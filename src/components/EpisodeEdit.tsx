import { createSignal, Show } from 'solid-js'
import MediaUpload, { validateMediaFile } from './MediaUpload'
import { toastStoreActions } from '../stores'
import { t } from '../stores/languageStore'
import type { ModerationStatus } from '../types'
import './EpisodeEdit.css'

interface EpisodeEditProps {
  episodeNumber: number
  title: string
  videoId: string
  videoPreview?: string
  // Review state. Absent for an episode that hasn't been saved yet.
  moderationStatus?: ModerationStatus
  moderationReason?: string
  hasPendingEdit?: boolean
  onTitleChange: (title: string) => void
  onVideoChange: (file: File | null, previewUrl: string | null) => void
  onDelete: () => void
}

// Where this episode stands with the reviewer, shown on the thing the uploader has to fix.
// A rejection is the case that needs their action, so it also shows the reviewer's words.
const ReviewState = (props: {
  status?: ModerationStatus
  reason?: string
  hasPendingEdit?: boolean
}) => {
  // An episode saved before manual moderation existed carries no status. It still has to
  // be reviewed, so treat "no record" as pending rather than showing no badge at all.
  const status = (): ModerationStatus => props.status || 'pending'

  return (
    <div class="episode-review">
      <span class={`episode-review-chip ${status()}`}>
        {(t().seriesEdit as unknown as Record<string, string>)[`review_${status()}`]}
      </span>
      <Show when={props.hasPendingEdit && status() !== 'rejected'}>
        <span class="episode-review-note">{t().seriesEdit.reviewPendingEdit}</span>
      </Show>
      <Show when={status() === 'rejected' && props.reason}>
        <p class="episode-review-reason">
          <span class="episode-review-reason-label">{t().seriesEdit.reviewReason}</span>
          {props.reason}
        </p>
      </Show>
    </div>
  )
}

const EpisodeEdit = (props: EpisodeEditProps) => {
  const [isEditingTitle, setIsEditingTitle] = createSignal(false)
  const [editedTitle, setEditedTitle] = createSignal(props.title)
  let replaceInputRef: HTMLInputElement | undefined

  // Only offer Replace when there is something to replace; an empty slot already opens the
  // picker when clicked. Reuses MediaUpload's limits so both entry points agree.
  const hasVideo = () => Boolean(props.videoId || props.videoPreview)

  const handleReplaceFile = async (e: Event & { currentTarget: HTMLInputElement }) => {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = '' // allow re-picking the same file after an error
    if (!file) return
    const error = await validateMediaFile(file, 'video')
    if (error) {
      toastStoreActions.show(error, 'error')
      return
    }
    props.onVideoChange(file, URL.createObjectURL(file))
  }

  const handleTitleClick = () => {
    setIsEditingTitle(true)
    setEditedTitle(props.title)
  }

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    props.onTitleChange(editedTitle())
  }

  const handleTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false)
      props.onTitleChange(editedTitle())
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setEditedTitle(props.title)
    }
  }

  return (
    <div class="episode-edit">
      <div class="episode-edit-header">
        <TitleField
          episodeNumber={props.episodeNumber}
          title={props.title}
          editedTitle={editedTitle()}
          isEditingTitle={isEditingTitle()}
          onTitleClick={handleTitleClick}
          onTitleChange={setEditedTitle}
          onTitleBlur={handleTitleBlur}
          onTitleKeyDown={handleTitleKeyDown}
        />
      </div>
      <div class="episode-edit-video">
        <MediaUpload
          mode="video"
          mediaUrl={props.videoPreview}
          videoId={props.videoId}
          onMediaChange={props.onVideoChange}
          showRemoveButton={false}
        />
      </div>
      <Show when={hasVideo()}>
        <button
          type="button"
          class="episode-replace-button"
          onClick={() => replaceInputRef?.click()}
        >
          {t().seriesEdit.replaceVideo}
        </button>
        <input
          type="file"
          ref={replaceInputRef}
          class="episode-replace-input"
          accept="video/*"
          onChange={handleReplaceFile}
        />
      </Show>
      <button
        type="button"
        class="episode-delete-button"
        onClick={props.onDelete}
      >
        {t().seriesEdit.deleteEpisode}
      </button>
      {/* Last in the card: the review block's height varies (a rejection reason can run to
          several lines), and .episode-list is a grid — anything above the video would push
          this card's player out of line with its neighbours in the same row. */}
      <ReviewState
        status={props.moderationStatus}
        reason={props.moderationReason}
        hasPendingEdit={props.hasPendingEdit}
      />
    </div>
  )
}

interface TitleFieldProps {
  episodeNumber: number
  title: string
  editedTitle: string
  isEditingTitle: boolean
  onTitleClick: () => void
  onTitleChange: (value: string) => void
  onTitleBlur: () => void
  onTitleKeyDown: (e: KeyboardEvent) => void
}

const TitleField = (props: TitleFieldProps) => {
  const displayTitle = () => props.title || `EP ${String(props.episodeNumber).padStart(2, '0')}`

  return (
    <Show
      when={props.isEditingTitle}
      fallback={
        <div class="episode-title-display" onClick={props.onTitleClick}>
          <span class="episode-title">{displayTitle()}</span>
          <span class="episode-edit-icon">✏️</span>
          <span class="episode-edit-text">(edit)</span>
        </div>
      }
    >
      <input
        type="text"
        class="episode-title-input"
        value={props.editedTitle}
        onInput={(e) => props.onTitleChange(e.currentTarget.value)}
        onBlur={props.onTitleBlur}
        onKeyDown={props.onTitleKeyDown}
        autofocus
      />
    </Show>
  )
}

export default EpisodeEdit
