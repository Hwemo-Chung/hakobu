# Verifier evaluation on seeded errors (n = 10)

This is a small, honest measurement of one pipeline step: does the **Ultra verifier** flag errors that were deliberately seeded into synthetic generator outputs? It is **not** the accuracy of the whole pipeline, and it is not a benchmark.

## Method

- Script: `scripts/verifier_seeded_eval.mjs` (summary: `scripts/verifier_seeded_summary.mjs`). Raw results: `scripts/results/verifier_seeded_eval.json` (no keys).
- It builds 10 synthetic JP→KR parcel cases and sends each to the verifier with the same call the app makes in `app/api/plan/route.ts`: model `nvidia/Nemotron-3-Ultra-550b-a55b` on Nebius Token Factory, the same system prompt, user-message layout and JSON schema (copied verbatim), temperature 0.2, `max_tokens` 3000, `enable_thinking: false`, 25 s timeout.
- The Nano and Super steps are **not** run. The generator outputs (classified items, prohibited flags, HS candidates, formatted address) are hand-written, with one error seeded per error case.
- Verdict schema: `supported` / `uncertain` / `contradicted` per check. Overall verdict = the more severe of the declared verdict and the worst check, the same aggregation as the app.
- Each case was run **2 times** (20 calls in total). All 20 calls returned valid JSON.

### Cases

| Group | Cases (n) | What was seeded |
|---|---|---|
| Wrong HS candidate | 3 | ceramic teacup with T-shirt codes 6109.10/6109.90; sunscreen with 8517.13 (smartphones)/9503.00 (toys); cotton T-shirt with ceramic codes 6912.00/6911.10 |
| Missing hazard flag | 3 | item marked low risk with "No curated rule match": portable charger 10000mAh with a lithium polymer cell; acetone nail polish remover 200 ml (flammable liquid); dried anchovy snack 300 g (animal product) |
| Control (correct outputs) | 4 | ceramic teacup 6912.00/6911.10; sunscreen 3304.99/3304.91; cotton T-shirt 6109.10/6205.20; lithium power bank correctly flagged by the curated rule, HS 8507.60 |

## Results (as measured)

| Group | Cases / runs | Result |
|---|---|---|
| Wrong HS | 3 / 6 | HS check `contradicted` in **6/6** runs (3/3 cases in run 1). Overall verdict `contradicted` 6/6. |
| Missing hazard flag | 3 / 6 | Prohibited check `uncertain` in **6/6** runs; `contradicted` 0/6; `supported` 0/6. All three were surfaced for human review, none was called a contradiction. |
| Controls | 4 / 8 | Overall `contradicted` **0/8** (no false contradiction). Overall `uncertain` 7/8, `supported` 1/8. In run 1: 3 of 4 controls `uncertain`, 1 `supported`. |

Cost and latency over the 20 calls: latency min 1,138 ms, median 1,267 ms, max 1,657 ms; average 778 prompt and 216 completion tokens per call; $0.0285 total at list price (Ultra $1.00 in / $3.00 out per 1M tokens), about $0.0014 per call.

### Reading the result honestly

- **Wrong-HS detection is strong in this sample:** 6/6 runs contradicted, with no contradiction on the 8 control runs.
- **Hazard detection is weak.** The verifier answered `uncertain` on the prohibited check for all 6 hazard runs, but it also answered `uncertain` on 5 of 6 runs for ordinary low-risk items with no rule match (controls 1–3; 1 run `supported`). Most of its reasons read "No curated rule match; confirm with customs". So `uncertain` on a missed hazard is mostly its generic "no rule match, please confirm" behaviour, not evidence that it recognised the hazard. Only the acetone case names the risk ("acetone flammability not assessed"). On this check the verifier did not separate hazardous from ordinary items.
- The verifier is prompted to say `uncertain` when evidence is thin and never to approve, so most control runs (7/8) also go to human review. That is by design, and it means a high review rate.

## Limits

- Small n: 10 synthetic cases, 2 runs each. The repeated runs are not new cases; 3 wrong-HS cases and 3 hazard cases are too few for any rate or confidence interval.
- The cases and seeded errors were written by the author. The HS errors are blatant (an entirely wrong chapter); subtle errors were not tested. Hazard items were chosen so that the curated aliases miss them.
- The verifier sees generator outputs, not a real parcel. Address errors and the Nano and Super steps were not evaluated. Temperature is 0.2, so results can vary between runs.
- Not the accuracy of the whole pipeline. Hakobu's output is an estimate, not legal advice.

## Reproduce

```
set -a; source <env file containing NEBIUS_API_KEY>; set +a
node scripts/verifier_seeded_eval.mjs --runs 2
node scripts/verifier_seeded_summary.mjs
```

The key is read from the environment only. A full run costs a few cents.
