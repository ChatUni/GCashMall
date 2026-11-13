import { For, Show } from 'solid-js'
import { A } from '@solidjs/router'
import { t } from '../stores/languageStore'
import Icon from './Icon'
import LegalLink from './LegalLink'
import { LEGAL_PAGES } from '../utils/legalPages'
import { isCordova } from '../utils/cordova'
import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  SUPPORT_EMAIL,
  activeSocialLinks,
} from '../utils/siteLinks'
import appStoreBadge from '../assets/badge-app-store.svg'
import googlePlayBadge from '../assets/badge-google-play.png'
import appStoreQr from '../assets/qr-app-store.svg'
import googlePlayQr from '../assets/qr-google-play.svg'
import './BottomBar.css'

type FooterKey = keyof ReturnType<typeof t>['footer']
type FooterLink = { label: FooterKey; href: string; external?: boolean }

const FOOTER_COLUMNS: { title: FooterKey; links: FooterLink[] }[] = [
  {
    title: 'explore',
    links: [
      { label: 'home', href: '/' },
      { label: 'genres', href: '/genre' },
      { label: 'search', href: '/search' },
      { label: 'createYourOwn', href: '/quick-create' },
    ],
  },
  {
    title: 'creators',
    links: [
      { label: 'creatorProgram', href: '/creator-program' },
      { label: 'uploadSeries', href: '/series/new' },
    ],
  },
  {
    title: 'company',
    links: [
      { label: 'about', href: '/about' },
      { label: 'contact', href: '/contact' },
      { label: 'support', href: `mailto:${SUPPORT_EMAIL}`, external: true },
    ],
  },
]

const STORES = [
  { name: 'App Store', url: APP_STORE_URL, badge: appStoreBadge, qr: appStoreQr },
  { name: 'Google Play', url: GOOGLE_PLAY_URL, badge: googlePlayBadge, qr: googlePlayQr },
]

const label = (key: FooterKey) => t().footer[key]
const currentYear = new Date().getFullYear()

const FooterLinkItem = (props: { link: FooterLink }) => (
  <Show
    when={props.link.external}
    fallback={
      <A class="site-footer-link" href={props.link.href}>
        {label(props.link.label)}
      </A>
    }
  >
    <a class="site-footer-link" href={props.link.href}>
      {label(props.link.label)}
    </a>
  </Show>
)

const FooterColumns = () => (
  <For each={FOOTER_COLUMNS}>
    {(column) => (
      <div class="site-footer-column">
        <h3 class="site-footer-heading">{label(column.title)}</h3>
        <For each={column.links}>{(link) => <FooterLinkItem link={link} />}</For>
      </div>
    )}
  </For>
)

// Store badges with a QR code each, for desktop visitors to scan with their phone. Not shown
// inside the native app, which is already installed.
const GetTheApp = () => (
  <Show when={!isCordova()}>
    <div class="site-footer-column site-footer-apps">
      <h3 class="site-footer-heading">{label('getApp')}</h3>
      <div class="site-footer-stores">
        <For each={STORES}>
          {(store) => (
            <div class="site-footer-store">
              <img class="site-footer-qr" src={store.qr} alt={`${store.name} QR code`} width="104" height="104" />
              <a class="site-footer-badge" href={store.url} target="_blank" rel="noopener noreferrer">
                <img src={store.badge} alt={store.name} height="36" />
              </a>
            </div>
          )}
        </For>
      </div>
      <p class="site-footer-scan">{label('scanToDownload')}</p>
    </div>
  </Show>
)

const LegalRow = () => (
  <nav class="site-footer-legal" aria-label={t().legal.title}>
    <For each={LEGAL_PAGES}>
      {(item) => (
        <LegalLink class="site-footer-legal-link" page={item.page}>
          {t().legal[item.key]}
        </LegalLink>
      )}
    </For>
  </nav>
)

const SocialIcons = () => (
  <Show when={activeSocialLinks().length > 0}>
    <div class="site-footer-social" aria-label={label('followUs')}>
      <For each={activeSocialLinks()}>
        {(social) => (
          <a
            class="site-footer-social-link"
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            title={social.label}
            aria-label={social.label}
          >
            <Icon name={social.icon} size={22} />
          </a>
        )}
      </For>
    </div>
  </Show>
)

// Site footer: link columns and the app download on top; copyright, every
// legal page and the social links below the divider.
const BottomBar = () => (
  <footer class="site-footer">
    <div class="site-footer-inner">
      <div class="site-footer-top">
        <FooterColumns />
        <GetTheApp />
      </div>
      <div class="site-footer-bottom">
        <div class="site-footer-bottom-text">
          <p class="site-footer-copyright">
            © {currentYear} Fresh Road Studio Inc. {label('rights')}
          </p>
          <LegalRow />
        </div>
        <SocialIcons />
      </div>
    </div>
  </footer>
)

export default BottomBar
