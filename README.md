# Hakobu

A lean one-screen preparation dashboard for **Korea ↔ Japan parcels**. The full concept, product reasoning, and demo script live in the [project README](../README.md).

Enter a direction, an item list, a weight, and a destination address. Hakobu returns:

- prohibited/quarantine review flags from a curated rule pack, with official source links,
- HS code candidates and a separate verifier pass,
- a duty and tax estimate with visible assumptions,
- a destination-format address beside the original,
- a rate comparison labeled **live**, **mock**, or **table**, with an ETA range,
- a model/step panel showing the model, mode, and latency for each call.

Every number is a preparation aid. Hakobu does not take payment, buy postage, file customs, or track a parcel.

## Stack

- Next.js 14 App Router, React 18, TypeScript
- Plain CSS, no UI framework
- Nebius Token Factory (OpenAI-compatible) with NVIDIA Nemotron models
- EasyPost test mode for courier rates
- frankfurter.app for FX reference rates
- Japan Post / Korea Post EMS rate table stored in `data/jp_post_rates.json`

No database and no extra runtime dependencies.

## Setup

Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs without keys. Missing integrations fall back to deterministic **MOCK** data, visibly labeled in the UI. Postal rows are always labeled **TABLE**, never live.

Environment variables:

```bash
NEBIUS_API_KEY=              # empty -> deterministic mock LLM steps
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
MODEL_NANO=nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B
MODEL_SUPER=nvidia/nemotron-3-super-120b-a12b
MODEL_ULTRA=nvidia/Nemotron-3-Ultra-550b-a55b
EASYPOST_API_KEY=            # test key; empty -> deterministic mock rates
```

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm start        # production server
npm test         # smoke test; requires a build
```

`npm test` runs `next start` on port 3999, posts the synthetic Tokyo → Seoul parcel to `/api/plan`, asserts the plan has at least four model steps and one rate, checks that mock labels appear when keys are absent, checks `GET /`, and stops the server. It exits nonzero on failure.

## Provenance and caveats

- **LIVE** rows are EasyPost test-mode API responses or a live FX response. They are not purchasable quotes.
- **MOCK** rows are deterministic fallbacks for demo use. They are not quotes.
- **TABLE** rows come from `data/jp_post_rates.json`, labeled **公式料金表 기준**. The values are samples, with `effectiveFrom` and `"verified": false`; verify them against the official [Japan Post EMS rate page](https://www.post.japanpost.jp/int/charge/list/ems_all.html) before use.
- The prohibited-item pack is a curated snapshot with source links. It is incomplete by design and changes over time.
- Duty, HS, prohibited status, and ETA are estimates or hints, **not legal, tax, or customs advice**. The sender and importer remain responsible.

## Layout

```text
app/page.tsx              server page; reads integration booleans
app/Dashboard.tsx         client form + result cards
app/api/plan/route.ts     four-step plan pipeline
lib/llm.ts                Nebius Token Factory client + mock fallback
lib/fx.ts                 frankfurter.app with 10s timeout + fallback
lib/rates.ts              EasyPost test API + postal table
lib/duty.ts               rules-based duty estimate
data/prohibited.json      curated prohibited/restricted snapshot
data/jp_post_rates.json   table-based EMS samples
scripts/smoke.mjs         end-to-end smoke test
```

## License

MIT © 2026 Hwemo-Chung. See [LICENSE](LICENSE).
