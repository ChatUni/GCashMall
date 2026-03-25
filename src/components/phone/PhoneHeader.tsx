import { Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { APP_DISPLAY_NAME } from '../../utils/config'
import './PhoneHeader.css'

interface PhoneHeaderProps {
  title?: string
  showBackButton?: boolean
  showSearch?: boolean
  onBack?: () => void
  rightAction?: JSX.Element
}

const PhoneHeader = (props: PhoneHeaderProps) => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (props.onBack) {
      props.onBack()
    } else {
      navigate(-1)
    }
  }

  const handleLogoClick = () => {
    navigate('/')
  }

  const handleSearchClick = () => {
    navigate('/search')
  }

  return (
    <header class="phone-header">
      <div class="phone-header-left">
        <Show
          when={props.showBackButton}
          fallback={
            <div class="phone-header-logo" onClick={handleLogoClick}>
              <img
                src="https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png"
                alt={APP_DISPLAY_NAME}
                class="phone-logo-image"
              />
            </div>
          }
        >
          <button class="phone-header-back" onClick={handleBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </Show>
      </div>

      <Show when={props.title}>
        <h1 class="phone-header-title">{props.title}</h1>
      </Show>

      <div class="phone-header-right">
        {props.rightAction}
        <Show when={props.showSearch !== false}>
          <button class="phone-header-search" onClick={handleSearchClick}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </Show>
      </div>
    </header>
  )
}

export default PhoneHeader
