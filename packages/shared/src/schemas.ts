import { z } from "zod";
import { STRATEGY_ORDER } from "./strategyOrder.js";

export const strategyTypeSchema = z.enum(
  STRATEGY_ORDER as unknown as [string, ...string[]],
);

export const sideSchema = z.enum(["buy", "sell", "sell_short", "buy_to_cover"]);

export const vehicleTypeSchema = z.enum([
  "equity",
  "option",
  "future",
  "crypto",
  "etf",
]);

export const checkpointSchema = z.enum(["entry", "eod", "follow_up", "manual"]);

export const createPlayLegSchema = z.object({
  symbol: z.string().min(1).max(64),
  vehicleType: vehicleTypeSchema,
  side: sideSchema,
  quantity: z.number().positive(),
  /** Optional override; if omitted, server fetches quote as fill price. */
  price: z.number().positive().optional(),
  fees: z.number().nonnegative().optional(),
  underlyingSymbol: z.string().min(1).max(32).optional(),
});

export const createPlaySchema = z.object({
  strategyType: strategyTypeSchema,
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "entryDate must be YYYY-MM-DD"),
  thesis: z.string().max(2000).optional(),
  legs: z.array(createPlayLegSchema).min(1),
});

export const refreshPricesSchema = z.object({
  playId: z.string().uuid(),
  checkpoint: z.enum(["eod", "follow_up", "manual"]),
});

export type CreatePlayInput = z.infer<typeof createPlaySchema>;
export type CreatePlayLegInput = z.infer<typeof createPlayLegSchema>;
export type RefreshPricesInput = z.infer<typeof refreshPricesSchema>;
