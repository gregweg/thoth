export interface Quote {
  symbol: string;
  price: number;
  asOf: string;
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote>;
}
