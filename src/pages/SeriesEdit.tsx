import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import MultiSelectTags from '../components/MultiSelectTags'
import MediaUpload from '../components/MediaUpload'
import EpisodeEdit from '../components/EpisodeEdit'
import { useLanguage } from '../context/LanguageContext'
import {
  useSeriesEditStore,
  seriesEditStoreActions,
  getActiveEpisodes,
  isAddEpisodeDisabled,
} from '../stores/seriesEditStore'
import {
  initializeSeriesEdit,
  saveSeries,
  handleImageChange,
  handleEpisodeTitleChange,
  handleEpisodeVideoChange,
  handleAddEpisode,
} from '../services/seriesEditService'
import './SeriesEdit.css'

// Track initialization per series ID
const initializedIds = new Set<string | undefined>()

const SeriesEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const isEditMode = Boolean(id)

  const state = useSeriesEditStore()

  // Initialize data (not in useEffect)
  const initKey = id || 'new'
  if (!initializedIds.has(initKey)) {
    initializedIds.add(initKey)
    seriesEditStoreActions.reset()
    initializeSeriesEdit(id, isEditMode)
  }

  const handleCancel = () => {
    const confirmed = window.confirm(t.seriesEdit.confirmCancel)
    if (confirmed) {
      navigate(-1)
    }
  }

  const handleSave = () => {
    saveSeries(id, t.seriesEdit as Record<string, string>, () => navigate(-1))
  }

  if (state.loading) {
    return (
      <div className="series-edit-page">
        <TopBar />
        <div className="series-edit-content">
          <div className="series-edit-loading">{t.seriesEdit.loading}</div>
        </div>
        <BottomBar />
      </div>
    )
  }

  const activeEpisodes = getActiveEpisodes(state.formData.episodes)

  return (
    <div className="series-edit-page">
      <TopBar />
      <div className="series-edit-content">
        {state.error && <div className="series-edit-error">{state.error}</div>}
        {state.success && <div className="series-edit-success">{state.success}</div>}

        <form className="series-edit-form" onSubmit={(e) => e.preventDefault()}>
          <NameField
            value={state.formData.name}
            onChange={seriesEditStoreActions.setName}
            label={t.seriesEdit.name}
          />

          <DescriptionField
            value={state.formData.description}
            onChange={seriesEditStoreActions.setDescription}
            label={t.seriesEdit.description}
          />

          <GenreField
            genres={state.genres}
            selectedIds={state.formData.genreIds}
            onChange={seriesEditStoreActions.setGenreIds}
            label={t.seriesEdit.genre}
          />

          <CoverField
            imageUrl={state.formData.cover}
            onImageChange={handleImageChange}
            label={t.seriesEdit.cover}
          />

          <EpisodeListField
            episodes={activeEpisodes}
            onTitleChange={handleEpisodeTitleChange}
            onVideoChange={handleEpisodeVideoChange}
            onDelete={seriesEditStoreActions.markEpisodeDeleted}
            onAddEpisode={handleAddEpisode}
            isAddDisabled={isAddEpisodeDisabled(state.formData.episodes)}
            label={t.seriesEdit.episodes}
            addLabel={t.seriesEdit.addEpisode}
          />

          <ActionButtons
            onCancel={handleCancel}
            onSave={handleSave}
            saving={state.saving}
            cancelLabel={t.seriesEdit.cancel}
            saveLabel={t.seriesEdit.save}
          />
        </form>

        {state.uploadProgress.show && (
          <UploadProgressDialog
            message={state.uploadProgress.message}
            current={state.uploadProgress.current}
            total={state.uploadProgress.total}
            title={t.seriesEdit.uploadProgress}
          />
        )}
      </div>
      <BottomBar />
    </div>
  )
}

// Pure sub-components

interface NameFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
}

const NameField: React.FC<NameFieldProps> = ({ value, onChange, label }) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <input
      type="text"
      className="series-edit-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
)

interface DescriptionFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
}

const DescriptionField: React.FC<DescriptionFieldProps> = ({ value, onChange, label }) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <textarea
      className="series-edit-textarea"
      rows={5}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
)

interface GenreFieldProps {
  genres: { id: number; name: string }[]
  selectedIds: number[]
  onChange: (selectedIds: number[]) => void
  label: string
}

const GenreField: React.FC<GenreFieldProps> = ({ genres, selectedIds, onChange, label }) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <MultiSelectTags tags={genres} selectedIds={selectedIds} onChange={onChange} />
  </div>
)

interface CoverFieldProps {
  imageUrl: string
  onImageChange: (file: File | null, previewUrl: string | null) => void
  label: string
}

const CoverField: React.FC<CoverFieldProps> = ({ imageUrl, onImageChange, label }) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <MediaUpload mode="image" mediaUrl={imageUrl} onMediaChange={onImageChange} />
  </div>
)

interface EpisodeFormData {
  id?: string
  episodeNumber: number
  title: string
  videoId: string
  videoPreview?: string
}

interface EpisodeListFieldProps {
  episodes: EpisodeFormData[]
  onTitleChange: (index: number, title: string) => void
  onVideoChange: (index: number, file: File | null, previewUrl: string | null) => void
  onDelete: (index: number) => void
  onAddEpisode: () => void
  isAddDisabled: boolean
  label: string
  addLabel: string
}

const EpisodeListField: React.FC<EpisodeListFieldProps> = ({
  episodes,
  onTitleChange,
  onVideoChange,
  onDelete,
  onAddEpisode,
  isAddDisabled,
  label,
  addLabel,
}) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <div className="episode-list">
      {episodes.map((episode, index) => (
        <EpisodeEdit
          key={episode.id || `new-${index}`}
          episodeNumber={episode.episodeNumber}
          title={episode.title}
          videoId={episode.videoId}
          videoPreview={episode.videoPreview}
          onTitleChange={(title) => onTitleChange(index, title)}
          onVideoChange={(file, previewUrl) => onVideoChange(index, file, previewUrl)}
          onDelete={() => onDelete(index)}
        />
      ))}
    </div>
    <button
      type="button"
      className="add-episode-button"
      onClick={onAddEpisode}
      disabled={isAddDisabled}
    >
      {addLabel}
    </button>
  </div>
)

interface ActionButtonsProps {
  onCancel: () => void
  onSave: () => void
  saving: boolean
  cancelLabel: string
  saveLabel: string
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onCancel,
  onSave,
  saving,
  cancelLabel,
  saveLabel,
}) => (
  <div className="series-edit-buttons">
    <button
      type="button"
      className="series-edit-button series-edit-button-cancel"
      onClick={onCancel}
      disabled={saving}
    >
      {cancelLabel}
    </button>
    <button
      type="button"
      className="series-edit-button series-edit-button-save"
      onClick={onSave}
      disabled={saving}
    >
      {saving ? '...' : saveLabel}
    </button>
  </div>
)

interface UploadProgressDialogProps {
  message: string
  current: number
  total: number
  title: string
}

const UploadProgressDialog: React.FC<UploadProgressDialogProps> = ({
  message,
  current,
  total,
  title,
}) => (
  <div className="upload-progress-overlay">
    <div className="upload-progress-dialog">
      <h3>{title}</h3>
      <p>{message}</p>
      <div className="upload-progress-bar">
        <div
          className="upload-progress-fill"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <p>
        {current} / {total}
      </p>
    </div>
  </div>
)

export default SeriesEdit
