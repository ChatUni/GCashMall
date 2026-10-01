// The app's icon set.
//
// Every pictographic icon in the UI comes from here. Emoji are NOT used anywhere in this
// codebase: they depend on a platform emoji font that is not always available to the webview
// (the iOS Simulator is the usual offender), and where it is missing each codepoint renders as
// a missing-glyph box — a flag emoji, being two regional indicators, renders as two boxes.
// Inline SVG has no such dependency and inherits colour and size from CSS.
//
// Usage:  <Icon name="heart" />            // 1em square, currentColor
//         <Icon name="trash" size={32} />  // explicit pixel size
//         <Icon name="tv" class="my-ico" /> // extra class for positioning
//
// Adding one: give it a 24x24 viewBox path and keep the visual weight consistent with its
// neighbours — stroked shapes at stroke-width 2, solid shapes filled.

import { Show, For } from 'solid-js'
import './Icon.css'

type Shape = { d: string; fill?: boolean; dots?: [number, number][] }

// 24x24 viewBox. `fill: true` means the path is a solid silhouette rather than a stroked line.
const SHAPES: Record<string, Shape> = {
  // ── People & account ──
  person: { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  people: { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  artist: { d: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M19 8l2 2-4 4-2-2 4-4z' },
  idCard: { d: 'M3 5h18v14H3zM7 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 16c.6-2 1.8-3 3-3s2.4 1 3 3M13 9h5M13 13h5' },
  crown: { d: 'M3 8l3.5 4L12 5l5.5 7L21 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8z' },
  door: { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9' },

  // ── Media ──
  tv: { d: 'M2 7h20v13H2zM7 7l5-4 5 4' },
  clapper: { d: 'M3 8h18v12H3zM3 8l2.5-4h13L21 8M8 4l-2.5 4M13 4l-2.5 4M18 4l-2.5 4' },
  play: { d: 'M7 4l13 8-13 8V4z', fill: true },
  playCircle: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM10 8l6 4-6 4V8z' },
  film: { d: 'M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4' },
  camera: { d: 'M2 7h13v10H2zM15 11l7-4v10l-7-4' },
  image: { d: 'M3 5h18v14H3zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 16l-5-5-9 8' },
  music: { d: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  tvScreen: { d: 'M3 4h18v13H3zM8 21h8M12 17v4' },

  // ── Commerce ──
  cart: { d: 'M2 3h3l2.7 11.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  money: { d: 'M12 2c-3 0-5 1.5-5 3.5 0 1.3 1 2.2 2.5 2.7C6.5 9 5 11 5 14a7 7 0 1 0 14 0c0-3-1.5-5-4.5-5.8C16 7.7 17 6.8 17 5.5 17 3.5 15 2 12 2zM12 10v8M14 12.5c0-1-1-1.5-2-1.5s-2 .5-2 1.5 1 1.3 2 1.5 2 .6 2 1.5-1 1.5-2 1.5-2-.5-2-1.5' },
  cash: { d: 'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 9h1M18 15h1' },
  wallet: { d: 'M3 6h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3zM3 6a2 2 0 0 1 2-2h11M17 12h3' },
  gem: { d: 'M6 3h12l4 6-10 12L2 9l4-6zM2 9h20M9 3l-2 6 5 12M15 3l2 6-5 12' },

  // ── Status & feedback ──
  heart: { d: 'M12 20.3l-1.4-1.3C5.4 14.4 2 11.3 2 7.5 2 4.4 4.4 2 7.5 2c1.7 0 3.4.8 4.5 2.1C13.1 2.8 14.8 2 16.5 2 19.6 2 22 4.4 22 7.5c0 3.8-3.4 6.9-8.6 11.5L12 20.3z', fill: true },
  heartBroken: { d: 'M12 20.3l-1.4-1.3C5.4 14.4 2 11.3 2 7.5 2 4.4 4.4 2 7.5 2c1.7 0 3.4.8 4.5 2.1C13.1 2.8 14.8 2 16.5 2 19.6 2 22 4.4 22 7.5c0 3.8-3.4 6.9-8.6 11.5L12 20.3zM12 4l-2 5h4l-2 5' },
  check: { d: 'M20 6L9 17l-5-5' },
  checkCircle: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 12l3 3 5-6' },
  warning: { d: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01' },
  info: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01' },
  hourglass: { d: 'M6 2h12M6 22h12M6 2c0 4 3 5 6 10 3-5 6-6 6-10M6 22c0-4 3-5 6-10 3 5 6 6 6 10' },
  bell: { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0' },
  target: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  party: { d: 'M3 21l4-12 9 9-13 3zM14 6l1-3M18 8l3-2M18 13l3 1M13 2l1 2' },
  fire: { d: 'M12 22a7 7 0 0 0 7-7c0-5-4-6-5-12-3 2-5 5-5 8 0 1.5-1 2-1.5 1C6 11 5 12.5 5 15a7 7 0 0 0 7 7z' },
  star: { d: 'M12 2l3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3 2 9.4l7-.9L12 2z', fill: true },
  sparkle: { d: 'M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9L12 2.5zM18.5 15l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z', fill: true },
  bolt: { d: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z', fill: true },

  // ── Security ──
  lock: { d: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4' },
  unlock: { d: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-2' },
  shield: { d: 'M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z' },

  // ── Actions ──
  pencil: { d: 'M17 3l4 4L8 20l-5 1 1-5L17 3z' },
  trash: { d: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6' },
  save: { d: 'M5 3h11l3 3v15H5zM8 3v6h7V3M8 14h8v7H8z' },
  upload: { d: 'M12 17V3M6 9l6-6 6 6M3 21h18' },
  download: { d: 'M12 3v14M6 11l6 6 6-6M3 21h18' },
  refresh: { d: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5' },
  link: { d: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5' },
  search: { d: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3' },
  share: { d: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4' },
  dice: { d: 'M4 4h16v16H4z', dots: [[8.5, 8.5], [15.5, 8.5], [12, 12], [8.5, 15.5], [15.5, 15.5]] },
  menu: { d: 'M3 6h18M3 12h18M3 18h18' },
  grid: { d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  gear: { d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z' },

  // ── Content & docs ──
  book: { d: 'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z' },
  clipboard: { d: 'M9 3h6v3H9zM8 5H6v16h12V5h-2M9 11h6M9 15h4' },
  bulb: { d: 'M9 18h6M10 22h4M12 2a6 6 0 0 0-3.5 10.9c.6.5.9 1.2 1 1.9l.1 1.2h4.8l.1-1.2c.1-.7.4-1.4 1-1.9A6 6 0 0 0 12 2z' },
  chart: { d: 'M3 3v18h18M7 15v3M12 10v8M17 6v12' },
  chartUp: { d: 'M3 17l6-6 4 4 7-7M15 8h6v6' },
  calendar: { d: 'M3 5h18v16H3zM3 10h18M8 2v4M16 2v4' },
  chat: { d: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z' },
  envelope: { d: 'M2 5h20v14H2zM2 5l10 8 10-8' },
  inbox: { d: 'M3 12h5l2 3h4l2-3h5M3 12l3-8h12l3 8v8H3z' },
  outbox: { d: 'M3 12h5l2 3h4l2-3h5M3 12l3-8h12l3 8v8H3zM12 3v7M9 6l3-3 3 3' },

  // ── World & device ──
  globe: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z' },
  phone: { d: 'M6 2h12v20H6zM10 19h4' },
  cloud: { d: 'M18 18H7A4 4 0 0 1 7 10a6 6 0 0 1 11.3 2A3.5 3.5 0 0 1 18 18z' },
  rocket: { d: 'M12 2c3.5 2.5 5 6 5 10l-5 4-5-4c0-4 1.5-7.5 5-10zM12 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM7 16l-2 5 4-2M17 16l2 5-4-2' },
  clock: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2' },
  palette: { d: 'M12 21a9 9 0 1 1 9-9c0 2-1.6 3-3.5 3H16a2 2 0 0 0-1.4 3.4A2 2 0 0 1 13 21zM7.5 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM16.5 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },

  // ── Genre marks ──
  swords: { d: 'M14 3h7v7M21 3L9 15M3 14l7 7M10 21l-7-7M3 10V3h7M3 3l12 12' },
  crystalBall: { d: 'M12 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM7 20h10M9.5 9.5a3.5 3.5 0 0 1 2-2' },
  ghost: { d: 'M12 2a8 8 0 0 0-8 8v12l3-2 3 2 2-2 2 2 3-2 3 2V10a8 8 0 0 0-8-8zM9 10h.01M15 10h.01' },
  ufo: { d: 'M3 13h18a6 6 0 0 0-18 0zM9 7a3 3 0 0 1 6 0M6 16l-2 3M18 16l2 3M12 16v4' },
  smile: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01' },
  masks: { d: 'M3 5h8v6a4 4 0 0 1-8 0V5zM13 5h8v6a4 4 0 0 1-8 0V5zM6 8h.01M8.5 8h.01M16 8h.01M18.5 8h.01' },
  send: { d: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
  flag: { d: 'M4 22V4M4 4h13l-2 4 2 4H4' },
  ban: { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM4.9 4.9l14.2 14.2' },
  more: { d: 'M5 12h.01M12 12h.01M19 12h.01' },
  cat: { d: 'M4 4l3 4M20 4l-3 4M12 20c-4.4 0-8-3-8-7 0-2 .9-3.9 2.5-5.3L7 8h10l.5-.3C19.1 9.1 20 11 20 13c0 4-3.6 7-8 7zM9 13h.01M15 13h.01M11 16h2' },
}

export type IconName = keyof typeof SHAPES

interface IconProps {
  name: IconName
  /** Pixel size. Defaults to 1em so the icon tracks its surrounding font-size. */
  size?: number
  class?: string
  /** Decorative by default. Give a label when the icon is the only thing conveying meaning. */
  label?: string
}

const Icon = (props: IconProps) => (
  <svg
    class={`icon icon-${props.name} ${props.class || ''}`}
    width={props.size ? `${props.size}` : '1em'}
    height={props.size ? `${props.size}` : '1em'}
    viewBox="0 0 24 24"
    fill={SHAPES[props.name]?.fill ? 'currentColor' : 'none'}
    stroke={SHAPES[props.name]?.fill ? 'none' : 'currentColor'}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    role={props.label ? 'img' : undefined}
    aria-label={props.label}
    aria-hidden={props.label ? undefined : 'true'}
  >
    <Show when={SHAPES[props.name]}>
      <path d={SHAPES[props.name].d} />
      <For each={SHAPES[props.name].dots || []}>
        {([cx, cy]) => <circle cx={cx} cy={cy} r="1.5" fill="currentColor" stroke="none" />}
      </For>
    </Show>
  </svg>
)

export default Icon
