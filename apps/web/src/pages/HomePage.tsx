import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type PlaySummary } from "../api";

export function HomePage() {
  const [openPlays, setOpenPlays] = useState<PlaySummary[]>([]);
  const [due, setDue] = useState<
    Array<{ id: string; strategyType: string; entryDate: string; reason: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.plays({ status: "open" }), api.dueCheckpoints()])
      .then(([plays, dueList]) => {
        setOpenPlays(plays);
        setDue(dueList);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="stack">
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
