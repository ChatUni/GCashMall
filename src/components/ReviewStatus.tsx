// The uploader's view of manual moderation, for My Series.
//
// A creator whose upload is rejected gets an email, but until they can see *why* inside the
// app they have no way to act on it. These two pieces close that loop:
//
//   ReviewStatusBadge — a corner badge on a series/production card: pending, changes
//     needed, or nothing at all once everything is approved and live.
//   ReviewStatusModal — the detail: the series' own verdict plus every episode's, with the
//     admin's rejection reason shown verbatim.
//
// Rule #7: both subscribe to accountStore directly; only the seriesId is passed in.

import { Show, For } from 'solid-js'
import { t } from '../stores/languageStore'
import {
  accountStore,
  accountStoreActions,
  moderationForSeries,
  reviewSummary,
} from '../stores/accountStore'
import './ReviewStatus.css'

const r = () => t().account.reviewStatus

// Corner badge. Silent when everything is approved and live — a creator only needs to be
// told about a series that is waiting on someone or needs their attention.
export const ReviewStatusBadge = (props: { seriesId?: string }) => {
  const summary = () => reviewSummary(moderationForSeries(props.seriesId))

  return (
    <Show when={summary() && summary()!.status !== 'approved'}>
      <div
        class={`review-badge ${summary()!.status}`}
        title={r().viewDetail}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          accountStoreActions.openReviewStatus(String(props.seriesId))
        }}
      >
        <span class="review-badge-dot" />
        {summary()!.status === 'rejected' ? r().changesNeeded : r().inReview}
        <Show when={summary()!.count > 1}>
          <span class="review-badge-count">{summary()!.count}</span>
        </Show>
      </div>
    </Show>
  )
}

const StatusLine = (props: { status: string; live?: boolean; reason?: string; label: string }) => (
  <div class={`review-row ${props.status}`}>
    <div class="review-row-head">
      <span class="review-row-label">{props.label}</span>
      <span class={`review-chip ${props.status}`}>
        {props.live
          ? r().live
          : (r() as unknown as Record<string, string>)[`status_${props.status}`]}
      </span>
    </div>
    <Show when={props.status === 'rejected' && props.reason}>
      <p class="review-reason">
        <span class="review-reason-label">{r().reasonLabel}</span>
        {props.reason}
      </p>
    </Show>
  </div>
)

export const ReviewStatusModal = () => {
  const mod = () => moderationForSeries(accountStore.reviewStatusSeriesId)

  return (
    <Show when={accountStore.reviewStatusSeriesId && mod()}>
      <div class="review-modal-overlay" onClick={accountStoreActions.closeReviewStatus}>
        <div class="review-modal" onClick={(e) => e.stopPropagation()}>
          <div class="review-modal-head">
            <h3 class="review-modal-title">{r().title}</h3>
            <button class="review-modal-close" onClick={accountStoreActions.closeReviewStatus}>
              ✕
            </button>
          </div>

          <p class="review-modal-sub">
            {mod()!.shelved
              ? r().notPublicYet
              : r().publicThrough.replace('{n}', String(mod()!.liveThrough))}
          </p>

          <StatusLine
            label={r().seriesDetails}
            status={mod()!.moderation.status}
            reason={mod()!.moderation.reason}
          />

          <For each={mod()!.episodes}>
            {(ep) => (
              <StatusLine
                label={`${r().episodeWord} ${String(ep.episodeNumber).padStart(2, '0')}${ep.title ? ` · ${ep.title}` : ''}`}
                status={ep.moderation.status}
                live={ep.isLive}
                reason={ep.moderation.reason}
              />
            )}
          </For>

          <p class="review-modal-note">{r().resubmitNote}</p>
        </div>
      </div>
    </Show>
  )
}
