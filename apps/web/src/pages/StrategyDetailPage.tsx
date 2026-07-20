import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { StrategyType } from "@ill/shared";
import { api } from "../api";

interface LegFormState {
  symbol: string;
  quantity: string;
  price: string;
  strike: string;
  expiration: string;
  optionType: "call" | "put";
}

function defaultExpiration(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
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
          data.content.legs.map((template) => ({
            symbol: "",
            quantity: "",
            price: "",
            strike: "",
            expiration: defaultExpiration(),
            optionType: template.defaultOptionType ?? "call",
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

  function updateLeg(i: number, patch: Partial<LegFormState>) {
    setLegs((prev) => {
      const next = [...prev];
      next[i] = { ...next[i]!, ...patch };
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    try {
      const equitySymbol = detail.content.legs
        .map((t, i) =>
          t.vehicleType === "equity" ? legs[i]?.symbol.trim().toUpperCase() : "",
        )
        .find((s) => s);

      const body = {
        strategyType: detail.content.strategyType,
        entryDate,
        thesis: thesis || undefined,
        legs: detail.content.legs
          .map((template, i) => {
            const form = legs[i]!;
            if (template.optional && !form.symbol.trim() && !form.strike) {
              return null;
            }
            if (template.vehicleType === "option") {
              const underlying = (
                form.symbol.trim() ||
                equitySymbol ||
                ""
              ).toUpperCase();
              if (!underlying) {
                throw new Error("Option leg needs an underlying symbol");
              }
              return {
                symbol: underlying,
                underlyingSymbol: underlying,
                vehicleType: template.vehicleType,
                side: template.side,
                quantity: Number(form.quantity),
                price: form.price ? Number(form.price) : undefined,
                optionType: form.optionType,
                strike: Number(form.strike),
                expiration: form.expiration,
              };
            }
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
  const isCoveredCall = c.strategyType === "covered_call";

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
              {c.legs.map((l) => l.label).join(" + ")}). You choose the symbols,
              size, and thesis.
              {isCoveredCall && (
                <>
                  {" "}
                  Typical cover: <strong>100 shares</strong> per{" "}
                  <strong>1 short call</strong> contract. Option premiums are{" "}
                  <strong>synthetic</strong> (Black–Scholes from the live
                  underlying quote — not a live options chain).
                </>
              )}
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
              {c.legs.map((template, i) => {
                const isOption = template.vehicleType === "option";
                return (
                  <div className="leg-block" key={`${template.label}-${i}`}>
                    <strong>{template.label}</strong>
                    <span className="muted">
                      {" "}
                      · side fixed as {template.side.replaceAll("_", " ")}
                      {template.optional ? " · optional" : ""}
                      {isOption ? " · synthetic premium" : ""}
                    </span>

                    <label htmlFor={`symbol-${i}`}>
                      {isOption
                        ? "Underlying symbol"
                        : "Symbol (you choose)"}
                    </label>
                    <input
                      id={`symbol-${i}`}
                      value={legs[i]?.symbol ?? ""}
                      onChange={(e) => updateLeg(i, { symbol: e.target.value })}
                      placeholder={
                        isOption
                          ? "e.g. AAPL (same as share leg if filled)"
                          : "e.g. MSFT, SPY, …"
                      }
                      required={!template.optional && !isOption}
                      autoComplete="off"
                    />

                    {isOption && (
                      <>
                        <label htmlFor={`opt-${i}`}>Option type</label>
                        <select
                          id={`opt-${i}`}
                          value={legs[i]?.optionType ?? "call"}
                          onChange={(e) =>
                            updateLeg(i, {
                              optionType: e.target.value as "call" | "put",
                            })
                          }
                        >
                          <option value="call">Call</option>
                          <option value="put">Put</option>
                        </select>
                        <label htmlFor={`strike-${i}`}>Strike</label>
                        <input
                          id={`strike-${i}`}
                          type="number"
                          min="0"
                          step="any"
                          value={legs[i]?.strike ?? ""}
                          onChange={(e) =>
                            updateLeg(i, { strike: e.target.value })
                          }
                          placeholder="e.g. 330"
                          required
                        />
                        <label htmlFor={`exp-${i}`}>Expiration</label>
                        <input
                          id={`exp-${i}`}
                          type="date"
                          value={legs[i]?.expiration ?? ""}
                          onChange={(e) =>
                            updateLeg(i, { expiration: e.target.value })
                          }
                          required
                        />
                      </>
                    )}

                    <label htmlFor={`qty-${i}`}>
                      {isOption ? "Contracts" : "Quantity (shares)"}
                    </label>
                    <input
                      id={`qty-${i}`}
                      type="number"
                      min="0"
                      step="any"
                      value={legs[i]?.quantity ?? ""}
                      onChange={(e) =>
                        updateLeg(i, { quantity: e.target.value })
                      }
                      placeholder={isOption ? "e.g. 1" : "e.g. 100"}
                      required={!template.optional}
                    />
                    <label htmlFor={`price-${i}`}>
                      Fill price (optional — blank uses{" "}
                      {isOption ? "synthetic premium" : "live quote"})
                    </label>
                    <input
                      id={`price-${i}`}
                      type="number"
                      min="0"
                      step="any"
                      value={legs[i]?.price ?? ""}
                      onChange={(e) => updateLeg(i, { price: e.target.value })}
                    />
                  </div>
                );
              })}
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
