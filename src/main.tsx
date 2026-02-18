import { render } from 'solid-js/web'
import './index.css'
import App from './App'

declare global {
  interface Window {
    tap: <T>(x: T) => T
  }
}

window.tap = <T,>(x: T): T => {
  console.log(x)
  return x
}

const root = document.getElementById('root')

if (root) {
  render(() => <App />, root)
}
