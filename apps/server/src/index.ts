import "./env.js";
import cors from "cors";
import express from "express";
import { createMarketDataProvider } from "./marketData/index.js";
import { createApiRouter } from "./routes/api.js";

const port = Number(process.env.PORT ?? 3001);
const app = express();
const market = createMarketDataProvider();

app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api", createApiRouter(market));

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
