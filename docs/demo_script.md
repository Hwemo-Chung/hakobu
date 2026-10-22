# Hakobu — demo video script

**Target length:** 2:55 · **Hard limit:** 2:59 · **Format:** 1920×1080, 30 fps, screen recording + voice-over  
**Language:** English narration. English captions. Korean/Japanese UI text is translated on screen.  
**Music:** **None.** Do not add a copyrighted track. Voice-over over silence (or cleared room tone) is the safest choice.  
**Data:** All names, addresses, and parcel contents are synthetic. Blur API keys, browser profiles, and notifications.  
**Trademarks:** Use text labels for EasyPost, Japan Post, Tavily, and Nebius/NVIDIA. Do not show third-party logos without permission.

> **Must say aloud:** “Nebius Token Factory” and “NVIDIA Nemotron.” Both appear at 0:27 and again in the architecture section at 2:15–2:45.
>
> **Architecture slide:** 2:15–2:45. Do not move it earlier or later; it is the section judges are told to look for.

---

## Timed script

| Time | On-screen action | Narration |
|---|---|---|
| **0:00–0:12** | Close-up of a taped cardboard box on a desk. Three browser tabs labeled “customs,” “carrier rates,” and “address format” close one by one. Cut to the Hakobu dashboard. Lower-third: **Tokyo → Seoul**. | Sending a box from Tokyo to Seoul should not take three tabs and a guess. Can I send it? What code? What will it cost? And how do I write the address? |
| **0:12–0:27** | Dashboard, one screen. Cursor clicks **Load sample shipment**. The step rail fills: Extract → Check → HS → Duty → Address → Rates. The item card shows “ceramic teacup” and “aerosol sunscreen.” On-screen label: **sample data**. | Hakobu puts those four questions on one screen. I start with a photo or a plain list — here, a ceramic teacup and an aerosol sunscreen. |
| **0:27–0:45** | The extraction card animates in. Open the **model router** panel. Highlight the row: **Nemotron 3 Nano · Nebius Token Factory**. Show live token/latency/cost values from the recorded run. Do not stage fake numbers. | NVIDIA Nemotron 3 Nano, running on Nebius Token Factory, extracts the items, quantities, and risk signals as structured JSON. The router panel shows which model ran, plus tokens, latency, and cost. |
| **0:45–1:05** | The sunscreen card turns yellow: **NEEDS CHECK**. Open the source popover: reason, official page, retrieval date. The cursor clicks **Remove and continue**. The teacup stays. | The aerosol is flagged yellow: pressurized containers need a carrier check. Hakobu links the current rule page and does not auto-reject. I remove it and continue with the teacup. |
| **1:05–1:25** | HS card. Three candidate rows appear from **Nemotron 3 Super**, each with a plain-language rationale. The **Nemotron 3 Ultra** verifier badge appears on each row: **supported / uncertain / contradicted**. Open one **uncertain** badge to show the reason and missing evidence. Cursor clicks **Confirm code**. | Now HS candidates. Nemotron 3 Super proposes codes with plain-language reasons. Then Nemotron 3 Ultra verifies each candidate against the item description and flags the one it cannot support. I confirm the final code — the sender stays responsible. |
| **1:25–1:42** | Duty card. Highlight the **ESTIMATE** label, the assumption chips, the threshold, the FX date, and the official-source link. Do not show a number that is not from the run. | Duty and tax are estimates, not legal advice. The app shows the assumption, the threshold it applied, and a link to the official source, so I can see why the number moves. |
| **1:42–2:00** | Address card. Split view: Japanese original on the left, Korean formatted version on the right, field-level highlights. Cursor scrolls the diff and clicks **Confirm address**. | Address formatting is a separate step. Super converts the Japanese address into Korean order and romanization. Original and converted sit side by side, and nothing is final until I approve it. |
| **2:00–2:15** | Rate comparison. Courier rows carry a green **LIVE** badge and a timestamp; Japan Post rows carry a grey **TABLE** badge and an effective date. FX line shows the rate and date. Scroll slowly; do not fake a “real-time” label on the table rows. | Then rates and ETA. EasyPost test rates for couriers carry a live badge. Japan Post EMS, air, and surface come from an official table, labeled table-based with its effective date. FX comes from frankfurter.app. |
| **2:15–2:45** | **Full-screen architecture slide.** Animate left to right: Browser → Next.js server routes → **Nebius Token Factory** → **NVIDIA Nemotron 3 Nano / Super / Ultra**. Branch to EasyPost (LIVE), Japan Post table (TABLE), frankfurter.app (FX), and Tavily (optional). A small router-log box shows model, tokens, latency, cost. Keep the slide still for the full 30 seconds. | Every model call goes to Nebius Token Factory through its OpenAI-compatible API. Three NVIDIA Nemotron models share the work: Nano for extraction, Super for HS candidates and address formatting, and Ultra as the verifier that checks both and flags uncertainty. EasyPost supplies live test rates; Japan Post rates come from an official table; Tavily is optional for current rule pages. The router logs model, tokens, latency, and cost. Models propose; a human confirms. |
| **2:45–2:55** | Return to the dashboard: confirmed HS, confirmed address, selected option, visible disclaimer footer. End card: **Hakobu** · demo / repo / video links [TBD]. Small text: **Estimates, not legal advice.** | Hakobu is one screen, honest labels, and a human at the end. Rates and duty are estimates. Check the official source before you ship. |

**Total: 2:55.** The last five seconds are a hold on the end card; do not add a music sting.

### Architecture slide layout (2:15–2:45)

Use one clean slide, large type, no code screenshots. A simple left-to-right layout works:

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser: one-screen dashboard                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Next.js server routes                                      │
│  plan · rates · rules · address · verify                    │
└───────┬───────────────────┬───────────────────┬─────────────┘
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────────┐
│  MODEL ROUTER  │  │  RULES + TABLES│  │  RATE ADAPTERS     │
│  Nano → Super  │  │  prohibited    │  │  EasyPost  (LIVE)  │
│  → Ultra       │  │  duty / HS     │  │  Japan Post(TABLE) │
└───────┬────────┘  └────────────────┘  │  frankfurter (FX)  │
        │                                └────────────────────┘
┌───────▼─────────────────────────────────────────────────────┐
│  Nebius Token Factory  ·  OpenAI-compatible API             │
│  NVIDIA Nemotron 3 Nano   → extract / classify              │
│  NVIDIA Nemotron 3 Super  → HS candidates / address         │
│  NVIDIA Nemotron 3 Ultra  → verifier / uncertainty          │
└─────────────────────────────────────────────────────────────┘

Router log: model · tokens · latency · cost        Tavily: optional
```

Keep the three model rows visible for the full 30 seconds. The narration names **Nebius Token Factory** and **NVIDIA Nemotron**; the slide should spell them the same way. Add a small footer: **“Models propose. A human confirms.”**

---

## Full voice-over (read in order)

> Sending a box from Tokyo to Seoul should not take three tabs and a guess. Can I send it? What code? What will it cost? And how do I write the address?
>
> Hakobu puts those four questions on one screen. I start with a photo or a plain list — here, a ceramic teacup and an aerosol sunscreen.
>
> NVIDIA Nemotron 3 Nano, running on Nebius Token Factory, extracts the items, quantities, and risk signals as structured JSON. The router panel shows which model ran, plus tokens, latency, and cost.
>
> The aerosol is flagged yellow: pressurized containers need a carrier check. Hakobu links the current rule page and does not auto-reject. I remove it and continue with the teacup.
>
> Now HS candidates. Nemotron 3 Super proposes codes with plain-language reasons. Then Nemotron 3 Ultra verifies each candidate against the item description and flags the one it cannot support. I confirm the final code — the sender stays responsible.
>
> Duty and tax are estimates, not legal advice. The app shows the assumption, the threshold it applied, and a link to the official source, so I can see why the number moves.
>
> Address formatting is a separate step. Super converts the Japanese address into Korean order and romanization. Original and converted sit side by side, and nothing is final until I approve it.
>
> Then rates and ETA. EasyPost test rates for couriers carry a live badge. Japan Post EMS, air, and surface come from an official table, labeled table-based with its effective date. FX comes from frankfurter.app.
>
> Every model call goes to Nebius Token Factory through its OpenAI-compatible API. Three NVIDIA Nemotron models share the work: Nano for extraction, Super for HS candidates and address formatting, and Ultra as the verifier that checks both and flags uncertainty. EasyPost supplies live test rates; Japan Post rates come from an official table; Tavily is optional for current rule pages. The router logs model, tokens, latency, and cost. Models propose; a human confirms.
>
> Hakobu is one screen, honest labels, and a human at the end. Rates and duty are estimates. Check the official source before you ship.

**Word count:** ~424 words. At a calm 150–155 words per minute, this reads in about 2:45–2:50, leaving a few seconds for transitions. Rehearse with a timer. If you run long, use the trim plan below; do not speed up the narration into an auctioneer voice.

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
- Open the router panel at least twice: once during extraction, once during verification.
- Open one verifier badge long enough to read the verdict and the missing evidence.
- Show both a **LIVE** and a **TABLE** badge in the same shot. This is the honesty moment.
- Do not speed up footage in a way that misrepresents latency. If you cut waiting time, cut it; do not claim it was real-time.
- If a live API fails, stop and retry. If it still fails, use the labeled **recorded run** mode and keep the label visible. Never show a recorded run as live.

### After recording

- Add English captions. If Korean or Japanese appears, add an English translation on screen.
- Keep the architecture slide still for the full 2:15–2:45 window. Do not animate text so fast that a judge cannot read the model names.
- End on the disclaimer. Do not add a copyrighted song, a trending audio clip, or a third-party jingle.
- Export at 1080p, H.264, AAC. Check that the final duration is under 3:00 in the YouTube player, not just in the editor.
- Upload as **Public** on YouTube. Confirm the video plays in an incognito window.

### If you are running long (trim plan)

Cut in this order until you are under 2:55:

1. Remove the aerosol item and use a single-item parcel. Saves ~10 seconds.
2. Drop the FX sentence from the narration. Saves ~3 seconds.
3. Shorten the architecture narration to the three model roles plus “Models propose; a human confirms.” Saves ~5 seconds.
4. Remove the address diff scroll; keep one static split view. Saves ~4 seconds.

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
Nano for extraction, Super for HS/address, Ultra as the verifier.

Demo: [TBD]
Source: [TBD]
Track: Best Apps & Agents — Nebius x NVIDIA Global AI Hackathon

Duty, tax, HS, and ETA outputs are estimates, not legal advice. EasyPost rates are
test-mode rates, not purchasable quotes. Japan Post rates are table-based.
All demo data is synthetic.

Music: none.
```

**Tags:** Nebius Token Factory, NVIDIA Nemotron, Nemotron 3, AI agent, cross-border shipping, HS code, customs, Korea, Japan, EasyPost, Tavily, Next.js

**Thumbnail:** Hakobu dashboard with the model-router panel open and the text “One screen. Three models. A human decides.” No third-party logos.

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
- [ ] Every number shown is from the recorded run; no invented metrics.
- [ ] Duty/HS/ETA outputs are labeled estimates; the disclaimer is visible.
- [ ] Live and table rates are labeled differently; no “real-time” claim for postal tables.
- [ ] Demo, repo, and video links are filled in before publishing.
- [ ] English narration and captions; Korean/Japanese UI text is translated.
- [ ] The features shown exist in the public repo.
