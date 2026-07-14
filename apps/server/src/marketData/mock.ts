import type { MarketDataProvider, Quote } from "./types.js";

const DEFAULT_PRICES: Record<string, number> = {
  AAPL: 190.5,
  MSFT: 420.25,
  SPY: 550.1,
  QQQ: 480.75,
  TSLA: 250.0,
};

export class MockMarketDataProvider implements MarketDataProvider {
  private readonly prices: Record<string, number>;

  constructor(prices: Record<string, number> = DEFAULT_PRICES) {
    this.prices = { ...prices };
  }

  async getQuote(symbol: string): Promise<Quote> {
    const key = symbol.toUpperCase();
    const price = this.prices[key] ?? 100;
    return {
      symbol: key,
      price,
      asOf: new Date().toISOString(),
    };
  }

  setPrice(symbol: string, price: number): void {
    this.prices[symbol.toUpperCase()] = price;
  }
}
