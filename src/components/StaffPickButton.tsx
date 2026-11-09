import { Show } from 'solid-js'
import Icon from './Icon'
import { t } from '../stores/languageStore'
import { accountStore } from '../stores/accountStore'
import { playerStore, playerPageStore, playerPageStoreActions } from '../stores/playerStore'
import './StaffPickButton.css'

const isPicked = () => !!playerStore.series?.staffPick
const label = () => (isPicked() ? t().player.staffPicked : t().player.staffPick)

// Admin only: adds the open series to, or removes it from, the Staff Picks rail.
const StaffPickButton = () => (
  <Show when={accountStore.user?.isAdmin && playerStore.series}>
    <button
      class={`staff-pick-btn ${isPicked() ? 'active' : ''}`}
      title={label()}
      aria-label={label()}
      aria-pressed={isPicked()}
      disabled={playerPageStore.staffPickBusy}
      onClick={playerPageStoreActions.toggleStaffPick}
    >
      <Icon name="star" size={18} />
    </button>
  </Show>
)

export default StaffPickButton
