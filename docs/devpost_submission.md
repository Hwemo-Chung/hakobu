# Hakobu — one screen for Korea–Japan parcels

**Track:** Best Apps & Agents  
**Tagline:** Prohibited-item checks, HS candidates, duty estimates, address formatting, and carrier rates in one flow — with NVIDIA Nemotron models on Nebius Token Factory proposing, verifying, and flagging uncertainty for a human to confirm.

> **Runtime disclosure:** Every generative AI call in Hakobu goes to **Nebius Token Factory** through its OpenAI-compatible API (`https://api.tokenfactory.nebius.com/v1/`, key in `NEBIUS_API_KEY`). The models are **NVIDIA Nemotron 3 Nano, Nemotron 3 Super, and Nemotron 3 Ultra**. No other inference provider is on the critical path. EasyPost, the Japan Post / Korea Post EMS table, and frankfurter.app are data sources, not models. If a key is absent or an API call fails, the affected step returns deterministic data with a visible **MOCK** label.

---

## Inspiration

I live in Tokyo and send parcels to family in Korea. The box is usually small — tea, a mug, a birthday present, sometimes sunscreen — but the questions around it are bigger than the box.

Can I send this? Does it need a quarantine check? Which HS code applies? What will my family pay at the door? Which service is actually cheaper once weight, size, and arrival date are on the table? And how do I write a Korean address in a form a Japanese carrier can print?

I have answered those questions in three browser tabs, a notes app, and a calculator more times than I want to admit. Each source is good at one thing. None of them gives me a single reviewable plan.

That is the gap Hakobu fills. It is not a shipping chatbot and it is not a customs broker. It is the one screen I wanted: it prepares the shipment, shows its sources, marks what it does not know, and stops for a human decision.

The audience is not abstract. Japan counted 4.28 million foreign residents at the end of June 2026 (Immigration Services Agency of Japan). Many of us send care packages, documents, and gifts across a border and learn the paperwork by trial and error. The same problem faces small sellers who ship a few parcels a week and cannot afford a full logistics back office.

Hakobu starts with Korea ↔ Japan because that is the corridor I know personally. The architecture is deliberately corridor-agnostic: rule packs, rate adapters, and model prompts are separate layers, so adding another country is a data and adapter problem rather than a rewrite.

---

## What it does

Hakobu is a one-screen cross-border parcel dashboard. You enter the contents, weight, and destination address, and Hakobu turns that into a reviewable shipment plan: prohibited/quarantine flags, HS code candidates, a duty and tax estimate, a formatted address, and a side-by-side carrier comparison with ETA.

Nothing is shipped, paid for, or filed by the app. Hakobu prepares the decision and shows its work.

The demo runs **Japan → Korea**: a small parcel from Tokyo to Seoul containing a ceramic teacup and an aerosol sunscreen.

### The flow, step by step

1. **Describe the parcel.** The user enters one item per line as `description | value` in JPY, a weight, and a destination address. The route handler validates the request. Nemotron 3 Nano classifies each item into a category and a three-state risk level and returns structured JSON. If the response is not valid JSON, the app falls back to a deterministic mock payload and labels the step MOCK.

2. **Check prohibited and quarantine risk.** A curated rule pack (`data/prohibited.json`) produces three states: low risk, needs a check, or high risk. Every flag carries a reason and an official source link. The app never auto-rejects an item and never says "approved to ship."

3. **Get HS code candidates.** Nemotron 3 Super proposes candidate headings with plain-language descriptions, a rationale, and a confidence level. Nemotron 3 Ultra then verifies the plan fields against the supplied evidence, including the HS candidates. The UI shows *supported*, *uncertain*, or *contradicted* with a reason and a human action. The sender remains responsible for the final code; the app calls them candidates, not conclusions.

4. **Estimate duty and tax.** A small rules module (`lib/duty.ts`) produces an estimate using the destination, declared value, FX rate, and a duty rate derived from the first HS candidate. The card shows the assumptions, the threshold applied, the FX date, and a link to the official source. It is labeled **estimate**, not a quote and not legal advice.

5. **Format the address.** Nemotron 3 Nano converts the address into the destination format and supplies a romanized line. The original and converted addresses sit side by side. The app does not validate deliverability and does not submit anything. Recipient names and phone numbers are never collected.

6. **Compare rates and ETA.** Courier rates and ETA come from the EasyPost test API and carry a **LIVE** badge with a timestamp, or a **MOCK** badge when no key is configured. One EMS postal row comes from `data/jp_post_rates.json` — Japan Post for JP → KR, Korea Post for KR → JP — and carries a **TABLE** badge with its effective date and `verified: false`. FX comes from frankfurter.app and is labeled **LIVE** or **FALLBACK**. The comparison normalizes prices to JPY and KRW and sorts by JPY equivalent, with an ETA range. No rate is purchasable from Hakobu.

7. **Review the plan.** The `08 / Routing` model/step panel shows the model, mode, and latency for each of the four model calls. Verifier verdicts sit next to the fields they checked. The plan stays in the browser session; the app does not store, submit, or export it.

### What Hakobu deliberately does not do

- It does not take payment or buy a label.
- It does not file a customs declaration.
- It does not auto-reject an item or declare it admissible.
- It does not present an HS candidate as a final, binding classification.
- It does not call a table-based postal rate "real-time."
- It does not give legal, tax, or customs advice.
- It does not store parcel data in a database.

Those are product decisions, not missing features. The value is in preparing a better decision, not in pretending the decision is automatic.

## How we built it

### Stack and shape

Hakobu is a single Next.js 14.2.15 App Router application in TypeScript with plain CSS. The only runtime dependencies are `next`, `react`, and `react-dom`. Server-side route handlers own every key and every model call. The browser never sees `NEBIUS_API_KEY` or `EASYPOST_API_KEY`.

The app has no database. A shipment plan is computed server-side, returned to the client, and held in React state for the session. That keeps the demo small and makes the trust boundary simple: the client displays what the server calculated, and the server never trusts a client-supplied price.

The stack is intentionally boring: one language, one deployable, a typed response shape, and a small set of adapters. The interesting part is the model step runner and the verifier loop.

### All model calls go to Nebius Token Factory

The AI client is an OpenAI-compatible client pointed at:

```text
base_url = https://api.tokenfactory.nebius.com/v1/
api_key  = process.env.NEBIUS_API_KEY
```

There is no fallback to another inference provider. If Token Factory is unavailable, the app reports a degraded state; it does not silently switch vendors.

The step runner is a small server-side function in `app/api/plan/route.ts`: it chooses a model role per step, calls `lib/llm.ts`, parses the JSON response, and falls back to a deterministic mock payload if the call fails or the JSON is invalid. Model IDs live in environment overrides, not in prompts, so a model can be swapped without editing the workflow.

### Model routing

| Step | NVIDIA model | Token Factory model ID | Why this tier | Context | Published list price (USD / 1M tokens, in / out) | Catalog region |
|---|---|---|---|---|---|---|
| Classify items | Nemotron 3 Nano 30B-A3B | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Bounded classification task; low-cost tier; keeps the expensive model out of the hot path | 262K | 0.06 / 0.24 | eu-north1 |
| HS code candidates | Nemotron 3 Super 120B-A12B | `nvidia/nemotron-3-super-120b-a12b` | More reasoning for taxonomy, rationale, and multilingual product descriptions | 256K | 0.30 / 0.90 | us-central1 |
| Address formatting | Nemotron 3 Nano 30B-A3B | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Locale formatting is a bounded instruction-following task; the low-cost tier is sufficient | 262K | 0.06 / 0.24 | eu-north1 |
| Verifier / critic | Nemotron 3 Ultra 550B-A55B | `nvidia/Nemotron-3-Ultra-550b-a55b` | Largest model in the family; reasoning-heavy verification; checks Nano and Super outputs, cites missing evidence, flags uncertainty | 1,024K | 1.00 / 3.00 | us-central1 |

Prices are from the Nebius Token Factory public model catalog as of October 2026. They can change. This build does not compute or display cost; the step panel shows model, mode, and latency only. Cost per shipment: [TBD - measure]. No vision model and no fallback model are wired in this build.

The routing logic is simple on purpose:

- **Nano** handles item classification and address formatting because both are bounded, format-constrained tasks with a narrow output shape. Paying Ultra prices for "turn this sentence into JSON" or "reorder this address" would be waste.
- **Super** handles HS candidates because that needs reasoning over ambiguous product text, but it does not need the largest model on every call.
- **Ultra** is a verifier, not a generator. It receives the item list, the Nano/Super outputs, the rule sources, and the output schema. Its job is to find unsupported claims, not to invent a better answer.

### The verification contract

The verifier is the part of Hakobu I care most about. A single "confidence" number is not enough for a compliance-adjacent workflow, so Ultra returns a verdict per field:

```json
{
  "field": "hs_candidates",
  "verdict": "uncertain",
  "reason": "The item description does not identify the ceramic body or glaze; two headings remain plausible.",
  "humanAction": "Confirm the material and intended use with the sender."
}
```

The verdict values are `supported`, `uncertain`, and `contradicted`. The UI renders them as badges in the `04 / Verify` section, with the reason and a **Human action** line.

Three rules make the verifier useful rather than decorative:

1. **It cannot add new facts.** The prompt forbids introducing a code, a rate, or a rule that is not in the supplied evidence. If the evidence is insufficient, the only correct answer is `uncertain`.
2. **It does not overwrite the generator.** When Ultra contradicts Super, both outputs stay visible. The user sees what changed and why. Silent replacement would hide the most important signal in the pipeline.
3. **It has a visible fallback.** If Ultra times out or returns invalid JSON, the verifier step falls back to its deterministic mock checks and is logged as `mode: "mock"`. The app never presents a mock check as a live one.

The app does not confirm or submit anything. The final HS code, address, and shipping decision remain with the sender.

### Data, provenance, and the live/table distinction

Every number in the UI has a source and a basis label.

| Output | Source | Basis label | What the user sees |
|---|---|---|---|
| Prohibited / quarantine flag | Curated rule pack plus official links | `rule` or `AI FLAG` | Flag, reason, source link |
| HS candidates | Nemotron 3 Super plus Nemotron 3 Ultra verification | `AI HINT` | Candidate codes, rationale, confidence, verifier checks |
| Duty / tax | Rules module plus FX | `ESTIMATE` | Amount, assumptions, threshold, official link |
| Address | Nemotron 3 Nano | `AI FORMATTED` | Original vs formatted, romanized line |
| Courier rate / ETA | EasyPost test API | `LIVE` or `MOCK` | Price, ETA, timestamp, "test rate" |
| Postal rate / ETA | Japan Post / Korea Post EMS table | `TABLE` | Price, ETA, effective date, `verified: false` |
| FX | frankfurter.app | `LIVE` or `FALLBACK` | Rate and date |

Rate adapters share one return shape:

```ts
type RateQuote = {
  id: string;
  carrier: string;
  service: string;
  priceJpy: number;
  priceKrw: number;
  priceOriginal: number;
  currency: string;
  etaDays: { min: number; max: number } | null;
  basis: "live" | "mock" | "table";
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  effectiveFrom?: string;
  verified?: boolean;
  note?: string;
};
```

That shape is why the comparison can be honest. The UI does not have a generic "real-time" badge; it renders `basis` and the relevant date. A postal table quote, an EasyPost test quote, and a deterministic mock can sit in the same list without pretending to be the same kind of number.

The duty estimate is deliberately conservative. It applies a small set of published rules and thresholds in `lib/duty.ts`, shows the assumptions, and links to the official source. It does not attempt to model preferential rates, anti-dumping duties, excise, or consignment-specific exceptions. The card says so.

### Reliability, cost, and privacy

- **Response validation.** Every model response is parsed as JSON in `app/api/plan/route.ts`. If parsing fails, the step uses its deterministic mock payload and is logged with a note. There is no repair retry and no schema-validation library.
- **Timeouts and fallback.** Model calls time out after 25 seconds, EasyPost after 15 seconds, and FX after 10 seconds. A failed call never produces a silent empty field; the affected step or row is labeled MOCK (or FALLBACK for FX).
- **Budget controls.** This build has no per-IP rate limit and no daily model-spend cap. Limits: [TBD].
- **Mock fallback.** If `NEBIUS_API_KEY` or `EASYPOST_API_KEY` is absent, or a live call fails, the app returns deterministic data with a visible MOCK label. There is no separate recorded-run mode and no switch to another provider.
- **Privacy.** API keys are server-only. Recipient names and phone numbers are never collected. There is no database and no parcel history. Address text is sent to Token Factory for formatting; the UI says so.
- **Prompt injection.** Item descriptions and address text are treated as untrusted data, not instructions. The system prompt separates evidence from instructions.
- **No client trust.** Rates and duty are recomputed on the server. The client cannot submit a price and have it accepted.

### Evaluation

I am building a small synthetic evaluation set of parcels with known item lists, destination rules, and human-labeled HS references. The metrics are:

- classification field accuracy (category, risk level, risk signals),
- prohibited/quarantine flag recall, counting "needs check" as a flag rather than a miss,
- HS top-3 recall against a human-labeled reference,
- address field accuracy after formatting,
- verifier calibration (does `uncertain` correlate with wrong or incomplete generator output?),
- p50/p95 latency per step,
- cost per shipment from actual token usage.

Results: **[TBD - fill after build]**. I will not put a number in this submission that I cannot reproduce from the repository and the evaluation script. The eval harness and the raw outputs will be published with the code.

## Challenges

**Uncertainty is the product, not an error state.** The easy version of this app is a chatbot that says "probably fine." The useful version says: "This aerosol needs a carrier check, here is the current page, and I will not clear it for you." Designing for three states — low risk, needs a check, high risk — is harder than designing for yes/no. Every flag needs a reason and a source, and "unknown" needs a next action. The UI has to make uncertainty legible without making the user give up.

**Three models, one answer.** Nano, Super, and Ultra can disagree. That is the point, but it is also a product risk. If Ultra silently overwrites Super, the user cannot see what changed. If the app shows three raw opinions, it is noise. The verification contract solves this with per-field verdicts, reasons, and a human action. When the verifier is uncertain, both outputs stay on screen.

**HS codes are a taxonomy problem, not a chat problem.** A model can produce a code that looks plausible. The cost of a wrong code is a held parcel or a surprise bill. I treat HS as a candidate-ranking problem grounded in official descriptions, with visible uncertainty and sender responsibility. The app never says "this is the code." That restraint is deliberate, and it is also the part most likely to disappoint someone who wants a one-click answer.

**Addresses are local, messy, and personal.** Japanese and Korean addresses do not map one-to-one. Block order, postal code placement, building names, romanization, and floor/suite conventions all change. A single translation pass is not enough. The app shows original and converted side by side and leaves deliverability to the sender. Recipient names and phone numbers are never collected.

**"Live" versus "table" is a trust problem.** It is tempting to put one "real-time" badge on everything. That would be a lie for postal rates. EasyPost test rates are live API calls but not purchasable quotes; the EMS row is an official table with an effective date. The UI uses separate badges and timestamps, and the copy never calls a table "real-time."

**Cross-region latency and failure.** The Nemotron models are listed in different regions. A verifier call can be slower than the rest of the pipeline, and a mixed-model pipeline has more failure modes than a single-model app. The app uses timeouts and a visible deterministic fallback. The step panel is not decoration; it is how I debug which model ran and how long it took. Measured p50/p95: [TBD - fill after build].

## Accomplishments

- **A complete one-screen flow, not a chat demo.** A user can go from an item list to a reviewable plan with prohibited/quarantine flags, HS candidates, a duty estimate, a formatted address, and a rate comparison without leaving the page.
- **A verifier pattern that is visible to the user.** Ultra checks Nano and Super, returns per-field verdicts, and flags uncertainty. The app shows the disagreement instead of hiding it.
- **A model/step panel that makes routing visible.** Every step shows the model, mode, and latency. The panel explains why Nano classifies and formats, Super proposes HS candidates, and Ultra only verifies.
- **Provenance designed in.** Live/mock/table badges, effective dates, source links, and timestamps are part of the data model, not a last-minute disclaimer.
- **Bilingual address handling with a side-by-side review.** The split view treats address formatting as a reviewable transformation rather than a magic translation.
- **A narrow, credible scope.** No payment, no label purchase, no customs filing. Hakobu is the preparation layer, and it is honest about that.

The impact case is deliberately narrow: a first-time sender reviews compliance, cost, address, and ETA in one place instead of reconciling four sources, and a small seller can repeat the same review for every parcel. I am not claiming a time saving until the evaluation measures it.

I am also proud of what the app refuses to do. It never auto-rejects an item, never declares a shipment admissible, and never calls a table-based rate real-time. In a domain where a confident wrong answer is expensive, those refusals are features.

## What we learned

- **The most useful AI output in a high-stakes workflow is a ranked set of options with reasons and an explicit "I don't know."** A single answer feels better in a demo and is worse in real life.
- **Routing is a product decision, not an infrastructure detail.** The cheap model does the boring part, the stronger model does the judgment, and the verifier earns trust. Once the step panel shows which model ran and how long each step took, prompt design changes: I started writing shorter classification prompts and narrower verifier prompts because I could see the shape of each call.
- **Structured output plus deterministic rules beats free-form chat when money or regulations are involved.** The rules engine does not hallucinate a threshold; the model explains and ranks.
- **"Live" and "table" are trust labels, not technical details.** Users do not care which API returned a number. They care whether the number is a quote, an estimate, or a published table, and when it was true.
- **A human confirmation step is not a failure of automation.** It is the feature that makes the rest of the automation acceptable.
- **OpenAI compatibility lowers the switching cost.** The first Token Factory call was a base URL and a key. The hard part was not the SDK; it was learning how each Nemotron tier behaves on multilingual, ambiguous item descriptions.
- **Localization is not translation.** Address formatting is a data and UX problem. A fluent sentence can still be undeliverable.

## What's next

- **Publish the evaluation.** Fill in the metrics above with reproducible results and keep the harness in the repo.
- **Add photo input with Nemotron 3.5 Super VL.** Photo input is not implemented in this build; the next step is a two-step vision-then-text path and a real label-photo test set.
- **Expand the corridors.** Korea ↔ Japan already runs in both directions in the UI. Add a third corridor with a different rule and rate structure to prove the adapters generalize.
- **Ground HS more deeply.** Retrieve official heading descriptions and explanatory notes, cite the exact heading, and abstain when the description is ambiguous.
- **Add official address validation** where the terms allow it, instead of relying on formatting alone.
- **Add live postal rate APIs** where they exist, and keep the table path for the ones that do not.
- **Move the nightly refresh to a Nebius Serverless Job.** A scheduled job would fetch official rate and rule pages, diff them against the versioned JSON, and open a review item. This is the natural use of Nebius AI Cloud in the architecture, but it is not on the critical path for the demo. Status: [TBD - fill after build].
- **Add a repeat-sender mode** with saved parcels and a review queue, without turning the app into a database of personal data.
- **Measure verifier economics.** The open question is when Ultra's verdict is worth 3.3× Super's input price. Measure quality and latency before changing the routing.
- **Export to carrier portals and printable customs forms.** Still human-submitted, always.

## Built with

Next.js 14.2.15, React 18.3.1, TypeScript 5.5.4, plain CSS, Nebius Token Factory, NVIDIA Nemotron 3 Nano, NVIDIA Nemotron 3 Super, NVIDIA Nemotron 3 Ultra, EasyPost test mode, frankfurter.app, GitHub, Vercel Hobby.

## Try it out

- **Live demo:** https://app-vert-five-97.vercel.app
- **Source code:** [TBD]
- **Demo video (YouTube, under 3:00):** [TBD]
- **Track:** Best Apps & Agents
- **License:** MIT
- **Judge access:** No login is implemented. Public URL: https://app-vert-five-97.vercel.app.
- **Demo data:** synthetic. Click **Load sample shipment**, then **Build plan**, to reproduce the Japan → Korea scenario.
- **If live APIs are unavailable:** the app returns deterministic data with visible **MOCK** labels. There is no recorded-run mode.

**A three-minute judge path:**

1. Click **Load sample shipment**, then **Build plan**. Read the numbered sections from `01 / Parcel` through `08 / Routing`.
2. Open the `08 / Routing` model/step panel and check which Nemotron model handled each step, with model, mode, and latency.
3. Read the `04 / Verify` checks. Each check shows a verdict, a reason, and a **Human action** line.
4. Compare a **LIVE** EasyPost rate (or a **MOCK** rate when no key is configured) with the **TABLE** EMS row. Note the different badges and dates.
5. Read the `05 / Estimate` disclaimer and the **Human action** language. Nothing is submitted or paid.

## Feedback on Nebius Token Factory, Nebius AI Cloud, and NVIDIA models

This section is written for the Nebius and NVIDIA teams. It is organized by product, and each item has the same shape: what I observed, why it mattered for Hakobu, a suggested fix, and a status.

Status labels:

- **Observed in docs/catalog** — I read it, but have not necessarily reproduced it at runtime.
- **Community report** — reported by other participants; I have not reproduced it.
- **Tested** — I ran it and the result is in the repository.
- **[TBD - fill after build]** — not yet experienced; I will fill this in after the build.

I have left runtime claims as [TBD] rather than guessing. A feedback report that invents an experience is worse than one that admits what it has not tested.

### Summary: five changes I would ship first

1. **Canonical model IDs, aliases, and a capability/region payload in `GET /v1/models`.** The current IDs mix casing and separators, and a router with five models feels the pain immediately.
2. **Per-key spend caps, a balance preflight, and a useful 402 body.** A public demo should not die between two steps because a credit balance crossed zero.
3. **A per-model capability matrix for JSON schema, tool calls, streaming, vision, and reasoning controls.** A router needs to know what it can ask for before it writes a prompt.
4. **A multi-model routing cookbook with cost, latency, and quality guidance.** The Nano/Super/Ultra story is the product; make the recommended pattern copy-pasteable.
5. **An NVIDIA embedding/reranker in the catalog, or an explicit recommended pairing.** Retrieval is the missing piece of an all-NVIDIA stack.

### A. Nebius Token Factory

**TF-01 · Billing setup blocks the first API call**

- **Observed:** Token Factory onboarding requires billing setup and a bank card before the trial can be used. The trial credit is $1 for 30 days, and participants have reported that promo credits arrive late or apply only after the trial. [Community report for the promo timing; documented for the card requirement and trial credit.]
- **Why it mattered:** The highest-friction moment in the funnel is before the first call. For a hackathon build, that is the moment a team decides whether to continue. A mid-demo 402 is worse than a slow model because it looks like a broken product.
- **Suggested fix:** A no-card sandbox key with a hard $5 cap and a 7-day expiry; one credit ledger that shows trial, promo, and paid balances separately; an email when a promo is applied; a clear "what happens at zero" page with the exact 402 behavior.
- **Status:** Documented; onboarding time [TBD - fill after build].

**TF-02 · Model IDs are not canonical**

- **Observed:** The catalog uses several patterns in one family: `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`, `nvidia/nemotron-3-super-120b-a12b`, `nvidia/Nemotron-3-Ultra-550b-a55b`, `nvidia/Nemotron-3_5-Lightning`, and `nvidia/Nemotron-3.5-Super-VL`. Casing, hyphenation, and version separators all vary.
- **Why it mattered:** Copy-paste errors are silent until a 404. In a router with five model IDs, this is avoidable friction, and it makes a model picker harder to build.
- **Suggested fix:** Choose one canonical form (lowercase kebab-case is the common convention), keep the current IDs as aliases, and make lookup case-insensitive. Return `id`, `aliases`, `family`, `version`, `region`, `context_window`, `pricing`, and `capabilities` from `GET /v1/models`. Add a "copy ID" button that copies the canonical value.
- **Status:** Observed in catalog.

**TF-03 · The global base URL versus regional models is unclear**

- **Observed:** The catalog lists Nemotron 3 Nano and 3.5 Lightning in `eu-north1`, Super and Ultra in `us-central1`, and Super VL in `us-north1`. The integration docs give a single global base URL. It is not obvious whether that host routes to the right region automatically or whether a regional host is required for some models.
- **Why it mattered:** A mixed-model router may cross regions on every step. That affects latency, failure modes, and data residency. I need to know where a request ran, not just which model answered.
- **Suggested fix:** Return `region` and the resolved `endpoint` in the model list and in response headers. Accept an optional `region` parameter. If a model is not available in the requested region, return a specific `region_mismatch` error with the correct host. Publish a one-page model × region matrix.
- **Status:** Observed; runtime behavior [TBD - fill after build].

**TF-04 · No spend cap, and 402 can arrive mid-request**

- **Observed:** Participants report HTTP 402 (out of credit) arriving mid-request and no account-level spend cap. [Community report; not yet reproduced.]
- **Why it mattered:** A judge can see the extraction step succeed and the verifier step fail. That reads as an unreliable product, not a budget event. A public demo needs a hard stop before the interesting part.
- **Suggested fix:** Per-key daily and monthly caps; `GET /v1/usage` and `GET /v1/balance`; a 402 body with `budget_remaining`, `reset_at`, and `request_id`; dashboard alerts at 50/80/100%; a "reserve for demo" mode that blocks non-demo calls when the balance is low.
- **Status:** Community report; [TBD - fill after build].

**TF-05 · Capability support is not documented per model**

- **Observed:** The catalog exposes type (text2text/image2text), context, region, and price. It does not say which models support JSON schema, tool calls, streaming, seed/determinism, or reasoning controls.
- **Why it mattered:** Hakobu's pipeline depends on structured JSON. Prompt-only JSON is fragile, and a router needs to know whether it can ask for a schema or must validate and repair in application code.
- **Suggested fix:** Add capability flags to `GET /v1/models` and a per-model table in the docs. If JSON schema is not supported, return a 400 before charging tokens. Document the supported fallback (prompt-only JSON plus validation) with an example.
- **Status:** [TBD - fill after build].

**TF-06 · Cost is derivable but not returned**

- **Observed:** OpenAI-compatible responses include `usage`, and the public catalog has per-million prices. I can derive cost from those two inputs, but this build does not do so in the UI.
- **Why it mattered:** Local price tables go stale. A server-side `cost_usd`, or a pricing endpoint with effective dates, would make any cost display honest and make cost comparisons across models trivial.
- **Suggested fix:** Include `cost_usd` in the response (or expose `GET /v1/pricing`), show cached-input pricing separately, and include `model` and `region` in the usage object. If exact cost is not possible, return the price version used.
- **Status:** [TBD - fill after build].

**TF-07 · Error codes need to distinguish model, region, and quota**

- **Observed:** [TBD - fill after build.]
- **Why it mattered:** A 404 can mean a wrong model ID, a model that is not available in the requested region, or a key without access. The fix is different in each case, and a router cannot recover without knowing which one happened.
- **Suggested fix:** Structured error codes (`model_not_found`, `region_mismatch`, `quota_exceeded`, `context_length_exceeded`, `invalid_schema`), a docs link, the model ID, the region, and a request ID. Keep the HTTP status meaningful, but put the machine-readable reason in the body.
- **Status:** [TBD - fill after build].

**TF-08 · No NVIDIA embedding or reranker in the public catalog**

- **Observed:** The catalog includes `Qwen/Qwen3-Embedding-8B` but no NVIDIA embedding or reranker model. Hakobu's rule pack is small enough for keyword search today, but a larger corridor set will need retrieval.
- **Why it mattered:** If a team wants an all-NVIDIA stack, retrieval is the gap. The answer may be "use the Qwen embedding," but that should be an explicit recommendation, not an inference from an empty row.
- **Suggested fix:** Add an NVIDIA embedding/reranker, or document the recommended non-NVIDIA pairing and its pricing in the Nemotron routing cookbook. Include a retrieval example with chunking and citation.
- **Status:** Observed in catalog.

**TF-09 · Sandboxes are gated, which makes them hard to plan around**

- **Observed:** Token Factory Sandboxes are beta and access is gated; participants have reported 403s and delays. [Community report.]
- **Why it mattered:** I did not put Sandboxes on Hakobu's critical path, so this did not block the demo. For a coding or verification agent, it would have.
- **Suggested fix:** A self-serve waitlist status, a clear access SLA, and a small sandbox quota for hackathon accounts. A "run one command" sandbox in the dashboard would be enough to evaluate the workflow.
- **Status:** Not used; [TBD - fill after build if access is granted].

**TF-10 · The docs need one "router in 10 minutes" page**

- **Observed:** The OpenAI-compatible base URL is the best part of the developer experience, but the information a router needs is spread across the model catalog, billing docs, and API reference.
- **Why it mattered:** I want a single page with three model IDs, a base URL, a JSON schema example, a fallback example, and a cost calculation. That page would have saved the most time in the build.
- **Suggested fix:** Publish a TypeScript and Python quickstart that routes Nano → Super → Ultra, validates JSON, logs usage, and falls back on 5xx/402. Include a Next.js route handler example and a "common errors" section.
- **Status:** [TBD - fill after build].

**TF-11 · Per-request observability is missing from the dashboard**

- **Observed:** [TBD - fill after build.]
- **Why it mattered:** The step panel is only as good as the usage data. I want per-request traces without building my own logging stack, especially when a verifier call fails intermittently.
- **Suggested fix:** A request log with timestamp, key, model, region, prompt/completion tokens, latency, cost, status, and request ID; CSV export; filters by model and status; a link from a failed request to the docs.
- **Status:** [TBD - fill after build].

**TF-12 · Publish a deprecation policy for model versions**

- **Observed:** Model names include versions (3, 3.5) and sizes (Nano, Super, Ultra). The catalog is a snapshot, and it is not clear how long a pinned ID will remain available.
- **Why it mattered:** A pinned ID can disappear; an alias can move under me. Both are bad for a reproducible demo and worse for a production router.
- **Suggested fix:** A deprecation policy with dates, stable aliases for a defined window, and `deprecated_at` in `GET /v1/models`. Let me pin an exact version and show the deprecation date in the dashboard.
- **Status:** [TBD - fill after build].

### B. Nebius AI Cloud

I did not put AI Cloud on Hakobu's critical path. Token Factory covers inference, and the demo is a single stateless web app. The feedback below is from evaluating AI Cloud for the batch job described in "What's next," not from a production deployment. I am marking that distinction explicitly.

**AC-01 · Two billing surfaces for one prototype**

- **Observed:** AI Cloud has no free trial and requires a $25 top-up to use cloud credits, while Token Factory has its own onboarding and credits. [Documented; the exact current terms should be re-checked before submission.]
- **Why it mattered:** Two billing surfaces make a small prototype harder to justify. I used Token Factory only, and AI Cloud stayed out of the critical path.
- **Suggested fix:** One Nebius account with a shared credit balance, or a hackathon sandbox that includes a small Serverless Jobs quota. Show a single "what will this cost" estimate across Token Factory and AI Cloud.
- **Status:** Documented; hands-on [TBD - fill after build].

**AC-02 · Serverless Jobs needs a cost example before I design the job**

- **Observed:** [TBD - fill after build.]
- **Why it mattered:** A nightly rule-refresh job is a natural fit: fetch official pages, diff them against the versioned JSON, and open a review item. Before adding it, I need an estimate for a short CPU job running nightly for the judging window.
- **Suggested fix:** A pricing calculator with a sample job (image, CPU, memory, duration, frequency), a `dry-run` that estimates cost, and a "cost per run" line in the job UI. Publish two or three reference workloads.
- **Status:** [TBD - fill after build].

**AC-03 · The path for a stateless web app is not obvious**

- **Observed:** AI Cloud documentation emphasizes GPUs, endpoints, and jobs. A Next.js app is not the obvious target.
- **Why it mattered:** I deployed the UI on [TBD] and used Token Factory for inference. If AI Cloud had a "deploy a web app" path, I would have considered it for the whole stack.
- **Suggested fix:** A "deploy a web app" guide (Dockerfile, port, health check, environment variables, zero-downtime deploy), or an explicit recommendation to use a PaaS for the UI and AI Cloud for batch jobs.
- **Status:** [TBD - fill after build].

**AC-04 · Quota and region visibility before job creation**

- **Observed:** [TBD - fill after build.]
- **Why it mattered:** I need to know whether the CPU/GPU quota and the region are available before I commit to a nightly job design.
- **Suggested fix:** Show quotas and regions in the console before creating a job; return a `quota_exceeded` error with requested versus available values; link to the quota request flow.
- **Status:** [TBD - fill after build].

**AC-05 · Join job logs and model traces**

- **Observed:** [TBD - fill after build.]
- **Why it mattered:** If a nightly job fails, I want the job log and the Token Factory request trace in one place, not two dashboards and a timestamp hunt.
- **Suggested fix:** Link job runs to model calls via request ID, include the model/region in the job log, and support log export.
- **Status:** [TBD - fill after build].

### C. NVIDIA Nemotron models

**NV-01 · Nano is the right tier for extraction; publish multilingual evidence**

- **Observed:** Nemotron 3 Nano is one of the cheapest text tiers and is a good fit for bounded extraction. Product names in Korean and Japanese mix scripts, units, brand names, and abbreviations.
- **Why it mattered:** Extraction sets up every later step. A missed "aerosol" or "lithium battery" flag is the most expensive error in the pipeline, and it happens before the expensive models see the item.
- **Suggested fix:** Publish multilingual extraction evaluations (Korean, Japanese, mixed-script) and a prompt example with a strict JSON schema. Add guidance for an explicit `unknown_terms` field so the model can flag what it did not understand instead of guessing.
- **Status:** [TBD - measure after build].

**NV-02 · Super for HS candidates needs grounding, not just a bigger model**

- **Observed:** HS codes are a long-tail taxonomy. A model can produce a plausible heading without evidence, and a more capable model can produce a more convincing wrong answer.
- **Why it mattered:** I use Super for candidates, not decisions. The prompt asks for a rationale and an uncertainty flag, and Ultra checks the result against the item description and rule excerpt.
- **Suggested fix:** Publish a "grounded classification" recipe: retrieve official heading descriptions, cite them, abstain when the description is ambiguous, and return top-k candidates with reasons. A small public HS sample set would let teams evaluate top-3 recall instead of eyeballing outputs.
- **Status:** Design observation; [TBD - measure after build].

**NV-03 · Ultra's verifier economics need guidance**

- **Observed:** At published list prices, Ultra is $1.00/$3.00 per million tokens, Super is $0.30/$0.90, and Nano is $0.06/$0.24. Ultra is about 3.3× Super and 16.7× Nano on input.
- **Why it mattered:** Ultra on every step would dominate both cost and latency. I use it as a verifier on the fields that matter, not as a generator. The open question is when its verdict is worth the premium.
- **Suggested fix:** Publish guidance on when Ultra's quality gain justifies the cost; add a "verifier-lite" recipe (Super verifies Nano, Ultra only on low confidence); expose a reasoning/token budget so I can cap the verifier's output.
- **Status:** Prices observed; quality and latency [TBD - measure after build].

**NV-04 · Context windows differ across the family**

- **Observed:** The catalog lists 262K for Nano, 256K for Super, and 1,024K for Ultra. A long input that fits Ultra may not fit Super.
- **Why it mattered:** The router must check context before calling. A silent truncation would be a correctness bug in a verification step, because the verifier would judge an incomplete plan.
- **Suggested fix:** Expose `context_window` in `GET /v1/models`; make truncation explicit in the response (`truncated: true`) or reject with `context_length_exceeded`; document the tokenizer and how to count tokens before sending.
- **Status:** Observed.

**NV-05 · The vision gap forces a two-model photo flow**

- **Observed:** Nemotron 3.5 Super VL is the only image2text Nemotron in the public catalog; Nano and Super are text2text.
- **Why it mattered:** A photo flow needs a VL call first, then a text call. That is two models and two costs, and a step panel would have to show both. It is workable, but it is not obvious from the model names.
- **Suggested fix:** Document the two-step pattern with a reference implementation; add a smaller/cheaper VL model; or add image input to Super so a single call can extract and classify.
- **Status:** Observed.

**NV-06 · Model naming needs one family page**

- **Observed:** "Nemotron 3" and "Nemotron 3.5" coexist; "Nano 30B-A3B", "Super 120B-A12B", and "Ultra 550B-A55B" use different size conventions. The IDs do not follow one pattern.
- **Why it mattered:** A model picker is harder to build and easier to misconfigure. The size suffix is useful, but only if it is consistent.
- **Suggested fix:** A canonical family page with model cards: ID, aliases, parameters, context, region, price, capabilities, recommended tasks, and a "copy ID" button. Keep the marketing name and the API ID visibly linked.
- **Status:** Observed.

**NV-07 · Verifier outputs need to be short and strict**

- **Observed:** [TBD - fill after build.]
- **Why it mattered:** The verifier should return a verdict, a reason, and an action. If Ultra writes an essay, the UI becomes unreadable and the token bill grows for no product value.
- **Suggested fix:** Document `max_output_tokens`, reasoning controls, and a "verifier" prompt pattern that returns strict JSON only. Show a good and a bad example in the docs.
- **Status:** [TBD - fill after build].

**NV-08 · Determinism matters for verifier verdicts**

- **Observed:** [TBD - fill after build.]
- **Why it mattered:** I want verdicts to be stable enough to compare across runs. Temperature 0 and a seed help; if a model is non-deterministic, the UI should say so rather than imply a reproducibility it does not have.
- **Suggested fix:** Document seed/temperature behavior per model, return the seed in the response, and publish a short determinism note with expected variance.
- **Status:** [TBD - fill after build].

**NV-09 · Structured-output support should be explicit**

- **Observed:** [TBD - fill after build.]
- **Why it mattered:** The whole pipeline depends on JSON. Prompt-only JSON is fragile, and a repair loop costs tokens and latency.
- **Suggested fix:** State whether JSON schema is enforced server-side. If it is not, provide a validation/repair recipe and a `response_format` example for each model. Include a schema failure example in the docs.
- **Status:** [TBD - fill after build].

**NV-10 · Address localization is high-stakes and locale-specific**

- **Observed:** [TBD - measure after build.]
- **Why it mattered:** Korean and Japanese addresses are not one-to-one. A fluent translation can still be undeliverable. The app uses a side-by-side view and leaves deliverability to the sender instead of trusting a single pass.
- **Suggested fix:** Publish locale evaluations for address formatting, recommend the side-by-side review pattern, and link to official postal data where the terms allow it. Treat address formatting as a structured transformation, not free text.
- **Status:** [TBD - measure after build].

**NV-11 · Compliance answers need a grounded mode**

- **Observed:** A prohibited-item or customs assistant can hallucinate a rule and cause real harm. The model's fluency is not evidence.
- **Why it mattered:** Hakobu never auto-rejects or declares. The verifier is instructed to cite the supplied rule text and to return `uncertain` when the evidence is insufficient.
- **Suggested fix:** A "grounded compliance" system card: retrieval required, citations required, no definitive legal claims, an explicit "unknown" state, and an abstention evaluation. Publish a refusal example alongside the happy path.
- **Status:** Design observation.

### What worked well

- **The OpenAI-compatible endpoint is the best part of the developer experience.** Changing `base_url` and `NEBIUS_API_KEY` is the whole integration; the router is ordinary OpenAI-style code. First-call time: [TBD - fill after build].
- **One key for Nano, Super, and Ultra makes multi-model routing practical.** I do not need three accounts or three SDKs, and the router can compare tiers without a billing detour.
- **Published per-million prices made tier comparisons possible during planning.** The catalog gives enough information to compare Nano, Super, and Ultra on cost, even though this build does not display cost. The step panel explains why Nano classifies and formats and Ultra only verifies.
- **Ultra's 1M-token context is a natural fit for verifying a whole shipment plan plus rule excerpts in one call.** Long-context quality on this task: [TBD - measure after build].
- **The catalog's region and price columns helped me plan the router before writing code.** The region column is also the source of the confusion in TF-03, so it is close to being a great page.

### What I have not tested yet

I am listing these so the feedback is not read as more complete than it is. Each becomes a `Tested` item or a `[TBD]` result after the build:

- rate limits, p95 latency, cold starts, and timeout behavior per model;
- streaming behavior through the Next.js route handler;
- JSON schema enforcement versus prompt-only JSON;
- tool/function calling on each model;
- vision quality on Super VL with label photos;
- Sandboxes access and workflow;
- AI Cloud Serverless Jobs pricing and deployment;
- long-context verification quality on Ultra;
- Korean/Japanese classification and address quality;
- 402 handling and spend-cap behavior;
- cost at demo scale: [TBD - measure].

---

## Disclosures

- **Estimates, not advice.** Duty, tax, HS, prohibited/quarantine, and ETA outputs are estimates or hints, not legal, tax, or customs advice. The sender/importer is responsible for the final declaration. Official sources prevail.
- **HS candidates are not binding.** Hakobu suggests candidates and shows its reasoning; it does not classify goods definitively.
- **Rate labels are literal.** EasyPost rates are test-mode API responses, not purchasable quotes. Japan Post rates are an official table with an effective date, not a live API. FX is a reference rate, not a transaction rate.
- **No payment, label, or filing.** Hakobu does not take payment, buy postage, or submit a customs declaration.
- **Synthetic demo data.** Names, addresses, and parcel contents in the demo are synthetic. No confidential or proprietary data was used.
- **Keys are not in the repo.** All API keys are server-side environment variables. `.env*` files are gitignored, and the repo is checked with a secret scanner before release.
- **Model prices** are from the Nebius Token Factory public catalog as of October 2026 and can change. The app reads model IDs from environment overrides and does not compute cost in this build.
- **Video:** public on YouTube, under 3:00, English narration, no copyrighted music.
- **Links:** demo https://app-vert-five-97.vercel.app, repository https://github.com/Hwemo-Chung/hakobu; video URL is [TBD].




