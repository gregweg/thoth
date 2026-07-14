import type { StrategyType } from "@ill/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return body as T;
}

export interface StrategyListItem {
  strategyType: StrategyType;
  status: "locked" | "unlocked" | "completed";
  completedPlayId: string | null;
  reviewedAt: string | null;
  content: {
    strategyType: StrategyType;
    description: string;
    economicCleavage: string;
    benefits: string[];
    risks: string[];
    goodConditions: string[];
    exampleSectorsOrCompanies: string[];
    legs: Array<{
      side: string;
      vehicleType: string;
      label: string;
      optional?: boolean;
    }>;
  };
}

export interface PlaySummary {
  id: string;
  strategyType: StrategyType;
  entryDate: string;
  thesis: string | null;
  status: "open" | "closed";
  createdAt?: string;
}

export interface PlayDetail {
  play: PlaySummary;
  legs: Array<{
    id: string;
    symbol: string;
    vehicleType: string;
    side: string;
    quantity: number;
    price: number;
    fees?: number;
    markPrice: number;
    markCheckpoint: string;
  }>;
  snapshots: Array<{
    id: string;
    instrumentId: string;
    capturedAt: string;
    price: number;
    checkpoint: string;
  }>;
  pnl: { unrealizedPnl: number; pctReturn: number };
  hasEod: boolean;
  hasFollowUp: boolean;
  canMarkReviewed: boolean;
  progressStatus: string;
}

export const api = {
  strategies: () => request<StrategyListItem[]>("/api/strategies"),
  strategy: (type: StrategyType) =>
    request<{
      content: StrategyListItem["content"];
      progress: {
        strategyType: StrategyType;
        status: "locked" | "unlocked" | "completed";
        completedPlayId: string | null;
        reviewedAt: string | null;
      };
      previousStrategy: StrategyType | null;
      plays: PlaySummary[];
    }>(`/api/strategies/${type}`),
  plays: (params?: { status?: string }) => {
    const q = params?.status ? `?status=${params.status}` : "";
    return request<PlaySummary[]>(`/api/plays${q}`);
  },
  play: (id: string) => request<PlayDetail>(`/api/plays/${id}`),
  createPlay: (body: unknown) =>
    request<{ play: { id: string } }>("/api/plays", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  refreshPrices: (playId: string, checkpoint: "eod" | "follow_up" | "manual") =>
    request("/api/prices/refresh", {
      method: "POST",
      body: JSON.stringify({ playId, checkpoint }),
    }),
  markReviewed: (playId: string) =>
    request<{ unlockedNext: StrategyType | null }>(
      `/api/plays/${playId}/mark-reviewed`,
      { method: "POST" },
    ),
  dueCheckpoints: () =>
    request<
      Array<{
        id: string;
        strategyType: StrategyType;
        entryDate: string;
        reason: string;
      }>
    >("/api/checkpoints/due"),
  quote: (symbol: string) =>
    request<{ symbol: string; price: number; asOf: string }>(
      `/api/quotes/${encodeURIComponent(symbol)}`,
    ),
};
