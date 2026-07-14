import { describe, expect, it } from "vitest";
import { computeAggregatePnl, computeSingleLegPnl } from "./pnl.js";

describe("computeSingleLegPnl", () => {
  it("computes long equity gain", () => {
    const result = computeSingleLegPnl({
      entryPrice: 100,
      quantity: 10,
      side: "buy",
      markPrice: 110,
    });
    expect(result.unrealizedPnl).toBe(100);
    expect(result.pctReturn).toBeCloseTo(0.1);
  });

  it("computes short equity gain when price falls", () => {
    const result = computeSingleLegPnl({
      entryPrice: 100,
      quantity: 10,
      side: "sell_short",
      markPrice: 90,
    });
    expect(result.unrealizedPnl).toBe(100);
    expect(result.pctReturn).toBeCloseTo(0.1);
  });

  it("subtracts fees", () => {
    const result = computeSingleLegPnl({
      entryPrice: 100,
      quantity: 1,
      side: "buy",
      markPrice: 110,
      fees: 2,
    });
    expect(result.unrealizedPnl).toBe(8);
  });
});

describe("computeAggregatePnl", () => {
  it("sums legs", () => {
    const result = computeAggregatePnl([
      { entryPrice: 100, quantity: 1, side: "buy", markPrice: 110 },
      { entryPrice: 50, quantity: 2, side: "sell_short", markPrice: 40 },
    ]);
    expect(result.unrealizedPnl).toBe(30);
  });
});
