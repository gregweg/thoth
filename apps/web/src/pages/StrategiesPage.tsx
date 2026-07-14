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
        Progress is gated in a fixed order. Locked strategies can be read; trading
        unlocks after you complete the previous one.
      </p>
      {error && <div className="error">{error}</div>}
      <ul className="strategy-list">
        {items.map((s, i) => (
          <li key={s.strategyType}>
            <div>
              <Link to={`/strategies/${s.strategyType}`}>
                {i + 1}. {s.strategyType}
              </Link>
            </div>
            <span className={`badge ${s.status}`}>{s.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
