import { createEffect, onCleanup, Show, For, untrack } from 'solid-js'
import { useParams } from '@solidjs/router'
import { commentStore, commentStoreActions, commentCount } from '../stores/commentStore'
import { accountStore } from '../stores/accountStore'
import { playerStore } from '../stores/playerStore'
import { t } from '../stores/languageStore'
import { isLoggedIn } from '../utils/api'
import { loginModalStoreActions } from '../stores'
import { timeAgo } from '../utils/timeAgo'
import './CommentSection.css'

// ── Main Comment Section ──

const CommentSection = () => {
  const params = useParams()

  // Load comments whenever series/episode changes
  createEffect(() => {
    const seriesId = params.id
    const episodeId = buildEpisodeId()
    if (seriesId && episodeId) {
      untrack(() => commentStoreActions.load(seriesId, episodeId))
    }
  })

  return (
    <div class="comment-section">
      <CommentTitleRow />
      <Show when={!commentStore.collapsed}>
        <CommentInput />
        <CommentList />
      </Show>
    </div>
  )
}

// ── Helpers ──

const buildEpisodeId = (): string | null => {
  const episode = playerStore.currentEpisode
  if (!episode) return null
  return episode._id || `ep-${episode.episodeNumber}`
}

// ── Title Row ──

const CommentTitleRow = () => (
  <div class="comment-title-row" onClick={commentStoreActions.toggleCollapsed}>
    <span class="comment-title-text">
      {commentCount()} {t().player.comments.title}
    </span>
    <svg
      class={`comment-chevron ${commentStore.collapsed ? 'collapsed' : ''}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </div>
)

// ── Input Row ──

const CommentInput = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (!isLoggedIn()) {
      loginModalStoreActions.open()
      return
    }
    commentStoreActions.submit()
  }

  const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    commentStoreActions.setInputText(e.currentTarget.value)
    if (commentStore.submitError) {
      commentStoreActions.clearSubmitError()
    }
  }

  return (
    <div class="comment-input-row">
      <UserAvatar
        src={accountStore.user?.avatar}
        size={36}
        isPlaceholder={!accountStore.user?.avatar}
      />
      <div class="comment-input-wrapper">
        <input
          type="text"
          placeholder={t().player.comments.placeholder}
          value={commentStore.inputText}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={commentStore.submitting}
        />
        <Show when={commentStore.submitError === 'profane'}>
          <div class="comment-error">{t().player.comments.profaneError}</div>
        </Show>
      </div>
      <div class="comment-input-actions">
        <button
          onClick={commentStoreActions.clearInput}
          disabled={!commentStore.inputText}
          title={t().player.comments.clear}
        >
          <ClearIcon />
        </button>
        <button
          onClick={handleSubmit}
          disabled={!commentStore.inputText.trim() || commentStore.submitting}
          title={t().player.comments.submit}
        >
          <SubmitIcon />
        </button>
      </div>
    </div>
  )
}

// ── Scroll Sentinel ──

const ScrollSentinel = () => {
  let ref: HTMLDivElement | undefined

  createEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          commentStoreActions.loadMore()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(ref)
    onCleanup(() => observer.disconnect())
  })

  return <div class="comment-scroll-sentinel" ref={ref} />
}

// ── Comment List ──

const CommentList = () => (
  <>
    <Show when={commentStore.loading}>
      <div class="comment-loading">{t().player.comments.loading}</div>
    </Show>

    <Show when={!commentStore.loading}>
      <Show
        when={commentStore.comments.length > 0}
        fallback={<div class="comment-empty">{t().player.comments.empty}</div>}
      >
        <div class="comment-list">
          <For each={commentStore.comments}>
            {(comment) => <CommentItem comment={comment} />}
          </For>
        </div>

        <Show when={commentStore.loadingMore}>
          <div class="comment-loading-more">{t().player.comments.loading}</div>
        </Show>

        <Show when={commentStore.hasMore}>
          <ScrollSentinel />
        </Show>
      </Show>
    </Show>
  </>
)

// ── Comment Item ──

const CommentItem = (props: { comment: { userAvatar: string | null; userNickname: string; createdAt: string | Date; body: string } }) => (
  <div class="comment-item">
    <div class="comment-avatar-col">
      <UserAvatar
        src={props.comment.userAvatar}
        size={24}
        isPlaceholder={!props.comment.userAvatar}
      />
    </div>
    <div class="comment-body-col">
      <div class="comment-meta">
        <span class="comment-username">{props.comment.userNickname}</span>
        <span class="comment-time">{timeAgo(props.comment.createdAt)}</span>
      </div>
      <div class="comment-text">{props.comment.body}</div>
    </div>
  </div>
)

// ── Shared Avatar ──

const UserAvatar = (props: { src: string | null | undefined; size: number; isPlaceholder: boolean }) => (
  <Show
    when={!props.isPlaceholder && props.src}
    fallback={
      <div
        class="comment-avatar-placeholder"
        style={{ width: `${props.size}px`, height: `${props.size}px` }}
      >
        <svg width={props.size * 0.55} height={props.size * 0.55} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>
    }
  >
    <img
      class={props.size >= 36 ? 'comment-input-avatar' : 'comment-avatar'}
      src={props.src!}
      alt="avatar"
      style={{ width: `${props.size}px`, height: `${props.size}px` }}
    />
  </Show>
)

// ── Icons ──

const ClearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
)

const SubmitIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
)

export default CommentSection
