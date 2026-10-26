#!/usr/bin/env node
// Reads scripts/results/verifier_seeded_eval.json, adds a computed `summary` block, prints it. No network, no keys.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "scripts", "results", "verifier_seeded_eval.json");
const data = JSON.parse(readFileSync(file, "utf8"));
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const count = (arr, fn) => arr.filter(fn).length;
const flat = (kind) => data.results.filter((c) => c.kind.startsWith(kind)).flatMap((c) => c.runs.map((r) => ({ ...r, caseId: c.id })));
const dist = (arr, key) => arr.reduce((o, r) => ((o[r[key] ?? "none"] = (o[r[key] ?? "none"] || 0) + 1), o), {});

const wrongHs = flat("seeded_wrong_hs");
const hazard = flat("seeded_missing_hazard");
const controls = flat("control");
const all = data.results.flatMap((c) => c.runs);
const run1 = (kind) => data.results.filter((c) => c.kind.startsWith(kind)).map((c) => c.runs[0]);

const summary = {
  calls: all.length,
  callsOk: count(all, (r) => r.ok && r.parsedJson),
  wrongHs: {
    cases: 3, runs: wrongHs.length,
    hsFieldContradicted: count(wrongHs, (r) => r.targetFieldVerdict === "contradicted"),
    overallContradicted: count(wrongHs, (r) => r.overallVerdict === "contradicted"),
    run1CasesCaught: count(run1("seeded_wrong_hs"), (r) => r.targetFieldVerdict === "contradicted")
  },
  missingHazard: {
    cases: 3, runs: hazard.length,
    prohibitedFieldNotSupported: count(hazard, (r) => r.targetFieldVerdict !== "supported" && r.targetFieldVerdict !== null),
    prohibitedFieldContradicted: count(hazard, (r) => r.targetFieldVerdict === "contradicted"),
    overallNotSupported: count(hazard, (r) => r.overallVerdict !== "supported"),
    prohibitedFieldVerdicts: dist(hazard, "targetFieldVerdict"),
    run1CasesNotSupported: count(run1("seeded_missing_hazard"), (r) => r.targetFieldVerdict !== "supported")
  },
  controls: {
    cases: 4, runs: controls.length,
    overallVerdicts: dist(controls, "overallVerdict"),
    overallContradicted: count(controls, (r) => r.overallVerdict === "contradicted"),
    overallNotSupported: count(controls, (r) => r.overallVerdict !== "supported"),
    run1OverallNotSupported: count(run1("control"), (r) => r.overallVerdict !== "supported"),
    run1OverallContradicted: count(run1("control"), (r) => r.overallVerdict === "contradicted"),
    hsControlsHsFieldVerdicts: dist(controls.filter((r) => r.caseId !== "C4-control-powerbank-flagged"), "targetFieldVerdict")
  },
  // can the verifier tell a missed hazard from an ordinary low-risk item on the prohibited check?
  prohibitedCheckOnUnflaggedItems: {
    note: "controls C1-C3 are ordinary low-risk items with no rule match; S4-S6 are hazardous items with no rule match",
    ordinaryItemsC1toC3: dist(
      data.results.filter((c) => /^C[123]/.test(c.id)).flatMap((c) => c.runs.map((r) => ({ v: r.checks.find((k) => /prohibit/i.test(k.field))?.verdict ?? "none" }))), "v"),
    hazardItemsS4toS6: dist(
      data.results.filter((c) => /^S[456]/.test(c.id)).flatMap((c) => c.runs.map((r) => ({ v: r.checks.find((k) => /prohibit/i.test(k.field))?.verdict ?? "none" }))), "v")
  },
  latencyMs: { min: Math.min(...all.map((r) => r.latencyMs)), median: median(all.map((r) => r.latencyMs)), max: Math.max(...all.map((r) => r.latencyMs)) },
  tokens: {
    avgPrompt: Math.round(all.reduce((s, r) => s + r.promptTokens, 0) / all.length),
    avgCompletion: Math.round(all.reduce((s, r) => s + r.completionTokens, 0) / all.length)
  },
  costUsd: { total: Number(all.reduce((s, r) => s + r.costUsd, 0).toFixed(4)), perCallAvg: Number((all.reduce((s, r) => s + r.costUsd, 0) / all.length).toFixed(5)) }
};
data.summary = summary;
writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
