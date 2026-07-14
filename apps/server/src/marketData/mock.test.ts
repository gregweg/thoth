import { describe, expect, it } from "vitest";
import { MockMarketDataProvider } from "./mock.js";

describe("MockMarketDataProvider", () => {
  it("returns known symbol price", async () => {
    const provider = new MockMarketDataProvider();
    const quote = await provider.getQuote("aapl");
    expect(quote.symbol).toBe("AAPL");
    expect(quote.price).toBe(190.5);
  });

  it("defaults unknown symbols to 100", async () => {
    const provider = new MockMarketDataProvider();
    const quote = await provider.getQuote("ZZZZ");
    expect(quote.price).toBe(100);
  });
});
