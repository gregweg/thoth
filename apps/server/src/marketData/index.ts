import { MockMarketDataProvider } from "./mock.js";
import { TwelveDataProvider } from "./twelveData.js";
import type { MarketDataProvider } from "./types.js";

export type { MarketDataProvider, Quote } from "./types.js";
export { MockMarketDataProvider } from "./mock.js";
export { TwelveDataProvider } from "./twelveData.js";

export function createMarketDataProvider(): MarketDataProvider {
  if (process.env.USE_MOCK_MARKET_DATA === "true") {
    return new MockMarketDataProvider();
  }
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.warn(
      "TWELVE_DATA_API_KEY missing — falling back to MockMarketDataProvider",
    );
    return new MockMarketDataProvider();
  }
  return new TwelveDataProvider(apiKey);
}
