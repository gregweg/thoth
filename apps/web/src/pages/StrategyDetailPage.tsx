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
            quantity: "",
            price: "",
          })),
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [strategyType]);

  useEffect(() => {
    if (loading) return;
    if (window.location.hash === "#trade") {
      document.getElementById("trade")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, strategyType]);

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
        <h2>{c.strategyType.replaceAll("_", " ")}</h2>
        <span className={`badge ${detail.progress.status}`}>
          {detail.progress.status}
        </span>
        {!locked && (
          <p style={{ marginTop: "0.75rem" }}>
            <a className="button" href="#trade">
              Jump to new play form
            </a>
          </p>
        )}
      </section>

      <section className="panel" id="trade">
        <h3>New play</h3>
        {locked ? (
          <p className="muted">
            Trading is locked until you complete{" "}
            <strong>
              {(detail.previousStrategy ?? "the previous strategy").replaceAll(
                "_",
                " ",
              )}
            </strong>
            . You can still read about this strategy below.
          </p>
        ) : (
          <>
            <p className="muted">
              This strategy fixes the <em>structure</em> (
              {c.legs.map((l) => l.label).join(" + ")}). You choose the symbol,
              quantity, date, and thesis.
            </p>
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
              <label htmlFor="thesis">Your thesis (optional)</label>
              <textarea
                id="thesis"
                rows={3}
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="Why this play?"
              />
              {c.legs.map((template, i) => (
                <div className="leg-block" key={`${template.label}-${i}`}>
                  <strong>{template.label}</strong>
                  <span className="muted">
                    {" "}
                    · side fixed as {template.side.replaceAll("_", " ")}
                    {template.optional ? " · optional" : ""}
                  </span>
                  <label htmlFor={`symbol-${i}`}>Symbol (you choose)</label>
                  <input
                    id={`symbol-${i}`}
                    value={legs[i]?.symbol ?? ""}
                    onChange={(e) => {
                      const next = [...legs];
                      next[i] = { ...next[i]!, symbol: e.target.value };
                      setLegs(next);
                    }}
                    placeholder="e.g. MSFT, SPY, …"
                    required={!template.optional}
                    autoComplete="off"
                  />
                  <label htmlFor={`qty-${i}`}>Quantity (shares)</label>
                  <input
                    id={`qty-${i}`}
                    type="number"
                    min="0"
                    step="any"
                    value={legs[i]?.quantity ?? ""}
                    onChange={(e) => {
                      const next = [...legs];
                      next[i] = { ...next[i]!, quantity: e.target.value };
                      setLegs(next);
                    }}
                    placeholder="e.g. 10"
                    required={!template.optional}
                  />
                  <label htmlFor={`price-${i}`}>
                    Fill price (optional — leave blank to use current quote)
                  </label>
                  <input
                    id={`price-${i}`}
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
                {submitting ? "Placing…" : "Place this play"}
              </button>
            </form>
          </>
        )}
      </section>

      <section className="panel">
        <h3>About this strategy</h3>
        <h4>Description</h4>
        <p>{c.description}</p>
        <h4>Economic cleavage</h4>
        <p>{c.economicCleavage}</p>
        <h4>Benefits</h4>
        <ul>
          {c.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <h4>Risks</h4>
        <ul>
          {c.risks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <h4>When it&apos;s a good strategy</h4>
        <ul>
          {c.goodConditions.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <h4>Real-world examples</h4>
        <ul>
          {c.exampleSectorsOrCompanies.map((ex) => (
            <li key={ex}>{ex}</li>
          ))}
        </ul>
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
                <th>Checkpoints</th>
                <th>P&amp;L</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {detail.plays.map((p) => {
                const checkpoints = [
                  p.hasEod ? "eod" : null,
                  p.hasFollowUp ? "follow_up" : null,
                ]
                  .filter(Boolean)
                  .join(", ");
                const pnl =
                  p.unrealizedPnl == null
                    ? "—"
                    : `${p.unrealizedPnl.toFixed(2)} (${(
                        (p.pctReturn ?? 0) * 100
                      ).toFixed(1)}%)`;
                return (
                  <tr key={p.id}>
                    <td>{p.entryDate}</td>
                    <td>{p.status}</td>
                    <td>{checkpoints || "entry only"}</td>
                    <td>{pnl}</td>
                    <td>
                      <Link to={`/plays/${p.id}`}>View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
