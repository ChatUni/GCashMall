# Moderation (Admin)

Manual review queue. Nothing an uploader creates reaches the public until it has been
approved — by an admin, by the automated scan, or implicitly by the uploader being verified.

## Automated scan

The automated content scan (transcribe → text check → frame extraction → vision check) does
**not** run during upload, and the code that made it do so has been removed rather than
disabled — moderate-on-save is not coming back.

It used to block the save: the browser uploaded each video, then polled for up to fifteen
minutes per episode while the creator watched a progress message, aborting the whole save on
a rejection or a timeout. That is the wrong shape for work whose length is bounded only by
how much video was uploaded, it made the browser the scheduler (closing the tab stopped the
work), and it is why the scan had been switched off entirely.

Now: the upload completes immediately, the series lands pending exactly as before, and the
scan is dispatched as a background job (`dispatchAutoModeration`). It runs on a long-lived
server rather than in a function — see `services/README.md` for the runtime split — and
reports back per episode as it goes:

| Callback | When | Effect |
|---|---|---|
| `POST jobProgress` | each episode (and the series' text) finishes | applies that verdict — approved or rejected with a reason |
| `POST jobComplete` | the whole scan ends | closes the job out |

Both are authenticated with an HMAC over the body (`WORKER_SHARED_SECRET`), not a user
token: the worker has no session. They are the only path by which a non-user may record a
review decision, and both are idempotent.

A scan that *cannot run* — the checker errors, an episode times out — never rejects. It
leaves the item pending for a human. A creator's upload is not refused because our API call
failed.

**Quick Create content is auto-approved.** It is neither scanned nor reviewed: it comes out
of our own generation pipeline, whose prompts and models already constrain what it can
produce, so both checking it and queueing it for a human are spent on our own output. A
Quick Create series is approved on arrival and public immediately, and never appears in the
queue. The creator's own Shelve switch still applies — `shelved` stays derived.

**An episode with no video is left pending, never approved.** "Nothing to check" is not the
same as "fit to publish" — approving one would put a blank episode in front of viewers. It is
left pending rather than rejected, because it is unfinished, not wrong: it is waiting on the
uploader, and a rejection would email them about work they have not submitted yet. The Series
Edit form likewise shows no review badge on an episode that has not been saved, since nothing
has been submitted for anyone to have an opinion about.

**What gets scanned is decided per item, not per series.** The rule is simply *whatever is
awaiting review*: generated episodes are approved on arrival and so are never pending, while
an uploaded one is. Filtering on pending therefore skips exactly our own output and nothing
else. An item already approved — by the scanner, by a human, or on arrival — is never
re-judged, because re-emitting a verdict could overturn a decision already made and would
attribute someone else's approval to the scanner. A series with nothing pending dispatches no
job at all.

**Series Edit is for uploaded series only.** `saveSeries` refuses a series carrying the
`quickCreate` flag; a Quick Create series is edited through the Quick Create flow, where
episodes are regenerated rather than uploaded. The UI never offers the route (`getMySeries`
filters those series out of the Uploaded tab), but `/series/:id/edit` is reachable by URL,
and without the server-side refusal a creator could add arbitrary uploaded video to a series
that is otherwise entirely our own output. The *read* (`seriesForEdit`) stays open to them —
the Quick Create publish page uses it to load its own published series.

**Subtitles are not a moderation concern.** Transcription rides on the same job as the
checks, so the job asks two separate questions:

- **Process** — every episode that has a video runs through the pipeline, because that is
  what produces its subtitles. It does not matter whether the episode is already approved.
- **Decide** — only an episode still awaiting review gets a verdict. Re-judging an approved
  one could overturn a decision already made.

Conflating the two breaks a verified creator's upload: their episodes arrive approved, so a
work list filtered by "pending" is empty and their video is never transcribed. Dispatch and
the pipeline therefore both gate on *anything to process or decide*, not on pending alone.
What verification buys is `skipChecks`: approve without checking, but still transcribe.

**`shelved` is always derived, never assigned.** A new series used to be created with
`shelved: true` hardcoded — right for an upload awaiting review, wrong for a verified
creator's, whose work is approved on arrival. `computeShelved` runs on create, on edit, and
on the shelve toggle.

**The shelve toggle sets a state, it does not flip one.** The button is labelled from the
derived `shelved`, while the switch it controls is `shelvedByUploader`; those disagree
whenever a series is hidden for some other reason. Flipping then inverts the creator's
intent — a button reading "Unshelve" would turn their own hide switch *on*. The client sends
the state it is asking for.

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
| First upload | Series `pending`, episode 1 `pending`, `shelved: true` |
| Upload by a **verified** creator | Everything `approved` on arrival; job still dispatched, with `skipChecks` (subtitles only) |
| Upload by anyone else | Pending as above, and the job is dispatched with checks on (not awaited) |
| Quick Create publish | `approved` on arrival, public immediately, no job, never queued |
| New episode added (upload or Quick Create) | That episode `pending`; the rest of the series is untouched |
| Existing episode edited via Quick Create | Auto-approved, like any Quick Create content |
| Existing series details edited | Live values kept public, edit parked in `moderation.pending` |
| Existing episode edited | Live episode kept public, edit parked in its `moderation.pending` |

## Verified uploaders

A verified creator is one an admin has decided to trust. The toggle lives on the Users panel
(below), and turning it on:

- approves everything that creator currently has waiting, series and episodes alike, and
- makes their future uploads arrive already approved, with no scan dispatched.

Turning it **off** does not retract approvals already granted — anything live stays live. It
only means future uploads are reviewed again. The toggle confirms before acting, in both
directions, because it publishes content in one click.

`verified` lives on the user document, alongside `verifiedAt` and `verifiedBy`.

## Appealing an automated rejection

The scanner can be wrong, and a creator needs a way to say so.

**A rejection does not delete the video.** It used to, and that made an appeal impossible:
the creator could only dispute the verdict by re-uploading the file the scanner had just
destroyed, and re-uploading triggered another scan that destroyed it again. Keeping the video
is what makes an automated verdict reviewable at all — a person can watch the footage that was
actually flagged. It is never public in the meantime, because the episode sits outside the
approved run.

1. The rejection email tells the creator they can ask for a person — only for *automated*
   rejections; where a human already decided, it says edit and resubmit as before.
2. **Request Review** on the rejected episode in Series Edit takes a reason. One click, no
   re-upload: the video is still there.
3. The scanner **skips** an episode with an outstanding request — re-judging it would produce
   the same verdict being disputed.
4. It appears under **Review Requests** on the moderation page, above the ordinary queue,
   showing what the scanner said, what the creator says, and the video itself.
5. Any decision, from either place, clears the request.

Uploading genuinely different content needs no appeal — saving it is enough, and the scanner
checks it as usual.

**A human's rejection does delete it.** The two rules are the same rule: a video is kept
exactly as long as the verdict on it can still be overturned. A machine's can, so the footage
stays and the episode keeps its `videoId`; once a person has confirmed, there is no further
appeal, and the video is removed from Bunny and the reference cleared — otherwise the edit
page renders a player for a file that 404s.

So rejected content only occupies storage while it is genuinely disputable.

| Method | Type | Auth | Input |
|---|---|---|---|
| POST | `requestEpisodeReview` | owner | `seriesId`*, `episodeNumber`*, `reason`* |
| GET | `reviewRequests` | admin | — |

## Parked series

A series whose uploader (or an admin) has hidden it with `shelvedByUploader` is out of the
review system entirely: it is not swept, not dispatched, not processed by the pipeline, and
not listed in the queue or its per-uploader counts. Hiding it is a decision to park it, and
listing work that nothing will ever act on is how a queue stops meaning anything.

This is `shelvedByUploader`, the explicit hide switch — **not** the derived `shelved`, which
is true for everything awaiting review. Filtering on the derived flag would empty the queue.

Parking is reversible, but not from the moderation page, since a parked series does not
appear there: unshelve it from the uploader's My Series, or with
`scripts/moderation-cleanup.mjs`.

## Users panel

Every user is listed, not only those with something in the queue — verifying a creator has
to be possible *before* they upload, or the flag could only ever be granted reactively, once
their work is already sitting in the queue.

Search matches nickname or email and runs server-side; the user table is not something to
ship to the browser whole. Each row shows avatar, name, email, an Admin tag where it
applies, a count of what that user still has awaiting review, and the Verified switch.

| Method | Type | Auth | Input |
|---|---|---|---|
| GET | `adminUsers` | admin | `search`, `limit` |
| POST | `setUserVerified` | admin | `userId`*, `verified`* |

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
| GET | `seriesForEdit` | owner or admin | `id`* (Quick Create series included — its publish page needs this) |
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

## Interaction (automated scan and verification)

- A creator uploads a three-episode series → the save returns immediately, all four items
  (series + three episodes) are pending, and one scan job is queued. Verdicts arrive one
  episode at a time; the creator watches them land in My Series.
- The scan flags episode 2 → that episode is rejected with the reason, episodes 1 and 3 are
  approved, and the series is public through episode 1 only (the approved run stops at the
  gap).
- OpenAI is down when the scan runs → nothing is rejected; every item stays pending and an
  admin decides.
- An admin verifies a creator with two series waiting → both are approved immediately, the
  creator's badge clears, and their next upload never enters the queue.
- The same creator is later un-verified → their live content stays live, and their next
  upload is reviewed again.
- A Quick Create episode is published → it is live at once, with no queue entry and no scan.
- A verified creator uploads → everything is approved immediately, and the job still runs so
  their episodes get subtitles.
- A creator opens `/series/<quick-create-id>/edit` directly → the page loads, but saving is
  refused with "edit it there instead"; no uploaded video can be attached to generated work.
- An uploaded series has episode 1 approved and episode 2 newly added → only episode 2 is
  scanned, and episode 1's approval is left exactly as it was.
- A creator adds an episode and saves before uploading its video → the episode stays pending,
  the series stays shelved, and nothing blank reaches viewers.
