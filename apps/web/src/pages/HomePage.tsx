import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type PlaySummary, type StrategyListItem } from "../api";

export function HomePage() {
  const [openPlays, setOpenPlays] = useState<PlaySummary[]>([]);
  const [due, setDue] = useState<
    Array<{ id: string; strategyType: string; entryDate: string; reason: string }>
  >([]);
  const [tradeable, setTradeable] = useState<StrategyListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.plays({ status: "open" }),
      api.dueCheckpoints(),
      api.strategies(),
    ])
      .then(([plays, dueList, strategies]) => {
        setOpenPlays(plays);
        setDue(dueList);
        setTradeable(
          strategies.filter(
            (s) => s.status === "unlocked" || s.status === "completed",
          ),
        );
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const currentFocus =
    tradeable.find((s) => s.status === "unlocked") ?? tradeable[0];

  return (
    <div className="stack">
      <section className="panel">
        <h2>Place a new play</h2>
        <p className="muted">
          Pick a strategy you&apos;ve unlocked, then choose your own symbol,
          size, and thesis on that page. The strategy fixes the trade type (e.g.
          long equity = buy shares) — not which stock.
        </p>
        {currentFocus && (
          <p>
            <Link className="button" to={`/strategies/${currentFocus.strategyType}#trade`}>
              New {currentFocus.strategyType.replaceAll("_", " ")} play
            </Link>
          </p>
        )}
        {tradeable.length > 1 && (
          <p className="muted">
            Or choose another unlocked strategy:{" "}
            {tradeable.map((s, i) => (
              <span key={s.strategyType}>
                {i > 0 ? ", " : ""}
                <Link to={`/strategies/${s.strategyType}#trade`}>
                  {s.strategyType}
                </Link>
              </span>
            ))}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Plays needing a checkpoint</h2>
        <p className="muted">
          Open plays with an eod snapshot, entry at least 5 calendar days ago, and
          no follow-up yet.
        </p>
        {error && <div className="error">{error}</div>}
        {due.length === 0 ? (
          <p className="muted">None due right now.</p>
        ) : (
          <ul>
            {due.map((p) => (
              <li key={p.id}>
                <Link to={`/plays/${p.id}`}>
                  {p.strategyType} — entered {p.entryDate}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Open plays</h2>
        {openPlays.length === 0 ? (
          <p className="muted">
            No open plays. Start with{" "}
            <Link to="/strategies/long_equity">long equity</Link>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Entry</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {openPlays.map((p) => (
                <tr key={p.id}>
                  <td>{p.strategyType}</td>
                  <td>{p.entryDate}</td>
                  <td>
                    <Link to={`/plays/${p.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
