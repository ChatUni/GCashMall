// "Episode charged" — shown once, on the Episode Ready page, after an episode's hold has
// been settled.
//
// The purchase dialog quotes an estimate and holds it. The model decides the real length,
// so what someone actually pays is usually less than what was taken. Without this dialog
// the refund would appear as an unexplained balance change; with it, the arithmetic is
// visible: held, charged, refunded.

import { Show } from 'solid-js'
import { t } from '../stores/languageStore'
import { quickCreateV1Store, quickCreateV1Actions } from '../stores/quickCreateV1Store'
import { formatCredits, CREDITS_ICON } from '../utils/credits'
import './SettlementDialog.css'

const s = () => t().quickCreateV1.settlement

const Credits = (props: { value: number; strong?: boolean }) => (
  <span class="settle-credits">
    <img src={CREDITS_ICON} alt="" class="settle-credits-icon" />
    {props.strong ? <b>{formatCredits(props.value)}</b> : formatCredits(props.value)}
  </span>
)

const SettlementDialog = () => {
  const st = () => quickCreateV1Store.settlement

  return (
    <Show when={st()}>
      <div class="qcv1-modal-overlay" onClick={quickCreateV1Actions.dismissSettlement}>
        <div class="qcv1-modal settle-modal" onClick={(e) => e.stopPropagation()}>
          <h3 class="qcv1-modal-title">{s().title}</h3>
          <p class="settle-sub">
            {s().renderedFor.replace('{n}', String(Math.round(st()!.actualSeconds)))}
          </p>

          <div class="settle-rows">
            <div class="settle-row">
              <span>{s().held}</span>
              <Credits value={st()!.heldCredits} />
            </div>
            <div class="settle-row strong">
              <span>{s().charged}</span>
              <Credits value={st()!.finalCredits} strong />
            </div>
            <Show when={st()!.refundedCredits > 0}>
              <div class="settle-row refund">
                <span>{s().refunded}</span>
                <Credits value={st()!.refundedCredits} strong />
              </div>
            </Show>
          </div>

          <p class="settle-note">
            {st()!.capped ? s().cappedNote : st()!.refundedCredits > 0 ? '' : s().exactNote}
          </p>

          <div class="qcv1-modal-actions">
            <button class="qcv1-btn primary" onClick={quickCreateV1Actions.dismissSettlement}>
              {s().done}
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default SettlementDialog
