# Hakobu — demo video script

**Target length:** 2:55 · **Hard limit:** 2:59 · **Format:** 1920×1080, 30 fps, screen recording + voice-over  
**Language:** English narration. English captions. Korean/Japanese UI text is translated on screen.  
**Music:** **None.** Do not add a copyrighted track. Voice-over over silence (or cleared room tone) is the safest choice.  
**Data:** All names, addresses, and parcel contents are synthetic. Blur API keys, browser profiles, and notifications.  
**Trademarks:** Use text labels for EasyPost, Japan Post, frankfurter, and Nebius/NVIDIA. Do not show third-party logos without permission.

> **Must say aloud:** “Nebius Token Factory” and “NVIDIA Nemotron.” Both are spoken at 0:27 and named again in the architecture section at 2:15–2:45.
>
> **Architecture slide:** 2:15–2:45. Do not move it earlier or later; it is the section judges are told to look for.

---

## Timed script

| Time | On-screen action | Narration |
|---|---|---|
| **0:00–0:12** | Close-up of a taped cardboard box on a desk. Three browser tabs labeled “customs,” “carrier rates,” and “address format” close one by one. Cut to the Hakobu dashboard. Lower-third: **Tokyo → Seoul**. | Sending a box from Tokyo to Seoul should not take three tabs and a guess. Can I send it? What code? What will it cost? And how do I write the address? |
| **0:12–0:27** | Dashboard, one screen. Cursor clicks **Load sample shipment**. The **01 / Parcel** form fills with the sample: two item lines, 1.2 kg, and a Seoul address. The form note reads **Sample data is synthetic.** The items box shows a **ceramic teacup** and an **aerosol sunscreen**, each with a JPY value; the **Declared total** updates. Cursor clicks **Build plan**. The loading panel reads **Building the plan** and **Nano classify → Super HS → Nano address → Ultra verify**. | Hakobu puts those four questions on one screen. I start with a plain list — here, a ceramic teacup and an aerosol sunscreen. |
| **0:27–0:45** | Results render: **Plan / JP → KR**, **2 items, 1.2 kg**, **Destination Korea**, and the summary grid (Declared value, Duty + tax estimate, Cheapest listed, ETA range). Top-right badges: **LIVE** (or **MOCK**) and **VERIFIER SUPPORTED** (or UNCERTAIN / CONTRADICTED). Scroll to **08 / Routing — Model / step panel**; point to the four rows — **Classify items + prohibited check** (NVIDIA Nemotron 3 Nano), **HS candidates + duty estimate** (Super), **Address translation** (Nano), **Ultra verification** (Ultra) — each with a **LIVE/MOCK** badge and latency in ms. Use only values from the run. | NVIDIA Nemotron 3 Nano, running on Nebius Token Factory, classifies the items and formats the address. The routing panel logs each step’s model, LIVE or MOCK mode, and latency. |
| **0:45–1:05** | Scroll back up to **02 / Compliance — Prohibited check** (**RULE SNAPSHOT** badge). The sunscreen flag is yellow **NEEDS CHECK** with its basis (**RULE** or **AI FLAG**); point to the reason and the **Official source ↗** link. The teacup shows its own level and basis. Both items stay in the plan; the card states nothing is auto-rejected. | The aerosol is flagged yellow: pressurized containers need a carrier check. Hakobu links the official rule page and does not auto-reject. The flag is advisory — the sender decides what to do before shipping. |
| **1:05–1:25** | **03 / Classify — HS code candidates** (**AI HINT**). Point to the code, description, plain-language rationale, and confidence badge on the candidate rows. Scroll to **04 / Verify — Verifier checks**; the header badge shows the overall verdict, and each check card shows **SUPPORTED / UNCERTAIN / CONTRADICTED**, its reason, and a **Human action** line. Hold on one **UNCERTAIN** card. | Now HS candidates. Nemotron 3 Super proposes codes with plain-language reasons and a confidence label. A separate pass from Nemotron 3 Ultra checks them and flags what it cannot support. The final code is the sender’s call — nothing is filed or submitted. |
| **1:25–1:42** | **05 / Estimate — Duty & tax estimate** (**ESTIMATE**). Point to the duty + tax total in JPY and KRW, declared value in JPY and USD, the duty rate, tax, the **UNDER THRESHOLD / ABOVE THRESHOLD** badge with its label, the assumptions list, the **Official duty reference ↗** link, and the disclaimer. Use only the run’s numbers. | Duty and tax are estimates, not legal advice. The app shows its assumptions, the threshold it applied, and a link to the official source, so I can see why the number moves. |
| **1:42–2:00** | **06 / Format — Address translation** (**AI FORMATTED**). Hold on the **Original** and **Formatted / Korea** boxes side by side, then the **Romanized** line. Read the note: **Formatting is a hint. Confirm field by field; deliverability is not validated.** | Address formatting is a separate step. The app shows the address you entered next to the destination-formatted version, plus a romanized line. It is a hint, not a validation — nothing is final until you check it field by field. |
| **2:00–2:15** | **07 / Compare — Rate comparison**. Table columns: **Basis, Service, Price, ETA, Provenance**. Courier rows show **LIVE** and **EasyPost test mode · [time]**; the Japan Post EMS row shows **TABLE**, its effective date, **verified: false**, and its source link. If a courier call fails, its row is labeled **MOCK — Deterministic mock · not a quote**. The FX row shows **LIVE** or **FALLBACK**, the FX date, JPY→KRW and JPY→USD, and the FX source link. Keep one **LIVE** and the **TABLE** row in the same shot. | Then rates and ETA. EasyPost test rates carry a LIVE badge and a fetch time. The Japan Post EMS row is a table sample, labeled TABLE with its effective date. FX comes from frankfurter.app, or a labeled FALLBACK if it is unreachable. |
| **2:15–2:45** | **Full-screen architecture slide.** Animate left to right: Browser → **Next.js route `/api/plan`** → **Nebius Token Factory** → **NVIDIA Nemotron 3 Nano / Super / Ultra**. Branch to EasyPost (**LIVE**, or **MOCK** fallback), Japan Post EMS table (**TABLE**), and frankfurter.app (**LIVE / FALLBACK**). A small routing-log box shows step, model, mode, latency. Keep the slide still for the full 30 seconds. | Every model call goes to Nebius Token Factory through its OpenAI-compatible API. Three NVIDIA Nemotron models share the work: Nano classifies items, runs the prohibited check, and formats the address; Super proposes HS candidates and the duty estimate; Ultra verifies and flags uncertainty. EasyPost supplies test rates, labeled LIVE or MOCK; the Japan Post EMS row is table-based; FX comes from frankfurter.app or a labeled fallback. The routing log shows model, mode, and latency. Models propose; a human confirms. |
| **2:45–2:55** | Return to the plan: **02 / Compliance** flags, **04 / Verify** verdicts, **07 / Compare** with LIVE/TABLE badges, **08 / Routing**, and the footer **Estimates, not legal advice.** End card: **Hakobu** · app-vert-five-97.vercel.app · github.com/Hwemo-Chung/hakobu · video https://youtu.be/ytUPLzPD_G8. Small text: **Estimates, not legal advice.** | Hakobu is one screen, honest labels, and a human at the end. Rates and duty are estimates. Check the official source before you ship. |

**Total: 2:55.** The last five seconds are a hold on the end card; do not add a music sting.

### Architecture slide layout (2:15–2:45)

Use one clean slide, large type, no code screenshots. A simple left-to-right layout works:

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser: one-screen dashboard                              │
└───────────────────────────┬─────────────────────────────────┘
                            │  POST /api/plan
┌───────────────────────────▼─────────────────────────────────┐
│  Next.js server route: /api/plan                            │
│  classify · prohibited · HS · duty · address · verify       │
│  rates · FX                                                 │
└───────┬───────────────────┬───────────────────┬─────────────┘
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────────┐
│  MODEL ROUTER  │  │  RULES + TABLES│  │  RATE ADAPTERS     │
│  Nano          │  │  prohibited    │  │  EasyPost          │
│  Super         │  │  duty          │  │    (LIVE / MOCK)   │
│  Ultra         │  │  threshold     │  │  Japan Post EMS    │
│                │  │                │  │    (TABLE)         │
│                │  │                │  │  frankfurter       │
│                │  │                │  │    (LIVE/FALLBACK) │
└───────┬────────┘  └────────────────┘  └────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────┐
│  Nebius Token Factory  ·  OpenAI-compatible API             │
│  NVIDIA Nemotron 3 Nano   → classify / prohibited / address │
│  NVIDIA Nemotron 3 Super  → HS candidates / duty            │
│  NVIDIA Nemotron 3 Ultra  → verify / uncertainty            │
└─────────────────────────────────────────────────────────────┘

Routing log: step · model · mode · latency
```

Keep the three model rows visible for the full 30 seconds. The narration names **Nebius Token Factory** and **NVIDIA Nemotron**; the slide should spell them the same way. Add a small footer: **“Models propose. A human confirms.”**

---

## Full voice-over (read in order)

> Sending a box from Tokyo to Seoul should not take three tabs and a guess. Can I send it? What code? What will it cost? And how do I write the address?
>
> Hakobu puts those four questions on one screen. I start with a plain list — here, a ceramic teacup and an aerosol sunscreen.
>
> NVIDIA Nemotron 3 Nano, running on Nebius Token Factory, classifies the items and runs the prohibited check. The routing panel logs each step’s model, whether it ran live or as a labeled mock, and its latency.
>
> The aerosol is flagged yellow: pressurized containers need a carrier check. Hakobu links the official rule page and does not auto-reject. The flag is advisory — the sender decides what to do before shipping.
>
> Now HS candidates. Nemotron 3 Super proposes codes with plain-language reasons and a confidence label. A separate pass from Nemotron 3 Ultra checks them and flags what it cannot support. The final code is the sender’s call — nothing is filed or submitted.
>
> Duty and tax are estimates, not legal advice. The app shows its assumptions, the threshold it applied, and a link to the official source, so I can see why the number moves.
>
> Address formatting is a separate step. The app shows the address you entered next to the destination-formatted version, plus a romanized line. It is a hint, not a validation — nothing is final until you check it field by field.
>
> Then rates and ETA. EasyPost test rates carry a live badge and a fetch time. The Japan Post EMS row comes from an official table, labeled table-based with its effective date. FX comes from frankfurter.app, or a labeled fallback if it is unreachable.
>
> Every model call goes to Nebius Token Factory through its OpenAI-compatible API. Three NVIDIA Nemotron models share the work: Nano classifies items, runs the prohibited check, and formats the address; Super proposes HS candidates and the duty estimate; Ultra verifies and flags uncertainty. EasyPost supplies test rates, labeled live or mock; the Japan Post EMS row is table-based; FX comes from frankfurter.app or a labeled fallback. The routing log shows model, mode, and latency. Models propose; a human confirms.
>
> Hakobu is one screen, honest labels, and a human at the end. Rates and duty are estimates. Check the official source before you ship.

**Word count:** ~382 words. At a calm 150–155 words per minute, this reads in about 2:30, leaving roughly 20–25 seconds for visual holds and transitions. Rehearse with a timer. If you finish early, hold longer on the architecture slide, **07 / Compare**, and the end card; do not add claims that are not on screen. If you run long, use the trim plan below; do not speed up the narration into an auctioneer voice.

---

## Production notes

### Before recording

- Record at 1080p or higher, 30 fps. Browser zoom 110–125% so text is readable on a phone.
- Hide bookmarks, extensions, notifications, and personal tabs. Use a clean browser profile.
- Blur or remove API keys, `.env` files, terminal history, and account menus.
- Use only synthetic names and addresses. Do not show a real parcel label or phone number.
- Prefer text labels over third-party logos. If a logo appears, it must be a nominative reference you have the right to show; when in doubt, use text.
- Load the sample shipment once before recording so the app is warm. Do not fake a cold start.

### During recording

- Keep the cursor visible and move slowly. Use a click highlight if available.
- Pause for one second after each click so the UI state is readable.
- Show the **08 / Routing** panel long enough to read all four rows; if time allows, return to it in the closing montage.
- Hold on one **UNCERTAIN** check in **04 / Verify** long enough to read the verdict, reason, and **Human action** line.
- In **07 / Compare**, show a **LIVE** row and the **TABLE** row in the same shot. If the courier call fails, show **MOCK** and **TABLE** instead; never call MOCK live. This is the honesty moment.
- Measured on 2026-10-23 (5 runs, sample shipment): the four model steps take about 0.7–1.6 s each (median), and model cost is about $0.0023 per plan. If you say a number on camera, use these, not rounder ones.
- Do not speed up footage in a way that misrepresents latency. If you cut waiting time, cut it; do not claim it was real-time.
- If a live API fails, stop and retry. If it still fails, use the labeled **MOCK** fallback and keep the **MOCK** badge visible. Never show a MOCK run as LIVE.

### After recording

- Add English captions. If Korean or Japanese appears, add an English translation on screen.
- Keep the architecture slide still for the full 2:15–2:45 window. Do not animate text so fast that a judge cannot read the model names.
- End on the disclaimer. Do not add a copyrighted song, a trending audio clip, or a third-party jingle.
- Export at 1080p, H.264, AAC. Check that the final duration is under 3:00 in the YouTube player, not just in the editor.
- Upload as **Public** on YouTube. Confirm the video plays in an incognito window.

### If you are running long (trim plan)

Cut in this order until you are under 2:55:

1. Rebuild with a single-item parcel. Saves ~10 seconds.
2. Drop the FX sentence from the narration. Saves ~3 seconds.
3. Shorten the architecture narration to the three model roles plus “Models propose; a human confirms.” Saves ~5 seconds.
4. Remove the hold on **06 / Format**; keep one static shot of the Original and Formatted boxes. Saves ~4 seconds.

Do **not** cut the architecture slide, the verifier badge, or the live/table comparison. Those are the three things the video is selling.

---

## YouTube metadata

**Title:** Hakobu — one screen for Korea–Japan parcels | Nebius Token Factory + NVIDIA Nemotron

**Description:**

```text
Hakobu is a one-screen cross-border parcel dashboard for Korea ↔ Japan.
It checks prohibited/quarantine risk, suggests HS code candidates, estimates duty,
formats the address, and compares live courier rates with official postal tables.
Every AI call goes to Nebius Token Factory and runs on NVIDIA Nemotron models:
Nano for classification and address formatting, Super for HS candidates and duty,
Ultra as the verifier. FX comes from frankfurter.app (LIVE or labeled FALLBACK).

Demo: https://app-vert-five-97.vercel.app
Source: https://github.com/Hwemo-Chung/hakobu
Track: Best Apps & Agents — Nebius x NVIDIA Global AI Hackathon

Duty, tax, HS, and ETA outputs are estimates, not legal advice. EasyPost rates are
test-mode rates, not purchasable quotes. Japan Post rates are table-based.
All demo data is synthetic.

Music: none.
```

**Tags:** Nebius Token Factory, NVIDIA Nemotron, Nemotron 3, AI agent, cross-border shipping, HS code, customs, Korea, Japan, EasyPost, frankfurter, Next.js

**Thumbnail:** Hakobu dashboard with the **08 / Routing** panel visible and the text “One screen. Three models. A human decides.” No third-party logos.

---

## Compliance checklist

- [ ] Final duration is under 3:00 (target 2:55).
- [ ] Video is **Public** on YouTube and plays in incognito.
- [ ] Narration says **“Nebius Token Factory”** aloud.
- [ ] Narration says **“NVIDIA Nemotron”** aloud.
- [ ] Architecture slide runs **2:15–2:45** and names Nano, Super, and Ultra.
- [ ] No copyrighted music. No trending audio. No third-party jingle.
- [ ] No company branding, internal screens, or confidential references.
- [ ] No real names, addresses, phone numbers, API keys, or account screens.
- [ ] No payment or checkout flow shown. Payment is out of scope for this submission.
- [ ] Every number shown is from the run; no invented metrics.
- [ ] Any fallback shown carries its own label — **MOCK** for AI/carrier fallback, **FALLBACK** for FX — and nothing fallback is presented as live.
- [ ] Duty/HS/ETA outputs are labeled estimates; the disclaimer is visible.
- [ ] **LIVE**, **MOCK**, and **TABLE** rates are labeled distinctly; no “real-time” claim for postal tables.
- [ ] Demo, repo, and video links are filled in before publishing.
- [ ] English narration and captions; Korean/Japanese UI text is translated.
- [ ] The features shown exist in the public repo.
