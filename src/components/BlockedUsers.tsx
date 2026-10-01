// Settings: the people you have blocked, each with Unblock. Shared by the desktop and phone
// account pages.

import { onMount, Show, For } from 'solid-js'
import { safetyStore, safetyActions } from '../stores/safetyStore'
import type { BlockedUser } from '../services/dataService'
import { t } from '../stores/languageStore'
import './BlockedUsers.css'

const s = () => t().safety as unknown as Record<string, string>

const BlockedRow = (props: { user: BlockedUser }) => (
  <div class="blocked-row">
    <img class="blocked-avatar" src={props.user.avatar || '/img/default-avatar.png'} alt="" />
    <span class="blocked-name">{props.user.nickname}</span>
    <button class="blocked-unblock" onClick={() => safetyActions.unblock(props.user)}>
      {s().unblock}
    </button>
  </div>
)

const BlockedUsers = (props: { class?: string }) => {
  onMount(() => safetyActions.loadBlocked())

  return (
    <div class={`blocked-users ${props.class || ''}`}>
      <h3 class="blocked-title">{s().blockedUsersTitle}</h3>
      <Show when={!safetyStore.blockedLoading} fallback={<div class="blocked-empty">…</div>}>
        <Show when={safetyStore.blocked.length > 0} fallback={<div class="blocked-empty">{s().blockedUsersEmpty}</div>}>
          <For each={safetyStore.blocked}>{(user) => <BlockedRow user={user} />}</For>
        </Show>
      </Show>
    </div>
  )
}

export default BlockedUsers
