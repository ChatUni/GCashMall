# Moderation (Admin)

Manual review queue. Nothing an uploader creates reaches the public until an admin has
looked at it. This is separate from, and additional to, the automated content-moderation
job that runs on upload (`videoModeration`).

Reached from Account → Moderation. The tab is only rendered for `user.isAdmin`.

## Model

Every series and every episode carries a `moderation` record:

```
moderation = {
  status: "pending" | "approved" | "rejected",
  reason,                 // rejection reason, emailed to the uploader verbatim
  reviewedAt, reviewedBy,
  pending: null | { …proposed field values… }
}
```

Reviewed fields:

| Level | Fields |
|---|---|
| Series | name, description, cover, tags, genre |
| Episode | title, description, thumbnail, videoId |

### Two versions are kept for edits

When an uploader edits something that already exists, the **live fields stay exactly as
they were** and the submitted values are parked in `moderation.pending`. The public keeps
seeing the approved version; only the admin sees the proposed one. Approving copies
`pending` over the live fields and clears it.

An edit that changes nothing reviewable does not re-open a completed review.

**Parking only applies when there is something public to protect.** An item that has never
been approved — a new episode still in the queue, or one rejected before it ever went live —
takes the edit directly onto its live fields and stays pending. Parking those would leave
the reviewer diffing against a placeholder that no viewer has ever seen. The test is
`status === 'approved' || moderation.pending` (`hasLiveVersion`).

**A missing `moderation` record reads as pending.** Documents written before this feature
existed have none; owner and admin reads normalise them so nothing appears unreviewed-but
-unlabelled.

### Visibility

- `approvedThrough(episodes)` — the longest unbroken run of approved episodes starting at
  episode 1. Approving episode 3 does **not** publish it while 1 or 2 are still pending, so
  a series never shows a gap.
- A series is publishable when its own status is `approved` **and**
  `approvedThrough >= 1` (at least one episode is live).
- `shelved` is derived, never set directly:
  `shelved = shelvedByUploader || !publishable`.
- `shelvedByUploader` is the creator's own hide switch (the Shelve/Unshelve button) and
  always wins — approving something the creator has hidden does not reveal it.

Public reads (`getSeries`, `getEpisodes`, feeds, search) return only episodes within
`approvedThrough`, with the `moderation` record stripped. The uploader's own My Series view
and the admin queue see everything.

**Owner-facing screens must not use the public read.** `saveSeries` treats an episode
missing from the payload as a deletion, so an edit form built from the filtered read would
silently delete every episode still awaiting review. `GET seriesForEdit` (owner or admin)
returns the unfiltered series and is what the Series Edit page and the Quick Create
published-episode views load from.

## Entry points

| Action | Result |
|---|---|
| First upload / first Quick Create publish | Series `pending`, episode 1 `pending`, `shelved: true` |
| New episode added (upload or Quick Create) | That episode `pending`; the rest of the series is untouched |
| Existing episode edited via Quick Create | Same staging as a manual edit — it does **not** publish directly |
| Existing series details edited | Live values kept public, edit parked in `moderation.pending` |
| Existing episode edited | Live episode kept public, edit parked in its `moderation.pending` |

## Page

Groups are listed by uploader (busiest first) and collapsed by default. Each group shows
avatar, nickname, email, and a series count.

Each series card carries two independently reviewable blocks:

1. **Series details** — title, description, genres. Button: **Approve Series**.
2. **Episodes** — one row per episode with the Bunny player embedded so the admin can watch
   it, plus title/description. Button per row: **Approve Episode**.

Where an edit is pending, the field is shown as a two-column diff: *Live now* vs
*Proposed*. For an edited episode the embedded video is the **proposed** `videoId`, since
that is what is being approved.

Status is shown as a pill: Pending / Approved / Rejected, plus **Live** for episodes inside
`approvedThrough`. An *Edited* tag marks an item whose `moderation.pending` is set — i.e. a
change to already-live content is waiting, as opposed to a first-time submission. Approving
clears `pending`, so the tag disappears with it.

### Rejection

**Reject** on either block opens a textarea. A reason is mandatory — it is sent to the
uploader verbatim. Rejecting keeps `moderation.pending` so the uploader can see what was
turned down and fix it; resubmitting puts it back in the queue as `pending`.

## Emails

Sent to the uploader, best-effort (a mail failure never fails or undoes a review):

| Event | Subject | Content |
|---|---|---|
| Series approved | `Approved: {series}` | Confirms it is live; if still shelved, notes it appears once the first episode is approved |
| Episode approved | `Approved: Episode {n}` | Confirms it is live; if earlier episodes are unreviewed, notes it goes live once they are approved |
| Series rejected | `Changes needed: {series}` | The admin's reason, and that editing resubmits it |
| Episode rejected | `Changes needed: Episode {n}` | As above |

## API

| Method | Type | Auth | Input |
|---|---|---|---|
| GET | `seriesForEdit` | owner or admin | `id`* |
| GET | `moderationQueue` | admin | — |
| POST | `approveSeries` | admin | `seriesId`* |
| POST | `rejectSeries` | admin | `seriesId`*, `reason`* |
| POST | `approveEpisode` | admin | `seriesId`*, `episodeNumber`* |
| POST | `rejectEpisode` | admin | `seriesId`*, `episodeNumber`*, `reason`* |

Each review action returns the updated series in queue shape, so the client swaps one card
without refetching the whole queue.

## Interaction

- An admin approves a new series' details and its episode 1 → the series leaves the shelf
  and appears publicly with one episode.
- An admin approves episode 3 while 2 is pending → episode 3 stays hidden; the uploader is
  told it will go live once the earlier episodes are approved. Approving 2 then publishes
  both.
- An uploader edits the title of a live series → the public still sees the old title; the
  admin sees both; approving swaps in the new one.
- An admin rejects an episode with a reason → the uploader receives the reason by email and
  the episode stays out of the public run.

## Uploader's view (My Series)

A rejection email is not enough on its own — the creator needs to see the verdict and the
reason inside the app, on the thing they have to fix.

`GET myModeration` returns every series the caller uploaded, in the same shape the admin
queue uses, so one status model drives both screens.

### Card badge

A corner badge on the series card (Uploaded tab) and on the production card (Published tab,
keyed off the production's `seriesId`):

| State | Badge |
|---|---|
| Anything rejected | **Changes needed** (red), with a count when more than one |
| Otherwise anything pending | **In review** (amber) |
| Everything approved | no badge — nothing needs their attention |

Rejections outrank pending: that is the state requiring action. Clicking the badge opens
the detail modal without triggering the card's own navigation.

### Detail modal

- Header line: `Not public yet…` or `Public through episode {n}.`
- One row for the series' own verdict, then one per episode, each with a status chip
  (In review / Approved / Changes needed, or **Live** for episodes inside the approved run).
- Rejected rows show the admin's reason verbatim under a "Reviewer feedback" label.
- A closing note explains that editing a rejected item resubmits it, and that episodes go
  live in order.

### Interaction

- A creator opens My Series after a rejection email → the card shows **Changes needed**;
  opening it shows exactly which episode and the reviewer's words.
- A creator whose episode 3 is approved while 2 is pending → episode 3 shows *Approved*,
  the header still reads *Public through episode 1*, and the note explains why.
