import { useState } from 'react'
import MediaUpload from './MediaUpload'
import { useLanguage } from '../context/LanguageContext'
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

const EpisodeEdit = ({
  episodeNumber,
  title,
  videoId,
  videoPreview,
  onTitleChange,
  onVideoChange,
  onDelete,
}: EpisodeEditProps) => {
  const { t } = useLanguage()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)

  const handleTitleClick = () => {
    setIsEditingTitle(true)
    setEditedTitle(title)
  }

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    onTitleChange(editedTitle)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false)
      onTitleChange(editedTitle)
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setEditedTitle(title)
    }
  }

  return (
    <div className="episode-edit">
      <div className="episode-edit-header">
        <TitleField
          episodeNumber={episodeNumber}
          title={title}
          editedTitle={editedTitle}
          isEditingTitle={isEditingTitle}
          onTitleClick={handleTitleClick}
          onTitleChange={setEditedTitle}
          onTitleBlur={handleTitleBlur}
          onTitleKeyDown={handleTitleKeyDown}
        />
      </div>
      <div className="episode-edit-video">
        <MediaUpload
          mode="video"
          mediaUrl={videoPreview}
          videoId={videoId}
          onMediaChange={onVideoChange}
          showRemoveButton={false}
        />
      </div>
      <button
        type="button"
        className="episode-delete-button"
        onClick={onDelete}
      >
        {t.seriesEdit.deleteEpisode}
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
  onTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

const TitleField = ({
  episodeNumber,
  title,
  editedTitle,
  isEditingTitle,
  onTitleClick,
  onTitleChange,
  onTitleBlur,
  onTitleKeyDown,
}: TitleFieldProps) => {
  const displayTitle = title || `EP ${String(episodeNumber).padStart(2, '0')}`
  
  if (isEditingTitle) {
    return (
      <input
        type="text"
        className="episode-title-input"
        value={editedTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        onBlur={onTitleBlur}
        onKeyDown={onTitleKeyDown}
        autoFocus
      />
    )
  }

  return (
    <div className="episode-title-display" onClick={onTitleClick}>
      <span className="episode-title">{displayTitle}</span>
      <span className="episode-edit-icon">✏️</span>
      <span className="episode-edit-text">(edit)</span>
    </div>
  )
}

export default EpisodeEdit
