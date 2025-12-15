import { useRef, useState, useEffect, useCallback } from 'react'
import './ImageUpload.css'

interface ImageUploadProps {
  imageUrl?: string
  onImageChange: (file: File | null, previewUrl: string | null) => void
}

const ImageUpload = ({ imageUrl, onImageChange }: ImageUploadProps) => {
  validateProps({ imageUrl, onImageChange })

  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl || null)
  const [showOverlay, setShowOverlay] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreviewUrl(imageUrl || null)
  }, [imageUrl])

  const handlePreviewClick = () => {
    if (previewUrl) {
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
    onImageChange(file, url)
  }

  const handleOverlayClick = () => {
    setShowOverlay(false)
  }

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (showOverlay) {
      setShowOverlay(false)
    }
  }, [showOverlay])

  useEffect(() => {
    if (showOverlay) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showOverlay, handleKeyDown])

  return (
    <div className="image-upload">
      <PreviewBox
        previewUrl={previewUrl}
        onClick={handlePreviewClick}
      />
      <FileInput
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {showOverlay && previewUrl && (
        <ImageOverlay
          imageUrl={previewUrl}
          onClick={handleOverlayClick}
        />
      )}
    </div>
  )
}

interface PreviewBoxProps {
  previewUrl: string | null
  onClick: () => void
}

const PreviewBox = ({ previewUrl, onClick }: PreviewBoxProps) => {
  const className = buildPreviewClassName(previewUrl)

  return (
    <div className={className} onClick={onClick}>
      {previewUrl ? (
        <img src={previewUrl} alt="Preview" className="image-upload-image" />
      ) : (
        <span className="image-upload-plus">+</span>
      )}
    </div>
  )
}

const buildPreviewClassName = (previewUrl: string | null): string => {
  const baseClass = 'image-upload-preview'
  return previewUrl ? `${baseClass} has-image` : baseClass
}

interface FileInputProps {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const FileInput = ({ onChange, ref }: FileInputProps & { ref: React.RefObject<HTMLInputElement | null> }) => {
  return (
    <input
      type="file"
      ref={ref}
      className="image-upload-input"
      accept="image/*"
      onChange={onChange}
    />
  )
}

interface ImageOverlayProps {
  imageUrl: string
  onClick: () => void
}

const ImageOverlay = ({ imageUrl, onClick }: ImageOverlayProps) => {
  return (
    <div className="image-upload-overlay" onClick={onClick}>
      <img
        src={imageUrl}
        alt="Full size preview"
        className="image-upload-overlay-image"
      />
    </div>
  )
}

const validateProps = ({ onImageChange }: ImageUploadProps) => {
  if (!onImageChange) {
    throw new Error('onImageChange prop is required')
  }
}

export default ImageUpload