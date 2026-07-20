import type { Side } from "./types.js";

export interface SingleLegPnlInput {
  entryPrice: number;
  quantity: number;
  side: Side;
  markPrice: number;
  fees?: number;
  /** Contract multiplier (100 for equity options, 1 for shares). */
  multiplier?: number;
}

export interface SingleLegPnlResult {
  unrealizedPnl: number;
  pctReturn: number;
}

/**
 * Unrealized P&L for a single leg.
 * Long (buy / buy_to_cover): profit when mark > entry.
 * Short (sell / sell_short): profit when mark < entry.
 */
export function computeSingleLegPnl(input: SingleLegPnlInput): SingleLegPnlResult {
  const {
    entryPrice,
    quantity,
    side,
    markPrice,
    fees = 0,
    multiplier = 1,
  } = input;
  const isLong = side === "buy" || side === "buy_to_cover";
  const direction = isLong ? 1 : -1;
  const unrealizedPnl =
    direction * (markPrice - entryPrice) * quantity * multiplier - fees;
  const notional = entryPrice * quantity * multiplier;
  const pctReturn = notional === 0 ? 0 : unrealizedPnl / notional;
  return { unrealizedPnl, pctReturn };
}

export interface LegForAggregate {
  entryPrice: number;
  quantity: number;
  side: Side;
  markPrice: number;
  fees?: number;
  multiplier?: number;
}

/** Sum single-leg P&L; pctReturn is vs total absolute entry notional. */
export function computeAggregatePnl(legs: LegForAggregate[]): SingleLegPnlResult {
  if (legs.length === 0) {
    return { unrealizedPnl: 0, pctReturn: 0 };
  }
  let unrealizedPnl = 0;
  let notional = 0;
  for (const leg of legs) {
    const result = computeSingleLegPnl(leg);
    unrealizedPnl += result.unrealizedPnl;
    notional += leg.entryPrice * leg.quantity;
  }
  const pctReturn = notional === 0 ? 0 : unrealizedPnl / notional;
  return { unrealizedPnl, pctReturn };
}
