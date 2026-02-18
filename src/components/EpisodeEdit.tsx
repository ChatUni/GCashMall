import { createSignal, Show } from 'solid-js'
import MediaUpload from './MediaUpload'
import { t } from '../stores/languageStore'
import './EpisodeEdit.css'

interface EpisodeEditProps {
  episodeNumber: number
  title: string
  videoId: string
  videoPreview?: string
  onTitleChange: (title: string) => void
  onVideoChange: (file: File | null, previewUrl: string | null) => void
  onDelete: () => void
}

const EpisodeEdit = (props: EpisodeEditProps) => {
  const [isEditingTitle, setIsEditingTitle] = createSignal(false)
  const [editedTitle, setEditedTitle] = createSignal(props.title)

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
      <button
        type="button"
        class="episode-delete-button"
        onClick={props.onDelete}
      >
        {t().seriesEdit.deleteEpisode}
      </button>
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
