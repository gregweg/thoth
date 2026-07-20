import { describe, expect, it } from "vitest";
import {
  blackScholesPrice,
  computeSyntheticOptionPrice,
  formatOptionSymbol,
  yearsToExpiration,
} from "./syntheticOption.js";

describe("yearsToExpiration", () => {
  it("returns roughly one year", () => {
    expect(yearsToExpiration("2026-01-01", "2027-01-01")).toBeCloseTo(1, 2);
  });
});

describe("blackScholesPrice", () => {
  it("prices an ATM call above intrinsic", () => {
    const price = blackScholesPrice(100, 100, 0.5, 0.04, 0.25, "call");
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThan(20);
  });

  it("put-call parity holds approximately", () => {
    const s = 100;
    const k = 100;
    const t = 0.5;
    const r = 0.04;
    const iv = 0.25;
    const call = blackScholesPrice(s, k, t, r, iv, "call");
    const put = blackScholesPrice(s, k, t, r, iv, "put");
    const lhs = call - put;
    const rhs = s - k * Math.exp(-r * t);
    expect(lhs).toBeCloseTo(rhs, 4);
  });
});

describe("computeSyntheticOptionPrice", () => {
  it("returns a rounded premium for a covered-call style OTM call", () => {
    const price = computeSyntheticOptionPrice({
      spot: 315.7,
      strike: 330,
      expiration: "2026-08-15",
      optionType: "call",
      asOf: "2026-07-15",
    });
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThan(315.7);
  });
});

describe("formatOptionSymbol", () => {
  it("builds a stable symbol", () => {
    expect(formatOptionSymbol("aapl", "call", 330, "2026-08-15")).toBe(
      "AAPL_C_330_2026-08-15",
    );
  });
});
