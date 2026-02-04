import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

declare global {
  interface Window {
    tap: <T>(x: T) => T
  }
}

window.tap = <T,>(x: T): T => {
  console.log(x)
  return x
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
