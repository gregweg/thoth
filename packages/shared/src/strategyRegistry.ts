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
  short_equity: {
    strategyType: "short_equity",
    description:
      "Sell shares you do not own (borrowed from a lender), expecting the price to " +
      "fall. This is still a single-leg equity trade, but P&L runs the opposite way " +
      "of a long: you profit if the mark drops below your short sale price, and you " +
      "lose if it rises. To close, you buy the shares back (buy to cover) and return " +
      "them. In this app the entry is recorded as sell_short; later marks show " +
      "unrealized P&L until you close the play.",
    economicCleavage:
      "Short selling is how the market expresses a view that a price is too high — " +
      "overvaluation, deteriorating fundamentals, a fading narrative, or a negative " +
      "catalyst. Borrowed shares let skeptics put capital behind that view and, in " +
      "doing so, add selling pressure and price discovery when optimism looks " +
      "excessive. The economic role is not “betting against companies” for its own " +
      "sake; it is correcting prices when the long side has overpaid for the claim " +
      "on future cash flows.",
    benefits: [
      "Direct way to profit from a decline without using options",
      "Can hedge or offset long exposure in the same name or sector",
      "Forces a clearer thesis: what breaks, and over what horizon?",
      "Still a simple single-leg structure — no strikes or expiration to manage",
      "Useful contrast to long equity: same vehicle, inverted P&L intuition",
    ],
    risks: [
      "Theoretically unlimited loss if the stock keeps rising (no cap like a long’s cost basis)",
      "Short squeezes and violent squeezes on low float / heavily shorted names",
      "Borrow can be recalled or expensive (hard-to-borrow fees) in live markets",
      "Gaps up on news can inflict large overnight losses",
      "Timing risk: a correct long-term bearish view can still lose if you are early",
    ],
    goodConditions: [
      "A specific bearish thesis (overvaluation, broken story, negative catalyst) — not just “it went up a lot”",
      "Adequate liquidity and borrow so entry/exit are realistic for practice",
      "You size small enough that an adverse squeeze is a lesson, not a wipeout",
      "You can monitor marks at eod and follow-up — shorts need active attention",
      "You understand you are fighting the long-run upward drift of many equity markets",
    ],
    exampleSectorsOrCompanies: [
      "Crowded momentum names after a narrative peak (illustrative learning setups, not recommendations)",
      "Overlevered consumer or speculative growth stocks when fundamentals deteriorate",
      "Sector pairs later in the curriculum — for now, single-name shorts for mechanics",
      "Avoid treating “meme” / squeeze-prone tickers as casual practice size",
      "Illustrative only — pick liquid names you can explain in a short thesis",
    ],
    legs: [
      { side: "sell_short", vehicleType: "equity", label: "Sell short shares" },
    ],
  },
  covered_call: {
    strategyType: "covered_call",
    description:
      "Own (or buy) shares and sell a call option against them — typically one " +
      "call contract per 100 shares. You collect the call premium up front. If " +
      "the stock stays below the strike through expiration, the call expires and " +
      "you keep the premium on top of any stock move. If the stock rallies above " +
      "the strike, your upside is capped near the strike (shares get called away " +
      "in a live brokerage; here we track the combined mark-to-market). This is a " +
      "two-leg structure: long equity + short call.",
    economicCleavage:
      "A covered call sells volatility and upside convexity to someone who wants " +
      "levered participation, while you act as a willing seller of that upside in " +
      "exchange for income. Economically you are converting potential capital " +
      "gains above the strike into a known premium — useful when you are mildly " +
      "bullish or neutral, happy to own the stock, and want to get paid for " +
      "capping your upside.",
    benefits: [
      "Generates premium income while you hold the shares",
      "Slightly cushions downside vs. holding stock alone (by the premium received)",
      "Defined opportunity set: you choose strike and expiration to match your view",
      "Still long the stock below the strike — you participate in moderate rallies",
      "Good bridge from plain equity into options mechanics without naked short risk on the call",
    ],
    risks: [
      "Upside is capped: a big rally leaves you underperforming a plain long",
      "Stock can still fall a lot — premium only offsets a slice of the decline",
      "Assignment / early exercise risk in live markets around dividends and deep ITM",
      "Opportunity cost if you are called away and the name keeps running",
      "Choosing strikes/expirations poorly can harvest little premium for lots of capped upside",
    ],
    goodConditions: [
      "You already want to own the shares (or are fine buying them) at current levels",
      "Mildly bullish to neutral outlook — not a high-conviction breakout bet",
      "Implied vol is rich enough that selling the call feels fairly paid (here: synthetic IV)",
      "You can size in 100-share lots so one short call is properly covered",
      "You accept giving up upside above your chosen strike for the premium",
    ],
    exampleSectorsOrCompanies: [
      "Large-cap dividend payers and liquid mega-caps often used for covered-call programs",
      "Broad equity ETFs (e.g. SPY) as a liquid underlying for learning strike selection",
      "Quality compounders you are happy to hold if not called away",
      "Illustrative only — not recommendations; keep practice size small",
    ],
    legs: [
      {
        side: "buy",
        vehicleType: "equity",
        label: "Long shares (cover)",
        optional: true,
      },
      {
        side: "sell",
        vehicleType: "option",
        label: "Sell call",
        defaultOptionType: "call",
      },
    ],
  },
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
