import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
} from "drizzle-orm/pg-core";

export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "equity",
  "option",
  "future",
  "crypto",
  "etf",
]);

export const strategyTypeEnum = pgEnum("strategy_type", [
  "long_equity",
  "short_equity",
  "covered_call",
  "cash_secured_put",
  "long_call",
  "long_put",
  "vertical_spread",
  "straddle",
  "strangle",
  "iron_condor",
  "long_future",
  "short_future",
  "pairs_trade",
]);

export const sideEnum = pgEnum("side", [
  "buy",
  "sell",
  "sell_short",
  "buy_to_cover",
]);

export const playStatusEnum = pgEnum("play_status", ["open", "closed"]);

export const checkpointEnum = pgEnum("checkpoint", [
  "entry",
  "eod",
  "follow_up",
  "manual",
]);

export const progressStatusEnum = pgEnum("progress_status", [
  "locked",
  "unlocked",
  "completed",
]);

export const groupTypeEnum = pgEnum("group_type", [
  "hedge",
  "roll",
  "scale_in",
  "pairs",
  "manual_bundle",
]);

export const playGroups = pgTable("play_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  groupType: groupTypeEnum("group_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const instruments = pgTable(
  "instruments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    symbol: text("symbol").notNull(),
    vehicleType: vehicleTypeEnum("vehicle_type").notNull(),
    underlyingSymbol: text("underlying_symbol"),
    meta: jsonb("meta"),
  },
  (t) => [index("instruments_symbol_idx").on(t.symbol)],
);

export const plays = pgTable(
  "plays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    strategyType: strategyTypeEnum("strategy_type").notNull(),
    entryDate: date("entry_date").notNull(),
    thesis: text("thesis"),
    status: playStatusEnum("status").notNull().default("open"),
    groupId: uuid("group_id").references(() => playGroups.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("plays_entry_date_idx").on(t.entryDate)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playId: uuid("play_id")
      .notNull()
      .references(() => plays.id, { onDelete: "cascade" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id),
    side: sideEnum("side").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
    price: numeric("price", { precision: 18, scale: 8 }).notNull(),
    fees: numeric("fees", { precision: 18, scale: 8 }),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("transactions_play_id_idx").on(t.playId)],
);

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id),
    playId: uuid("play_id").references(() => plays.id, { onDelete: "cascade" }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    price: numeric("price", { precision: 18, scale: 8 }).notNull(),
    checkpoint: checkpointEnum("checkpoint").notNull(),
  },
  (t) => [
    index("price_snapshots_instrument_checkpoint_idx").on(
      t.instrumentId,
      t.checkpoint,
    ),
    index("price_snapshots_play_id_idx").on(t.playId),
  ],
);

export const strategyProgress = pgTable("strategy_progress", {
  strategyType: strategyTypeEnum("strategy_type").primaryKey(),
  status: progressStatusEnum("status").notNull().default("locked"),
  completedPlayId: uuid("completed_play_id").references(() => plays.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});
