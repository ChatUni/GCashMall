import { Show } from 'solid-js'
import type { JSX } from 'solid-js'
import PhoneNavBar from '../components/phone/PhoneNavBar'
import PhoneHeader from '../components/phone/PhoneHeader'
import './PhoneLayout.css'

interface PhoneLayoutProps {
  children?: JSX.Element
  title?: string
  showHeader?: boolean
  showBackButton?: boolean
  onBack?: () => void
  rightAction?: JSX.Element
}

const PhoneLayout = (props: PhoneLayoutProps) => (
  <div class="phone-layout">
    <Show when={props.showHeader !== false}>
      <PhoneHeader
        title={props.title}
        showBackButton={props.showBackButton}
        onBack={props.onBack}
        rightAction={props.rightAction}
      />
    </Show>
    <main class="phone-content">
      {props.children}
    </main>
    <PhoneNavBar />
  </div>
)

export default PhoneLayout
