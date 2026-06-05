# Auto-Captioning Implementation Plan

Auto-generated captions for videos uploaded to Bunny.net Stream, with English translation when the source is non-English, stored in MongoDB, surfaced in the player CC menu.

**Status:** plan only — not yet implemented. Awaiting go-ahead.

---

## TL;DR — Recommendation

**For the launch: use Bunny Stream's native Transcribe AI + Bunny Translate.** Captions render natively inside the Bunny iframe player, so the iOS `app://` Player.js postMessage bug isn't on the critical path. One vendor, one bill, one API surface, ~1 day of integration work.

**Keep a back-door for cost.** Bunny's pricing is **$0.10/min per language** (confirmed on the live pricing page — every transcription pass is 1 lang-min, every translation pass is another). At sustained 1,000+ videos/month, swap ZH transcription to **Deepgram Nova-3 Multilingual** (~10× cheaper per minute) and push the resulting VTT back to Bunny via the Add Caption REST endpoint. Same DB schema, same player rendering — only the STT step swaps out.

**Sources:**
- Bunny Transcribe AI docs: <https://docs.bunny.net/stream/transcribing>
- Bunny pricing: confirmed `$0.10/min/language` for Transcribing on bunny.net's Stream pricing tab
- Bunny webhooks: <https://docs.bunny.net/stream/webhooks>
- Bunny Add Caption API: <https://docs.bunny.net/reference/video_addcaption>

---

## 1. Architecture

```
┌────────────┐  upload  ┌─────────────┐
│  Creator   │ ───────► │  Bunny      │
└────────────┘          │  Stream     │
                        │  (encode)   │
                        └──────┬──────┘
                               │ webhook: Finished (status=3)
                               ▼
                ┌────────────────────────────┐
                │ Netlify Function           │
                │ /api?type=bunnyWebhook     │
                │ 1. signature / idempotency │
                │ 2. enqueue in captionJobs  │
                │ 3. POST .../transcribe     │
                └──────┬─────────────────────┘
                       │ (Bunny processes async)
                       │
                       │ webhook: CaptionsGenerated (status=9)
                       ▼
                ┌────────────────────────────┐
                │ Netlify Function           │
                │ /api?type=captionsReady    │
                │ 1. GET caption VTT(s)      │
                │ 2. detect source lang      │
                │ 3. if non-EN → POST        │
                │    .../translate?to=en     │
                │ 4. on CaptionsGenerated #2 │
                │ 5. parse VTT → cues        │
                │ 6. save to MongoDB         │
                └────────────────────────────┘

Playback: <iframe src="iframe.mediadelivery.net/embed/…">
  Bunny player auto-shows CC menu with EN (+ ZH, if present).
  iOS app:// quirk doesn't apply — captions are baked into the player.
```

**Where each step runs**

- **Bunny Stream** — hosts video, runs STT and translation, serves caption tracks to its player.
- **Netlify Functions** (`netlify/functions/utils/`) — one endpoint accepts Bunny lifecycle webhooks, another handles `CaptionsGenerated`. Both stateless; business logic in a new `utils/captions.js`.
- **MongoDB** — stores captions for our own use (UI list, future "search by line", optional overlay fallback). NOT the playback delivery path.
- **No external queue** at this scale; the Bunny webhook + a Mongo `captionJobs` document with a status state machine gives idempotency. Add Netlify Background Functions or a cron if we ever need rate limiting / retries.

**Backfill** is the same pipeline driven by a one-shot runner: enumerate Bunny library (`GET /library/{id}/videos?page=…`), look up each `videoId` in our captions collection, and for any video missing an `en` track, call the same `transcribe → (translate if not EN)` path. Throttle to N parallel jobs, persist progress in Mongo so it survives function timeouts.

---

## 2. Technology

### STT: **Bunny Transcribe AI** (primary), Deepgram Nova-3 Multilingual (fallback)

Bunny Transcribe AI is built on Whisper and explicitly lists 56 source languages including Chinese (`zh`). Captions show up in the Bunny iframe player's CC menu automatically.

| Provider | Per-min (PAYG) | Native ZH | Native VTT? | Translate? | Source |
|---|---|---|---|---|---|
| **Bunny Transcribe AI** | **$0.10/lang-min** | ✅ Whisper-based | ✅ in player | ✅ to 57 langs | [pricing](https://bunny.net/stream/), [docs](https://docs.bunny.net/stream/transcribing) |
| **Deepgram Nova-3 Multilingual** | $0.0092 | ✅ zh-CN / zh-TW / zh-HK | JSON → convert | No (use side-pass) | [pricing](https://deepgram.com/pricing) |
| OpenAI `whisper-1` | $0.006 | ✅ | ✅ srt/vtt | ✅ ZH→EN only | [pricing](https://openai.com/api/pricing/), [STT guide](https://developers.openai.com/api/docs/guides/speech-to-text) |
| OpenAI `gpt-4o-transcribe` | ~$0.006 | ✅ | ❌ json/text only | ❌ | [STT guide](https://developers.openai.com/api/docs/guides/speech-to-text) |
| OpenAI `gpt-4o-mini-transcribe` | ~$0.003 | ✅ | ❌ json/text only | ❌ | [pricing](https://openai.com/api/pricing/) |
| AssemblyAI Universal-2 | $0.0025 + $0.001 translate | ✅ | JSON → convert | ✅ add-on | [pricing](https://www.assemblyai.com/pricing/) |
| Self-hosted Whisper-large-v3 (Modal/Salad GPU) | $0.001–0.003 | ✅ | via library | ZH→EN only | [Modal](https://modal.com/blog/how-to-deploy-whisper), [Salad](https://blog.salad.com/whisper-large-v3/) |

**Why Bunny wins the primary slot despite being more expensive per minute**

1. **Zero playback engineering.** Captions show up in the Bunny embed's CC menu automatically; we don't need to render anything in the SolidJS shell — so we don't fight the iOS `app://localhost` Player.js postMessage bug for caption sync.
2. **One vendor.** STT + translation + delivery in one bill, one API surface.
3. **Webhooks are first-class.** `CaptionsGenerated` (id 9) plus the lifecycle events (`Finished` = 3, `Resolution finished` = 4) give clean idempotent triggers.

**Why we keep a fallback ready:** if Mandarin quality disappoints on real drama dialogue, Deepgram Nova-3 Multilingual is ~10× cheaper per minute and we keep rendering identical by uploading the VTT back to Bunny via Add Caption.

### Translation: **Bunny built-in** (primary), gpt-4o-mini (fallback)

Bunny advertises translation to ~57 target languages including English. When source is detected as `zh`, ask Bunny to translate to EN — billed at the same $0.10/lang-min as a second transcription pass.

If we move to the external pipeline later, the cheapest sane translator for cue-level ZH→EN is **gpt-4o-mini** at ~$0.40–$0.75 per 1M characters end-to-end. DeepL is the quality champion but more expensive.

**Do NOT use Whisper's own `/translations` endpoint as the strategy.** Two reasons:

- It only translates *into* English, so we can never add ZH→ES (or any other target) without a real translator.
- Whisper `turbo` silently ignores `task=translate` and returns source-language text. Use `medium` or `large` if self-hosting.

### Language detection

Both Bunny and Whisper auto-detect. Threshold: detected language confidence ≥ 0.7 AND detected ≠ `en` → run a translation pass. Below 0.7, transcribe-only and flag the doc with `lang: 'unknown'` for manual review — better than silently translating an English video.

### Caption storage (MongoDB)

One document per `(videoId, lang)`:

```js
// collection: captions
{
  _id,                          // ObjectId
  videoId: 'abc-bunny-guid',    // Bunny video GUID
  lang: 'en',                   // BCP-47 / ISO-639 short
  label: 'English',             // for picker UI
  source: 'bunny' | 'deepgram' | 'whisper',
  cues: [
    { start: 1.23, end: 4.56, text: '...' },
    // ...
  ],
  vtt: 'WEBVTT\n\n00:00:01.230 --> 00:00:04.560\n...',  // pre-rendered
  createdAt, updatedAt
}

// indexes
captions.createIndex({ videoId: 1, lang: 1 }, { unique: true })
captions.createIndex({ videoId: 1 })
```

Storing both `cues` (for in-app search) and `vtt` (for direct serving as a fallback `<track>` source) costs almost nothing and unlocks future features.

### Playback / display — **Option A (Bunny native CC)**

The Add Caption endpoint exists: `POST https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}/captions/{srclang}` with the `AccessKey` header. When we use Bunny's own Transcribe AI, captions are already attached server-side; when we fall back to an external STT, we upload the VTT and the Bunny player renders it in the standard CC menu. Either way the SolidJS shell does no caption work — compatible with the iOS `app://` quirk.

Keep **Option C** (HLS via native `<video>` + `<track>`) on the shelf — removes the iframe dependency but is a much bigger rewrite (URL signing, custom player UI, fullscreen, AirPlay). Not justified just for captions.

### New-upload trigger (Bunny webhooks)

Register one webhook URL and switch on the `Status` integer in the body:

| Status | Meaning | What we do |
|---|---|---|
| 0 | Queued | ignore |
| 1 | Processing | ignore |
| 2 | Encoding | ignore |
| 3 | Finished | **fire transcription request** |
| 4 | Resolution finished | "video is playable" (use as a backup trigger) |
| 9 | CaptionsGenerated | **fetch VTT, translate if needed, store** |

Two endpoints in Netlify Functions; both store a `captionJobs` row keyed by `(videoId, lang)` with state machine `queued → transcribed → translated → stored` so retries are idempotent.

### Backfill design

1. `GET /library/{id}/videos?page=…` to enumerate. Persist a cursor in a `captionBackfill` doc.
2. For each video, check `captions` for an `en` track. Skip if present.
3. POST Bunny's transcription request, write a `captionJobs` row.
4. Throttle to N=5 concurrent in-flight jobs; Bunny webhooks complete them async.
5. Re-run the runner on a daily cron to pick up stragglers.

At 1,000 videos × 4-min avg and moderate parallelism, the backfill finishes within a day (Bunny processes async on their side; we're just orchestrating).

---

## 3. Cost Analysis

**Confirmed pricing from Bunny Stream pricing tab:**

- Transcoding: **FREE**
- Transcribing: **$0.10/minute per language**
- Storage: from $0.01/GB
- CDN: from $0.005/GB

**Assumptions** for all rows: 4-minute average video; 50% non-English (needs transcription + translation = 2 lang-minutes per non-EN video, 1 per EN video). For external-path translation cost: ~30 spoken words/min × 4 min ≈ 120 words ≈ 720 chars per non-EN video.

Lang-minute multiplier = **1.5×** the raw video minutes (0.5·1 + 0.5·2).

### Per-scenario monthly cost

| Volume | Raw min/mo | Lang-min/mo | **Bunny path** | **External path** (Deepgram Nova-3 + gpt-4o-mini) |
|---|---|---|---|---|
| 100 vids | 400 | 600 | **$60** | 400 × $0.0092 + ~$0.01 ≈ **$3.69** |
| 500 vids | 2,000 | 3,000 | **$300** | 2,000 × $0.0092 + ~$0.07 ≈ **$18.47** |
| 2,000 vids | 8,000 | 12,000 | **$1,200** | 8,000 × $0.0092 + ~$0.29 ≈ **$73.89** |

### One-time backfill (1,000 existing videos, avg 4 min)

- **Bunny path:** 4,000 × 1.5 = 6,000 lang-min × $0.10 = **$600**
- **External path:** 4,000 × $0.0092 + 500 vids × 720 chars × $0.40/1M ≈ **~$37**

### Other line items (all negligible)

- **Netlify Functions:** free up to 125k invocations/mo + 100h compute. Even at 2,000 vids/mo × ~6 invocations/video ≈ 12k invocations — well inside free.
- **MongoDB storage:** each VTT is a few kB; 2,000 videos × 2 tracks ≈ 16 MB/month of new captions. Irrelevant.

### The cost picture, plain

At **100 vids/mo**, Bunny is $60/mo and the simplicity is clearly worth it. At **2,000 vids/mo**, Bunny is $1,200 vs ~$74 external — a $1,125/mo gap that pays back the engineering investment in 2–3 months.

### Break-even rule of thumb

| Monthly volume | Bunny | External hybrid | Worth switching? |
|---|---|---|---|
| 100 vids | $60 | ~$4 | No — simplicity wins |
| 500 vids | $300 | ~$19 | Borderline |
| 2,000 vids | $1,200 | ~$74 | Yes — pays back in 2–3 mo |

---

## 4. Risks & Open Questions

1. **Bunny "auto-transcribe on encode finish" is unconfirmed.** Likely we must explicitly call a "generate transcription" endpoint after the `Finished` (status 3) webhook rather than relying on automatic behavior. The design above already assumes explicit; verify so we don't waste time looking for a setting.
2. **Add Caption request body shape.** The "base64 captions file + label + srclang" shape was marginal in research verification. Before coding the fallback path, hit Bunny's live API reference and confirm exact field names (and whether the file goes as base64 in JSON or raw multipart).
3. **Mandarin quality.** Bunny's Whisper-based engine vs Deepgram Nova-3 Multilingual on actual drama dialogue is unmeasured. Worth a small spike: 10 representative ZH clips through both pipelines, eye-grade the captions. If Bunny is clearly worse, switch to Deepgram-for-ZH-only and keep Bunny for EN.
4. **Cross-language code-switching.** Deepgram Nova-3 does intra-clip code-switching for 10 languages but Mandarin isn't among them; mixed EN↔ZH clips will land in whichever language dominates. Bunny Whisper handles this slightly better. Tell creators that mixed-language clips may get a single-language caption.
5. **`whisper-1` for ZH→EN translation** only outputs English; can't translate to any other target. Not a now-problem given the EN-only display rule.
6. **Backfill stampede.** If 1,000 videos all kick off transcription at once, Bunny may rate-limit and the bill could spike. Mitigation: the job throttle (N=5 concurrent) + daily cron.
7. **Iframe CC menu default selection.** Does the Bunny embed auto-select a track based on `Accept-Language` or an embed URL param, or does the user always pick from the CC menu? 30-second smoke test before promising "Chinese users see Chinese subs automatically."
8. **iOS `app://` quirk.** Caption rendering is unaffected (Bunny player owns it). The existing wall-clock 3-second preview fallback in PhonePlayer / Player.tsx remains the right model for any future timeupdate-driven feature.

---

## 5. v1 Implementation Sketch (Bunny-native)

Once go-ahead is given, the file-level changes:

1. **`netlify/functions/utils/bunny.js`** (new) — thin client for Bunny Stream API: `transcribeVideo(videoId)`, `translateCaption(videoId, srcLang, targetLang)`, `getCaption(videoId, lang)`, `addCaption(videoId, srcLang, label, vttBase64)`, `listVideos(page)`.
2. **`netlify/functions/utils/captions.js`** (new) — pipeline orchestration: `handleBunnyWebhook(body)`, `handleCaptionsReady(body)`, `parseVttToCues(vtt)`, `cuesToVtt(cues)`.
3. **`netlify/functions/utils/handlers.js`** — add two handler entries: `bunnyWebhook` (POST) and `runBackfill` (POST, admin-only).
4. **`netlify/functions/api.js`** — register the two new handlers in `apiHandlers`.
5. **MongoDB:** `captions` collection (unique index on `videoId+lang`) and `captionJobs` collection (state machine).
6. **Player side: zero changes.** The Bunny embed shows the CC menu automatically.
7. **Backfill runner** — a script (`scripts/backfill-captions.cjs` or a one-shot admin endpoint) that enumerates videos and seeds `captionJobs`.

Open question before coding: does Bunny auto-transcribe on encode-finish, or do we need to fire `POST .../transcribe` explicitly? Resolve via dashboard / docs spike.

---

## 6. Next Steps

- [ ] **30-min spike** — enable Transcribe AI on one test video in the Bunny dashboard, confirm webhook payload format and whether transcription is automatic or explicit, time how long Mandarin captions take to appear.
- [ ] **Quality eye-grade** — pick 10 representative ZH clips, transcribe via Bunny, sanity-check on real dialogue. (Optional: also run them through Deepgram Nova-3 to gauge whether the hybrid path is needed.)
- [ ] **Decide:** commit to Bunny-native v1, or jump straight to the hybrid (Bunny EN + Deepgram ZH + Add Caption upload).
- [ ] On go-ahead: implement the file changes above; ship behind a per-video `captionsEnabled` flag so creators can opt in/out during the rollout.

---

*Generated 2026-06-04. Pricing confirmed against Bunny Stream pricing tab on the same date.*
