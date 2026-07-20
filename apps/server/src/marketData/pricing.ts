import {
  OPTION_CONTRACT_MULTIPLIER,
  computeSyntheticOptionPrice,
  formatOptionSymbol,
  type OptionMeta,
  type OptionRight,
} from "@ill/shared";
import type { MarketDataProvider } from "./types.js";

export { OPTION_CONTRACT_MULTIPLIER };

export async function getEquitySpot(
  market: MarketDataProvider,
  symbol: string,
  cache: Map<string, number>,
): Promise<number> {
  const key = symbol.toUpperCase();
  if (!cache.has(key)) {
    const quote = await market.getQuote(key);
    cache.set(key, quote.price);
  }
  return cache.get(key)!;
}

export async function priceOptionLeg(
  market: MarketDataProvider,
  cache: Map<string, number>,
  params: {
    underlyingSymbol: string;
    optionType: OptionRight;
    strike: number;
    expiration: string;
    asOf: string;
  },
): Promise<{ symbol: string; price: number; meta: OptionMeta }> {
  const underlying = params.underlyingSymbol.toUpperCase();
  const spot = await getEquitySpot(market, underlying, cache);
  const price = computeSyntheticOptionPrice({
    spot,
    strike: params.strike,
    expiration: params.expiration,
    optionType: params.optionType,
    asOf: params.asOf,
  });
  const symbol = formatOptionSymbol(
    underlying,
    params.optionType,
    params.strike,
    params.expiration,
  );
  return {
    symbol,
    price,
    meta: {
      kind: "option",
      optionType: params.optionType,
      strike: params.strike,
      expiration: params.expiration,
    },
  };
}

export function isOptionMeta(meta: unknown): meta is OptionMeta {
  return (
    typeof meta === "object" &&
    meta != null &&
    (meta as OptionMeta).kind === "option"
  );
}

export async function markInstrument(
  market: MarketDataProvider,
  cache: Map<string, number>,
  instrument: {
    symbol: string;
    vehicleType: string;
    underlyingSymbol: string | null;
    meta: unknown;
  },
  asOf: string,
): Promise<number> {
  if (instrument.vehicleType === "option" && isOptionMeta(instrument.meta)) {
    const underlying =
      instrument.underlyingSymbol ?? instrument.symbol.split("_")[0]!;
    const priced = await priceOptionLeg(market, cache, {
      underlyingSymbol: underlying,
      optionType: instrument.meta.optionType,
      strike: instrument.meta.strike,
      expiration: instrument.meta.expiration,
      asOf,
    });
    return priced.price;
  }
  return getEquitySpot(market, instrument.symbol, cache);
}
