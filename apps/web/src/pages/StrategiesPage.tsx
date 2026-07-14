import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type StrategyListItem } from "../api";

export function StrategiesPage() {
  const [items, setItems] = useState<StrategyListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .strategies()
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="panel">
      <h2>Strategies</h2>
      <p className="muted">
        Progress is gated in a fixed order. Open an unlocked or completed
        strategy to place a new play (choose your own symbol and size). Locked
        strategies are read-only until you finish the previous one.
      </p>
      {error && <div className="error">{error}</div>}
      <ul className="strategy-list">
        {items.map((s, i) => {
          const canTrade = s.status === "unlocked" || s.status === "completed";
          return (
            <li key={s.strategyType}>
              <div>
                <Link to={`/strategies/${s.strategyType}${canTrade ? "#trade" : ""}`}>
                  {i + 1}. {s.strategyType.replaceAll("_", " ")}
                </Link>
                {canTrade && (
                  <span className="muted"> — place a play here</span>
                )}
              </div>
              <span className={`badge ${s.status}`}>{s.status}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
