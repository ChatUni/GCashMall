import { useRef, useState, useEffect, useCallback } from 'react'
import './MediaUpload.css'

type MediaMode = 'image' | 'video'

interface MediaUploadProps {
  mode: MediaMode
  mediaUrl?: string
  videoId?: string
  onMediaChange: (file: File | null, previewUrl: string | null) => void
}

const MediaUpload = ({ mode, mediaUrl, videoId, onMediaChange }: MediaUploadProps) => {
  validateProps({ mode, onMediaChange })

  const [previewUrl, setPreviewUrl] = useState<string | null>(mediaUrl || null)
  const [showOverlay, setShowOverlay] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreviewUrl(mediaUrl || null)
  }, [mediaUrl])

  const hasMedia = Boolean(previewUrl) || (mode === 'video' && Boolean(videoId))

  const handlePreviewClick = () => {
    if (hasMedia) {
      setShowOverlay(true)
    } else {
      openFilePicker()
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const processSelectedFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    onMediaChange(file, url)
  }

  const handleOverlayClick = () => {
    setShowOverlay(false)
  }

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (showOverlay) {
        setShowOverlay(false)
      }
    },
    [showOverlay],
  )

  useEffect(() => {
    if (showOverlay) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showOverlay, handleKeyDown])

  const acceptType = getAcceptType(mode)

  return (
    <div className="media-upload">
      <PreviewBox
        mode={mode}
        previewUrl={previewUrl}
        videoId={videoId}
        onClick={handlePreviewClick}
      />
      <FileInput ref={fileInputRef} accept={acceptType} onChange={handleFileChange} />
      {showOverlay && hasMedia && (
        <MediaOverlay
          mode={mode}
          mediaUrl={previewUrl}
          videoId={videoId}
          onClick={handleOverlayClick}
        />
      )}
    </div>
  )
}

const getAcceptType = (mode: MediaMode): string => {
  return mode === 'image' ? 'image/*' : 'video/*'
}

interface PreviewBoxProps {
  mode: MediaMode
  previewUrl: string | null
  videoId?: string
  onClick: () => void
}

const PreviewBox = ({ mode, previewUrl, videoId, onClick }: PreviewBoxProps) => {
  const hasMedia = Boolean(previewUrl) || (mode === 'video' && Boolean(videoId))
  const className = buildPreviewClassName(hasMedia)

  return (
    <div className={className} onClick={onClick}>
      {hasMedia ? (
        <PreviewContent mode={mode} previewUrl={previewUrl} videoId={videoId} />
      ) : (
        <span className="media-upload-plus">+</span>
      )}
    </div>
  )
}

interface PreviewContentProps {
  mode: MediaMode
  previewUrl: string | null
  videoId?: string
}

const PreviewContent = ({ mode, previewUrl, videoId }: PreviewContentProps) => {
  if (mode === 'image' && previewUrl) {
    return <img src={previewUrl} alt="Preview" className="media-upload-image" />
  }

  return <VideoThumbnail previewUrl={previewUrl} videoId={videoId} />
}

interface VideoThumbnailProps {
  previewUrl: string | null
  videoId?: string
}

const VideoThumbnail = ({ previewUrl, videoId }: VideoThumbnailProps) => {
  const thumbnailUrl = getThumbnailUrl(previewUrl, videoId)
  const isLocalBlob = previewUrl?.startsWith('blob:')

  if (isLocalBlob && previewUrl) {
    return <video src={previewUrl} className="media-upload-video-thumbnail" muted />
  }

  if (thumbnailUrl) {
    return (
      <div className="media-upload-video-container">
        <img src={thumbnailUrl} alt="Video thumbnail" className="media-upload-image" />
        <div className="media-upload-play-icon">▶</div>
      </div>
    )
  }

  return <span className="media-upload-plus">+</span>
}

const getThumbnailUrl = (previewUrl: string | null, videoId?: string): string | null => {
  if (videoId) {
    return `https://vz-918d4e7e-1fb.b-cdn.net/${videoId}/thumbnail.jpg`
  }
  return previewUrl
}

const buildPreviewClassName = (hasMedia: boolean): string => {
  const baseClass = 'media-upload-preview'
  return hasMedia ? `${baseClass} has-media` : baseClass
}

interface FileInputProps {
  accept: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const FileInput = ({
  accept,
  onChange,
  ref,
}: FileInputProps & { ref: React.RefObject<HTMLInputElement | null> }) => {
  return (
    <input
      type="file"
      ref={ref}
      className="media-upload-input"
      accept={accept}
      onChange={onChange}
    />
  )
}

interface MediaOverlayProps {
  mode: MediaMode
  mediaUrl: string | null
  videoId?: string
  onClick: () => void
}

const MediaOverlay = ({ mode, mediaUrl, videoId, onClick }: MediaOverlayProps) => {
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div className="media-upload-overlay" onClick={onClick}>
      {mode === 'image' && mediaUrl ? (
        <img src={mediaUrl} alt="Full size preview" className="media-upload-overlay-image" />
      ) : (
        <div className="media-upload-overlay-video" onClick={handleContentClick}>
          <VideoPlayer mediaUrl={mediaUrl} videoId={videoId} />
        </div>
      )}
    </div>
  )
}

interface VideoPlayerProps {
  mediaUrl: string | null
  videoId?: string
}

const VideoPlayer = ({ mediaUrl, videoId }: VideoPlayerProps) => {
  const isLocalBlob = mediaUrl?.startsWith('blob:')

  if (isLocalBlob && mediaUrl) {
    return <video src={mediaUrl} className="media-upload-video-player" controls autoPlay />
  }

  if (videoId) {
    return (
      <iframe
        src={`https://iframe.mediadelivery.net/embed/569096/${videoId}?autoplay=true`}
        className="media-upload-video-iframe"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    )
  }

  if (mediaUrl) {
    return <video src={mediaUrl} className="media-upload-video-player" controls autoPlay />
  }

  return null
}

const validateProps = ({
  mode,
  onMediaChange,
}: Pick<MediaUploadProps, 'mode' | 'onMediaChange'>) => {
  if (!mode) {
    throw new Error('mode prop is required')
  }
  if (!onMediaChange) {
    throw new Error('onMediaChange prop is required')
  }
}

export default MediaUpload