import type { MarketDataProvider, Quote } from "./types.js";

interface TwelveDataQuoteResponse {
  symbol?: string;
  name?: string;
  close?: string;
  price?: string;
  datetime?: string;
  timestamp?: number;
  code?: number;
  message?: string;
  status?: string;
}

export class TwelveDataProvider implements MarketDataProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error("TWELVE_DATA_API_KEY is required for TwelveDataProvider");
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", this.apiKey);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Twelve Data HTTP ${res.status} for ${symbol}`);
    }

    const data = (await res.json()) as TwelveDataQuoteResponse;
    if (data.status === "error" || data.code) {
      throw new Error(
        data.message ?? `Twelve Data error for ${symbol}`,
      );
    }

    const priceStr = data.close ?? data.price;
    const price = priceStr != null ? Number(priceStr) : NaN;
    if (!Number.isFinite(price)) {
      throw new Error(`Twelve Data returned no price for ${symbol}`);
    }

    const asOf =
      data.datetime ??
      (data.timestamp
        ? new Date(data.timestamp * 1000).toISOString()
        : new Date().toISOString());

    return { symbol: data.symbol ?? symbol, price, asOf };
  }
}
