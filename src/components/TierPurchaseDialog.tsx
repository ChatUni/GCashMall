// Quality-tier purchase dialog — shown before an episode is generated.
//
// The user picks a target length and a quality tier; the price shown is rate x length.
// That amount is HELD, not spent: once the episode is rendered the charge is settled
// against its real duration and the remainder refunded, capped at the amount held. So
// every figure here is a ceiling — the most the episode can cost, never a surprise floor.

import { createSignal, onMount, Show, For } from 'solid-js'
import { t } from '../stores/languageStore'
import { accountStore } from '../stores/accountStore'
import { refreshUser } from '../services/accountService'
import { formatCredits, CREDITS_ICON } from '../utils/credits'
import {
  VIDEO_TIERS,
  DEFAULT_TIER_ID,
  EPISODE_LENGTH_OPTIONS,
  DEFAULT_EPISODE_SECONDS,
  tierCost,
  tierFamily,
  findTier,
  type VideoTier,
} from '../utils/videoTiers'
import './TierPurchaseDialog.css'

const q = () => t().quickCreateV1.purchase

// Every number in this dialog is credits, so each one carries the mark.
const Credits = (props: { value: number; bold?: boolean }) => (
  <span class="tier-credits">
    <img src={CREDITS_ICON} alt="" class="tier-credits-icon" />
    {props.bold ? <b>{formatCredits(props.value)}</b> : formatCredits(props.value)}
  </span>
)

const TierPurchaseDialog = (props: {
  title: string
  busy?: boolean
  onConfirm: (tierId: string, seconds: number) => void
  onCancel: () => void
  onTopUp: () => void
}) => {
  // The balance decides whether this dialog offers Generate or Top Up, so read it fresh
  // rather than trusting the copy cached at login. Runs once, when the dialog opens.
  onMount(() => {
    refreshUser()
  })

  const [selected, setSelected] = createSignal(DEFAULT_TIER_ID)
  const [seconds, setSeconds] = createSignal(DEFAULT_EPISODE_SECONDS)
  const tier = (): VideoTier => findTier(selected()) || VIDEO_TIERS[0]
  const cost = () => tierCost(tier(), seconds())
  const balance = () => accountStore.balance
  const canAfford = () => balance() >= cost()

  return (
    <div class="qcv1-modal-overlay" onClick={() => !props.busy && props.onCancel()}>
      <div class="qcv1-modal tier-modal" onClick={(e) => e.stopPropagation()}>
        <h3 class="qcv1-modal-title">{props.title}</h3>
        <p class="tier-sub">{q().chooseQuality}</p>

        {/* Length first: it scales every price in the list below it. */}
        <div class="tier-length">
          <span class="tier-length-label">{q().lengthLabel}</span>
          <div class="tier-length-opts">
            <For each={EPISODE_LENGTH_OPTIONS}>
              {(n) => (
                <button
                  class={`tier-length-opt ${seconds() === n ? 'selected' : ''}`}
                  disabled={props.busy}
                  onClick={() => setSeconds(n)}
                >
                  {q().seconds.replace('{n}', String(n))}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="tier-list">
          <For each={VIDEO_TIERS}>
            {(t0) => (
              <button
                class={`tier-row ${selected() === t0.id ? 'selected' : ''}`}
                disabled={props.busy}
                onClick={() => setSelected(t0.id)}
              >
                <span class="tier-radio" />
                <span class="tier-name">
                  <span class="tier-family">{tierFamily(t0)}</span>
                  <span class="tier-res">{t0.resolution}</span>
                </span>
                <span class="tier-rate">
                  <img src={CREDITS_ICON} alt="" class="tier-credits-icon sm" />
                  {q().perSecond.replace('{n}', String(t0.creditsPerSecond))}
                </span>
                <span class="tier-total">
                  <Credits value={tierCost(t0, seconds())} bold />
                </span>
              </button>
            )}
          </For>
        </div>

        <div class="qcv1-modal-cost">
          <span>{q().totalFor.replace('{n}', String(seconds()))}</span>
          <span class="qcv1-modal-price">
            <Credits value={cost()} bold />
          </span>
        </div>
        <div class="qcv1-modal-balance">
          <span>{q().yourBalance}</span>
          <span class={`qcv1-modal-bal ${canAfford() ? '' : 'low'}`}>
            <Credits value={balance()} />
          </span>
        </div>

        <p class="tier-cap-note">{q().capNote}</p>

        <Show when={!canAfford()}>
          <p class="qcv1-error sm">{q().insufficientBalance}</p>
        </Show>

        <div class="qcv1-modal-actions">
          <button class="qcv1-btn ghost" disabled={props.busy} onClick={props.onCancel}>
            {q().cancel}
          </button>
          <Show
            when={canAfford()}
            fallback={
              <button class="qcv1-btn secondary" onClick={props.onTopUp}>
                {q().topUp}
              </button>
            }
          >
            <button
              class="qcv1-btn primary"
              disabled={props.busy}
              onClick={() => props.onConfirm(selected(), seconds())}
            >
              {props.busy ? '…' : q().confirmGenerate}
            </button>
          </Show>
        </div>
      </div>
    </div>
  )
}

export default TierPurchaseDialog
