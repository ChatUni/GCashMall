import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import MultiSelectTags from '../components/MultiSelectTags'
import MediaUpload from '../components/MediaUpload'
import EpisodeEdit from '../components/EpisodeEdit'
import { useLanguage } from '../context/LanguageContext'
import { apiGet, apiPost } from '../utils/api'
import type { Genre, Series, Episode } from '../types'
import './SeriesEdit.css'

interface EpisodeFormData {
  id?: string
  episodeNumber: number
  title: string
  videoId: string
  videoPreview?: string
  videoFile?: File | null
  isNew?: boolean
  isDeleted?: boolean
}

interface SeriesFormData {
  name: string
  description: string
  genreIds: number[]
  cover: string
  episodes: EpisodeFormData[]
}

interface UploadProgress {
  show: boolean
  message: string
  current: number
  total: number
}

const SeriesEdit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const isEditMode = Boolean(id)

  const [formData, setFormData] = useState<SeriesFormData>({
    name: '',
    description: '',
    genreIds: [],
    cover: '',
    episodes: [],
  })
  const [genres, setGenres] = useState<Genre[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [originalCover, setOriginalCover] = useState<string>('')
  const [_originalEpisodes, _setOriginalEpisodes] = useState<EpisodeFormData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    show: false,
    message: '',
    current: 0,
    total: 0,
  })

  useEffect(() => {
    fetchGenres()
    if (isEditMode && id) {
      fetchSeries(id)
    } else {
      addInitialEpisode()
    }
  }, [id, isEditMode])

  const fetchGenres = async () => {
    try {
      const result = await apiGet<Genre[]>('genres')
      if (result.success && result.data) {
        setGenres(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch genres:', err)
    }
  }

  const fetchSeries = async (seriesId: string) => {
    setLoading(true)
    try {
      const result = await apiGet<Series>('series', { id: seriesId })
      if (result.success && result.data) {
        const series = result.data
        const episodes = mapEpisodesToFormData(series.episodes || [])
        setFormData({
          name: series.name,
          description: series.description,
          genreIds: series.genre ? series.genre.map((g: Genre) => g.id) : [],
          cover: series.cover,
          episodes: episodes,
        })
        setOriginalCover(series.cover)
        _setOriginalEpisodes(episodes.map((ep) => ({ ...ep })))

        if (episodes.length === 0) {
          addInitialEpisode()
        }
      }
    } catch (err) {
      setError(t.seriesEdit.loadError)
    } finally {
      setLoading(false)
    }
  }

  const mapEpisodesToFormData = (episodes: Episode[]): EpisodeFormData[] => {
    return episodes.map((ep) => ({
      id: ep._id,
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      videoId: ep.videoId || '',
      videoPreview: undefined,
      videoFile: null,
      isNew: false,
      isDeleted: false,
    }))
  }

  const addInitialEpisode = () => {
    setFormData((prev) => ({
      ...prev,
      episodes: [createNewEpisode(1)],
    }))
  }

  const createNewEpisode = (episodeNumber: number): EpisodeFormData => ({
    episodeNumber,
    title: '',
    videoId: '',
    videoPreview: undefined,
    videoFile: null,
    isNew: true,
    isDeleted: false,
  })

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }))
  }

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }))
  }

  const handleGenreChange = (selectedIds: number[]) => {
    setFormData((prev) => ({ ...prev, genreIds: selectedIds }))
  }

  const handleImageChange = (file: File | null, previewUrl: string | null) => {
    setImageFile(file)
    if (previewUrl) {
      setFormData((prev) => ({ ...prev, cover: previewUrl }))
    }
  }

  const handleEpisodeTitleChange = (index: number, title: string) => {
    setFormData((prev) => ({
      ...prev,
      episodes: prev.episodes.map((ep, i) =>
        i === index ? { ...ep, title } : ep,
      ),
    }))
  }

  const handleEpisodeVideoChange = (
    index: number,
    file: File | null,
    previewUrl: string | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      episodes: prev.episodes.map((ep, i) =>
        i === index
          ? { ...ep, videoFile: file, videoPreview: previewUrl || undefined }
          : ep,
      ),
    }))
  }

  const handleDeleteEpisode = (index: number) => {
    setFormData((prev) => {
      const episode = prev.episodes[index]
      let newEpisodes: EpisodeFormData[]

      if (episode.isNew) {
        newEpisodes = prev.episodes.filter((_, i) => i !== index)
      } else {
        newEpisodes = prev.episodes.map((ep, i) =>
          i === index ? { ...ep, isDeleted: true } : ep,
        )
      }

      newEpisodes = renumberEpisodes(newEpisodes)
      return { ...prev, episodes: newEpisodes }
    })
  }

  const renumberEpisodes = (episodes: EpisodeFormData[]): EpisodeFormData[] => {
    let number = 1
    return episodes.map((ep) => {
      if (ep.isDeleted) return ep
      return { ...ep, episodeNumber: number++ }
    })
  }

  const handleAddEpisode = () => {
    const activeEpisodes = formData.episodes.filter((ep) => !ep.isDeleted)
    const newEpisodeNumber = activeEpisodes.length + 1
    setFormData((prev) => ({
      ...prev,
      episodes: [...prev.episodes, createNewEpisode(newEpisodeNumber)],
    }))
  }

  const isAddEpisodeDisabled = (): boolean => {
    const activeEpisodes = formData.episodes.filter((ep) => !ep.isDeleted)
    if (activeEpisodes.length === 0) return false
    const lastEpisode = activeEpisodes[activeEpisodes.length - 1]
    return !lastEpisode.videoId && !lastEpisode.videoFile
  }

  const handleCancel = () => {
    const confirmed = window.confirm(t.seriesEdit.confirmCancel)
    if (confirmed) {
      navigate(-1)
    }
  }

  const handleSave = async () => {
    const confirmed = window.confirm(t.seriesEdit.confirmSave)
    if (!confirmed) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      let coverUrl = formData.cover

      if (imageFile) {
        coverUrl = await handleCoverUpload()
      }

      const episodesData = await handleEpisodeListChanges()

      await saveSeriesToDb(coverUrl, episodesData)
      setSuccess(t.seriesEdit.saveSuccess)
      setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.seriesEdit.saveError)
    } finally {
      setSaving(false)
      setUploadProgress({ show: false, message: '', current: 0, total: 0 })
    }
  }

  const handleCoverUpload = async (): Promise<string> => {
    if (!imageFile) return formData.cover

    if (originalCover && coverHasChanged()) {
      await deleteExistingCover()
    }

    return await uploadNewCover()
  }

  const coverHasChanged = (): boolean => {
    return originalCover !== formData.cover
  }

  const deleteExistingCover = async () => {
    try {
      await apiPost('deleteImage', { url: originalCover })
    } catch (err) {
      console.error('Failed to delete existing cover:', err)
    }
  }

  const uploadNewCover = async (): Promise<string> => {
    if (!imageFile) throw new Error('No image file to upload')

    const imageBase64 = await fileToDataUrl(imageFile)

    const result = await apiPost<{ url: string }>('uploadImage', {
      image: imageBase64,
      folder: 'GCash',
    })
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to upload image')
    }

    return result.data.url
  }

  const handleEpisodeListChanges = async (): Promise<EpisodeFormData[]> => {
    const episodesToDelete = getEpisodesToDelete()
    const episodesToUpload = getEpisodesToUpload()

    const totalOperations = episodesToDelete.length + episodesToUpload.length
    let currentOperation = 0

    if (totalOperations > 0) {
      setUploadProgress({
        show: true,
        message: t.seriesEdit.deletingVideos,
        current: 0,
        total: totalOperations,
      })
    }

    for (const episode of episodesToDelete) {
      await deleteEpisodeVideo(episode)
      currentOperation++
      setUploadProgress((prev) => ({
        ...prev,
        current: currentOperation,
      }))
    }

    if (episodesToUpload.length > 0) {
      setUploadProgress((prev) => ({
        ...prev,
        message: t.seriesEdit.uploadingVideos,
      }))
    }

    const updatedEpisodes = [...formData.episodes]
    for (const episode of episodesToUpload) {
      const index = updatedEpisodes.findIndex((ep) => ep === episode)
      if (index !== -1 && episode.videoFile) {
        const videoId = await uploadEpisodeVideo(episode)
        updatedEpisodes[index] = { ...updatedEpisodes[index], videoId }
      }
      currentOperation++
      setUploadProgress((prev) => ({
        ...prev,
        current: currentOperation,
      }))
    }

    return updatedEpisodes.filter((ep) => !ep.isDeleted)
  }

  const getEpisodesToDelete = (): EpisodeFormData[] => {
    return formData.episodes.filter(
      (ep) => ep.isDeleted && ep.videoId && !ep.isNew,
    )
  }

  const getEpisodesToUpload = (): EpisodeFormData[] => {
    return formData.episodes.filter((ep) => !ep.isDeleted && ep.videoFile)
  }

  const deleteEpisodeVideo = async (episode: EpisodeFormData) => {
    if (!episode.videoId) return
    try {
      await apiPost('deleteVideo', { videoId: episode.videoId })
    } catch (err) {
      console.error('Failed to delete video:', err)
    }
  }

  const uploadEpisodeVideo = async (episode: EpisodeFormData): Promise<string> => {
    if (!episode.videoFile) throw new Error('No video file to upload')

    // Step 1: Create video entry and get upload URL
    const createResult = await apiPost<{
      videoId: string
      uploadUrl: string
      accessKey: string
    }>('uploadVideo', {
      title: episode.title || `Episode ${episode.episodeNumber}`,
    })

    if (!createResult.success || !createResult.data) {
      throw new Error(createResult.error || 'Failed to create video')
    }

    const { videoId, uploadUrl, accessKey } = createResult.data

    // Step 2: Upload video directly to Bunny.net
    await uploadVideoDirectly(episode.videoFile, uploadUrl, accessKey)

    return videoId
  }

  const uploadVideoDirectly = async (
    file: File,
    uploadUrl: string,
    accessKey: string,
  ): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/octet-stream',
        AccessKey: accessKey,
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload video: ${response.statusText}`)
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const saveSeriesToDb = async (
    coverUrl: string,
    episodes: EpisodeFormData[],
  ) => {
    const seriesData = buildSeriesData(coverUrl, episodes)

    const result = await apiPost(
      'saveSeries',
      seriesData as unknown as Record<string, unknown>,
    )
    if (!result.success) {
      throw new Error(result.error || 'Failed to save series')
    }
  }

  const buildSeriesData = (coverUrl: string, episodes: EpisodeFormData[]) => {
    const selectedGenres = formData.genreIds
      .map((genreId) => genres.find((g) => g.id === genreId))
      .filter((g): g is Genre => g !== undefined)

    return {
      id: id || undefined,
      name: formData.name,
      description: formData.description,
      cover: coverUrl,
      genre: selectedGenres,
      episodes: episodes.map((ep) => ({
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        videoId: ep.videoId,
      })),
    }
  }

  if (loading) {
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

  const activeEpisodes = formData.episodes.filter((ep) => !ep.isDeleted)

  return (
    <div className="series-edit-page">
      <TopBar />
      <div className="series-edit-content">
        {error && <div className="series-edit-error">{error}</div>}
        {success && <div className="series-edit-success">{success}</div>}

        <form className="series-edit-form" onSubmit={(e) => e.preventDefault()}>
          <NameField
            value={formData.name}
            onChange={handleNameChange}
            label={t.seriesEdit.name}
          />

          <DescriptionField
            value={formData.description}
            onChange={handleDescriptionChange}
            label={t.seriesEdit.description}
          />

          <GenreField
            genres={genres}
            selectedIds={formData.genreIds}
            onChange={handleGenreChange}
            label={t.seriesEdit.genre}
          />

          <CoverField
            imageUrl={formData.cover}
            onImageChange={handleImageChange}
            label={t.seriesEdit.cover}
          />

          <EpisodeListField
            episodes={activeEpisodes}
            onTitleChange={handleEpisodeTitleChange}
            onVideoChange={handleEpisodeVideoChange}
            onDelete={handleDeleteEpisode}
            onAddEpisode={handleAddEpisode}
            isAddDisabled={isAddEpisodeDisabled()}
            label={t.seriesEdit.episodes}
            addLabel={t.seriesEdit.addEpisode}
          />

          <ActionButtons
            onCancel={handleCancel}
            onSave={handleSave}
            saving={saving}
            cancelLabel={t.seriesEdit.cancel}
            saveLabel={t.seriesEdit.save}
          />
        </form>

        {uploadProgress.show && (
          <UploadProgressDialog
            message={uploadProgress.message}
            current={uploadProgress.current}
            total={uploadProgress.total}
            title={t.seriesEdit.uploadProgress}
          />
        )}
      </div>
      <BottomBar />
    </div>
  )
}

interface NameFieldProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
}

const NameField = ({ value, onChange, label }: NameFieldProps) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <input
      type="text"
      className="series-edit-input"
      value={value}
      onChange={onChange}
    />
  </div>
)

interface DescriptionFieldProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  label: string
}

const DescriptionField = ({
  value,
  onChange,
  label,
}: DescriptionFieldProps) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <textarea
      className="series-edit-textarea"
      rows={5}
      value={value}
      onChange={onChange}
    />
  </div>
)

interface GenreFieldProps {
  genres: Genre[]
  selectedIds: number[]
  onChange: (selectedIds: number[]) => void
  label: string
}

const GenreField = ({
  genres,
  selectedIds,
  onChange,
  label,
}: GenreFieldProps) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <MultiSelectTags
      tags={genres}
      selectedIds={selectedIds}
      onChange={onChange}
    />
  </div>
)

interface CoverFieldProps {
  imageUrl: string
  onImageChange: (file: File | null, previewUrl: string | null) => void
  label: string
}

const CoverField = ({ imageUrl, onImageChange, label }: CoverFieldProps) => (
  <div className="series-edit-field">
    <label className="series-edit-label">{label}</label>
    <MediaUpload mode="image" mediaUrl={imageUrl} onMediaChange={onImageChange} />
  </div>
)

interface EpisodeListFieldProps {
  episodes: EpisodeFormData[]
  onTitleChange: (index: number, title: string) => void
  onVideoChange: (
    index: number,
    file: File | null,
    previewUrl: string | null,
  ) => void
  onDelete: (index: number) => void
  onAddEpisode: () => void
  isAddDisabled: boolean
  label: string
  addLabel: string
}

const EpisodeListField = ({
  episodes,
  onTitleChange,
  onVideoChange,
  onDelete,
  onAddEpisode,
  isAddDisabled,
  label,
  addLabel,
}: EpisodeListFieldProps) => (
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
          onVideoChange={(file, previewUrl) =>
            onVideoChange(index, file, previewUrl)
          }
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

const ActionButtons = ({
  onCancel,
  onSave,
  saving,
  cancelLabel,
  saveLabel,
}: ActionButtonsProps) => (
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

const UploadProgressDialog = ({
  message,
  current,
  total,
  title,
}: UploadProgressDialogProps) => (
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
