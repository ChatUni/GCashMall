import type { JSX } from 'solid-js'
import './Card.css'

interface CardProps {
  children: JSX.Element
  onClick?: () => void
  class?: string
  title?: string
}

const Card = (props: CardProps) => (
  <div
    class={`card ${props.class || ''}`}
    onClick={props.onClick}
    title={props.title}
  >
    {props.children}
  </div>
)

export default Card
