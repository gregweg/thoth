import { Router } from "express";
import type { StrategyType } from "@ill/shared";
import { STRATEGY_ORDER } from "@ill/shared";
import type { MarketDataProvider } from "../marketData/index.js";
import * as playsService from "../services/plays.js";

function httpError(err: unknown): { status: number; message: string } {
  if (err && typeof err === "object" && "status" in err) {
    return {
      status: Number((err as { status: number }).status) || 500,
      message: err instanceof Error ? err.message : "Error",
    };
  }
  if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "ZodError") {
    return { status: 400, message: String(err) };
  }
  return {
    status: 500,
    message: err instanceof Error ? err.message : "Internal server error",
  };
}

export function createApiRouter(market: MarketDataProvider): Router {
  const router = Router();

  router.get("/strategies", async (_req, res) => {
    try {
      const data = await playsService.listStrategies();
      res.json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.get("/strategies/:strategyType", async (req, res) => {
    try {
      const strategyType = req.params.strategyType as StrategyType;
      if (!STRATEGY_ORDER.includes(strategyType)) {
        res.status(404).json({ error: "Unknown strategy" });
        return;
      }
      const data = await playsService.getStrategyDetail(strategyType);
      res.json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.post("/plays", async (req, res) => {
    try {
      const data = await playsService.createPlay(req.body, market);
      res.status(201).json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.get("/plays", async (req, res) => {
    try {
      const data = await playsService.listPlays({
        strategyType: req.query.strategyType as string | undefined,
        status: req.query.status as string | undefined,
      });
      res.json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.get("/plays/:id", async (req, res) => {
    try {
      const data = await playsService.getPlayDetail(req.params.id);
      if (!data) {
        res.status(404).json({ error: "Play not found" });
        return;
      }
      res.json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.post("/plays/:id/close", async (req, res) => {
    try {
      const data = await playsService.closePlay(req.params.id);
      if (!data) {
        res.status(404).json({ error: "Play not found" });
        return;
      }
      res.json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.post("/plays/:id/mark-reviewed", async (req, res) => {
    try {
      const data = await playsService.markReviewed(req.params.id);
      res.json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.post("/prices/refresh", async (req, res) => {
    try {
      const data = await playsService.refreshPrices(req.body, market);
      res.json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.get("/checkpoints/due", async (_req, res) => {
    try {
      const data = await playsService.listDueCheckpoints();
      res.json(data);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  router.get("/quotes/:symbol", async (req, res) => {
    try {
      const quote = await market.getQuote(req.params.symbol);
      res.json(quote);
    } catch (err) {
      const { status, message } = httpError(err);
      res.status(status).json({ error: message });
    }
  });

  return router;
}
