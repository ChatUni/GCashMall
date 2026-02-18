import { createSignal, createEffect, onCleanup, Show } from 'solid-js'
import './ImageUpload.css'

interface ImageUploadProps {
  imageUrl?: string
  onImageChange: (file: File | null, previewUrl: string | null) => void
}

const ImageUpload = (props: ImageUploadProps) => {
  validateProps(props)

  const [previewUrl, setPreviewUrl] = createSignal<string | null>(props.imageUrl || null)
  const [showOverlay, setShowOverlay] = createSignal(false)
  let fileInputRef: HTMLInputElement | undefined

  createEffect(() => {
    setPreviewUrl(props.imageUrl || null)
  })

  const handlePreviewClick = () => {
    if (previewUrl()) {
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
    props.onImageChange(file, url)
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

  return (
    <div class="image-upload">
      <PreviewBox
        previewUrl={previewUrl()}
        onClick={handlePreviewClick}
      />
      <input
        type="file"
        ref={fileInputRef}
        class="image-upload-input"
        accept="image/*"
        onChange={handleFileChange}
      />
      <Show when={showOverlay() && previewUrl()}>
        <ImageOverlay
          imageUrl={previewUrl()!}
          onClick={handleOverlayClick}
        />
      </Show>
    </div>
  )
}

interface PreviewBoxProps {
  previewUrl: string | null
  onClick: () => void
}

const PreviewBox = (props: PreviewBoxProps) => {
  const className = () => buildPreviewClassName(props.previewUrl)

  return (
    <div class={className()} onClick={props.onClick}>
      <Show
        when={props.previewUrl}
        fallback={<span class="image-upload-plus">+</span>}
      >
        <img src={props.previewUrl!} alt="Preview" class="image-upload-image" />
      </Show>
    </div>
  )
}

const buildPreviewClassName = (previewUrl: string | null): string => {
  const baseClass = 'image-upload-preview'
  return previewUrl ? `${baseClass} has-image` : baseClass
}

interface ImageOverlayProps {
  imageUrl: string
  onClick: () => void
}

const ImageOverlay = (props: ImageOverlayProps) => (
  <div class="image-upload-overlay" onClick={props.onClick}>
    <img
      src={props.imageUrl}
      alt="Full size preview"
      class="image-upload-overlay-image"
    />
  </div>
)

const validateProps = (props: ImageUploadProps) => {
  if (!props.onImageChange) {
    throw new Error('onImageChange prop is required')
  }
}

export default ImageUpload
