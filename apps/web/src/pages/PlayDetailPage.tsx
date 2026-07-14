import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type PlayDetail } from "../api";

function formatPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export function PlayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<PlayDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    api
      .play(id)
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh(checkpoint: "eod" | "follow_up" | "manual") {
    if (!id) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.refreshPrices(id, checkpoint);
      setMessage(`Captured ${checkpoint} snapshot.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkReviewed() {
    if (!id) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.markReviewed(id);
      setMessage(
        result.unlockedNext
          ? `Reviewed. Unlocked ${result.unlockedNext}.`
          : "Reviewed. Strategy completed.",
      );
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  if (!detail && !error) return <p className="muted">Loading…</p>;
  if (!detail) return <div className="error">{error}</div>;

  const pnlClass =
    detail.pnl.unrealizedPnl > 0
      ? "positive"
      : detail.pnl.unrealizedPnl < 0
        ? "negative"
        : "";

  return (
    <div className="stack">
      <section className="panel">
        <p className="muted">
          <Link to={`/strategies/${detail.play.strategyType}`}>
            ← {detail.play.strategyType}
          </Link>
        </p>
        <h2>Play results</h2>
        <p>
          <strong>{detail.play.strategyType}</strong> · entry{" "}
          {detail.play.entryDate} · {detail.play.status}
        </p>
        {detail.play.thesis && <p>{detail.play.thesis}</p>}
        {error && <div className="error">{error}</div>}
        {message && <p className="muted">{message}</p>}

        <p className={`pnl ${pnlClass}`}>
          {formatMoney(detail.pnl.unrealizedPnl)} ({formatPct(detail.pnl.pctReturn)})
        </p>

        <div className="button-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => refresh("eod")}
          >
            Refresh eod
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => refresh("follow_up")}
          >
            Refresh follow-up
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => refresh("manual")}
          >
            Refresh manual
          </button>
          {detail.canMarkReviewed && (
            <button type="button" disabled={busy} onClick={onMarkReviewed}>
              Mark reviewed
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <h3>Legs</h3>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Entry</th>
              <th>Mark</th>
            </tr>
          </thead>
          <tbody>
            {detail.legs.map((leg) => (
              <tr key={leg.id}>
                <td>{leg.symbol}</td>
                <td>{leg.side}</td>
                <td>{leg.quantity}</td>
                <td>{formatMoney(leg.price)}</td>
                <td>
                  {formatMoney(leg.markPrice)}{" "}
                  <span className="muted">({leg.markCheckpoint})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Snapshots</h3>
        {detail.snapshots.length === 0 ? (
          <p className="muted">No snapshots.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Checkpoint</th>
                <th>Price</th>
                <th>Captured</th>
              </tr>
            </thead>
            <tbody>
              {detail.snapshots.map((s) => (
                <tr key={s.id}>
                  <td>{s.checkpoint}</td>
                  <td>{formatMoney(s.price)}</td>
                  <td>{new Date(s.capturedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
