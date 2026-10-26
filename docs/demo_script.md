# Hakobu — demo script (≤ 2:00, reference/backup draft)

> **Status note.** The published demo video (YouTube, 2:25, https://youtu.be/ytUPLzPD_G8) is **not being re-shot or replaced**. This script is a reference/backup that matches the *current* facts. Where the published video differs from the current app:
> - **EMS value:** the video shows the JP → KR EMS row as **JPY 2,750 (sample table)**. The app now uses Japan Post's official zone-1 table (`verified: true`, checked 2026-10-26): **1.2 kg = JPY 2,500**. The video's JPY 2,750 / "sample" is therefore outdated.
> - **Carrier rows:** in the public demo, UPS / FedEx / DHL rows are **MOCK** (no EasyPost key); the four model steps are **LIVE**.
> - **Evaluation:** the seeded verifier test (n = 10) was run after the video and is not in it.
> - **Video length:** 2:25 published vs ≤ 2:00 here.
> The previous 2:55 script is kept as `demo_script_old_2026-10-23.md`.

**Format:** 1920×1080, English narration, no music, synthetic data only (blur keys/profiles). Text labels, no third-party logos.
**Must say aloud:** "Nebius Token Factory" and "NVIDIA Nemotron".

## Timed script

| Time | On screen | Spoken line |
|---|---|---|
| **0:00–0:10** | Title card **Hakobu** · "Korea ↔ Japan parcels, one screen" · Nebius × NVIDIA hackathon. Cut to the dashboard. | Sending a box from Tokyo to Seoul takes three tabs and a guess. Hakobu puts it on one screen, built on Nebius Token Factory and NVIDIA Nemotron. |
| **0:10–0:25** | Click **Load sample shipment** (ceramic teacup + aerosol sunscreen, 1.2 kg, Seoul address; "Sample data is synthetic"). Click **Build plan**. Loading panel: Nano classify → Super HS → Nano address → Ultra verify. | I load a synthetic parcel — a ceramic teacup and an aerosol sunscreen, 1.2 kilograms — and build the plan. |
| **0:25–0:42** | Scroll to **08 / Routing**: four rows — Nano classify, Super HS candidates, Nano address, Ultra verify — each with model, **LIVE** badge, latency in ms (use values from the run). | Four model steps run live on Nebius Token Factory: Nemotron 3 Nano classifies, Super proposes HS candidates, Nano formats the address, and Ultra verifies. The panel shows each model, its mode and its latency. |
| **0:42–0:55** | **02 / Compliance**: sunscreen flagged **NEEDS CHECK** (rule basis) with reason and **Official source ↗** link; the card says nothing is auto-rejected. | The prohibited check is a curated rule pack with official links. The aerosol needs a carrier check. Nothing is auto-rejected, and nothing is declared admissible. |
| **0:55–1:20** | **03 / Classify** HS candidates (**AI HINT**), then **04 / Verify**: cards with **SUPPORTED / UNCERTAIN / CONTRADICTED**, reason and **Human action** line; hold on one UNCERTAIN card. Overlay caption (added in editing, not an app screen): "Seeded test, n = 10 synthetic cases — wrong HS code: contradicted 6/6 runs · hazard flags: only generic 'uncertain' · correct controls: never contradicted". | Ultra checks the HS candidates and says supported, uncertain or contradicted, with a human action. In a small seeded test of ten synthetic cases, it contradicted a wrong HS code in six of six runs and never contradicted a correct control. But it only said a generic "uncertain" on missed hazards, so I don't claim it detects them. |
| **1:20–1:32** | **05 / Estimate**: duty + tax in JPY/KRW, threshold badge, assumptions, official link, disclaimer **ESTIMATE**. | Duty and tax are estimates, not legal advice. The assumptions and the official source are right there. |
| **1:32–1:42** | **06 / Format**: Original vs Formatted (Korea) side by side, Romanized line, note "deliverability is not validated". | The address is shown before and after formatting, as a hint — not a validation. |
| **1:42–1:56** | **07 / Compare**: JP → KR **EMS** row, **TABLE** badge, **verified: true**, **1.2 kg = JPY 2,500**, Japan Post source link, ETA marked as my own estimate. Then the rows UPS / FedEx / DHL with **MOCK** badges, and the KR → JP EMS row marked **SAMPLE / unverified** if shown. FX row: LIVE or FALLBACK. | The Japan-to-Korea EMS price is Japan Post's official table, checked on October 26, 2026. UPS, FedEx and DHL are labeled mock in this public demo — there is no EasyPost key. Korea-to-Japan EMS is a labeled sample. Nothing here is real-time or purchasable. |
| **1:56–2:00** | End card: **Hakobu** · app-vert-five-97.vercel.app · github.com/Hwemo-Chung/hakobu · "Estimates, not legal advice." | Models propose; a human confirms. Check the official source before you ship. |

**Narration length:** about 250 words (≈ 1:40 at 150 wpm, leaving ~20 s for holds). If running long, drop the 1:32 address beat first, then shorten the seeded-test sentence. Do not cut the **08 / Routing** panel, the verifier cards, or the LIVE/TABLE/MOCK comparison.

## Honesty checklist
- JP → KR EMS = official Japan Post table, `verified: true`, JPY 2,500 for 1.2 kg (checked 2026-10-26; source page states no effective date; ETA is my own estimate).
- KR → JP EMS = SAMPLE, `verified: false`.
- UPS / FedEx / DHL = **MOCK** in the public demo. Four model steps = **LIVE** (a failed call is labeled MOCK, never shown as live).
- Verifier test: n = 10 synthetic cases, 2 runs each, blatant errors only; hazard detection not shown to work; no accuracy/recall claim for the full pipeline.
- Duty / HS / ETA = estimates or hints, not legal, tax or customs advice. Do not say "real-time" about a table.
- Every number on screen comes from the run; use no invented metrics.
