import { useNavigate } from '@solidjs/router'
import { t } from '../stores/languageStore'
import './BottomBar.css'

const BottomBar = () => {
  const navigate = useNavigate()

  const handleAboutClick = () => {
    navigate('/about')
  }

  const handleContactClick = () => {
    navigate('/contact')
  }

  return (
    <div class="bottom-bar">
      <div class="bottom-bar-content">
        <button class="bottom-bar-link" onClick={handleAboutClick}>
          {(t().bottomBar as Record<string, string>).about}
        </button>
        <button class="bottom-bar-link" onClick={handleContactClick}>
          {(t().bottomBar as Record<string, string>).contact}
        </button>
      </div>
    </div>
  )
}

export default BottomBar
