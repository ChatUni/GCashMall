import { createSignal, createEffect, onCleanup, Show, Switch, Match } from 'solid-js'
import './MediaUpload.css'

type MediaMode = 'image' | 'video'

interface MediaUploadProps {
  mode: MediaMode
  mediaUrl?: string
  videoId?: string
  onMediaChange: (file: File | null, previewUrl: string | null) => void
  showRemoveButton?: boolean
}

const MediaUpload = (props: MediaUploadProps) => {
  validateProps(props)

  const [previewUrl, setPreviewUrl] = createSignal<string | null>(props.mediaUrl || null)
  const [showOverlay, setShowOverlay] = createSignal(false)
  let fileInputRef: HTMLInputElement | undefined

  createEffect(() => {
    setPreviewUrl(props.mediaUrl || null)
  })

  const hasMedia = () => Boolean(previewUrl()) || (props.mode === 'video' && Boolean(props.videoId))

  const handlePreviewClick = () => {
    if (hasMedia()) {
      setShowOverlay(true)
    } else {
      openFilePicker()
    }
  }

  const openFilePicker = () => {
    fileInputRef?.click()
  }

  const handleFileChange = (event: Event & { currentTarget: HTMLInputElement }) => {
    const file = event.currentTarget.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const processSelectedFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    props.onMediaChange(file, url)
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    props.onMediaChange(null, null)
    if (fileInputRef) {
      fileInputRef.value = ''
    }
  }

  const handleOverlayClick = () => {
    setShowOverlay(false)
  }

  const handleKeyDown = (_event: KeyboardEvent) => {
    if (showOverlay()) {
      setShowOverlay(false)
    }
  }

  createEffect(() => {
    if (showOverlay()) {
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  const acceptType = () => getAcceptType(props.mode)

  return (
    <div class="media-upload">
      <PreviewBox
        mode={props.mode}
        previewUrl={previewUrl()}
        videoId={props.videoId}
        onClick={handlePreviewClick}
        onRemove={handleRemove}
        showRemoveButton={props.showRemoveButton ?? true}
      />
      <input
        type="file"
        ref={fileInputRef}
        class="media-upload-input"
        accept={acceptType()}
        onChange={handleFileChange}
      />
      <Show when={showOverlay() && hasMedia()}>
        <MediaOverlay
          mode={props.mode}
          mediaUrl={previewUrl()}
          videoId={props.videoId}
          onClick={handleOverlayClick}
        />
      </Show>
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
  onRemove: () => void
  showRemoveButton: boolean
}

const PreviewBox = (props: PreviewBoxProps) => {
  const hasMedia = () => Boolean(props.previewUrl) || (props.mode === 'video' && Boolean(props.videoId))
  const className = () => buildPreviewClassName(hasMedia())

  const handleRemoveClick = (e: MouseEvent) => {
    e.stopPropagation()
    props.onRemove()
  }

  return (
    <div class={className()} onClick={props.onClick}>
      <Show
        when={hasMedia()}
        fallback={<span class="media-upload-plus">+</span>}
      >
        <>
          <PreviewContent mode={props.mode} previewUrl={props.previewUrl} videoId={props.videoId} />
          <Show when={props.showRemoveButton}>
            <button class="media-upload-remove-button" onClick={handleRemoveClick}>
              ×
            </button>
          </Show>
        </>
      </Show>
    </div>
  )
}

interface PreviewContentProps {
  mode: MediaMode
  previewUrl: string | null
  videoId?: string
}

const PreviewContent = (props: PreviewContentProps) => (
  <Switch fallback={<VideoThumbnail previewUrl={props.previewUrl} videoId={props.videoId} />}>
    <Match when={props.mode === 'image' && props.previewUrl}>
      <img src={props.previewUrl!} alt="Preview" class="media-upload-image" />
    </Match>
  </Switch>
)

interface VideoThumbnailProps {
  previewUrl: string | null
  videoId?: string
}

const VideoThumbnail = (props: VideoThumbnailProps) => {
  const thumbnailUrl = () => getThumbnailUrl(props.previewUrl, props.videoId)
  const isLocalBlob = () => props.previewUrl?.startsWith('blob:')

  return (
    <Show
      when={isLocalBlob() && props.previewUrl}
      fallback={
        <Show
          when={thumbnailUrl()}
          fallback={<span class="media-upload-plus">+</span>}
        >
          <div class="media-upload-video-container">
            <img src={thumbnailUrl()!} alt="Video thumbnail" class="media-upload-image" />
            <div class="media-upload-play-icon">▶</div>
          </div>
        </Show>
      }
    >
      <video src={props.previewUrl!} class="media-upload-video-thumbnail" muted playsinline />
    </Show>
  )
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

interface MediaOverlayProps {
  mode: MediaMode
  mediaUrl: string | null
  videoId?: string
  onClick: () => void
}

const MediaOverlay = (props: MediaOverlayProps) => {
  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div class="media-upload-overlay" onClick={props.onClick}>
      <Show
        when={props.mode === 'image' && props.mediaUrl}
        fallback={
          <div class="media-upload-overlay-video" onClick={handleContentClick}>
            <VideoPlayer mediaUrl={props.mediaUrl} videoId={props.videoId} />
          </div>
        }
      >
        <img src={props.mediaUrl!} alt="Full size preview" class="media-upload-overlay-image" />
      </Show>
    </div>
  )
}

interface VideoPlayerProps {
  mediaUrl: string | null
  videoId?: string
}

const VideoPlayer = (props: VideoPlayerProps) => {
  const isLocalBlob = () => props.mediaUrl?.startsWith('blob:')

  return (
    <Show
      when={isLocalBlob() && props.mediaUrl}
      fallback={
        <Show
          when={props.videoId}
          fallback={
            <Show when={props.mediaUrl}>
              <video src={props.mediaUrl!} class="media-upload-video-player" controls autoplay playsinline />
            </Show>
          }
        >
          <iframe
            src={`https://iframe.mediadelivery.net/embed/569096/${props.videoId}?autoplay=true`}
            class="media-upload-video-iframe"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
          />
        </Show>
      }
    >
      <video src={props.mediaUrl!} class="media-upload-video-player" controls autoplay playsinline />
    </Show>
  )
}

const validateProps = (props: MediaUploadProps) => {
  if (!props.mode) {
    throw new Error('mode prop is required')
  }
  if (!props.onMediaChange) {
    throw new Error('onMediaChange prop is required')
  }
}

export default MediaUpload
