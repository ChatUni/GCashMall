import { createSignal, Show, For } from 'solid-js'
import { useParams, useNavigate } from '@solidjs/router'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import MultiSelectTags from '../components/MultiSelectTags'
import MediaUpload from '../components/MediaUpload'
import EpisodeEdit from '../components/EpisodeEdit'
import { t } from '../stores/languageStore'
import {
  seriesEditStore,
  seriesEditStoreActions,
  getActiveEpisodes,
  isAddEpisodeDisabled,
} from '../stores/seriesEditStore'
import {
  initializeSeriesEdit,
  saveSeriesWithConfirmation,
  handleImageChange,
  handleEpisodeTitleChange,
  handleEpisodeVideoChange,
  handleAddEpisode,
} from '../services/seriesEditService'
import './SeriesEdit.css'

// Track initialization per series ID
const initializedIds = new Set<string | undefined>()

// Reusable SeriesEdit content component
export interface SeriesEditContentProps {
  seriesId?: string
  onCancel: () => void
  onSaveComplete: () => void
}

export const SeriesEditContent = (props: SeriesEditContentProps) => {
  const isEditMode = () => Boolean(props.seriesId) && props.seriesId !== 'new'
  const id = () => props.seriesId === 'new' ? undefined : props.seriesId

  // Save confirmation modal state
  const [showSaveModal, setShowSaveModal] = createSignal(false)

  // Cancel confirmation modal state
  const [showCancelModal, setShowCancelModal] = createSignal(false)

  // Initialize data (not in effect)
  const initKey = () => id() || 'new'
  if (!initializedIds.has(initKey())) {
    initializedIds.add(initKey())
    seriesEditStoreActions.reset()
    initializeSeriesEdit(id(), isEditMode())
  }

  const handleCancelClick = () => {
    setShowCancelModal(true)
  }

  const handleCancelConfirm = () => {
    setShowCancelModal(false)
    initializedIds.delete(initKey())
    props.onCancel()
  }

  const handleCancelCancel = () => {
    setShowCancelModal(false)
  }

  const handleSaveClick = () => {
    setShowSaveModal(true)
  }

  const handleSaveConfirm = () => {
    setShowSaveModal(false)
    saveSeriesWithConfirmation(id(), t().seriesEdit as Record<string, string>, () => {
      initializedIds.delete(initKey())
      props.onSaveComplete()
    })
  }

  const handleSaveCancel = () => {
    setShowSaveModal(false)
  }

  return (
    <Show when={!seriesEditStore.loading} fallback={
      <div class="series-edit-content">
        <div class="series-edit-loading">{t().seriesEdit.loading}</div>
      </div>
    }>
      <div class="series-edit-content">
        <Show when={seriesEditStore.error}>
          <div class="series-edit-error">{seriesEditStore.error}</div>
        </Show>
        <Show when={seriesEditStore.success}>
          <div class="series-edit-success">{seriesEditStore.success}</div>
        </Show>

        <form class="series-edit-form" onSubmit={(e) => e.preventDefault()}>
          <NameField
            value={seriesEditStore.formData.name}
            onChange={seriesEditStoreActions.setName}
            label={t().seriesEdit.name}
            totalEpisodes={getActiveEpisodes(seriesEditStore.formData.episodes).length}
          />

          <DescriptionField
            value={seriesEditStore.formData.description}
            onChange={seriesEditStoreActions.setDescription}
            label={t().seriesEdit.description}
          />

          <GenreField
            genres={seriesEditStore.genres}
            selectedIds={seriesEditStore.formData.genreIds}
            onChange={seriesEditStoreActions.setGenreIds}
            label={t().seriesEdit.genre}
          />

          <CoverField
            imageUrl={seriesEditStore.formData.cover}
            onImageChange={handleImageChange}
            label={t().seriesEdit.cover}
          />

          <EpisodeListField
            episodes={getActiveEpisodes(seriesEditStore.formData.episodes)}
            onTitleChange={handleEpisodeTitleChange}
            onVideoChange={handleEpisodeVideoChange}
            onDelete={seriesEditStoreActions.markEpisodeDeleted}
            onAddEpisode={handleAddEpisode}
            isAddDisabled={isAddEpisodeDisabled(seriesEditStore.formData.episodes)}
            label={t().seriesEdit.episodes}
            addLabel={t().seriesEdit.addEpisode}
          />

          <ShelvedField
            checked={seriesEditStore.formData.shelved}
            onChange={seriesEditStoreActions.setShelved}
            label={t().seriesEdit.shelved}
          />

          <ActionButtons
            onCancel={handleCancelClick}
            onSave={handleSaveClick}
            saving={seriesEditStore.saving}
            cancelLabel={t().seriesEdit.cancel}
            saveLabel={t().seriesEdit.save}
          />
        </form>

        <Show when={seriesEditStore.uploadProgress.show}>
          <UploadProgressDialog
            message={seriesEditStore.uploadProgress.message}
            current={seriesEditStore.uploadProgress.current}
            total={seriesEditStore.uploadProgress.total}
            title={t().seriesEdit.uploadProgress}
          />
        </Show>

        {/* Save Confirmation Modal */}
        <Show when={showSaveModal()}>
          <SaveConfirmationModal
            title={(t().seriesEdit as Record<string, string>).confirmSaveTitle || 'Confirm Save'}
            message={(t().seriesEdit as Record<string, string>).confirmSaveMessage || 'Are you sure you want to save this series?'}
            confirmLabel={(t().seriesEdit as Record<string, string>).confirmSaveBtn || 'Save'}
            cancelLabel={t().seriesEdit.cancel}
            onConfirm={handleSaveConfirm}
            onCancel={handleSaveCancel}
          />
        </Show>

        {/* Cancel Confirmation Modal */}
        <Show when={showCancelModal()}>
          <CancelConfirmationModal
            title={(t().seriesEdit as Record<string, string>).confirmCancelTitle || 'Discard Changes?'}
            message={(t().seriesEdit as Record<string, string>).confirmCancelMessage || 'Are you sure you want to cancel? Any unsaved changes will be lost.'}
            confirmLabel={(t().seriesEdit as Record<string, string>).discardChanges || 'Discard Changes'}
            cancelLabel={(t().seriesEdit as Record<string, string>).keepEditing || 'Keep Editing'}
            onConfirm={handleCancelConfirm}
            onCancel={handleCancelCancel}
          />
        </Show>
      </div>
    </Show>
  )
}

// Page component that wraps SeriesEditContent with TopBar/BottomBar
const SeriesEdit = () => {
  const params = useParams()
  const navigate = useNavigate()

  return (
    <div class="series-edit-page">
      <TopBar />
      <SeriesEditContent
        seriesId={params.id}
        onCancel={() => navigate(-1)}
        onSaveComplete={() => navigate(-1)}
      />
      <BottomBar />
    </div>
  )
}

// Pure sub-components

interface NameFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
  totalEpisodes: number
}

const NameField = (props: NameFieldProps) => (
  <div class="series-edit-field">
    <label class="series-edit-label">{props.label}</label>
    <input
      type="text"
      class="series-edit-input"
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)}
    />
    <span class="series-edit-total-eps">Total EPs {String(props.totalEpisodes).padStart(2, '0')}</span>
  </div>
)

interface DescriptionFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
}

const DescriptionField = (props: DescriptionFieldProps) => (
  <div class="series-edit-field">
    <label class="series-edit-label">{props.label}</label>
    <textarea
      class="series-edit-textarea"
      rows={5}
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)}
    />
  </div>
)

interface GenreFieldProps {
  genres: { _id: string; name: string }[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  label: string
}

const GenreField = (props: GenreFieldProps) => (
  <div class="series-edit-field">
    <label class="series-edit-label">{props.label}</label>
    <MultiSelectTags tags={props.genres} selectedIds={props.selectedIds} onChange={props.onChange} />
  </div>
)

interface CoverFieldProps {
  imageUrl: string
  onImageChange: (file: File | null, previewUrl: string | null) => void
  label: string
}

const CoverField = (props: CoverFieldProps) => (
  <div class="series-edit-field">
    <label class="series-edit-label">{props.label}</label>
    <MediaUpload mode="image" mediaUrl={props.imageUrl} onMediaChange={props.onImageChange} />
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

const EpisodeListField = (props: EpisodeListFieldProps) => (
  <div class="series-edit-field">
    <label class="series-edit-label">{props.label}</label>
    <div class="episode-list">
      <For each={props.episodes}>
        {(episode, index) => (
          <EpisodeEdit
            episodeNumber={episode.episodeNumber}
            title={episode.title}
            videoId={episode.videoId}
            videoPreview={episode.videoPreview}
            onTitleChange={(title) => props.onTitleChange(index(), title)}
            onVideoChange={(file, previewUrl) => props.onVideoChange(index(), file, previewUrl)}
            onDelete={() => props.onDelete(index())}
          />
        )}
      </For>
    </div>
    <button
      type="button"
      class="add-episode-button"
      onClick={props.onAddEpisode}
      disabled={props.isAddDisabled}
    >
      {props.addLabel}
    </button>
  </div>
)

interface ShelvedFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

const ShelvedField = (props: ShelvedFieldProps) => (
  <div class="series-edit-field series-edit-field-checkbox">
    <label class="series-edit-checkbox-label">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      {props.label}
    </label>
  </div>
)

interface ActionButtonsProps {
  onCancel: () => void
  onSave: () => void
  saving: boolean
  cancelLabel: string
  saveLabel: string
}

const ActionButtons = (props: ActionButtonsProps) => (
  <div class="series-edit-buttons">
    <button
      type="button"
      class="series-edit-button series-edit-button-cancel"
      onClick={props.onCancel}
      disabled={props.saving}
    >
      {props.cancelLabel}
    </button>
    <button
      type="button"
      class="series-edit-button series-edit-button-save"
      onClick={props.onSave}
      disabled={props.saving}
    >
      {props.saving ? '...' : props.saveLabel}
    </button>
  </div>
)

interface UploadProgressDialogProps {
  message: string
  current: number
  total: number
  title: string
}

const UploadProgressDialog = (props: UploadProgressDialogProps) => (
  <div class="upload-progress-overlay">
    <div class="upload-progress-dialog">
      <h3>{props.title}</h3>
      <p>{props.message}</p>
      <div class="upload-progress-bar">
        <div
          class="upload-progress-fill"
          style={{ width: `${(props.current / props.total) * 100}%` }}
        />
      </div>
      <p>
        {props.current} / {props.total}
      </p>
    </div>
  </div>
)

interface SaveConfirmationModalProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

const SaveConfirmationModal = (props: SaveConfirmationModalProps) => (
  <div class="save-modal-overlay" onClick={props.onCancel}>
    <div class="save-modal" onClick={(e) => e.stopPropagation()}>
      <div class="save-modal-icon">💾</div>
      <h2 class="save-modal-title">{props.title}</h2>
      <p class="save-modal-message">{props.message}</p>
      <div class="save-modal-buttons">
        <button class="save-modal-btn save-modal-btn-confirm" onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
        <button class="save-modal-btn save-modal-btn-cancel" onClick={props.onCancel}>
          {props.cancelLabel}
        </button>
      </div>
    </div>
  </div>
)

interface CancelConfirmationModalProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

const CancelConfirmationModal = (props: CancelConfirmationModalProps) => (
  <div class="save-modal-overlay" onClick={props.onCancel}>
    <div class="save-modal" onClick={(e) => e.stopPropagation()}>
      <div class="save-modal-icon">⚠️</div>
      <h2 class="save-modal-title">{props.title}</h2>
      <p class="save-modal-message">{props.message}</p>
      <div class="save-modal-buttons">
        <button class="save-modal-btn save-modal-btn-warning" onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
        <button class="save-modal-btn save-modal-btn-cancel" onClick={props.onCancel}>
          {props.cancelLabel}
        </button>
      </div>
    </div>
  </div>
)

export default SeriesEdit
