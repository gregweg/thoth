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
  long_equity: {
    strategyType: "long_equity",
    description:
      "Buy shares of a stock or ETF and hold them, expecting the price to rise. " +
      "This is a single-leg trade: you pay the market price for N shares and your " +
      "profit or loss moves one-for-one with the underlying (before fees). There " +
      "is no expiration and no leverage from derivatives — you own the economic " +
      "exposure directly. You close the idea by selling the shares (or keeping " +
      "them as a longer-term holding).",
    economicCleavage:
      "Buying equity is a claim on a firm’s future cash flows and residual value. " +
      "The opportunity exists when the market price understates that claim relative " +
      "to your view — because of temporary sentiment, underappreciated growth, " +
      "misread fundamentals, or simply a bet that broad risk appetite and earnings " +
      "will improve. In that sense, long equity is the baseline way capital funds " +
      "productive assets and participates in upside when expectations are too low.",
    benefits: [
      "Straightforward P&L: up in price helps you; down hurts you — easy to reason about",
      "Unlimited upside in theory (price can keep rising); loss capped at what you paid",
      "No option decay, strike selection, or expiration management",
      "Liquid names are easy to enter and exit at transparent market prices",
      "Can express a multi-year thesis without rolling contracts",
    ],
    risks: [
      "Full downside to zero if the company fails (you can lose your entire stake)",
      "Drawdowns can be large and last a long time even if the thesis is eventually right",
      "Opportunity cost vs. cash or other ideas while capital is tied up",
      "Gap risk overnight and around news — price can jump through levels with no trade",
      "Concentration risk if one name dominates your practice book",
    ],
    goodConditions: [
      "You have a clear bullish thesis (fundamental, technical, or thematic) and a time horizon",
      "You want directional exposure without learning options mechanics first",
      "Liquidity is adequate (tight spreads, reasonable volume) so fills are fair",
      "You can tolerate mark-to-market swings at eod and on later follow-up checkpoints",
      "Position size is small enough that a bad outcome is a lesson, not a crisis",
    ],
    exampleSectorsOrCompanies: [
      "Large-cap tech and platforms often used as liquid learning vehicles (e.g. AAPL, MSFT)",
      "Broad index ETFs for market-level beta (e.g. SPY, QQQ) when the thesis is “the market”",
      "Secular growth themes (cloud, semiconductors, consumer brands) expressed via leading names",
      "Illustrative only — not recommendations; pick symbols you understand for practice",
    ],
    legs: [{ side: "buy", vehicleType: "equity", label: "Buy shares" }],
  },
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
