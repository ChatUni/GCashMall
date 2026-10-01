// The report-or-block sheet (comments), the report form and the block confirmation. Mounted once
// per player page; the buttons on that page open them through safetyStore.

import { Show, For } from 'solid-js'
import { safetyStore, safetyActions } from '../stores/safetyStore'
import { playerStore, checkIsSeriesOwner } from '../stores/playerStore'
import type { ReportReason } from '../services/dataService'
import { t } from '../stores/languageStore'
import Icon from './Icon'
import './SafetyDialogs.css'

const s = () => t().safety as unknown as Record<string, string>

const REASONS: { id: ReportReason; key: string }[] = [
  { id: 'sexual', key: 'reasonSexual' },
  { id: 'violence', key: 'reasonViolence' },
  { id: 'harassment', key: 'reasonHarassment' },
  { id: 'spam', key: 'reasonSpam' },
  { id: 'other', key: 'reasonOther' },
]

export const reasonLabel = (reason: string) => {
  const match = REASONS.find((r) => r.id === reason)
  return match ? s()[match.key] : reason
}

const reportLabel = () => {
  const type = safetyStore.sheet?.targetType
  return type === 'comment' ? s().reportComment : type === 'episode' ? s().reportEpisode : s().reportSeries
}

// "Report this …" / "Block <name>" / "Cancel".
const Sheet = () => (
  <Show when={safetyStore.sheet}>
    <div class="safety-overlay" onClick={safetyActions.closeSheet}>
      <div class="safety-sheet" role="dialog" aria-label={s().reportOrBlock} onClick={(e) => e.stopPropagation()}>
        <button class="safety-option" onClick={safetyActions.startReport}>
          <Icon name="flag" /> {reportLabel()}
        </button>
        <button class="safety-option danger" onClick={safetyActions.startBlock}>
          <Icon name="ban" /> {s().blockUser.replace('{name}', safetyStore.sheet!.userName)}
        </button>
        <button class="safety-option cancel" onClick={safetyActions.closeSheet}>
          {s().cancel}
        </button>
      </div>
    </div>
  </Show>
)

const ReportForm = () => (
  <Show when={safetyStore.report}>
    <div class="safety-overlay" onClick={safetyActions.cancelReport}>
      <div class="safety-dialog" role="dialog" aria-label={s().reportTitle} onClick={(e) => e.stopPropagation()}>
        <h3 class="safety-title">{s().reportTitle}</h3>
        <div class="safety-reasons" role="radiogroup">
          <For each={REASONS}>
            {(r) => (
              <button
                class={`safety-reason ${safetyStore.reason === r.id ? 'selected' : ''}`}
                role="radio"
                aria-checked={safetyStore.reason === r.id}
                onClick={() => safetyActions.setReason(r.id)}
              >
                {s()[r.key]}
              </button>
            )}
          </For>
        </div>
        <textarea
          class="safety-details"
          rows={3}
          maxLength={1000}
          placeholder={s().detailsPlaceholder}
          value={safetyStore.details}
          onInput={(e) => safetyActions.setDetails(e.currentTarget.value)}
        />
        <div class="safety-actions">
          <button class="safety-btn" onClick={safetyActions.cancelReport}>{s().cancel}</button>
          <button
            class="safety-btn primary"
            disabled={!safetyStore.reason || safetyStore.submitting}
            onClick={safetyActions.submitReport}
          >
            {safetyStore.submitting ? '…' : s().submitReport}
          </button>
        </div>
      </div>
    </div>
  </Show>
)

const BlockConfirm = () => (
  <Show when={safetyStore.block}>
    <div class="safety-overlay" onClick={safetyActions.cancelBlock}>
      <div class="safety-dialog" role="alertdialog" onClick={(e) => e.stopPropagation()}>
        <h3 class="safety-title">{s().blockTitle.replace('{name}', safetyStore.block!.userName)}</h3>
        <p class="safety-body">{s().blockBody}</p>
        <div class="safety-actions">
          <button class="safety-btn" onClick={safetyActions.cancelBlock}>{s().cancel}</button>
          <button class="safety-btn danger" disabled={safetyStore.blocking} onClick={safetyActions.confirmBlock}>
            {safetyStore.blocking ? '…' : s().blockConfirm}
          </button>
        </div>
      </div>
    </div>
  </Show>
)

const SafetyDialogs = () => (
  <>
    <Sheet />
    <ReportForm />
    <BlockConfirm />
  </>
)

// "Report" for the series being watched — the current episode, or the series when no episode is
// loaded. Report only: creators are never blocked. Not shown on your own series.
export const SeriesSafetyButton = (props: { iconOnly?: boolean }) => (
  <Show when={playerStore.series && !checkIsSeriesOwner()}>
    <button
      class={`safety-trigger ${props.iconOnly ? 'icon-only' : ''}`}
      title={seriesReportLabel()}
      aria-label={seriesReportLabel()}
      onClick={() =>
        safetyActions.openReport({
          targetType: playerStore.currentEpisode ? 'episode' : 'series',
          seriesId: String(playerStore.series!._id),
          episodeNumber: playerStore.currentEpisode?.episodeNumber,
          userId: String(playerStore.series!.uploaderId || ''),
          userName: '',
        })
      }
    >
      <Icon name="flag" size={18} />
      <Show when={!props.iconOnly}>{seriesReportLabel()}</Show>
    </button>
  </Show>
)

const seriesReportLabel = () => (playerStore.currentEpisode ? s().reportEpisode : s().reportSeries)

export default SafetyDialogs
