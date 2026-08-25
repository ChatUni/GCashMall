// Creator Program — redesigned per the "creator 2" mockups. Uses the app TopBar (no left
// menu). A marketing Landing view + a 2-step Join wizard (Accept Agreement → Create
// Profile). Joining calls the server (grants publish permission) and refreshes the store.

import { For, Show, Switch, Match, createSignal, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import TopBar from '../components/TopBar'
import { t } from '../stores/languageStore'
import { accountStore } from '../stores/accountStore'
import { toastStoreActions } from '../stores'
import { getStoredUser } from '../utils/api'
import {
  isCordova,
  openSystemBrowser,
  legalPageUrl,
  PRIVACY_POLICY_PAGE,
} from '../utils/cordova'
import {
  creatorProgramStore as store,
  creatorProgramStoreActions as actions,
  canAdvanceJoin,
  BIO_MAX,
} from '../stores/creatorProgramStore'
import './CreatorProgram.css'

const cp = () => t().creatorProgram

const CDN = 'https://res.cloudinary.com/daqc8bim3/image/upload'
// Transparent-background hero (blends into the card in light + dark). See
// scripts/generate-creator-hero.mjs.
const HERO_ART = `${CDN}/GCash/creator/hero-creator.webp`
const PREVIEW_BANNER = `${CDN}/GCash/quick%20create%20v1/idea-dragonAcademy.webp`
const DEFAULT_AVATAR = `${CDN}/GCash/quick%20create%20v1/idea-aiGirlfriend.webp`
const GUSD_LOGO = `${CDN}/v1764702233/logo.png`

const isCreator = () =>
  ((accountStore.user || getStoredUser()) as { allowUpload?: boolean } | null)?.allowUpload === true

// ── Landing ──

const WHY = [
  { icon: '⬆️', cls: 'purple', k: 'publish' },
  { icon: '📈', cls: 'green', k: 'earn' },
  { icon: '👛', cls: 'amber', k: 'payouts' },
  { icon: '🛡️', cls: 'blue', k: 'secure' },
  { icon: '👥', cls: 'pink', k: 'built' },
] as const

const HOW = [
  { n: 1, icon: '✏️', tag: 'ok', k: 's1' },
  { n: 2, icon: '☁️', tag: 'green', k: 's2' },
  { n: 3, icon: '📈', tag: 'amber', k: 's3' },
  { n: 4, icon: '🛡️', tag: 'blue', k: 's4' },
] as const

const FAQS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const

const Landing = () => {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = createSignal<string | null>(null)
  const why = () => cp().why as Record<string, string>
  const how = () => cp().how as Record<string, string>
  const faq = () => cp().faq as Record<string, string>

  return (
    <div class="cpp-content">
      <h1 class="cpp-title">{cp().title}</h1>
      <p class="cpp-subtitle">{cp().subtitle}</p>

      {/* Hero */}
      <div class="cpp-hero">
        <div class="cpp-hero-left">
          <span class="cpp-hero-badge">✦ {cp().hero.badge}</span>
          <h2 class="cpp-hero-title">
            {cp().hero.titlePre}
            <span class="cpp-accent">{cp().hero.titleAccent}</span>
            {cp().hero.titlePost}
          </h2>
          <p class="cpp-hero-desc">{cp().hero.desc}</p>
          <ul class="cpp-hero-bullets">
            <li>{cp().hero.b1}</li>
            <li>{cp().hero.b2}</li>
            <li>{cp().hero.b3}</li>
          </ul>
          <div class="cpp-hero-actions">
            <button class="cpp-btn-primary" onClick={actions.startJoin}>
              {cp().hero.join}
            </button>
            <button class="cpp-link" onClick={actions.startJoin}>
              {cp().hero.learnMore} →
            </button>
          </div>
        </div>
        <div class="cpp-hero-art">
          <img src={HERO_ART} alt="" />
          <div class="cpp-hero-earn">
            <span class="cpp-hero-earn-label">{cp().hero.earnUpTo}</span>
            <b class="cpp-hero-earn-value">{cp().hero.earnPercent}</b>
            <img class="cpp-coin" src={GUSD_LOGO} alt="GUSD" />
          </div>
        </div>
      </div>

      {/* Already a creator */}
      <Show when={isCreator()}>
        <div class="cpp-already">
          <div class="cpp-already-icon">👑</div>
          <div class="cpp-already-text">
            <b>{cp().alreadyTitle}</b>
            <p>{cp().alreadyDesc}</p>
          </div>
          <button class="cpp-btn-outline" onClick={() => navigate('/account?tab=mySeries')}>
            {cp().enterHub} →
          </button>
        </div>
      </Show>

      {/* Why */}
      <h3 class="cpp-section-title">{cp().whyTitle}</h3>
      <div class="cpp-why-grid">
        <For each={WHY}>
          {(w) => (
            <div class="cpp-why-card">
              <span class={`cpp-why-icon ${w.cls}`}>{w.icon}</span>
              <b class="cpp-why-title">{why()[`${w.k}Title`]}</b>
              <p class="cpp-why-desc">{why()[`${w.k}Desc`]}</p>
            </div>
          )}
        </For>
      </div>

      {/* How it works */}
      <h3 class="cpp-section-title">{cp().howTitle}</h3>
      <div class="cpp-how-grid">
        <For each={HOW}>
          {(h, i) => (
            <>
              <div class="cpp-how-card">
                <span class="cpp-how-num">{h.n}</span>
                <span class="cpp-how-icon">{h.icon}</span>
                <b class="cpp-how-title">{how()[`${h.k}Title`]}</b>
                <p class="cpp-how-desc">{how()[`${h.k}Desc`]}</p>
                <span class={`cpp-how-tag ${h.tag}`}>{how()[`${h.k}Tag`]}</span>
              </div>
              <Show when={i() < HOW.length - 1}>
                <span class="cpp-how-arrow">→</span>
              </Show>
            </>
          )}
        </For>
      </div>

      {/* Status cards */}
      <div class="cpp-status-grid">
        <div class="cpp-status-card">
          <div class="cpp-status-head">{cp().earningsTitle} ⓘ</div>
          <div class="cpp-status-sub">{cp().pendingTitle}</div>
          <div class="cpp-earn-value">$0.00</div>
          <p class="cpp-status-note">{cp().pendingNote}</p>
          <button class="cpp-btn-outline full" onClick={() => navigate('/account?tab=mySeries')}>
            📊 {cp().viewEarnings}
          </button>
        </div>

        <div class="cpp-status-card">
          <div class="cpp-status-head">
            {cp().payoutStatusTitle} <span class="cpp-pill-warn">{cp().payoutNotEnabled}</span>
          </div>
          <div class="cpp-payout-kyc">
            <span class="cpp-payout-kyc-icon">🪪</span>
            <b>{cp().payoutKycTitle}</b>
          </div>
          <ul class="cpp-check-list">
            <li>{cp().payoutK1}</li>
            <li>{cp().payoutK2}</li>
            <li>{cp().payoutK3}</li>
          </ul>
          <button class="cpp-btn-primary full" onClick={() => toastStoreActions.show(cp().payoutNotEnabled, 'info')}>
            {cp().enablePayouts}
          </button>
          <button class="cpp-link center">{cp().learnPayouts} →</button>
        </div>

        <div class="cpp-status-card">
          <div class="cpp-status-head">{cp().payoutMethodTitle}</div>
          <div class="cpp-gusd-row">
            <img class="cpp-gusd-logo" src={GUSD_LOGO} alt="GUSD" />
            <b>GUSD</b>
          </div>
          <div class="cpp-status-sub">{cp().gusdPoweredBy}</div>
          <p class="cpp-status-note">{cp().gusdDesc}</p>
          <div class="cpp-pay-logos">
            <img src={GUSD_LOGO} alt="GUSD" />
            <span class="cpp-stripe">stripe</span>
          </div>
          <button class="cpp-link">{cp().changeInSettings}</button>
        </div>
      </div>

      {/* FAQ */}
      <div class="cpp-faq-head">
        <h3 class="cpp-section-title nomargin">{cp().faqTitle}</h3>
        <button class="cpp-link">{cp().viewAllFaqs} →</button>
      </div>
      <div class="cpp-faq-grid">
        <For each={FAQS}>
          {(q) => {
            const a = `a${q.slice(1)}`
            return (
              <div class={`cpp-faq ${openFaq() === q ? 'open' : ''}`}>
                <button class="cpp-faq-q" onClick={() => setOpenFaq(openFaq() === q ? null : q)}>
                  <span>{faq()[q]}</span>
                  <span class="cpp-faq-chevron">⌄</span>
                </button>
                <Show when={openFaq() === q}>
                  <p class="cpp-faq-a">{faq()[a]}</p>
                </Show>
              </div>
            )
          }}
        </For>
      </div>

      {/* CTA */}
      <div class="cpp-cta">
        <div class="cpp-cta-left">
          <span class="cpp-cta-emoji">🧑‍🎨</span>
          <span>{cp().ctaTitle}</span>
        </div>
        <div class="cpp-cta-right">
          <button class="cpp-btn-primary" onClick={actions.startJoin}>
            {cp().hero.join}
          </button>
          <span class="cpp-cta-time">⏱ {cp().ctaTime}</span>
        </div>
      </div>
      <p class="cpp-footer-note">🔒 {cp().footerNote}</p>
    </div>
  )
}

// ── Join wizard ──

// The policy is a static page outside the SPA, opened in a new tab so the creator doesn't
// lose the half-filled signup flow. In Cordova a plain target="_blank" is hijacked into an
// embedded WebView with no way back, so hand the URL to the system browser instead.
const openPrivacyPolicy = (e: MouseEvent) => {
  if (!isCordova()) return
  e.preventDefault()
  openSystemBrowser(legalPageUrl(PRIVACY_POLICY_PAGE))
}

const StepAgreement = () => {
  const j = () => cp().join
  return (
    <div class="cpp-panel">
      <span class="cpp-step-badge">{j().stepLabel.replace('{n}', '1')}</span>
      <h2 class="cpp-panel-title">📋 {j().agTitle}</h2>
      <p class="cpp-panel-desc">{j().agDesc}</p>

      <div class="cpp-agreement">
        <h4>{j().agHeading}</h4>
        <p>{j().agIntro}</p>
        <b>{j().ag1h}</b>
        <p>{j().ag1b}</p>
        <b>{j().ag2h}</b>
        <p>{j().ag2b}</p>
        <b>{j().ag3h}</b>
        <p>{j().ag3b}</p>
        <b>{j().ag4h}</b>
        <p>{j().ag4b}</p>
      </div>

      <label class="cpp-agree-check">
        <input
          type="checkbox"
          checked={store.agreementAccepted}
          onChange={(e) => actions.setAgreement(e.currentTarget.checked)}
        />
        <span>
          {j().accept} <a class="cpp-link inline">{j().tos}</a> {j().and}{' '}
          <a
            class="cpp-link inline"
            href={legalPageUrl(PRIVACY_POLICY_PAGE)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openPrivacyPolicy}
          >
            {j().privacy}
          </a>
        </span>
      </label>

      <button class="cpp-btn-primary full" disabled={!store.agreementAccepted} onClick={actions.next}>
        {j().acceptContinue} →
      </button>
      <p class="cpp-panel-note">🔒 {j().dataSafe}</p>
    </div>
  )
}

const SOCIALS = [
  { key: 'youtube', icon: '▶', ph: 'youtube.com/yourchannel' },
  { key: 'instagram', icon: '◎', ph: 'instagram.com/yourhandle' },
  { key: 'x', icon: '𝕏', ph: 'x.com/yourhandle' },
] as const

const StepProfile = () => {
  const j = () => cp().join
  const navigate = useNavigate()
  const p = () => store.profile
  const name = () => p().displayName.trim() || 'Creator'
  const avatar = () => p().avatar || accountStore.user?.avatar || DEFAULT_AVATAR
  const filledSocials = () => SOCIALS.filter((s) => (p().socials as Record<string, string>)[s.key])

  const submit = async () => {
    await actions.submitJoin()
    if (store.joined) {
      toastStoreActions.show(j().become, 'success')
      actions.reset()
      navigate('/account?tab=mySeries')
    }
  }

  return (
    <div class="cpp-prof-layout">
      <div class="cpp-panel">
        <span class="cpp-step-badge">{j().stepLabel.replace('{n}', '2')}</span>
        <h2 class="cpp-panel-title">{j().profTitle}</h2>
        <p class="cpp-panel-desc">{j().profDesc}</p>

        <div class="cpp-form">
          <h4>{j().basicInfo}</h4>

          <label class="cpp-label">
            {j().displayName} <span class="cpp-req">*</span>
          </label>
          <input
            class="cpp-input"
            value={p().displayName}
            onInput={(e) => actions.setProfileField('displayName', e.currentTarget.value)}
          />
          <span class="cpp-hint">{j().displayNameHint}</span>

          <label class="cpp-label">
            {j().bio} <span class="cpp-optional">{j().optional}</span>
          </label>
          <div class="cpp-textarea-wrap">
            <textarea
              class="cpp-textarea"
              maxlength={BIO_MAX}
              placeholder={j().bioPlaceholder}
              value={p().bio}
              onInput={(e) => actions.setProfileField('bio', e.currentTarget.value)}
            />
            <span class="cpp-count">
              {p().bio.length} / {BIO_MAX}
            </span>
          </div>

          <label class="cpp-label">
            {j().socialLinks} <span class="cpp-optional">{j().optional}</span>
          </label>
          <span class="cpp-hint">{j().socialLinksHint}</span>
          <For each={SOCIALS}>
            {(s) => (
              <div class="cpp-social-row">
                <span class="cpp-social-icon">{s.icon}</span>
                <input
                  class="cpp-input"
                  placeholder={s.ph}
                  value={(p().socials as Record<string, string>)[s.key]}
                  onInput={(e) => actions.setSocial(s.key as never, e.currentTarget.value)}
                />
              </div>
            )}
          </For>
          <button class="cpp-add-link">+ {j().addLink}</button>
        </div>

        <div class="cpp-prof-actions">
          <button class="cpp-btn-outline" onClick={actions.back}>
            {j().back}
          </button>
          <button
            class="cpp-btn-primary"
            disabled={!canAdvanceJoin() || store.submitting}
            onClick={submit}
          >
            {store.submitting ? j().joining : `${j().become} ✨`}
          </button>
        </div>
        <Show when={store.submitError}>
          <p class="cpp-error">{store.submitError}</p>
        </Show>
        <p class="cpp-become-note">{j().becomeNote}</p>
      </div>

      {/* Profile preview */}
      <div class="cpp-preview">
        <b class="cpp-preview-title">{j().previewTitle}</b>
        <p class="cpp-preview-desc">{j().previewDesc}</p>
        <div class="cpp-preview-card">
          <div class="cpp-preview-banner" style={{ 'background-image': `url(${PREVIEW_BANNER})` }} />
          <img class="cpp-preview-avatar" src={avatar()} alt="" />
          <div class="cpp-preview-name">{name()}</div>
          <div class="cpp-preview-handle">@{name().replace(/\s+/g, '')}</div>
          <Show when={p().bio}>
            <p class="cpp-preview-bio">{p().bio}</p>
          </Show>
          <Show when={filledSocials().length > 0}>
            <div class="cpp-preview-socials">
              <For each={filledSocials()}>{(s) => <span class="cpp-preview-soc">{s.icon}</span>}</For>
            </div>
          </Show>
          <div class="cpp-preview-stats">
            <span>
              <b>0</b>
              {j().statSeries}
            </span>
            <span>
              <b>0</b>
              {j().statEpisodes}
            </span>
            <span>
              <b>0</b>
              {j().statFollowers}
            </span>
          </div>
          <p class="cpp-preview-customize">✨ {j().previewCustomize}</p>
        </div>
      </div>
    </div>
  )
}

const JoinWizard = () => {
  const j = () => cp().join
  return (
    <div class="cpp-content">
      <div class="cpp-join-head">
        <button class="cpp-back-btn" onClick={actions.cancel}>
          ←
        </button>
        <div>
          <h1 class="cpp-title">{j().title}</h1>
          <p class="cpp-subtitle">{j().subtitle}</p>
        </div>
      </div>

      {/* 2-step progress */}
      <div class="cpp-steps">
        <div class={`cpp-step ${store.step >= 1 ? 'active' : ''}`}>
          <span class="cpp-step-num">1</span>
          <div class="cpp-step-text">
            <b>{j().step1}</b>
            <span>{j().step1Sub}</span>
          </div>
        </div>
        <div class={`cpp-step-line ${store.step >= 2 ? 'active' : ''}`} />
        <div class={`cpp-step ${store.step >= 2 ? 'active' : ''}`}>
          <span class="cpp-step-num">2</span>
          <div class="cpp-step-text">
            <b>{j().step2}</b>
            <span>{j().step2Sub}</span>
          </div>
        </div>
      </div>

      <Switch>
        <Match when={store.step === 1}>
          <StepAgreement />
        </Match>
        <Match when={store.step === 2}>
          <StepProfile />
        </Match>
      </Switch>

      <div class="cpp-kyc-banner">
        <span>ℹ️ {j().kycBanner}</span>
        <button class="cpp-link">{cp().learnPayouts} →</button>
      </div>
    </div>
  )
}

// ── Page ──

const CreatorProgram = () => {
  onMount(() => {
    const u = accountStore.user || getStoredUser()
    if (u) actions.prefill(u.nickname || '', u.email || '', u.avatar || '')
  })
  return (
    <div class="cpp-page">
      <TopBar />
      <Switch>
        <Match when={store.view === 'landing'}>
          <Landing />
        </Match>
        <Match when={store.view === 'join'}>
          <JoinWizard />
        </Match>
      </Switch>
    </div>
  )
}

export default CreatorProgram
