// Admin manual-moderation queue (Account → Moderation).
//
// Everything an uploader creates arrives here shelved. The admin reviews two separate
// things: the series' own details (title / description / genres / cover) and each episode's
// video. Both must pass before anything reaches the public, and episodes go live in order.
//
// Rule #7: every piece subscribes to moderationStore directly rather than taking props for
// state; only identity (which series/episode a row is for) is passed down.

import { onMount, Show, For } from 'solid-js'
import { t } from '../stores/languageStore'
import {
  moderationStore,
  moderationStoreActions as actions,
  rejectKey,
  isBusy,
  seriesPendingCount,
  seriesUnapprovedCount,
  isFullyApproved,
  orderedSeries,
} from '../stores/moderationStore'
import { getIframeUrl } from '../utils/playerHelpers'
import type { AdminUser, ReviewRequestGroup } from '../services/dataService'
import type { ModerationEpisode, ModerationSeries, ModerationGroup } from '../types'
import './ModerationSection.css'

const m = () => t().account.moderation

// ── Small shared pieces ──

const StatusPill = (props: { status: string; live?: boolean }) => (
  <span class={`mod-pill ${props.status}`}>
    {props.live ? m().statusLive : (m() as unknown as Record<string, string>)[`status_${props.status}`]}
  </span>
)

// A field the admin is being asked to approve. When an edit is pending we show the live
// value and the proposed one side by side — that is the whole point of keeping both.
const ReviewField = (props: { label: string; current: string; proposed?: string }) => (
  <div class="mod-field">
    <span class="mod-field-label">{props.label}</span>
    <Show
      when={props.proposed !== undefined && props.proposed !== props.current}
      fallback={<span class="mod-field-value">{props.current || '—'}</span>}
    >
      <div class="mod-diff">
        <div class="mod-diff-side old">
          <span class="mod-diff-tag">{m().currentVersion}</span>
          <span class="mod-field-value">{props.current || '—'}</span>
        </div>
        <div class="mod-diff-side new">
          <span class="mod-diff-tag">{m().proposedVersion}</span>
          <span class="mod-field-value">{props.proposed || '—'}</span>
        </div>
      </div>
    </Show>
  </div>
)

// Reject form — a reason is mandatory, since it is emailed to the uploader verbatim.
const RejectForm = (props: { target: string; onConfirm: (reason: string) => void }) => (
  <Show when={moderationStore.rejectTarget === props.target}>
    <div class="mod-reject">
      <textarea
        class="mod-reject-input"
        rows={3}
        placeholder={m().rejectPlaceholder}
        value={moderationStore.rejectReason}
        onInput={(e) => actions.setRejectReason(e.currentTarget.value)}
      />
      <div class="mod-reject-actions">
        <button
          class="mod-btn danger"
          disabled={!moderationStore.rejectReason.trim()}
          onClick={() => props.onConfirm(moderationStore.rejectReason.trim())}
        >
          {m().confirmReject}
        </button>
        <button class="mod-btn ghost" onClick={actions.closeReject}>
          {m().cancel}
        </button>
      </div>
    </div>
  </Show>
)

// Approve is one-way — it publishes to the public and emails the uploader — so it asks
// first, and says what will actually happen rather than a bare "are you sure".
const ConfirmApprove = (props: {
  target: string
  message: string
  note?: string
  busy: boolean
  onConfirm: () => void
}) => (
  <Show when={moderationStore.confirmTarget === props.target}>
    <div class="mod-confirm">
      <p class="mod-confirm-msg">{props.message}</p>
      <Show when={props.note}>
        <p class="mod-confirm-note">{props.note}</p>
      </Show>
      <div class="mod-confirm-actions">
        <button class="mod-btn primary" disabled={props.busy} onClick={props.onConfirm}>
          {m().confirmApprove}
        </button>
        <button class="mod-btn ghost" onClick={actions.closeConfirm}>
          {m().cancel}
        </button>
      </div>
    </div>
  </Show>
)

// ── Episode review ──

const EpisodeRow = (props: {
  seriesId: string
  episode: ModerationEpisode
  willPublish: boolean
}) => {
  const ep = () => props.episode
  const pending = () => ep().moderation.pending
  const key = () => rejectKey(props.seriesId, ep().episodeNumber)
  // Approving an edit means reviewing the NEW video, not the one currently live.
  const videoId = () => pending()?.videoId || ep().videoId

  return (
    <div class={`mod-episode ${ep().moderation.status}`}>
      <div class="mod-episode-head">
        <span class="mod-episode-no">
          {m().episodeWord} {String(ep().episodeNumber).padStart(2, '0')}
        </span>
        <StatusPill status={ep().moderation.status} live={ep().isLive} />
        {/* "Edited" means a change to an already-live episode is waiting — i.e. there is a
            proposed version held back. It clears on approval, when pending is applied. */}
        <Show when={pending()}>
          <span class="mod-tag-edit">{m().editedTag}</span>
        </Show>
      </div>

      <Show when={videoId()} fallback={<p class="mod-empty">{m().noVideo}</p>}>
        <div class="mod-video">
          <iframe
            src={getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, videoId())}
            loading="lazy"
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
            allowfullscreen
          />
        </div>
      </Show>

      <ReviewField label={m().episodeTitle} current={ep().title} proposed={pending()?.title} />
      <ReviewField
        label={m().episodeDescription}
        current={ep().description}
        proposed={pending()?.description}
      />

      <Show when={ep().moderation.status === 'rejected' && ep().moderation.reason}>
        <p class="mod-reason">
          <b>{m().rejectedReason}</b> {ep().moderation.reason}
        </p>
      </Show>

      <Show when={ep().moderation.status === 'pending'}>
        <div class="mod-actions">
          <button
            class="mod-btn primary"
            disabled={isBusy(props.seriesId)}
            onClick={() => actions.openConfirm(key())}
          >
            {m().approveEpisode}
          </button>
          <button class="mod-btn ghost" onClick={() => actions.openReject(key())}>
            {m().reject}
          </button>
        </div>
        <ConfirmApprove
          target={key()}
          busy={isBusy(props.seriesId)}
          message={
            pending()
              ? m().confirmApproveEpisodeEdit.replace('{n}', String(ep().episodeNumber))
              : m().confirmApproveEpisode.replace('{n}', String(ep().episodeNumber))
          }
          // Approving does not always publish — earlier episodes have to clear first.
          note={props.willPublish ? m().confirmWillPublish : m().confirmWillWait}
          onConfirm={() => actions.approveEpisode(props.seriesId, ep().episodeNumber)}
        />
        <RejectForm
          target={key()}
          onConfirm={(reason) => actions.rejectEpisode(props.seriesId, ep().episodeNumber, reason)}
        />
      </Show>
    </div>
  )
}

// ── Series review ──

const SeriesCard = (props: { series: ModerationSeries }) => {
  const s = () => props.series
  const pending = () => s().moderation.pending
  const open = () => !!moderationStore.expandedSeries[s()._id]
  const waiting = () => seriesPendingCount(s())
  const unapproved = () => seriesUnapprovedCount(s())
  // Distinct confirm key so Approve All and Approve Series can't both be open at once.
  const allKey = () => `${s()._id}:all`

  return (
    <section class={`mod-series ${open() ? 'open' : ''} ${isFullyApproved(s()) ? 'done' : ''}`}>
      {/* Collapsed by default — each expanded series renders a video player per episode,
          so opening a whole uploader's catalogue at once would be a wall of iframes. */}
      <button class="mod-series-head" onClick={() => actions.toggleSeries(s()._id)}>
        <Show when={s().cover}>
          <img class="mod-series-cover" src={pending()?.cover || s().cover} alt="" />
        </Show>
        <div class="mod-series-headings">
          <h3 class="mod-series-name">{s().name}</h3>
          <div class="mod-series-meta">
            <StatusPill status={s().moderation.status} />
            <Show when={pending()}>
              <span class="mod-tag-edit">{m().editedTag}</span>
            </Show>
            <span class="mod-live-note">
              {s().shelved
                ? m().notPublic
                : m().liveThrough.replace('{n}', String(s().liveThrough))}
            </span>
          </div>
        </div>
        <Show when={waiting() > 0}>
          <span class="mod-series-waiting">
            {m().awaitingCount.replace('{n}', String(waiting()))}
          </span>
        </Show>
        <span class={`mod-chevron ${open() ? 'open' : ''}`}>⌄</span>
      </button>

      <Show when={open()}>

      {/* 1. The series itself: title / description / genres. */}
      <div class="mod-block">
        <div class="mod-block-head">
          <span class="mod-block-title">{m().seriesDetails}</span>
          <Show when={unapproved() > 0}>
            <button
              class="mod-btn approve-all"
              disabled={isBusy(s()._id)}
              onClick={() => actions.openConfirm(allKey())}
            >
              ✓ {m().approveAll}
            </button>
          </Show>
        </div>
        <ConfirmApprove
          target={allKey()}
          busy={isBusy(s()._id)}
          message={m().confirmApproveAll.replace('{n}', String(unapproved()))}
          note={m().confirmApproveAllNote}
          onConfirm={() => actions.approveAll(s()._id)}
        />
        <ReviewField label={m().seriesTitle} current={s().name} proposed={pending()?.name} />
        <ReviewField
          label={m().seriesDescription}
          current={s().description}
          proposed={pending()?.description}
        />
        <ReviewField
          label={m().seriesGenres}
          current={(s().tags || []).join(', ')}
          proposed={pending()?.tags?.join(', ')}
        />

        <Show when={s().moderation.status === 'rejected' && s().moderation.reason}>
          <p class="mod-reason">
            <b>{m().rejectedReason}</b> {s().moderation.reason}
          </p>
        </Show>

        <Show when={s().moderation.status === 'pending'}>
          <div class="mod-actions">
            <button
              class="mod-btn primary"
              disabled={isBusy(s()._id)}
              onClick={() => actions.openConfirm(rejectKey(s()._id))}
            >
              {m().approveSeries}
            </button>
            <button class="mod-btn ghost" onClick={() => actions.openReject(rejectKey(s()._id))}>
              {m().reject}
            </button>
          </div>
          <ConfirmApprove
            target={rejectKey(s()._id)}
            busy={isBusy(s()._id)}
            message={pending() ? m().confirmApproveSeriesEdit : m().confirmApproveSeries}
            note={s().liveThrough >= 1 ? undefined : m().confirmSeriesNeedsEpisode}
            onConfirm={() => actions.approveSeries(s()._id)}
          />
          <RejectForm
            target={rejectKey(s()._id)}
            onConfirm={(reason) => actions.rejectSeries(s()._id, reason)}
          />
        </Show>
      </div>

      {/* 2. Each episode, reviewed on its own. */}
      <div class="mod-block">
        <span class="mod-block-title">{m().episodes}</span>
        <For each={s().episodes} fallback={<p class="mod-empty">{m().noEpisodes}</p>}>
          {(episode) => (
            <EpisodeRow
              seriesId={s()._id}
              episode={episode}
              // It goes live immediately only if every earlier episode is already live.
              willPublish={episode.episodeNumber <= s().liveThrough + 1}
            />
          )}
        </For>
      </div>

      </Show>
    </section>
  )
}

const UploaderGroup = (props: { group: ModerationGroup }) => {
  const g = () => props.group
  const open = () => !!moderationStore.expanded[g().uploaderId]

  return (
    <div class="mod-group">
      <button class="mod-group-head" onClick={() => actions.toggleGroup(g().uploaderId)}>
        <span class="mod-avatar">
          <Show when={g().uploaderAvatar} fallback={<span>👤</span>}>
            <img src={g().uploaderAvatar} alt="" />
          </Show>
        </span>
        <span class="mod-group-who">
          <span class="mod-group-name">{g().uploaderName}</span>
          <span class="mod-group-email">{g().uploaderEmail}</span>
        </span>
        <span class="mod-group-count">
          {m().seriesCount.replace('{n}', String(g().series.length))}
        </span>
        <span class={`mod-chevron ${open() ? 'open' : ''}`}>⌄</span>
      </button>
      <Show when={open()}>
        <div class="mod-group-body">
          <For each={orderedSeries(g().series)}>
            {(series) => <SeriesCard series={series} />}
          </For>
        </div>
      </Show>
    </div>
  )
}

// ── Review requests ──
//
// A creator appealing an automated rejection, after replacing the video. Listed above the
// ordinary queue because nothing else will ever resolve these: the scanner has already had
// its say, and only a person can answer.
const RequestedEpisode = (props: { seriesId: string; episode: ReviewRequestGroup['series'][number]['episodes'][number] }) => (
  <div class="mod-request-episode">
    <div class="mod-request-head">
      <span class="mod-request-ep">
        {m().episodeWord} {String(props.episode.episodeNumber).padStart(2, '0')}
        {props.episode.title ? ` · ${props.episode.title}` : ''}
      </span>
      <span class="mod-pill rejected">{m().status_rejected}</span>
    </div>
    <p class="mod-request-line">
      <span class="mod-request-label">{m().machineSaid}</span>
      {props.episode.rejectedReason}
    </p>
    <p class="mod-request-line creator">
      <span class="mod-request-label">{m().creatorSaid}</span>
      {props.episode.request.reason}
    </p>
    <Show when={props.episode.videoId}>
      <div class="mod-video">
        <iframe
          src={getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, props.episode.videoId)}
          allowfullscreen
          title={props.episode.title}
        />
      </div>
    </Show>
    <div class="mod-actions">
      <button
        class="mod-btn primary"
        disabled={isBusy(props.seriesId)}
        onClick={() => actions.approveEpisode(props.seriesId, props.episode.episodeNumber)}
      >
        {m().approveEpisode}
      </button>
      <button
        class="mod-btn ghost"
        onClick={() => actions.openReject(rejectKey(props.seriesId, props.episode.episodeNumber))}
      >
        {m().reject}
      </button>
    </div>
    <RejectForm
      target={rejectKey(props.seriesId, props.episode.episodeNumber)}
      onConfirm={(reason) => actions.rejectEpisode(props.seriesId, props.episode.episodeNumber, reason)}
    />
  </div>
)

const ReviewRequestsPanel = () => (
  <Show when={moderationStore.requests.length > 0}>
    <section class="mod-requests">
      <div class="mod-users-head">
        <h2 class="mod-users-title">{m().requestsTitle}</h2>
      </div>
      <p class="mod-users-hint">{m().requestsHint}</p>
      <For each={moderationStore.requests}>
        {(group) => (
          <div class="mod-request-group">
            <div class="mod-group-head static">
              <img class="mod-user-avatar" src={group.uploaderAvatar || '/img/default-avatar.png'} alt="" />
              <div class="mod-user-id">
                <span class="mod-user-name">{group.uploaderName}</span>
                <span class="mod-user-email">{group.uploaderEmail}</span>
              </div>
            </div>
            <For each={group.series}>
              {(sx) => (
                <div class="mod-request-series">
                  <h3 class="mod-request-series-name">{sx.name}</h3>
                  <For each={sx.episodes}>
                    {(ep) => <RequestedEpisode seriesId={sx._id} episode={ep} />}
                  </For>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
    </section>
  </Show>
)

// ── Users ──
//
// Every user is listed, not only those with something in the queue: verifying a creator has
// to be possible BEFORE they upload, or the flag could only ever be granted after their work
// is already waiting. Search runs server-side — the user table is not something to ship to
// the browser whole.
const UserRow = (props: { user: AdminUser }) => (
  <div class={`mod-user ${props.user.verified ? 'verified' : ''}`}>
    <img
      class="mod-user-avatar"
      src={props.user.avatar || '/img/default-avatar.png'}
      alt=""
      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
    />
    <div class="mod-user-id">
      <span class="mod-user-name">
        {props.user.nickname}
        <Show when={props.user.isAdmin}>
          <span class="mod-user-tag admin">{m().adminTag}</span>
        </Show>
      </span>
      <span class="mod-user-email">{props.user.email}</span>
    </div>
    <Show when={props.user.pendingCount > 0}>
      <span class="mod-user-pending">{m().pendingCount.replace('{n}', String(props.user.pendingCount))}</span>
    </Show>
    <label class="mod-toggle-wrap">
      <span class="mod-toggle-label">{m().verified}</span>
      <button
        class={`mod-toggle ${props.user.verified ? 'on' : ''}`}
        role="switch"
        aria-checked={props.user.verified}
        aria-label={m().verified}
        disabled={moderationStore.verifyBusyId === props.user._id}
        onClick={() => actions.askVerify(props.user)}
      >
        <span class="mod-toggle-knob" />
      </button>
    </label>
  </div>
)

// Verifying approves the creator's whole backlog and every future upload, so it confirms.
const VerifyConfirm = () => (
  <Show when={moderationStore.verifyTarget}>
    <div class="mod-modal-overlay" onClick={actions.cancelVerify}>
      <div class="mod-modal" onClick={(e) => e.stopPropagation()}>
        <h3 class="mod-modal-title">
          {moderationStore.verifyTarget!.verified ? m().unverifyTitle : m().verifyTitle}
        </h3>
        <p class="mod-modal-body">
          {(moderationStore.verifyTarget!.verified ? m().unverifyBody : m().verifyBody).replace(
            '{name}',
            moderationStore.verifyTarget!.nickname,
          )}
        </p>
        <div class="mod-modal-actions">
          <button class="mod-btn ghost" onClick={actions.cancelVerify}>{m().cancel}</button>
          <button
            class={`mod-btn ${moderationStore.verifyTarget!.verified ? 'danger' : 'primary'}`}
            onClick={() => actions.confirmVerify()}
          >
            {moderationStore.verifyTarget!.verified ? m().unverifyConfirm : m().verifyConfirm}
          </button>
        </div>
      </div>
    </div>
  </Show>
)

const UsersPanel = () => {
  let timer: ReturnType<typeof setTimeout> | undefined
  // Debounced so a filter runs once the typing pauses, not once per keystroke.
  const onSearch = (value: string) => {
    clearTimeout(timer)
    timer = setTimeout(() => actions.setUserSearch(value), 250)
  }

  return (
    <section class="mod-users">
      <div class="mod-users-head">
        <h2 class="mod-users-title">{m().usersTitle}</h2>
        <input
          class="mod-users-search"
          type="search"
          placeholder={m().searchUsers}
          onInput={(e) => onSearch(e.currentTarget.value)}
        />
      </div>
      <p class="mod-users-hint">{m().verifiedHint}</p>

      <Show
        when={!moderationStore.usersLoading}
        fallback={<div class="mod-loading">{m().loading}</div>}
      >
        <Show
          when={moderationStore.users.length > 0}
          fallback={<div class="mod-empty-state">{m().noUsers}</div>}
        >
          <div class="mod-user-list">
            <For each={moderationStore.users}>{(user) => <UserRow user={user} />}</For>
          </div>
        </Show>
      </Show>
    </section>
  )
}

const ModerationSection = () => {
  onMount(() => {
    actions.load()
    actions.loadUsers()
    actions.loadRequests()
  })

  return (
    <div class="content-section moderation-section">
      <div class="section-header">
        <h1 class="page-title">{m().title}</h1>
        <p class="page-subtitle">{m().subtitle}</p>
      </div>

      <Show when={moderationStore.error}>
        <p class="mod-error">{moderationStore.error}</p>
      </Show>

      <ReviewRequestsPanel />

      <Show
        when={!moderationStore.loading}
        fallback={<div class="mod-loading">{m().loading}</div>}
      >
        <Show
          when={moderationStore.groups.length > 0}
          fallback={<div class="mod-empty-state">✅ {m().emptyQueue}</div>}
        >
          <For each={moderationStore.groups}>{(group) => <UploaderGroup group={group} />}</For>
        </Show>
      </Show>

      <UsersPanel />
      <VerifyConfirm />
    </div>
  )
}

export default ModerationSection
