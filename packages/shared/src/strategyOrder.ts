import type { StrategyType } from "./types.js";

/** Fixed learning progression order (spec §7.1). */
export const STRATEGY_ORDER: readonly StrategyType[] = [
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
] as const;

export function getNextStrategy(
  strategyType: StrategyType,
): StrategyType | undefined {
  const idx = STRATEGY_ORDER.indexOf(strategyType);
  if (idx < 0 || idx >= STRATEGY_ORDER.length - 1) return undefined;
  return STRATEGY_ORDER[idx + 1];
}

export function getPreviousStrategy(
  strategyType: StrategyType,
): StrategyType | undefined {
  const idx = STRATEGY_ORDER.indexOf(strategyType);
  if (idx <= 0) return undefined;
  return STRATEGY_ORDER[idx - 1];
}
