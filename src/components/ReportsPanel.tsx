// Admin: open content reports, newest first, with Remove / Dismiss. Lives at the top of the
// moderation page because a report is time-sensitive in a way the upload queue is not.

import { onMount, Show, For } from 'solid-js'
import { reportsStore, reportsStoreActions } from '../stores/reportsStore'
import type { ContentReport } from '../services/dataService'
import { t } from '../stores/languageStore'
import { reasonLabel } from './SafetyDialogs'
import { timeAgo } from '../utils/timeAgo'
import Icon from './Icon'
import './ReportsPanel.css'

const s = () => t().safety as unknown as Record<string, string>

const targetLabel = (report: ContentReport) => {
  if (report.targetType === 'comment') return s().targetComment
  if (report.targetType === 'episode') return s().targetEpisode.replace('{n}', String(report.episodeNumber ?? ''))
  return s().targetSeries
}

const ReportRow = (props: { report: ContentReport }) => (
  <div class="report-row">
    <div class="report-head">
      <span class="report-target">
        <Icon name="flag" /> {props.report.seriesName || '—'} · {targetLabel(props.report)}
      </span>
      <span class="report-time">{timeAgo(props.report.createdAt)}</span>
    </div>
    <p class="report-line">
      <span class="report-reason">{reasonLabel(props.report.reason)}</span>
      <Show when={props.report.details}> — {props.report.details}</Show>
    </p>
    <Show when={props.report.targetType === 'comment'}>
      <blockquote class="report-quote">{props.report.commentBody || '—'}</blockquote>
    </Show>
    <p class="report-meta">
      {s().reportedBy}: {props.report.reporter || '—'} · {s().owner}: {props.report.reportedUser || '—'}
    </p>
    <div class="report-actions">
      <button
        class="mod-btn ghost"
        disabled={!!reportsStore.resolvingId}
        onClick={() => reportsStoreActions.resolve(props.report, 'dismiss')}
      >
        {s().dismiss}
      </button>
      <button
        class="mod-btn danger"
        disabled={!!reportsStore.resolvingId}
        onClick={() => reportsStoreActions.resolve(props.report, 'remove')}
      >
        {s().remove}
      </button>
    </div>
  </div>
)

const ReportsPanel = () => {
  onMount(() => reportsStoreActions.load())

  return (
    <section class="reports-panel">
      <h2 class="mod-users-title">{s().reportsTitle}</h2>
      <p class="mod-users-hint">{s().reportsHint}</p>
      <Show when={!reportsStore.loading} fallback={<div class="mod-loading">…</div>}>
        <Show when={reportsStore.reports.length > 0} fallback={<div class="report-empty">{s().reportsEmpty}</div>}>
          <For each={reportsStore.reports}>{(report) => <ReportRow report={report} />}</For>
        </Show>
      </Show>
    </section>
  )
}

export default ReportsPanel
