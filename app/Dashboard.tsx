"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import type {
  Direction,
  ItemInput,
  PlanResponse,
  RateQuote,
  RiskLevel,
  StepLog,
  Verdict
} from "@/lib/types";

const SAMPLE = {
  direction: "JP->KR" as Direction,
  itemsText:
    "Ceramic teacup (stoneware, glazed) | 24000\nAerosol sunscreen SPF50, 90g | 3800",
  weightKg: "1.2",
  address: "45 Teheran-ro, Gangnam-gu, Seoul 06132, Republic of Korea"
};

const JP = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0
});
const KRW = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0
});
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "LOW",
  needs_check: "NEEDS CHECK",
  high: "HIGH"
};

const VERDICT_LABEL: Record<Verdict, string> = {
  supported: "SUPPORTED",
  uncertain: "UNCERTAIN",
  contradicted: "CONTRADICTED"
};

interface DashboardProps {
  llmConfigured: boolean;
  ratesConfigured: boolean;
}

function parseItems(text: string): { items: ItemInput[] } | { error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return { error: "Add at least one item." };

  const items: ItemInput[] = [];
  for (const line of lines) {
    const separator = line.lastIndexOf("|");
    if (separator === -1) {
      return { error: "Use the format description | value in JPY, one item per line." };
    }

    const description = line.slice(0, separator).trim();
    const valueText = line
      .slice(separator + 1)
      .replace(/[,\s¥円]/g, "")
      .trim();
    const valueJpy = Number(valueText);

    if (!description) return { error: "Every item needs a description." };
    if (!Number.isFinite(valueJpy) || valueJpy < 0) {
      return { error: "Every item needs a non-negative value in JPY." };
    }

    items.push({ description, valueJpy: Math.round(valueJpy) });
  }

  return { items };
}

function isPlanResponse(value: unknown): value is PlanResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PlanResponse>;
  return (
    Array.isArray(candidate.steps) &&
    Array.isArray(candidate.rates) &&
    Array.isArray(candidate.prohibited) &&
    typeof candidate.direction === "string" &&
    Boolean(candidate.meta)
  );
}

function shortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function modeBadge(mode: "live" | "mock") {
  return <span className={`badge ${mode}`}>{mode === "live" ? "LIVE" : "MOCK"}</span>;
}

function EnvPill({ name, configured }: { name: string; configured: boolean }) {
  return (
    <span className={`env-pill ${configured ? "on" : "off"}`}>
      <span className="dot" aria-hidden="true" />
      {name}: {configured ? "LIVE" : "MOCK"}
    </span>
  );
}

function ResultContent({ result }: { result: PlanResponse }) {
  const cheapest = result.rates[0];
  const tableRate = result.rates.find((rate) => rate.basis === "table");
  const hasLive = result.rates.some((rate) => rate.basis === "live");
  const hasMock = result.rates.some((rate) => rate.basis === "mock");
  const totalLatency = result.steps.reduce((total, step) => total + step.latencyMs, 0);
  const destination = result.direction === "JP->KR" ? "Korea" : "Japan";
  const etaText =
    result.eta.minDays > 0 ? `${result.eta.minDays}–${result.eta.maxDays} days` : "—";

  return (
    <div className="result-enter">
      <div className="results-head">
        <div>
          <p className="step-label">Plan / {result.direction.replace("->", " → ")}</p>
          <h2>
            {result.items.length} item{result.items.length === 1 ? "" : "s"},{" "}
            {result.weightKg} kg
          </h2>
          <p className="results-sub">
            Destination {destination} · generated {shortTime(result.meta.generatedAt)}
          </p>
        </div>
        <div className="result-tags">
          <span className={`badge ${result.meta.mock ? "mock" : "live"}`}>
            {result.meta.mock ? "MOCK" : "LIVE"}
          </span>
          <span className={`badge ${result.verification.verdict}`}>
            VERIFIER {VERDICT_LABEL[result.verification.verdict]}
          </span>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-item">
          <span>Declared value</span>
          <strong>{JP.format(result.duty.declaredValueJpy)}</strong>
          <small>{KRW.format(result.duty.declaredValueKrw)}</small>
        </div>
        <div className="summary-item">
          <span>Duty + tax estimate</span>
          <strong>{JP.format(result.duty.totalJpy)}</strong>
          <small>Estimate, not a quote</small>
        </div>
        <div className="summary-item">
          <span>Cheapest listed</span>
          <strong>{cheapest ? JP.format(cheapest.priceJpy) : "—"}</strong>
          <small>{cheapest ? `${cheapest.carrier} ${cheapest.service}` : "No rates"}</small>
        </div>
        <div className="summary-item">
          <span>ETA range</span>
          <strong>{etaText}</strong>
          <small>Customs delays not modeled</small>
        </div>
      </div>

      <div className="card-grid">
        <section className="panel card">
          <div className="card-head">
            <div>
              <p className="step-label">02 / Compliance</p>
              <h3>Prohibited check</h3>
            </div>
            <span className="badge neutral">RULE SNAPSHOT</span>
          </div>
          <p className="card-intro">
            Three-state review flags. Nothing is auto-rejected; the sender confirms every item.
          </p>
          <div className="flag-list">
            {result.prohibited.map((flag, index) => (
              <article className={`flag ${flag.level}`} key={`${flag.description}-${index}`}>
                <div className="flag-top">
                  <span className={`badge ${flag.level}`}>{RISK_LABEL[flag.level]}</span>
                  <span className="flag-basis">{flag.basis === "rule" ? "RULE" : "AI FLAG"}</span>
                </div>
                <strong className="flag-title">{flag.description}</strong>
                <p className="flag-label">{flag.label}</p>
                <p>{flag.reason}</p>
                <a href={flag.sourceUrl} target="_blank" rel="noreferrer">
                  Official source ↗
                </a>
              </article>
            ))}
          </div>
          <p className="fineprint">{result.classification.notes}</p>
        </section>

        <section className="panel card">
          <div className="card-head">
            <div>
              <p className="step-label">03 / Classify</p>
              <h3>HS code candidates</h3>
            </div>
            <span className="badge neutral">AI HINT</span>
          </div>
          <p className="card-intro">
            Candidate headings, not a binding classification. The sender confirms the final code.
          </p>
          <div className="hs-list">
            {result.hsCandidates.map((candidate, index) => (
              <article className="hs-row" key={`${candidate.item}-${candidate.code}-${index}`}>
                <div className="hs-code">{candidate.code}</div>
                <div className="hs-body">
                  <strong>{candidate.item}</strong>
                  <p className="hs-desc">{candidate.description}</p>
                  <p className="hs-rationale">{candidate.rationale}</p>
                </div>
                <span className="badge neutral">{candidate.confidence}</span>
              </article>
            ))}
          </div>
          <p className="fineprint">{result.hsNotes}</p>
        </section>
      </div>

      <section className="panel card">
        <div className="card-head">
          <div>
            <p className="step-label">04 / Verify</p>
            <h3>Verifier checks</h3>
          </div>
          <span className={`badge ${result.verification.verdict}`}>
            {VERDICT_LABEL[result.verification.verdict]}
          </span>
        </div>
        <p className="card-intro">{result.verification.summary}</p>
        <div className="check-grid">
          {result.verification.checks.map((check, index) => (
            <article className="check" key={`${check.field}-${index}`}>
              <div className="check-top">
                <strong>{check.field.replace(/_/g, " ")}</strong>
                <span className={`badge ${check.verdict}`}>{VERDICT_LABEL[check.verdict]}</span>
              </div>
              <p>{check.reason}</p>
              <p className="human-action">
                <span>Human action</span> {check.humanAction}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="card-grid">
        <section className="panel card">
          <div className="card-head">
            <div>
              <p className="step-label">05 / Estimate</p>
              <h3>Duty &amp; tax estimate</h3>
            </div>
            <span className="badge neutral">ESTIMATE</span>
          </div>
          <div className="duty-total">
            <div>
              <span>Estimated duty + tax</span>
              <strong>{JP.format(result.duty.totalJpy)}</strong>
            </div>
            <span className="duty-krw">{KRW.format(result.duty.totalKrw)}</span>
          </div>
          <div className="kv-grid">
            <div>
              <span>Declared value</span>
              <strong>{JP.format(result.duty.declaredValueJpy)}</strong>
            </div>
            <div>
              <span>Declared in USD</span>
              <strong>{USD.format(result.duty.declaredValueUsd)}</strong>
            </div>
            <div>
              <span>Duty ({result.duty.dutyRatePercent}%)</span>
              <strong>{JP.format(result.duty.dutyJpy)}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{JP.format(result.duty.taxJpy)}</strong>
            </div>
          </div>
          <p className="threshold-line">
            <span className={`badge ${result.duty.threshold.applied ? "low" : "needs_check"}`}>
              {result.duty.threshold.applied ? "UNDER THRESHOLD" : "ABOVE THRESHOLD"}
            </span>
            {result.duty.threshold.label}
          </p>
          <ul className="assumptions">
            {result.duty.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
          <div className="source-row">
            <a href={result.duty.sourceUrl} target="_blank" rel="noreferrer">
              Official duty reference ↗
            </a>
            <span className="fineprint">{result.duty.disclaimer}</span>
          </div>
        </section>

        <section className="panel card">
          <div className="card-head">
            <div>
              <p className="step-label">06 / Format</p>
              <h3>Address translation</h3>
            </div>
            <span className="badge neutral">AI FORMATTED</span>
          </div>
          <p className="card-intro">
            Original and destination format side by side. Recipient names and phone numbers are not
            requested.
          </p>
          <div className="address-pair">
            <div className="address-box">
              <span className="mini-label">Original</span>
              <pre className="address-text">{result.addressTranslation.original}</pre>
            </div>
            <div className="address-box destination">
              <span className="mini-label">Formatted / {destination}</span>
              <pre className="address-text">{result.addressTranslation.formatted}</pre>
            </div>
          </div>
          <div className="romanized">
            <span className="mini-label">Romanized</span>
            <p>{result.addressTranslation.romanized}</p>
          </div>
          <p className="fineprint">{result.addressTranslation.notes}</p>
          <p className="fineprint">
            Formatting is a hint. Confirm field by field; deliverability is not validated.
          </p>
        </section>
      </div>

      <section className="panel card">
        <div className="rate-head">
          <div>
            <p className="step-label">07 / Compare</p>
            <h3>Rate comparison</h3>
            <p className="card-intro">
              Normalized to JPY and KRW, sorted by JPY equivalent. Every row shows its basis.
            </p>
          </div>
          <div className="eta-block">
            <span>ETA range</span>
            <strong>{etaText}</strong>
            <p>{result.eta.note}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="rate-table">
            <caption className="sr-only">
              Carrier and postal rates sorted by JPY equivalent, with provenance badges
            </caption>
            <thead>
              <tr>
                <th>Basis</th>
                <th>Service</th>
                <th>Price</th>
                <th>ETA</th>
                <th>Provenance</th>
              </tr>
            </thead>
            <tbody>
              {result.rates.map((rate: RateQuote, index: number) => (
                <tr key={`${rate.id}-${index}`}>
                  <td>
                    <span className={`badge ${rate.basis}`}>{rate.basis.toUpperCase()}</span>
                  </td>
                  <td>
                    <strong className="service-name">{rate.carrier}</strong>
                    <span className="service-detail">{rate.service}</span>
                  </td>
                  <td className="price-cell">
                    <strong>{JP.format(rate.priceJpy)}</strong>
                    <span>{KRW.format(rate.priceKrw)}</span>
                    {rate.currency !== "JPY" && (
                      <small>
                        {rate.currency} {rate.priceOriginal.toFixed(2)}
                      </small>
                    )}
                  </td>
                  <td>{rate.etaDays ? `${rate.etaDays.min}–${rate.etaDays.max} d` : "—"}</td>
                  <td className="provenance-cell">
                    <span className="source-name">{rate.source}</span>
                    {rate.basis === "table" ? (
                      <span className="warn">
                        Effective {rate.effectiveFrom} · verified: {String(rate.verified)}
                      </span>
                    ) : rate.basis === "live" ? (
                      <span>EasyPost test mode · {shortTime(rate.fetchedAt)}</span>
                    ) : (
                      <span className="warn">Deterministic mock · not a quote</span>
                    )}
                    <a href={rate.sourceUrl} target="_blank" rel="noreferrer">
                      Source ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="provenance-notes">
          {tableRate && (
            <p>
              <span className="badge table">TABLE</span>
              {tableRate.note} Values are samples and must be verified ({tableRate.sourceUrl}).
            </p>
          )}
          {hasLive && (
            <p>
              <span className="badge live">LIVE</span>
              Courier rows are EasyPost test-mode API responses, not purchasable quotes.
            </p>
          )}
          {hasMock && (
            <p>
              <span className="badge mock">MOCK</span>
              Mock carrier rates are deterministic demo values, not quotes or offers.
            </p>
          )}
        </div>

        <div className="fx-row">
          <span className={`badge ${result.fx.basis}`}>
            {result.fx.basis === "live" ? "LIVE" : "FALLBACK"}
          </span>
          <span>
            FX {result.fx.date}: JPY→KRW {result.fx.rates.KRW.toFixed(2)} · JPY→USD{" "}
            {result.fx.rates.USD.toFixed(4)}
          </span>
          <a href={result.fx.sourceUrl} target="_blank" rel="noreferrer">
            {result.fx.source} ↗
          </a>
          {result.fx.note && <span className="warn">{result.fx.note}</span>}
        </div>
      </section>

      <section className="panel card">
        <div className="card-head">
          <div>
            <p className="step-label">08 / Routing</p>
            <h3>Model / step panel</h3>
          </div>
          <span className={`badge ${result.meta.mock ? "mock" : "live"}`}>
            {result.meta.mock ? "MOCK" : "LIVE"}
          </span>
        </div>
        <p className="card-intro">
          Every generative step is logged with its model, mode, and latency. Mock responses are
          deterministic and always labeled.
        </p>
        <div className="table-wrap">
          <table className="step-table">
            <caption className="sr-only">Model routing log for each plan step</caption>
            <thead>
              <tr>
                <th>Step</th>
                <th>Model</th>
                <th>Mode</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {result.steps.map((step: StepLog) => (
                <tr key={step.step}>
                  <td>
                    <strong>{step.label}</strong>
                    <span className="step-key">{step.step}</span>
                    {step.note && <span className="step-note">{step.note}</span>}
                  </td>
                  <td className="model-name">{step.model}</td>
                  <td>{modeBadge(step.mode)}</td>
                  <td className="latency">{step.latencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fineprint">
          Total model time {totalLatency.toLocaleString()} ms across {result.steps.length} steps.
          Nano classifies and formats, Super proposes HS candidates, Ultra verifies. No provider
          fallback beyond the labeled mock path.
        </p>
      </section>
    </div>
  );
}

export default function Dashboard({ llmConfigured, ratesConfigured }: DashboardProps) {
  const [direction, setDirection] = useState<Direction>(SAMPLE.direction);
  const [itemsText, setItemsText] = useState(SAMPLE.itemsText);
  const [weightKg, setWeightKg] = useState(SAMPLE.weightKg);
  const [address, setAddress] = useState(SAMPLE.address);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const itemsPreview = parseItems(itemsText);
  const declaredPreview =
    "items" in itemsPreview
      ? itemsPreview.items.reduce((total, item) => total + item.valueJpy, 0)
      : null;

  const missing = [
    !llmConfigured ? "Nebius Token Factory" : null,
    !ratesConfigured ? "EasyPost" : null
  ].filter((name): name is string => Boolean(name));

  function loadSample() {
    setDirection(SAMPLE.direction);
    setItemsText(SAMPLE.itemsText);
    setWeightKg(SAMPLE.weightKg);
    setAddress(SAMPLE.address);
    setResult(null);
    setError("");
  }

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsed = parseItems(itemsText);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }

    const weight = Number(weightKg);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 30) {
      setError("Weight must be greater than 0 and at most 30 kg.");
      return;
    }
    if (address.trim().length < 5) {
      setError("Add a destination address.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          items: parsed.items,
          weightKg: weight,
          address: address.trim()
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | PlanResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload && "error" in payload && payload.error
            ? payload.error
            : `Request failed (${response.status}).`;
        throw new Error(message);
      }
      if (!isPlanResponse(payload)) {
        throw new Error("Unexpected response from the plan endpoint.");
      }

      setResult(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not build the plan. Check the server logs."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="mark" aria-hidden="true">
            箱
          </div>
          <div>
            <p className="eyebrow">Korea ↔ Japan parcels</p>
            <h1>Hakobu</h1>
          </div>
        </div>
        <div className="status-cluster" aria-label="Integration status">
          <EnvPill name="Nebius" configured={llmConfigured} />
          <EnvPill name="EasyPost" configured={ratesConfigured} />
          <span className="corridor-pill">KR ↔ JP</span>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">Cross-border parcel preparation</p>
          <h2>A reviewable plan before you seal the box.</h2>
          <p>
            Compliance flags, HS hints, a duty estimate, a destination address, and carrier rates
            on one screen. Nothing is purchased, filed, or submitted.
          </p>
        </div>
        <div className="legend" aria-label="Provenance legend">
          <div>
            <span className="badge live">LIVE</span>
            <span>API response</span>
          </div>
          <div>
            <span className="badge mock">MOCK</span>
            <span>Deterministic demo</span>
          </div>
          <div>
            <span className="badge table">TABLE</span>
            <span>Official table sample</span>
          </div>
        </div>
      </section>

      {missing.length > 0 && (
        <div className="mock-banner" role="status">
          <span className="badge mock">MOCK</span>
          <p>
            <strong>Demo mode.</strong> {missing.join(" and ")}{" "}
            {missing.length === 1 ? "is" : "are"} not configured. AI and courier fallbacks are
            deterministic and labeled MOCK. Postal rows are table values, never live quotes.
          </p>
        </div>
      )}

      <div className="workspace">
        <aside className="panel form-panel">
          <div className="form-heading">
            <p className="step-label">01 / Parcel</p>
            <h2>Describe the shipment</h2>
            <p>Two directions, one corridor. Sample data is synthetic.</p>
          </div>

          <form onSubmit={submitPlan}>
            <div className="field">
              <span className="field-label">Direction</span>
              <div className="direction-toggle" role="group" aria-label="Shipment direction">
                <button
                  type="button"
                  aria-pressed={direction === "KR->JP"}
                  onClick={() => setDirection("KR->JP")}
                >
                  KR → JP
                </button>
                <button
                  type="button"
                  aria-pressed={direction === "JP->KR"}
                  onClick={() => setDirection("JP->KR")}
                >
                  JP → KR
                </button>
              </div>
              <p className="field-hint">
                {direction === "KR->JP"
                  ? "Origin Korea · destination Japan"
                  : "Origin Japan · destination Korea"}
              </p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="items">
                Items and declared value <span>JPY</span>
              </label>
              <textarea
                id="items"
                className="items-input"
                value={itemsText}
                onChange={(event) => setItemsText(event.target.value)}
                rows={4}
                spellCheck={false}
                required
              />
              <p className="field-hint">One item per line: description | value. Example above.</p>
            </div>

            <div className="field split-field">
              <div>
                <label className="field-label" htmlFor="weight">
                  Weight <span>kg</span>
                </label>
                <input
                  id="weight"
                  type="number"
                  min="0.1"
                  max="30"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  required
                />
              </div>
              <div className="value-note">
                <span className="mini-label">Declared total</span>
                <strong>{declaredPreview === null ? "—" : JP.format(declaredPreview)}</strong>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="address">
                Destination address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={3}
                required
              />
              <p className="field-hint">Do not enter a real name or phone number.</p>
            </div>

            <div className="actions">
              <button className="primary" type="submit" disabled={loading}>
                {loading ? "Building plan…" : "Build plan"}
              </button>
              <button className="secondary" type="button" onClick={loadSample} disabled={loading}>
                Load sample shipment
              </button>
            </div>
          </form>

          <div className="form-note">
            <span className="dot-accent" aria-hidden="true" />
            <p>
              Preparation only. Hakobu does not take payment, buy postage, file customs, or track a
              parcel.
            </p>
          </div>
        </aside>

        <section className="results" aria-live="polite">
          {error && (
            <div className="error-banner" role="alert">
              <strong>Plan not built.</strong> {error}
            </div>
          )}

          {loading ? (
            <div className="panel loading-panel">
              <span className="spinner" aria-hidden="true" />
              <div>
                <h3>Building the plan</h3>
                <p>Nano classify → Super HS → Nano address → Ultra verify</p>
                <p className="fineprint">
                  Live calls can take a few seconds. Missing keys fall back to labeled mock data.
                </p>
              </div>
            </div>
          ) : result ? (
            <ResultContent result={result} />
          ) : (
            <div className="panel empty-state">
              <div className="empty-content">
                <div className="empty-mark" aria-hidden="true">
                  箱
                </div>
                <p className="step-label">One screen / one plan</p>
                <h2>Your parcel plan appears here.</h2>
                <p>
                  Start with the synthetic teacup and aerosol sample, or enter your own items. The
                  plan stays in this browser session and is never stored.
                </p>
                <ul className="empty-list">
                  <li>Prohibited and quarantine flags with official sources</li>
                  <li>HS candidates and a separate verifier pass</li>
                  <li>Duty estimate with visible assumptions</li>
                  <li>Address diff and a live / mock / table rate comparison</li>
                </ul>
                <button className="secondary sample-cta" type="button" onClick={loadSample}>
                  Load sample shipment
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="footer">
        <div>
          <strong>Hakobu</strong>
          <p>Preparation layer for Korea ↔ Japan parcels. No payment, postage, filing, or tracking.</p>
        </div>
        <p className="disclaimer">Estimates, not legal advice.</p>
      </footer>
    </main>
  );
}
