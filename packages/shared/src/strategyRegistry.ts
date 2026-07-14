import type { StrategyContent, StrategyContentRegistry, StrategyType } from "./types.js";

function stub(
  strategyType: StrategyType,
  legs: StrategyContent["legs"],
): StrategyContent {
  return {
    strategyType,
    description: `TODO: Phase content for ${strategyType} — description.`,
    economicCleavage: `TODO: Phase content for ${strategyType} — economic cleavage.`,
    benefits: [`TODO: benefits for ${strategyType}`],
    risks: [`TODO: risks for ${strategyType}`],
    goodConditions: [`TODO: good conditions for ${strategyType}`],
    exampleSectorsOrCompanies: [`TODO: examples for ${strategyType}`],
    legs,
  };
}

export const strategyContentRegistry: StrategyContentRegistry = {
  long_equity: stub("long_equity", [
    { side: "buy", vehicleType: "equity", label: "Buy shares" },
  ]),
  short_equity: stub("short_equity", [
    { side: "sell_short", vehicleType: "equity", label: "Sell short shares" },
  ]),
  covered_call: stub("covered_call", [
    {
      side: "buy",
      vehicleType: "equity",
      label: "Long shares (or already held)",
      optional: true,
    },
    { side: "sell", vehicleType: "option", label: "Sell call" },
  ]),
  cash_secured_put: stub("cash_secured_put", [
    { side: "sell", vehicleType: "option", label: "Sell put (cash-secured)" },
  ]),
  long_call: stub("long_call", [
    { side: "buy", vehicleType: "option", label: "Buy call" },
  ]),
  long_put: stub("long_put", [
    { side: "buy", vehicleType: "option", label: "Buy put" },
  ]),
  vertical_spread: stub("vertical_spread", [
    { side: "buy", vehicleType: "option", label: "Buy option (long leg)" },
    { side: "sell", vehicleType: "option", label: "Sell option (short leg)" },
  ]),
  straddle: stub("straddle", [
    { side: "buy", vehicleType: "option", label: "Buy call" },
    { side: "buy", vehicleType: "option", label: "Buy put" },
  ]),
  strangle: stub("strangle", [
    { side: "buy", vehicleType: "option", label: "Buy OTM call" },
    { side: "buy", vehicleType: "option", label: "Buy OTM put" },
  ]),
  iron_condor: stub("iron_condor", [
    { side: "buy", vehicleType: "option", label: "Buy lower put" },
    { side: "sell", vehicleType: "option", label: "Sell higher put" },
    { side: "sell", vehicleType: "option", label: "Sell lower call" },
    { side: "buy", vehicleType: "option", label: "Buy higher call" },
  ]),
  long_future: stub("long_future", [
    { side: "buy", vehicleType: "future", label: "Buy future" },
  ]),
  short_future: stub("short_future", [
    { side: "sell_short", vehicleType: "future", label: "Sell short future" },
  ]),
  pairs_trade: stub("pairs_trade", [
    { side: "buy", vehicleType: "equity", label: "Long leg" },
    { side: "sell_short", vehicleType: "equity", label: "Short leg" },
  ]),
};

export function getStrategyContent(strategyType: StrategyType): StrategyContent {
  return strategyContentRegistry[strategyType];
}
