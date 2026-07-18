// Reusable social-share widgets. SocialShareRow renders the same set of share
// buttons used on the Player page (Facebook, X, Instagram, WhatsApp, Reddit, Email)
// for an arbitrary url/text, and SocialSharePopup wraps that row in a modal overlay.
import { createSignal, Show } from 'solid-js'
import {
  shareFacebook,
  shareTwitter,
  shareInstagram,
  shareWhatsApp,
  shareReddit,
  shareEmail,
  copyToClipboard,
} from '../utils/playerHelpers'
import './SocialShare.css'

// The 6 share buttons + a "copy link" button, shareable to any url/text. imageUrl is
// used by Instagram (which shares an image, not a link); it falls back to the url.
export const SocialShareRow = (props: { url: string; text: string; imageUrl?: string }) => {
  const [copied, setCopied] = createSignal(false)
  const copy = async (e: MouseEvent) => {
    e.stopPropagation() // keep the popup open so the "copied" tick is visible
    if (await copyToClipboard(props.url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <>
    <button class="social-button" title="Facebook" onClick={() => shareFacebook(props.url)}>
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#1877F2"
          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        />
      </svg>
    </button>
    <button
      class="social-button"
      title="X"
      onClick={() => shareTwitter(props.url, props.text)}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" class="x-icon">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"
        />
      </svg>
    </button>
    <button
      class="social-button"
      title="Instagram"
      onClick={() => shareInstagram(props.imageUrl || props.url)}
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#E4405F"
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        />
      </svg>
    </button>
    <button
      class="social-button"
      title="WhatsApp"
      onClick={() => shareWhatsApp(props.url, props.text)}
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#25D366"
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        />
      </svg>
    </button>
    <button
      class="social-button"
      title="Reddit"
      onClick={() => shareReddit(props.url, props.text)}
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#FF4500"
          d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.07 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"
        />
      </svg>
    </button>
    <button
      class="social-button"
      title="Email"
      onClick={() => shareEmail(props.url, props.text)}
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path
          fill="#777"
          d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
        />
      </svg>
    </button>
    <button class="social-button" title="Copy link" onClick={copy}>
      <Show
        when={copied()}
        fallback={
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="#8b5cf6"
              d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
            />
          </svg>
        }
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path
            fill="#22c55e"
            d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
          />
        </svg>
      </Show>
    </button>
  </>
  )
}

// Modal overlay showing the share buttons in a horizontal row. Closes on backdrop
// click, the ✕, or after a share button is tapped.
export const SocialSharePopup = (props: {
  url: string
  text: string
  imageUrl?: string
  title: string
  closeLabel: string
  onClose: () => void
}) => (
  <div class="sshare-overlay" onClick={props.onClose}>
    <div class="sshare-panel" onClick={(e) => e.stopPropagation()}>
      <button class="sshare-x" title={props.closeLabel} onClick={props.onClose}>
        ✕
      </button>
      <h3 class="sshare-title">{props.title}</h3>
      <div class="sshare-row" onClick={props.onClose}>
        <SocialShareRow url={props.url} text={props.text} imageUrl={props.imageUrl} />
      </div>
    </div>
  </div>
)
