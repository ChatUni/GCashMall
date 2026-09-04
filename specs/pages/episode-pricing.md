# Episode Pricing

What it costs to generate one episode in Quick Create, and how that cost is collected.

No episode is free — including the first. Every episode is priced the same way.

## Tiers

Price is `credits per second × seconds`. The tier chosen at purchase is stored on the
production document, so the render uses the model and resolution that was paid for rather
than the admin default.

| Tier | Model | Resolution | Credits/sec |
|---|---|---|---|
| `mini-480p` (default) | `bytedance/seedance-2.0-mini` | 480p | 4 |
| `mini-720p` | `bytedance/seedance-2.0-mini` | 720p | 6 |
| `fast-480p` | `bytedance/seedance-2.0-fast` | 480p | 9 |
| `fast-720p` | `bytedance/seedance-2.0-fast` | 720p | 12 |

## Length

The creator chooses a target length of **30 or 60 seconds**. Any other value falls back to
30, so a hand-crafted request cannot quote itself a cheaper hold than it renders.

The choice is stored as the production's `episodeLength` and passed to the Episode Director
as `targetDurationSeconds`, which plans shot count and durations from it. It is chosen at
purchase, not on the idea page, because it is a price decision — and because the proposal
(Call 1) describes a season, not a runtime.

## Hold and cap

The model decides the real length and rarely hits the target exactly. Charging the estimate
would overcharge a short episode; charging the true length afterwards could present a bill
above the quote. So the charge happens in two stages:

1. **Hold** — at Approve & Continue, the full estimate (`rate × target seconds`) is debited
   and recorded as `chargedCredits`. This lands *before* production starts, so an episode
   can never be generated on money the user doesn't have.
2. **Settle** — when the episode video is composed, its duration is measured
   (`probeDuration` on the stitched file) and the charge recalculated at the true length.
   The difference is refunded to the balance as its own `refund` transaction.

**The settled charge is capped at the hold.** A render that overruns costs the quoted price
and no more — an overrun is a planning error on our side, not the creator's. The purchase
dialog's figure is therefore a ceiling, and the dialog says so.

Settlement happens only once the episode is **stored** (Bunny or Cloudinary), never merely
stitched — settling on the local file would charge for an episode a failed upload meant
nobody ever received. It is written before the episode is revealed to the client, so the
client reads `episodeVideo` and `settlement` in the same tick and the dialog can't be missed.

### Failure: recover first, refund last

Settlement only runs on the success path, so a job that dies after the charge would leave the
creator paying for nothing. But a refund is not always the right answer, because the two
halves of a production fail very differently:

- **The pipeline throws, or the video hand-off fails** (`status: 'error'`) — nothing usable
  exists. `releaseEpisodeHold` refunds the **whole** hold immediately.
- **Composition fails after the shots rendered** — the expensive half succeeded and the cheap
  half is retryable. The hold is **kept**, the job is marked `render.phase: 'error'` with
  `render.recoverable: true`, and the creator is offered a retry. Refunding here would force a
  re-purchase and throw away four perfectly good shots.

A composition failure only releases the hold once recovery is out of reach: the rendered
shots are gone from the document, or `composeAttempts` has reached `MAX_COMPOSE_ATTEMPTS`
(3).

### Retrying composition

Nothing re-triggers composition on its own after it errors — the client only advances a job
whose render phase is `rendering` or `composing`. `POST retryComposition` (owner only) is
that path: it clears the compose claim, sets the phase back to `composing`, and fires the
audio background function. The rendered shots are reused as they are, so nothing is
regenerated and the original hold still stands — it settles normally once the episode lands.

`scripts/recompose.mjs` does the same sweep offline for jobs stuck before this existed.

Release and settlement share the single `settledAt` claim, so **exactly one of them can ever
happen** for a production — a late-arriving success cannot refund on top of a release, or the
reverse. A job with an `episodeVideo` is never released.

A released production keeps `chargedAt`/`chargedCredits` as an audit trail but is no longer
treated as paid: `chargeEpisode` sees `settlement.released` and starts a fresh charge, so a
refunded job cannot also be re-rendered for free.

`scripts/release-stuck-holds.mjs` sweeps up productions charged before this existed (dry run
by default, `--apply` to post).

Both settlement and release are idempotent: the first call stamps `settledAt` and every later
call is a no-op, so a retried or duplicated composition cannot refund twice. Both are
best-effort — a billing failure never costs the user the episode they already paid for.

The original charge transaction is never rewritten; the refund is posted separately, so the
ledger still shows that a hold was taken.

### Stored on the production

```
episodeLength     // the target the creator paid for (30 | 60)
videoTier         // { id, model, resolution, creditsPerSecond }
chargedAt
chargedCredits    // the hold
settledAt         // set once, claims the settlement
settlement = { heldCredits, finalCredits, refundedCredits, actualSeconds,
               estimatedSeconds, capped }
```

## Dialogs

**Purchase** (Approve & Continue, and Generate Next Episode) — length selector, then the
four tiers with per-second rate and resulting total, the amount to be held, the balance, and
a note that the final charge follows the real length and never exceeds the hold. Every
figure carries the credits mark. Insufficient balance swaps the confirm button for Top Up.

**Episode charged** (Episode Ready, shown once) — the measured length, then held / charged /
refunded. Without it the refund would look like an unexplained balance change. When the cap
applied, it says the episode ran long and was charged the quoted amount.

## API

| Method | Type | Auth | Input |
|---|---|---|---|
| POST | `chargeEpisode` | owner | `jobId`*, `tierId`, `seconds` |
| POST | `startNextEpisode` | owner | `jobId`*, `episode`*, `tierId`, `seconds` |
| POST | `retryComposition` | owner | `jobId`* |

## Interaction

- A creator picks 60s at `fast-720p` (12/sec) → 720 credits are held. The episode renders at
  54.2s → 650 charged, 70 refunded, and the dialog shows all three numbers.
- The same episode renders at 63s → 720 charged, nothing refunded, and the dialog explains
  that it ran long and was charged the quoted amount.
- A creator with 300 credits opens the dialog at 60s `fast-720p` → the confirm button is
  replaced by Top Up; nothing is held and no render starts.
- Composition is retried after a crash that already settled → the second settlement is a
  no-op and no second refund is posted.
- The pipeline dies before any shot renders → the whole hold is refunded, and buying a retry
  starts a fresh charge rather than rendering free.
- Composition fails with the shots intact → the hold is kept and the Ready page offers
  **Retry Assembly**; re-stitching costs nothing extra and settles the original hold.
- Composition fails three times → the hold is released and the episode must be re-purchased.
