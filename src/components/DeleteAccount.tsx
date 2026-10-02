// "Delete account" in Settings, with a confirmation that spells out what is lost.

import { Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { accountDeletionStore, accountDeletionActions } from '../stores/accountDeletionStore'
import { accountStore } from '../stores/accountStore'
import { t } from '../stores/languageStore'
import { formatCredits } from '../utils/credits'
import './SafetyDialogs.css'
import './DeleteAccount.css'

const d = () => t().account.deleteAccount as unknown as Record<string, string>

const ConfirmDialog = () => {
  const navigate = useNavigate()
  return (
    <Show when={accountDeletionStore.confirming}>
      <div class="safety-overlay" onClick={accountDeletionActions.close}>
        <div class="safety-dialog" role="alertdialog" onClick={(e) => e.stopPropagation()}>
          <h3 class="safety-title">{d().title}</h3>
          <p class="safety-body">{d().body}</p>
          <Show when={(accountStore.balance || 0) > 0}>
            <p class="safety-body delete-account-balance">
              {d().balanceWarning.replace('{credits}', formatCredits(accountStore.balance))}
            </p>
          </Show>
          <div class="safety-actions">
            <button class="safety-btn" onClick={accountDeletionActions.close}>{d().cancel}</button>
            <button
              class="safety-btn danger"
              disabled={accountDeletionStore.deleting}
              onClick={() => accountDeletionActions.confirm(navigate)}
            >
              {accountDeletionStore.deleting ? '…' : d().confirm}
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

const DeleteAccount = (props: { class?: string }) => (
  <>
    <button class={`delete-account-btn ${props.class || ''}`} onClick={accountDeletionActions.open}>
      {d().button}
    </button>
    <ConfirmDialog />
  </>
)

export default DeleteAccount
