import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { StrategyType } from "@ill/shared";
import { api } from "../api";

interface LegFormState {
  symbol: string;
  quantity: string;
  price: string;
}

export function StrategyDetailPage() {
  const { strategyType } = useParams<{ strategyType: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof api.strategy>
  > | null>(null);
  const [thesis, setThesis] = useState("");
  const [entryDate, setEntryDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [legs, setLegs] = useState<LegFormState[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!strategyType) return;
    setLoading(true);
    api
      .strategy(strategyType as StrategyType)
      .then((data) => {
        setDetail(data);
        setLegs(
          data.content.legs.map(() => ({
            symbol: "",
            quantity: "1",
            price: "",
          })),
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [strategyType]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        strategyType: detail.content.strategyType,
        entryDate,
        thesis: thesis || undefined,
        legs: detail.content.legs
          .map((template, i) => {
            const form = legs[i]!;
            if (template.optional && !form.symbol.trim()) return null;
            return {
              symbol: form.symbol.trim().toUpperCase(),
              vehicleType: template.vehicleType,
              side: template.side,
              quantity: Number(form.quantity),
              price: form.price ? Number(form.price) : undefined,
            };
          })
          .filter(Boolean),
      };
      const created = await api.createPlay(body);
      navigate(`/plays/${created.play.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create play");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!detail) return <div className="error">{error ?? "Not found"}</div>;

  const locked = detail.progress.status === "locked";
  const c = detail.content;

  return (
    <div className="stack">
      <section className="panel">
        <p className="muted">
          <Link to="/strategies">← Strategies</Link>
        </p>
        <h2>{c.strategyType}</h2>
        <span className={`badge ${detail.progress.status}`}>
          {detail.progress.status}
        </span>

        <h3>Description</h3>
        <p>{c.description}</p>
        <h3>Economic cleavage</h3>
        <p>{c.economicCleavage}</p>
        <h3>Benefits</h3>
        <ul>
          {c.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <h3>Risks</h3>
        <ul>
          {c.risks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <h3>When it&apos;s a good strategy</h3>
        <ul>
          {c.goodConditions.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <h3>Real-world examples</h3>
        <ul>
          {c.exampleSectorsOrCompanies.map((ex) => (
            <li key={ex}>{ex}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h3>Trade form</h3>
        {locked ? (
          <p className="muted">
            Complete{" "}
            <strong>{detail.previousStrategy ?? "the previous strategy"}</strong>{" "}
            first.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            {error && <div className="error">{error}</div>}
            <label htmlFor="entryDate">Entry date</label>
            <input
              id="entryDate"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
            <label htmlFor="thesis">Thesis (optional)</label>
            <textarea
              id="thesis"
              rows={3}
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
            />
            {c.legs.map((template, i) => (
              <div className="leg-block" key={`${template.label}-${i}`}>
                <strong>{template.label}</strong>
                {template.optional && (
                  <span className="muted"> (optional)</span>
                )}
                <label>Symbol</label>
                <input
                  value={legs[i]?.symbol ?? ""}
                  onChange={(e) => {
                    const next = [...legs];
                    next[i] = { ...next[i]!, symbol: e.target.value };
                    setLegs(next);
                  }}
                  placeholder="AAPL"
                  required={!template.optional}
                />
                <label>Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={legs[i]?.quantity ?? "1"}
                  onChange={(e) => {
                    const next = [...legs];
                    next[i] = { ...next[i]!, quantity: e.target.value };
                    setLegs(next);
                  }}
                  required={!template.optional}
                />
                <label>Price override (optional — blank uses live quote)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={legs[i]?.price ?? ""}
                  onChange={(e) => {
                    const next = [...legs];
                    next[i] = { ...next[i]!, price: e.target.value };
                    setLegs(next);
                  }}
                />
              </div>
            ))}
            <button type="submit" disabled={submitting}>
              {submitting ? "Placing…" : "Place play"}
            </button>
          </form>
        )}
      </section>

      <section className="panel">
        <h3>Past trades</h3>
        {detail.plays.length === 0 ? (
          <p className="muted">No plays yet for this strategy.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Entry</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {detail.plays.map((p) => (
                <tr key={p.id}>
                  <td>{p.entryDate}</td>
                  <td>{p.status}</td>
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
