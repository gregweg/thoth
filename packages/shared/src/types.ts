export type VehicleType = "equity" | "option" | "future" | "crypto" | "etf";

export type StrategyType =
  | "long_equity"
  | "short_equity"
  | "covered_call"
  | "cash_secured_put"
  | "long_call"
  | "long_put"
  | "vertical_spread"
  | "straddle"
  | "strangle"
  | "iron_condor"
  | "long_future"
  | "short_future"
  | "pairs_trade";

export type Side = "buy" | "sell" | "sell_short" | "buy_to_cover";

export type PlayStatus = "open" | "closed";

export type Checkpoint = "entry" | "eod" | "follow_up" | "manual";

export type ProgressStatus = "locked" | "unlocked" | "completed";

export type GroupType = "hedge" | "roll" | "scale_in" | "pairs" | "manual_bundle";

export interface OptionMeta {
  kind: "option";
  optionType: "call" | "put";
  strike: number;
  expiration: string;
}

export interface FutureMeta {
  kind: "future";
  expiration: string;
  contractSize?: number;
}

export interface Instrument {
  id: string;
  symbol: string;
  vehicleType: VehicleType;
  underlyingSymbol?: string;
  meta?: OptionMeta | FutureMeta;
}

export interface Play {
  id: string;
  strategyType: StrategyType;
  entryDate: string;
  thesis?: string;
  status: PlayStatus;
  groupId?: string;
}

export interface Transaction {
  id: string;
  playId: string;
  instrumentId: string;
  side: Side;
  quantity: number;
  price: number;
  fees?: number;
  executedAt: string;
}

export interface PlayGroup {
  id: string;
  name: string;
  groupType: GroupType;
  playIds: string[];
  createdAt: string;
}

export interface PriceSnapshot {
  id: string;
  instrumentId: string;
  capturedAt: string;
  price: number;
  checkpoint: Checkpoint;
}

export interface PerformanceResult {
  playId: string;
  checkpoint: "eod" | "follow_up";
  unrealizedPnl: number;
  pctReturn: number;
  asOf: string;
}

export interface StrategyProgress {
  strategyType: StrategyType;
  status: ProgressStatus;
  completedPlayId?: string;
  reviewedAt?: string;
}

export interface LegTemplate {
  side: Side;
  vehicleType: VehicleType;
  label: string;
  optional?: boolean;
}

export interface StrategyContent {
  strategyType: StrategyType;
  description: string;
  economicCleavage: string;
  benefits: string[];
  risks: string[];
  goodConditions: string[];
  exampleSectorsOrCompanies: string[];
  legs: LegTemplate[];
}

export type StrategyContentRegistry = Record<StrategyType, StrategyContent>;

/** Calendar days after entry before a follow-up checkpoint is due. */
export const FOLLOW_UP_DUE_CALENDAR_DAYS = 5;
