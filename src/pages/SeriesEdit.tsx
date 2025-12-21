import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import MultiSelectTags from '../components/MultiSelectTags'
import ImageUpload from '../components/ImageUpload'
import { useLanguage } from '../context/LanguageContext'
import { apiGet, apiPost, apiPostFormData } from '../utils/api'
import type { Genre, Series } from '../types'
import './SeriesEdit.css'

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
  })
  const [genres, setGenres] = useState<Genre[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [originalCover, setOriginalCover] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchGenres()
    if (isEditMode && id) {
      fetchSeries(id)
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
        setFormData({
          name: series.name,
          description: series.description,
          genreIds: series.genre ? series.genre.map((g: Genre) => g.id) : [],
          cover: series.cover,
        })
        setOriginalCover(series.cover)
      }
    } catch (err) {
      setError(t.seriesEdit.loadError)
    } finally {
      setLoading(false)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }))
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleCancel = () => {
    const confirmed = window.confirm(t.seriesEdit.confirmCancel)
    if (confirmed) {
      navigate(-1)
    }
  }

  const handleSave = async () => {
    const confirmed = window.confirm(t.seriesEdit.confirmSave)
    if (!confirmed) {
      navigate(-1)
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

      await saveSeriesToDb(coverUrl)
      setSuccess(t.seriesEdit.saveSuccess)
      setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.seriesEdit.saveError)
    } finally {
      setSaving(false)
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

    const formDataUpload = new FormData()
    formDataUpload.append('file', imageFile)
    formDataUpload.append('folder', 'GCash')

    const result = await apiPostFormData<{ url: string }>('uploadImage', formDataUpload)
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to upload image')
    }

    return result.data.url
  }

  const saveSeriesToDb = async (coverUrl: string) => {
    const seriesData = buildSeriesData(coverUrl)

    const result = await apiPost('saveSeries', seriesData as unknown as Record<string, unknown>)
    if (!result.success) {
      throw new Error(result.error || 'Failed to save series')
    }
  }

  const buildSeriesData = (coverUrl: string) => {
    const selectedGenres = formData.genreIds
      .map((genreId) => genres.find((g) => g.id === genreId))
      .filter((g): g is Genre => g !== undefined)

    return {
      id: id || undefined,
      name: formData.name,
      description: formData.description,
      cover: coverUrl,
      genre: selectedGenres,
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

          <ActionButtons
            onCancel={handleCancel}
            onSave={handleSave}
            saving={saving}
            cancelLabel={t.seriesEdit.cancel}
            saveLabel={t.seriesEdit.save}
          />
        </form>
      </div>
      <BottomBar />
    </div>
  )
}

interface SeriesFormData {
  name: string
  description: string
  genreIds: number[]
  cover: string
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

const DescriptionField = ({ value, onChange, label }: DescriptionFieldProps) => (
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

const GenreField = ({ genres, selectedIds, onChange, label }: GenreFieldProps) => (
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
    <ImageUpload
      imageUrl={imageUrl}
      onImageChange={onImageChange}
    />
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

export default SeriesEdit