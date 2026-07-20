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

export const optionTypeSchema = z.enum(["call", "put"]);

export const createPlayLegSchema = z
  .object({
    symbol: z.string().min(1).max(64),
    vehicleType: vehicleTypeSchema,
    side: sideSchema,
    quantity: z.number().positive(),
    /** Optional override; if omitted, server fetches/synthesizes fill price. */
    price: z.number().positive().optional(),
    fees: z.number().nonnegative().optional(),
    underlyingSymbol: z.string().min(1).max(32).optional(),
    optionType: optionTypeSchema.optional(),
    strike: z.number().positive().optional(),
    expiration: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "expiration must be YYYY-MM-DD")
      .optional(),
  })
  .superRefine((leg, ctx) => {
    if (leg.vehicleType !== "option") return;
    if (leg.optionType == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "optionType is required for option legs",
        path: ["optionType"],
      });
    }
    if (leg.strike == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "strike is required for option legs",
        path: ["strike"],
      });
    }
    if (leg.expiration == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiration is required for option legs",
        path: ["expiration"],
      });
    }
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
