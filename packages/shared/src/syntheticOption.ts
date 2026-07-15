/** Standard US equity option contract size. */
export const OPTION_CONTRACT_MULTIPLIER = 100;

/** Assumed constant IV for synthetic pricing (educational, not a vol surface). */
export const DEFAULT_SYNTHETIC_IV = 0.25;

/** Assumed continuous risk-free rate for synthetic pricing. */
export const DEFAULT_RISK_FREE_RATE = 0.04;

export type OptionRight = "call" | "put";

export interface SyntheticOptionInput {
  spot: number;
  strike: number;
  /** YYYY-MM-DD */
  expiration: string;
  optionType: OptionRight;
  /** Valuation date YYYY-MM-DD (defaults to UTC today). */
  asOf?: string;
  iv?: number;
  riskFreeRate?: number;
}

function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Year fraction from asOf to expiration (calendar, ACT/365). */
export function yearsToExpiration(asOf: string, expiration: string): number {
  const start = Date.parse(`${asOf}T00:00:00Z`);
  const end = Date.parse(`${expiration}T00:00:00Z`);
  const days = (end - start) / (1000 * 60 * 60 * 24);
  return Math.max(days / 365, 1 / 365);
}

/**
 * Black–Scholes European option price (per share), used as a synthetic quote
 * grounded in the live underlying spot. Not a live options chain.
 */
export function blackScholesPrice(
  spot: number,
  strike: number,
  timeYears: number,
  rate: number,
  iv: number,
  optionType: OptionRight,
): number {
  if (spot <= 0 || strike <= 0) return 0;
  if (timeYears <= 0 || iv <= 0) {
    const intrinsic =
      optionType === "call"
        ? Math.max(spot - strike, 0)
        : Math.max(strike - spot, 0);
    return intrinsic;
  }

  const sqrtT = Math.sqrt(timeYears);
  const d1 =
    (Math.log(spot / strike) + (rate + (iv * iv) / 2) * timeYears) /
    (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;

  if (optionType === "call") {
    return (
      spot * normCdf(d1) - strike * Math.exp(-rate * timeYears) * normCdf(d2)
    );
  }
  return (
    strike * Math.exp(-rate * timeYears) * normCdf(-d2) - spot * normCdf(-d1)
  );
}

export function computeSyntheticOptionPrice(
  input: SyntheticOptionInput,
): number {
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
  const iv = input.iv ?? DEFAULT_SYNTHETIC_IV;
  const rate = input.riskFreeRate ?? DEFAULT_RISK_FREE_RATE;
  const t = yearsToExpiration(asOf, input.expiration);
  const price = blackScholesPrice(
    input.spot,
    input.strike,
    t,
    rate,
    iv,
    input.optionType,
  );
  return Math.round(price * 100) / 100;
}

/** Stable synthetic OCC-ish symbol for storage (not exchange symbology). */
export function formatOptionSymbol(
  underlying: string,
  optionType: OptionRight,
  strike: number,
  expiration: string,
): string {
  const right = optionType === "call" ? "C" : "P";
  const strikeTag = Number.isInteger(strike)
    ? String(strike)
    : strike.toFixed(2).replace(".", "p");
  return `${underlying.toUpperCase()}_${right}_${strikeTag}_${expiration}`;
}
