import {
  STRATEGY_ORDER,
  computeAggregatePnl,
  createPlaySchema,
  formatIsoDate,
  getNextStrategy,
  getPreviousStrategy,
  getStrategyContent,
  isFollowUpDue,
  refreshPricesSchema,
  strategyContentRegistry,
  type CreatePlayInput,
  type StrategyType,
} from "@ill/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  instruments,
  plays,
  priceSnapshots,
  strategyProgress,
  transactions,
} from "../db/schema.js";
import type { MarketDataProvider } from "../marketData/index.js";

function num(value: string | null | undefined): number {
  return value == null ? 0 : Number(value);
}

export async function listStrategies() {
  const progress = await db.select().from(strategyProgress);
  const byType = new Map(progress.map((p) => [p.strategyType, p]));

  return STRATEGY_ORDER.map((strategyType) => {
    const p = byType.get(strategyType);
    return {
      strategyType,
      status: p?.status ?? "locked",
      completedPlayId: p?.completedPlayId ?? null,
      reviewedAt: p?.reviewedAt?.toISOString() ?? null,
      content: strategyContentRegistry[strategyType],
    };
  });
}

export async function getStrategyDetail(strategyType: StrategyType) {
  const [progress] = await db
    .select()
    .from(strategyProgress)
    .where(eq(strategyProgress.strategyType, strategyType));

  const playRows = await db
    .select()
    .from(plays)
    .where(eq(plays.strategyType, strategyType));

  const previous = getPreviousStrategy(strategyType);

  const playsWithCheckpoints = await Promise.all(
    playRows.map(async (p) => {
      const detail = await getPlayDetail(p.id);
      return {
        id: p.id,
        strategyType: p.strategyType,
        entryDate: p.entryDate,
        thesis: p.thesis,
        status: p.status,
        hasEod: detail?.hasEod ?? false,
        hasFollowUp: detail?.hasFollowUp ?? false,
        unrealizedPnl: detail?.pnl.unrealizedPnl ?? null,
        pctReturn: detail?.pnl.pctReturn ?? null,
      };
    }),
  );

  return {
    content: getStrategyContent(strategyType),
    progress: progress
      ? {
          strategyType: progress.strategyType,
          status: progress.status,
          completedPlayId: progress.completedPlayId,
          reviewedAt: progress.reviewedAt?.toISOString() ?? null,
        }
      : { strategyType, status: "locked" as const, completedPlayId: null, reviewedAt: null },
    previousStrategy: previous ?? null,
    plays: playsWithCheckpoints,
  };
}

export async function createPlay(
  raw: unknown,
  market: MarketDataProvider,
) {
  const input: CreatePlayInput = createPlaySchema.parse(raw);

  const [progress] = await db
    .select()
    .from(strategyProgress)
    .where(eq(strategyProgress.strategyType, input.strategyType as StrategyType));

  if (!progress || progress.status === "locked") {
    const err = new Error(
      `Strategy ${input.strategyType} is locked. Complete the previous strategy first.`,
    );
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  const executedAt = new Date();
  const quoteCache = new Map<string, number>();

  return db.transaction(async (tx) => {
    const [play] = await tx
      .insert(plays)
      .values({
        strategyType: input.strategyType as StrategyType,
        entryDate: input.entryDate,
        thesis: input.thesis,
        status: "open",
      })
      .returning();

    if (!play) throw new Error("Failed to create play");

    const createdTxs = [];

    for (const leg of input.legs) {
      const symbol = leg.symbol.toUpperCase();
      let [instrument] = await tx
        .select()
        .from(instruments)
        .where(
          and(
            eq(instruments.symbol, symbol),
            eq(instruments.vehicleType, leg.vehicleType),
          ),
        );

      if (!instrument) {
        [instrument] = await tx
          .insert(instruments)
          .values({
            symbol,
            vehicleType: leg.vehicleType,
            underlyingSymbol: leg.underlyingSymbol?.toUpperCase(),
          })
          .returning();
      }

      if (!instrument) throw new Error("Failed to upsert instrument");

      let fillPrice = leg.price;
      if (fillPrice == null) {
        if (!quoteCache.has(symbol)) {
          const quote = await market.getQuote(symbol);
          quoteCache.set(symbol, quote.price);
        }
        fillPrice = quoteCache.get(symbol)!;
      }

      const [txRow] = await tx
        .insert(transactions)
        .values({
          playId: play.id,
          instrumentId: instrument.id,
          side: leg.side,
          quantity: String(leg.quantity),
          price: String(fillPrice),
          fees: leg.fees != null ? String(leg.fees) : null,
          executedAt,
        })
        .returning();

      await tx.insert(priceSnapshots).values({
        instrumentId: instrument.id,
        playId: play.id,
        capturedAt: executedAt,
        price: String(fillPrice),
        checkpoint: "entry",
      });

      createdTxs.push(txRow);
    }

    return { play, transactions: createdTxs };
  });
}

export async function listPlays(filters?: {
  strategyType?: string;
  status?: string;
}) {
  let rows = await db.select().from(plays);
  if (filters?.strategyType) {
    rows = rows.filter((p) => p.strategyType === filters.strategyType);
  }
  if (filters?.status) {
    rows = rows.filter((p) => p.status === filters.status);
  }
  return rows.map((p) => ({
    id: p.id,
    strategyType: p.strategyType,
    entryDate: p.entryDate,
    thesis: p.thesis,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function getPlayDetail(playId: string) {
  const [play] = await db.select().from(plays).where(eq(plays.id, playId));
  if (!play) return null;

  const txs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.playId, playId));

  const instrumentIds = [...new Set(txs.map((t) => t.instrumentId))];
  const instrumentRows =
    instrumentIds.length > 0
      ? await db
          .select()
          .from(instruments)
          .where(inArray(instruments.id, instrumentIds))
      : [];
  const instrumentMap = new Map(instrumentRows.map((i) => [i.id, i]));

  const snapshots = await db
    .select()
    .from(priceSnapshots)
    .where(eq(priceSnapshots.playId, playId));

  const latestByInstrument = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    const existing = latestByInstrument.get(snap.instrumentId);
    if (
      !existing ||
      snap.capturedAt.getTime() > existing.capturedAt.getTime()
    ) {
      latestByInstrument.set(snap.instrumentId, snap);
    }
  }

  const legs = txs.map((t) => {
    const instrument = instrumentMap.get(t.instrumentId);
    const mark = latestByInstrument.get(t.instrumentId);
    return {
      id: t.id,
      instrumentId: t.instrumentId,
      symbol: instrument?.symbol ?? "?",
      vehicleType: instrument?.vehicleType ?? "equity",
      side: t.side,
      quantity: num(t.quantity),
      price: num(t.price),
      fees: t.fees != null ? num(t.fees) : undefined,
      executedAt: t.executedAt.toISOString(),
      markPrice: mark ? num(mark.price) : num(t.price),
      markCheckpoint: mark?.checkpoint ?? "entry",
    };
  });

  const pnl = computeAggregatePnl(
    legs.map((l) => ({
      entryPrice: l.price,
      quantity: l.quantity,
      side: l.side,
      markPrice: l.markPrice,
      fees: l.fees,
    })),
  );

  const hasEod = snapshots.some((s) => s.checkpoint === "eod");
  const hasFollowUp = snapshots.some((s) => s.checkpoint === "follow_up");

  const [progress] = await db
    .select()
    .from(strategyProgress)
    .where(eq(strategyProgress.strategyType, play.strategyType));

  return {
    play: {
      id: play.id,
      strategyType: play.strategyType,
      entryDate: play.entryDate,
      thesis: play.thesis,
      status: play.status,
      createdAt: play.createdAt.toISOString(),
    },
    legs,
    snapshots: snapshots.map((s) => ({
      id: s.id,
      instrumentId: s.instrumentId,
      capturedAt: s.capturedAt.toISOString(),
      price: num(s.price),
      checkpoint: s.checkpoint,
    })),
    pnl,
    hasEod,
    hasFollowUp,
    canMarkReviewed:
      hasEod &&
      progress?.status === "unlocked" &&
      progress.completedPlayId == null,
    progressStatus: progress?.status ?? "locked",
  };
}

export async function closePlay(playId: string) {
  const [updated] = await db
    .update(plays)
    .set({ status: "closed" })
    .where(eq(plays.id, playId))
    .returning();
  return updated ?? null;
}

export async function markReviewed(playId: string) {
  const detail = await getPlayDetail(playId);
  if (!detail) {
    const err = new Error("Play not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (!detail.hasEod) {
    const err = new Error("Play needs an eod checkpoint before review");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const strategyType = detail.play.strategyType;
  const [progress] = await db
    .select()
    .from(strategyProgress)
    .where(eq(strategyProgress.strategyType, strategyType));

  if (!progress || progress.status === "locked") {
    const err = new Error("Strategy is locked");
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  if (progress.status === "completed") {
    return { strategyType, status: "completed" as const, unlockedNext: null };
  }

  const reviewedAt = new Date();
  await db
    .update(strategyProgress)
    .set({
      status: "completed",
      completedPlayId: playId,
      reviewedAt,
    })
    .where(eq(strategyProgress.strategyType, strategyType));

  const next = getNextStrategy(strategyType);
  if (next) {
    await db
      .update(strategyProgress)
      .set({ status: "unlocked" })
      .where(eq(strategyProgress.strategyType, next));
  }

  return {
    strategyType,
    status: "completed" as const,
    unlockedNext: next ?? null,
  };
}

export async function refreshPrices(
  raw: unknown,
  market: MarketDataProvider,
) {
  const input = refreshPricesSchema.parse(raw);
  const [play] = await db.select().from(plays).where(eq(plays.id, input.playId));
  if (!play) {
    const err = new Error("Play not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const txs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.playId, input.playId));

  const instrumentIds = [...new Set(txs.map((t) => t.instrumentId))];
  const instrumentRows =
    instrumentIds.length > 0
      ? await db
          .select()
          .from(instruments)
          .where(inArray(instruments.id, instrumentIds))
      : [];

  const capturedAt = new Date();
  const created = [];

  for (const instrument of instrumentRows) {
    const quote = await market.getQuote(instrument.symbol);
    const [snap] = await db
      .insert(priceSnapshots)
      .values({
        instrumentId: instrument.id,
        playId: play.id,
        capturedAt,
        price: String(quote.price),
        checkpoint: input.checkpoint,
      })
      .returning();
    created.push(snap);
  }

  return {
    playId: play.id,
    checkpoint: input.checkpoint,
    snapshots: created.map((s) => ({
      id: s!.id,
      instrumentId: s!.instrumentId,
      price: num(s!.price),
      capturedAt: s!.capturedAt.toISOString(),
      checkpoint: s!.checkpoint,
    })),
  };
}

export async function listDueCheckpoints() {
  const today = formatIsoDate(new Date());
  const openPlays = await db
    .select()
    .from(plays)
    .where(eq(plays.status, "open"));

  const due = [];
  for (const play of openPlays) {
    const snaps = await db
      .select()
      .from(priceSnapshots)
      .where(eq(priceSnapshots.playId, play.id));
    const hasFollowUp = snaps.some((s) => s.checkpoint === "follow_up");
    const hasEod = snaps.some((s) => s.checkpoint === "eod");
    if (isFollowUpDue(play.entryDate, today, hasFollowUp) && hasEod) {
      due.push({
        id: play.id,
        strategyType: play.strategyType,
        entryDate: play.entryDate,
        status: play.status,
        reason: "follow_up_due" as const,
      });
    }
  }
  return due;
}
