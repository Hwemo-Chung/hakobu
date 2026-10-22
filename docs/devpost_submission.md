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

The step runner is a small server-side function in `app/api/plan/route.ts`: it chooses a model role per step, calls `lib/llm.ts`, parses the JSON response, and falls back to a deterministic mock payload if the call fails or the JSON is invalid. All Nemotron 3 steps run with `chat_template_kwargs: {"enable_thinking": false}`; with reasoning on, Super and Ultra exhausted the token budget and returned truncated JSON. Model IDs live in environment overrides, not in prompts, so a model can be swapped without editing the workflow.

### Model routing

| Step | NVIDIA model | Token Factory model ID | Why this tier | Context | Published list price (USD / 1M tokens, in / out) | Catalog region |
|---|---|---|---|---|---|---|
| Classify items | Nemotron 3 Nano 30B-A3B | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Bounded classification task; low-cost tier; keeps the expensive model out of the hot path | 262K | 0.06 / 0.24 | eu-north1 |
| HS code candidates | Nemotron 3 Super 120B-A12B | `nvidia/nemotron-3-super-120b-a12b` | More reasoning for taxonomy, rationale, and multilingual product descriptions | 256K | 0.30 / 0.90 | us-central1 |
| Address formatting | Nemotron 3 Nano 30B-A3B | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Locale formatting is a bounded instruction-following task; the low-cost tier is sufficient | 262K | 0.06 / 0.24 | eu-north1 |
| Verifier / critic | Nemotron 3 Ultra 550B-A55B | `nvidia/Nemotron-3-Ultra-550b-a55b` | Largest model in the family; reasoning-heavy verification; checks Nano and Super outputs, cites missing evidence, flags uncertainty | 1,024K | 1.00 / 3.00 | us-central1 |

Prices are from the Nebius Token Factory public model catalog as of October 2026. They can change. Measured cost per shipment plan, from real token usage over 5 runs: about $0.0023 on average (Ultra ≈ 81%). The step panel shows model, mode, and latency; the API response also carries per-step token usage. No vision model and no fallback model are wired in this build.

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
- **Budget controls.** This build has no per-IP rate limit and no daily model-spend cap. Each call is capped at 3,000 output tokens, so the worst case for one plan is roughly $0.012 at list price.
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

Results: the accuracy evaluation is not done yet; only latency and cost have been measured (see the feedback section). I will not put a number in this submission that I cannot reproduce from the repository and the evaluation script. The eval harness and the raw outputs will be published with the code.

## Challenges

**Uncertainty is the product, not an error state.** The easy version of this app is a chatbot that says "probably fine." The useful version says: "This aerosol needs a carrier check, here is the current page, and I will not clear it for you." Designing for three states — low risk, needs a check, high risk — is harder than designing for yes/no. Every flag needs a reason and a source, and "unknown" needs a next action. The UI has to make uncertainty legible without making the user give up.

**Three models, one answer.** Nano, Super, and Ultra can disagree. That is the point, but it is also a product risk. If Ultra silently overwrites Super, the user cannot see what changed. If the app shows three raw opinions, it is noise. The verification contract solves this with per-field verdicts, reasons, and a human action. When the verifier is uncertain, both outputs stay on screen.

**HS codes are a taxonomy problem, not a chat problem.** A model can produce a code that looks plausible. The cost of a wrong code is a held parcel or a surprise bill. I treat HS as a candidate-ranking problem grounded in official descriptions, with visible uncertainty and sender responsibility. The app never says "this is the code." That restraint is deliberate, and it is also the part most likely to disappoint someone who wants a one-click answer.

**Addresses are local, messy, and personal.** Japanese and Korean addresses do not map one-to-one. Block order, postal code placement, building names, romanization, and floor/suite conventions all change. A single translation pass is not enough. The app shows original and converted side by side and leaves deliverability to the sender. Recipient names and phone numbers are never collected.

**"Live" versus "table" is a trust problem.** It is tempting to put one "real-time" badge on everything. That would be a lie for postal rates. EasyPost test rates are live API calls but not purchasable quotes; the EMS row is an official table with an effective date. The UI uses separate badges and timestamps, and the copy never calls a table "real-time."

**Cross-region latency and failure.** The Nemotron models are listed in different regions. A verifier call can be slower than the rest of the pipeline, and a mixed-model pipeline has more failure modes than a single-model app. The app uses timeouts and a visible deterministic fallback. The step panel is not decoration; it is how I debug which model ran and how long it took. Measured medians over 5 runs were 0.7–1.6 s per step and about 5.3 s summed across the four steps (HS and address run in parallel). Five runs are too few for a p95.

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
- **Move the nightly refresh to a Nebius Serverless Job.** A scheduled job would fetch official rate and rule pages, diff them against the versioned JSON, and open a review item. This is the natural use of Nebius AI Cloud in the architecture, but it is not on the critical path for the demo. Status: not started.
- **Add a repeat-sender mode** with saved parcels and a review queue, without turning the app into a database of personal data.
- **Measure verifier economics.** The open question is when Ultra's verdict is worth 3.3× Super's input price. Measure quality and latency before changing the routing.
- **Export to carrier portals and printable customs forms.** Still human-submitted, always.

## Built with

Next.js 14.2.15, React 18.3.1, TypeScript 5.5.4, plain CSS, Nebius Token Factory, NVIDIA Nemotron 3 Nano, NVIDIA Nemotron 3 Super, NVIDIA Nemotron 3 Ultra, EasyPost test mode, frankfurter.app, GitHub, Vercel Hobby.

## Try it out

- **Live demo:** https://app-vert-five-97.vercel.app
- **Source code:** https://github.com/Hwemo-Chung/hakobu
- **Demo video (YouTube, under 3:00):** https://youtu.be/ytUPLzPD_G8
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

This section is written for the Nebius and NVIDIA teams. It lists only what I actually ran into while wiring Hakobu to Token Factory on 2026-10-23, plus a short list of what I did not test. Measurements: 5 runs of the 4-step pipeline on the sample shipment, called from a local Next.js server and then from the Vercel deployment.

### What I experienced

**TF-01 · Billing setup before the first call.** A payment card had to be registered before I could get an API key. For a hackathon this is the single biggest drop-off point. *Suggestion:* a capped no-card sandbox key.

**TF-02 · `GET /v1/models` works, but returns only IDs.** The list endpoint returned all three IDs I use (`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`, `nvidia/nemotron-3-super-120b-a12b`, `nvidia/Nemotron-3-Ultra-550b-a55b`), so my configured IDs were correct. Each entry has only `id`, `created`, `object`, `owned_by`. Casing and separators differ across one family (`Nemotron-3_5-Lightning` vs `Nemotron-3.5-Super-VL`), so I copied IDs exactly from the list. *Suggestion:* add context window, price, region and capability flags (JSON mode, reasoning toggle) to the list response.

**NV-01 · Reasoning is on by default and silently ate my JSON budget.** With `max_tokens: 1400` and default settings, Super and Ultra spent most of the budget on reasoning tokens. In the first 10 runs (before the fix), Ultra hit the 1,400-token cap and returned truncated, unparseable JSON in 9 of 10 runs, Super did so in 7 of 10, and Super returned an empty `content` twice. Every call still returned HTTP 200, so the failure only showed up as a parse error in my app. Setting `chat_template_kwargs: {"enable_thinking": false}` fixed it: in the 5 measured runs below, all 20 step calls returned valid JSON, and latency dropped from roughly 3–10 s per step to roughly 0.7–3.3 s. The `usage.completion_tokens_details.reasoning_tokens` field was what let me diagnose it. *Suggestion:* document the reasoning toggle prominently for each Nemotron model, and return `finish_reason: "length"` guidance or a warning when reasoning consumes the whole budget.

**TF-03 · The OpenAI-compatible endpoint really is a drop-in.** The integration is a base URL plus a bearer key; `usage` with prompt and completion tokens came back on every successful call, which is all I needed to compute cost from the published catalog prices.

### Measured (5 runs, sample shipment, thinking disabled)

| Step | Model | Latency median (min–max) | Avg tokens in / out | Avg cost per call |
|---|---|---|---|---|
| Classify | Nano | 1,089 ms (973–1,395) | 686 / 158 | $0.000079 |
| HS candidates | Super | 1,637 ms (1,447–3,284) | 248 / 271 | $0.000318 |
| Address | Nano | 710 ms (681–1,098) | 134 / 85 | $0.000028 |
| Verify | Ultra | 1,425 ms (1,310–1,555) | 1,036 / 271 | $0.001849 |

Average model cost per shipment plan: **$0.0023** (max $0.0027). Ultra is about 81% of it. Cost = tokens × list price from the [Nebius Token Factory model catalog](https://tokenfactory.nebius.com/model-catalog.md) (Nano $0.06/$0.24, Super $0.30/$0.90, Ultra $1.00/$3.00 per 1M input/output tokens, read 2026-10-23); no cached-input discount applied.

### What I did not test

Rate limits and 402/out-of-credit behavior, streaming, server-side JSON schema enforcement, tool calling, vision (Super VL), Sandboxes, region routing, long-context quality, determinism across runs, and anything on Nebius AI Cloud (not used; the UI is on Vercel Hobby). I am not making claims about these.

---

## Disclosures

- **Estimates, not advice.** Duty, tax, HS, prohibited/quarantine, and ETA outputs are estimates or hints, not legal, tax, or customs advice. The sender/importer is responsible for the final declaration. Official sources prevail.
- **HS candidates are not binding.** Hakobu suggests candidates and shows its reasoning; it does not classify goods definitively.
- **Rate labels are literal.** EasyPost rates are test-mode API responses, not purchasable quotes. Japan Post rates are an official table with an effective date, not a live API. FX is a reference rate, not a transaction rate.
- **No payment, label, or filing.** Hakobu does not take payment, buy postage, or submit a customs declaration.
- **Synthetic demo data.** Names, addresses, and parcel contents in the demo are synthetic. No confidential or proprietary data was used.
- **Keys are not in the repo.** All API keys are server-side environment variables. `.env*` files are gitignored, and the repo is checked with a secret scanner before release.
- **Model prices** are from the Nebius Token Factory public catalog as of October 2026 and can change. The app reads model IDs from environment overrides ; cost figures in this document are computed from measured token usage × these prices.
- **Video:** public on YouTube, under 3:00, English narration, no copyrighted music.
- **Links:** demo https://app-vert-five-97.vercel.app, repository https://github.com/Hwemo-Chung/hakobu; video https://youtu.be/ytUPLzPD_G8.




