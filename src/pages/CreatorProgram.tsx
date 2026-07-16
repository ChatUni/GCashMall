import { For, Show, Switch, Match, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { t } from '../stores/languageStore'
import { accountStore } from '../stores/accountStore'
import {
  creatorProgramStore,
  creatorProgramStoreActions as actions,
  canAdvanceJoin,
  JOIN_STEP_COUNT,
  BIO_MAX,
} from '../stores/creatorProgramStore'
import './CreatorProgram.css'

const cp = () => t().creatorProgram
const store = creatorProgramStore

const DEFAULT_AVATAR = 'https://res.cloudinary.com/daqc8bim3/image/upload/GCash/quick%20create/genre-action.webp'
const HERO_ART = 'https://res.cloudinary.com/daqc8bim3/image/upload/GCash/quick%20create/genre-action.webp'

// ── Shell sidebar (shared by landing + wizard) ──

const NAV_ITEMS: { key: string; icon: string; path?: string }[] = [
  { key: 'home', icon: '🏠', path: '/' },
  { key: 'mySeries', icon: '📚', path: '/account?tab=mySeries' },
  { key: 'analytics', icon: '📊' },
  { key: 'fans', icon: '👥' },
  { key: 'earnings', icon: '💲', path: '/account?tab=wallet' },
  { key: 'messages', icon: '💬' },
  { key: 'settings', icon: '⚙️', path: '/account?tab=settings' },
]

const Sidebar = () => {
  const navigate = useNavigate()
  const nav = () => cp().nav as Record<string, string>
  const user = () => accountStore.user
  return (
    <aside class="cpp-sidebar">
      <div class="cpp-logo" onClick={() => navigate('/')}>
        <span class="cpp-logo-mark">G</span>
        <span class="cpp-logo-text">Ganime</span>
      </div>

      <button class="cpp-create-btn" onClick={() => navigate('/quick-create')}>
        <span class="cpp-create-plus">+</span> {cp().create}
      </button>

      <nav class="cpp-nav">
        <For each={NAV_ITEMS}>
          {(item) => (
            <button
              class="cpp-nav-item"
              onClick={() => item.path && navigate(item.path)}
              disabled={!item.path}
            >
              <span class="cpp-nav-icon">{item.icon}</span>
              {nav()[item.key]}
            </button>
          )}
        </For>
      </nav>

      <div class="cpp-sidebar-spacer" />

      <div class="cpp-pro">
        <span class="cpp-pro-crown">👑</span>
        <div class="cpp-pro-title">{cp().proBadge}</div>
        <div class="cpp-pro-desc">{cp().proDesc}</div>
        <button class="cpp-pro-btn">{cp().proUpgrade}</button>
      </div>

      <div class="cpp-user">
        <img class="cpp-user-avatar" src={user()?.avatar || DEFAULT_AVATAR} alt="" />
        <div class="cpp-user-info">
          <span class="cpp-user-name">{store.profile.displayName || user()?.nickname || 'Creator'}</span>
          <span class="cpp-user-role">{cp().role}</span>
        </div>
        <span class="cpp-user-caret">⌄</span>
      </div>
    </aside>
  )
}

// ── Small reusable bits ──

const Check = () => <span class="cpp-check">✓</span>
const FeatureIcon = (props: { emoji: string }) => <span class="cpp-feat-icon">{props.emoji}</span>

// ── Landing page ──

const Landing = () => {
  const l = () => cp().landing
  const why = () => l().why as Record<string, string>
  const how = () => l().how as Record<string, string>

  const WHY = [
    { icon: '🏷️', title: 'revenueTitle', desc: 'revenueDesc' },
    { icon: '🌐', title: 'globalTitle', desc: 'globalDesc' },
    { icon: '👛', title: 'payoutsTitle', desc: 'payoutsDesc' },
    { icon: '💲', title: 'noFeesTitle', desc: 'noFeesDesc' },
    { icon: '🛡️', title: 'noKycTitle', desc: 'noKycDesc' },
  ]
  const HOW = [
    { n: 1, icon: '✏️', title: 'createTitle', desc: 'createDesc' },
    { n: 2, icon: '⬆️', title: 'publishTitle', desc: 'publishDesc' },
    { n: 3, icon: '👥', title: 'growTitle', desc: 'growDesc' },
    { n: 4, icon: '💲', title: 'earnTitle', desc: 'earnDesc' },
  ]
  const FAQS = ['faqKyc', 'faqCountries', 'faqMinPayout', 'faqSplit', 'faqChange', 'faqWhenPaid']

  return (
    <div class="cpp-main">
      <header class="cpp-topbar">
        <h1 class="cpp-page-title">{l().title}</h1>
        <div class="cpp-topbar-right">
          <span class="cpp-gems">💎 120</span>
          <span class="cpp-help">?</span>
        </div>
      </header>

      <div class="cpp-content">
        {/* Hero */}
        <section class="cpp-hero">
          <div class="cpp-hero-left">
            <span class="cpp-hero-badge">⭐ {l().badge}</span>
            <h2 class="cpp-hero-title">
              {l().heroPre}
              <span class="cpp-accent">{l().heroPercent}</span>
              {l().heroPost}
            </h2>
            <p class="cpp-hero-desc">{l().heroDesc}</p>
            <button class="cpp-btn-primary cpp-hero-cta" onClick={actions.startJoin}>
              {l().join} <span class="cpp-arrow">→</span>
            </button>
            <p class="cpp-hero-time">🕐 {l().joinTime}</p>
          </div>
          <div class="cpp-hero-right">
            <img class="cpp-hero-art" src={HERO_ART} alt="" />
            <div class="cpp-float-card cpp-float-revenue">
              <span class="cpp-float-label">{l().revenue}</span>
              <span class="cpp-float-value">$12,450.80</span>
              <span class="cpp-float-up">+24.6%</span>
            </div>
            <div class="cpp-float-card cpp-float-sales">
              <span class="cpp-float-label">{l().monthlySales}</span>
              <span class="cpp-float-value">1,248</span>
              <span class="cpp-float-up">+18.3%</span>
            </div>
            <div class="cpp-float-card cpp-float-share">
              <span class="cpp-float-label">{l().yourShare}</span>
              <span class="cpp-float-value">$9,960.64</span>
            </div>
          </div>
        </section>

        {/* Why creators love Ganime */}
        <section class="cpp-section">
          <h3 class="cpp-section-title">{l().whyTitle}</h3>
          <div class="cpp-why-grid">
            <For each={WHY}>
              {(f) => (
                <div class="cpp-card cpp-why-card">
                  <FeatureIcon emoji={f.icon} />
                  <div class="cpp-why-title">{why()[f.title]}</div>
                  <div class="cpp-why-desc">{why()[f.desc]}</div>
                </div>
              )}
            </For>
          </div>
        </section>

        {/* How it works */}
        <section class="cpp-section">
          <h3 class="cpp-section-title">{l().howTitle}</h3>
          <div class="cpp-card cpp-how">
            <For each={HOW}>
              {(s, i) => (
                <>
                  <div class="cpp-how-step">
                    <span class="cpp-how-num">{s.n}</span>
                    <FeatureIcon emoji={s.icon} />
                    <div class="cpp-how-title">{how()[s.title]}</div>
                    <div class="cpp-how-desc">{how()[s.desc]}</div>
                  </div>
                  <Show when={i() < HOW.length - 1}>
                    <span class="cpp-how-arrow">→</span>
                  </Show>
                </>
              )}
            </For>
          </div>
        </section>

        {/* Get paid your way */}
        <section class="cpp-section">
          <h3 class="cpp-section-title">{l().getPaidTitle}</h3>
          <p class="cpp-section-sub">{l().getPaidDesc}</p>
          <div class="cpp-pay-grid">
            <div class="cpp-card cpp-pay-card">
              <div class="cpp-pay-head">
                <span class="cpp-pay-name cpp-stripe">stripe</span>
                <span class="cpp-tag">⚠ {l().recommended}</span>
              </div>
              <div class="cpp-pay-title">{l().stripeName}</div>
              <p class="cpp-pay-desc">{l().stripeDesc}</p>
              <ul class="cpp-pay-feats">
                <For each={[l().stripeF1, l().stripeF2, l().stripeF3, l().stripeF4]}>
                  {(f) => <li><Check /> {f}</li>}
                </For>
              </ul>
            </div>
            <div class="cpp-card cpp-pay-card">
              <div class="cpp-pay-head">
                <span class="cpp-pay-name cpp-gusd">GUSD</span>
              </div>
              <div class="cpp-pay-title">{l().gusdName} {l().gusdSub}</div>
              <p class="cpp-pay-desc">{l().gusdDesc}</p>
              <ul class="cpp-pay-feats">
                <For each={[l().gusdF1, l().gusdF2, l().gusdF3, l().gusdF4]}>
                  {(f) => <li><Check /> {f}</li>}
                </For>
              </ul>
            </div>
          </div>
          <p class="cpp-note">🔒 {l().compliance}</p>
        </section>

        {/* FAQ */}
        <section class="cpp-section">
          <div class="cpp-faq-head">
            <h3 class="cpp-section-title">{l().faqTitle}</h3>
            <span class="cpp-link">{l().viewAllFaqs} →</span>
          </div>
          <div class="cpp-faq-grid">
            <For each={FAQS}>
              {(k) => (
                <button class="cpp-faq-item">
                  <span>{(l() as Record<string, string>)[k]}</span>
                  <span class="cpp-faq-caret">⌄</span>
                </button>
              )}
            </For>
          </div>
        </section>

        {/* Bottom CTA */}
        <section class="cpp-cta-banner">
          <span class="cpp-cta-avatars">🧑‍🎨🧑‍🎤🧑‍🚀</span>
          <span class="cpp-cta-text">{l().ctaTitle}</span>
          <button class="cpp-btn-primary" onClick={actions.startJoin}>
            {l().join} <span class="cpp-arrow">→</span>
          </button>
        </section>
        <p class="cpp-footer-note">🔒 {l().footerNote}</p>
      </div>
    </div>
  )
}

// ── Join wizard ──

const STEP_KEYS = [
  { key: 'agreement', label: 'stepAgreement', sub: 'stepAgreementSub', done: 'stepAgreementDone' },
  { key: 'payout', label: 'stepPayout', sub: 'stepPayoutSub', done: 'stepPayoutSub' },
  { key: 'profile', label: 'stepProfile', sub: 'stepProfileSub', done: 'stepProfileDone' },
  { key: 'complete', label: 'stepComplete', sub: 'stepCompleteSub', done: 'stepCompleteSub' },
]

const Stepper = () => {
  const j = () => cp().join as Record<string, string>
  return (
    <div class="cpp-stepper">
      <For each={STEP_KEYS}>
        {(s, i) => {
          const n = i() + 1
          const active = () => store.step === n
          const done = () => store.step > n
          return (
            <>
              <Show when={n > 1}>
                <div class={`cpp-stepper-line ${store.step >= n ? 'done' : ''}`} />
              </Show>
              <button class="cpp-stepper-item" onClick={() => actions.goToStep(n)} disabled={n > store.step}>
                <span class={`cpp-stepper-num ${active() ? 'active' : ''} ${done() ? 'done' : ''}`}>
                  {done() ? '✓' : n}
                </span>
                <span class="cpp-stepper-text">
                  <span class="cpp-stepper-label">{j()[s.label]}</span>
                  <span class="cpp-stepper-sub">{done() ? j()[s.done] : j()[s.sub]}</span>
                </span>
              </button>
            </>
          )
        }}
      </For>
    </div>
  )
}

// Step 1 — Agreement
const Step1 = () => {
  const s = () => cp().step1 as Record<string, string>
  const BEN = [
    { icon: '🏷️', t: 'revenueTitle', d: 'revenueDesc' },
    { icon: '🌐', t: 'globalTitle', d: 'globalDesc' },
    { icon: '👛', t: 'payoutsTitle', d: 'payoutsDesc' },
    { icon: '🛡️', t: 'secureTitle', d: 'secureDesc' },
    { icon: '👥', t: 'toolsTitle', d: 'toolsDesc' },
  ]
  const TERMS = [['t1h', 't1b'], ['t2h', 't2b'], ['t3h', 't3b'], ['t4h', 't4b']]
  return (
    <div class="cpp-card cpp-step-card">
      <div class="cpp-step-head">
        <div>
          <span class="cpp-step-label">{cp().join.stepOf.replace('{n}', '1')}</span>
          <h2 class="cpp-step-title">{s().title}</h2>
          <p class="cpp-step-desc">{s().desc}</p>
          <p class="cpp-step-desc">{s().desc2}</p>
        </div>
        <span class="cpp-step-emoji">📋</span>
      </div>

      <div class="cpp-benefits-title">{s().benefitsTitle}</div>
      <div class="cpp-benefits">
        <For each={BEN}>
          {(b) => (
            <div class="cpp-benefit">
              <FeatureIcon emoji={b.icon} />
              <div class="cpp-benefit-title">{s()[b.t]}</div>
              <div class="cpp-benefit-desc">{s()[b.d]}</div>
            </div>
          )}
        </For>
      </div>

      <div class="cpp-agreement">
        <div class="cpp-agreement-head">
          <span class="cpp-agreement-title">{s().agreementTitle}</span>
          <span class="cpp-agreement-updated">{s().lastUpdated}</span>
        </div>
        <div class="cpp-agreement-body">
          <p>{s().intro}</p>
          <For each={TERMS}>
            {([h, b]) => (
              <div class="cpp-term">
                <div class="cpp-term-h">{s()[h]}</div>
                <p>{s()[b]}</p>
              </div>
            )}
          </For>
        </div>
        <label class="cpp-accept">
          <input
            type="checkbox"
            checked={store.agreementAccepted}
            onChange={(e) => actions.setAgreement(e.currentTarget.checked)}
          />
          <span>
            {s().accept} {s().acceptAnd} <span class="cpp-link">{s().tos} ↗</span> {s().and}{' '}
            <span class="cpp-link">{s().privacy} ↗</span>
          </span>
        </label>
      </div>

      <div class="cpp-datasafe">
        <span class="cpp-datasafe-icon">🛡️</span>
        <div>
          <span class="cpp-datasafe-title">{s().dataSafeTitle}</span>{' '}
          <span class="cpp-datasafe-desc">{s().dataSafeDesc}</span>{' '}
          <span class="cpp-link">{s().learnMore} ↗</span>
        </div>
      </div>
    </div>
  )
}

// Step 2 — Payout
const Step2 = () => {
  const s = () => cp().step2 as Record<string, string>
  const ROWS = [
    ['cReceive', 'cReceiveStripe', 'cReceiveGusd'],
    ['cSpeed', 'cSpeedStripe', 'cSpeedGusd'],
    ['cCountries', 'cCountriesStripe', 'cCountriesGusd'],
    ['cFees', 'cFeesStripe', 'cFeesGusd'],
    ['cBest', 'cBestStripe', 'cBestGusd'],
  ]
  const PayCard = (p: { method: 'stripe' | 'gusd' }) => {
    const selected = () => store.payoutMethod === p.method && !store.payoutDeferred
    const isStripe = p.method === 'stripe'
    const feats = () =>
      isStripe
        ? [s().stripeF1, s().stripeF2, s().stripeF3, s().stripeF4]
        : [s().gusdF1, s().gusdF2, s().gusdF3, s().gusdF4]
    return (
      <button
        class={`cpp-card cpp-paysel ${selected() ? 'selected' : ''}`}
        onClick={() => actions.setPayout(p.method)}
      >
        <Show when={isStripe}>
          <span class="cpp-tag cpp-paysel-tag">{s().recommended}</span>
        </Show>
        <span class={`cpp-pay-name ${isStripe ? 'cpp-stripe' : 'cpp-gusd'}`}>
          {isStripe ? 'stripe' : 'GUSD'}
        </span>
        <div class="cpp-pay-title">{isStripe ? s().stripeName : `${s().gusdName} ${s().gusdSub}`}</div>
        <p class="cpp-pay-desc">{isStripe ? s().stripeDesc : s().gusdDesc}</p>
        <ul class="cpp-pay-feats">
          <For each={feats()}>{(f) => <li><Check /> {f}</li>}</For>
        </ul>
        <span class="cpp-radio-row">
          <span class={`cpp-radio ${selected() ? 'on' : ''}`} />
          {isStripe ? s().chooseStripe : s().chooseGusd}
        </span>
      </button>
    )
  }
  return (
    <div class="cpp-card cpp-step-card">
      <div class="cpp-step-head">
        <div>
          <span class="cpp-step-label">{cp().join.stepOf.replace('{n}', '2')}</span>
          <h2 class="cpp-step-title">{s().title}</h2>
          <p class="cpp-step-desc">{s().desc}</p>
          <p class="cpp-step-desc">{s().desc2}</p>
        </div>
        <span class="cpp-step-emoji">👛</span>
      </div>

      <div class="cpp-pay-grid">
        <PayCard method="stripe" />
        <PayCard method="gusd" />
      </div>

      <table class="cpp-compare">
        <thead>
          <tr>
            <th></th>
            <th class="cpp-stripe">stripe</th>
            <th><span class="cpp-gusd">GUSD</span> {s().gusdSub}</th>
          </tr>
        </thead>
        <tbody>
          <For each={ROWS}>
            {([label, a, b]) => (
              <tr>
                <td class="cpp-compare-label">{s()[label]}</td>
                <td>
                  {s()[a]}
                  <Show when={label === 'cFees'}>
                    <div class="cpp-link">{s().cLearnMore} ↗</div>
                  </Show>
                </td>
                <td>
                  {s()[b]}
                  <Show when={label === 'cFees'}>
                    <div class="cpp-link">{s().cLearnMore} ↗</div>
                  </Show>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <div class="cpp-datasafe">
        <span class="cpp-datasafe-icon">🔒</span>
        <div>
          <span class="cpp-datasafe-title">{s().secureTitle}</span>{' '}
          <span class="cpp-datasafe-desc">{s().secureDesc}</span>
        </div>
      </div>
    </div>
  )
}

// Step 3 — Profile
const Step3 = () => {
  const s = () => cp().step3 as Record<string, string>
  let fileRef: HTMLInputElement | undefined
  const onFile = (e: Event & { currentTarget: HTMLInputElement }) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => actions.setProfileField('avatar', reader.result as string)
    reader.readAsDataURL(file)
  }
  const SOCIALS: { key: 'youtube' | 'x' | 'instagram' | 'tiktok'; icon: string; ph: string }[] = [
    { key: 'youtube', icon: '▶️', ph: 'youtube.com/yourchannel' },
    { key: 'x', icon: '𝕏', ph: 'x.com/yourhandle' },
    { key: 'instagram', icon: '📷', ph: 'instagram.com/yourhandle' },
    { key: 'tiktok', icon: '🎵', ph: 'tiktok.com/@yourhandle' },
  ]
  const p = store.profile
  return (
    <div class="cpp-card cpp-step-card">
      <div class="cpp-step-head">
        <div>
          <span class="cpp-step-label">{cp().join.stepOf.replace('{n}', '3')}</span>
          <h2 class="cpp-step-title">{s().title}</h2>
          <p class="cpp-step-desc">{s().desc}</p>
          <p class="cpp-step-desc">{s().desc2}</p>
        </div>
        <span class="cpp-step-emoji">📝</span>
      </div>

      <div class="cpp-profile-grid">
        {/* Form */}
        <div class="cpp-profile-form">
          <div class="cpp-form-section">{s().basicInfo}</div>

          <label class="cpp-field">
            <span class="cpp-label">{s().creatorName} <span class="cpp-req">*</span></span>
            <input
              class="cpp-input"
              value={p.creatorName}
              placeholder={s().creatorNamePlaceholder}
              onInput={(e) => actions.setProfileField('creatorName', e.currentTarget.value)}
            />
            <span class="cpp-hint">{s().creatorNameHint}</span>
          </label>

          <label class="cpp-field">
            <span class="cpp-label">{s().email} <span class="cpp-req">*</span></span>
            <input
              class="cpp-input"
              type="email"
              value={p.email}
              placeholder="jamie@example.com"
              onInput={(e) => actions.setProfileField('email', e.currentTarget.value)}
            />
            <span class="cpp-hint">{s().emailHint}</span>
          </label>

          <label class="cpp-field">
            <span class="cpp-label">{s().displayName} <span class="cpp-req">*</span></span>
            <input
              class="cpp-input"
              value={p.displayName}
              placeholder="AnimeDreamer"
              onInput={(e) => actions.setProfileField('displayName', e.currentTarget.value)}
            />
            <span class="cpp-hint">{s().displayNameHint}</span>
          </label>

          <label class="cpp-field">
            <span class="cpp-label">{s().bio}</span>
            <textarea
              class="cpp-input cpp-textarea"
              value={p.bio}
              maxLength={BIO_MAX}
              placeholder={s().bioPlaceholder}
              onInput={(e) => actions.setProfileField('bio', e.currentTarget.value)}
            />
            <span class="cpp-counter">{p.bio.length} / {BIO_MAX}</span>
            <span class="cpp-hint">{s().bioHint}</span>
          </label>

          <div class="cpp-form-section">{s().profileImage}</div>
          <p class="cpp-hint">{s().profileImageDesc}</p>
          <div class="cpp-upload-row">
            <img class="cpp-upload-avatar" src={p.avatar || DEFAULT_AVATAR} alt="" />
            <button class="cpp-upload-btn" onClick={() => fileRef?.click()}>
              ⬆ {s().upload}
              <span class="cpp-upload-hint">{s().uploadHint}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
            <ul class="cpp-tips">
              <li>{s().tips}</li>
              <li>• {s().tip1}</li>
              <li>• {s().tip2}</li>
              <li>• {s().tip3}</li>
            </ul>
          </div>

          <div class="cpp-form-section">{s().socialLinks}</div>
          <p class="cpp-hint">{s().socialLinksHint}</p>
          <div class="cpp-socials">
            <For each={SOCIALS}>
              {(soc) => (
                <div class="cpp-social-field">
                  <span class="cpp-social-icon">{soc.icon}</span>
                  <input
                    class="cpp-input"
                    value={p.socials[soc.key]}
                    placeholder={soc.ph}
                    onInput={(e) => actions.setSocial(soc.key, e.currentTarget.value)}
                  />
                </div>
              )}
            </For>
          </div>
          <button class="cpp-add-link">+ {s().addLink}</button>
        </div>

        {/* Preview */}
        <div class="cpp-profile-side">
          <div class="cpp-card cpp-preview">
            <div class="cpp-preview-title">{s().previewTitle}</div>
            <p class="cpp-hint">{s().previewDesc}</p>
            <div class="cpp-preview-banner">
              <img class="cpp-preview-avatar" src={p.avatar || DEFAULT_AVATAR} alt="" />
            </div>
            <div class="cpp-preview-name">{p.displayName || 'AnimeDreamer'}</div>
            <div class="cpp-preview-handle">@{(p.displayName || 'AnimeDreamer').replace(/\s+/g, '')}</div>
            <p class="cpp-preview-bio">{p.bio || s().previewBio}</p>
            <div class="cpp-preview-socials">▶️ 𝕏 📷 🎵</div>
            <div class="cpp-preview-stats">
              <div><span class="cpp-stat-n">12</span><span class="cpp-stat-l">{s().statSeries}</span></div>
              <div><span class="cpp-stat-n">48</span><span class="cpp-stat-l">{s().statEpisodes}</span></div>
              <div><span class="cpp-stat-n">5.2K</span><span class="cpp-stat-l">{s().statFollowers}</span></div>
            </div>
          </div>
          <div class="cpp-card cpp-why-info">
            <div class="cpp-why-info-title">{s().whyTitle}</div>
            <div class="cpp-why-info-row">🔐 {s().why1}</div>
            <div class="cpp-why-info-row">💲 {s().why2}</div>
            <div class="cpp-why-info-row">🛡️ {s().why3}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 4 — Complete
const Step4 = () => {
  const s = () => cp().step4 as Record<string, string>
  const navigate = useNavigate()
  const NEXT = [
    { icon: '✏️', t: 'createTitle', d: 'createDesc', c: 'createCta', path: '/quick-create' },
    { icon: '⬆️', t: 'publishTitle', d: 'publishDesc', c: 'publishCta', path: '/account?tab=mySeries' },
    { icon: '👥', t: 'growTitle', d: 'growDesc', c: 'growCta', path: '/account?tab=mySeries' },
    { icon: '💲', t: 'earnTitle', d: 'earnDesc', c: 'earnCta', path: '/account?tab=wallet' },
  ]
  const deferred = () => store.payoutDeferred
  const isStripe = () => store.payoutMethod === 'stripe'
  return (
    <div class="cpp-card cpp-step-card cpp-complete">
      <div class="cpp-complete-hero">
        <span class="cpp-complete-emoji">🙌</span>
        <span class="cpp-complete-badge">✓</span>
      </div>
      <h2 class="cpp-complete-title">{s().title} 🎉</h2>
      <p class="cpp-step-desc cpp-center">{s().desc}</p>
      <p class="cpp-step-desc cpp-center">{s().desc2}</p>

      <div class={`cpp-payout-banner ${deferred() ? 'warn' : ''}`}>
        <span class="cpp-payout-check">{deferred() ? '⚠' : '✓'}</span>
        <div class="cpp-payout-info">
          <span class="cpp-payout-title">
            {deferred() ? s().payoutDeferred : s().payoutConnected}
          </span>
          <span class="cpp-payout-sub">
            <Show when={!deferred()} fallback={s().payoutDeferredDesc}>
              <b>{isStripe() ? s().stripeConnected : s().gusdConnected}</b> —{' '}
              {isStripe() ? s().stripeConnectedDesc : s().gusdConnectedDesc}
            </Show>
          </span>
        </div>
        <button class="cpp-btn-ghost" onClick={() => navigate('/account?tab=settings')}>
          {s().managePayout}
        </button>
      </div>

      <div class="cpp-whatsnext-title">{s().whatsNext}</div>
      <div class="cpp-next-grid">
        <For each={NEXT}>
          {(n) => (
            <div class="cpp-card cpp-next-card">
              <FeatureIcon emoji={n.icon} />
              <div class="cpp-next-t">{s()[n.t]}</div>
              <div class="cpp-next-d">{s()[n.d]}</div>
              <button class="cpp-link cpp-next-cta" onClick={() => navigate(n.path)}>
                {s()[n.c]} →
              </button>
            </div>
          )}
        </For>
      </div>

      <div class="cpp-important">
        <div class="cpp-important-title">🛡️ {s().importantTitle}</div>
        <div class="cpp-important-grid">
          <div><b>{s().noKycTitle}</b><br />{s().noKycDesc}</div>
          <div><b>{s().splitTitle}</b><br />{s().splitDesc}</div>
          <div><b>{s().supportTitle}</b><br />{s().supportDesc}</div>
        </div>
      </div>

      <p class="cpp-build-together">{s().buildTogether} 🚀</p>
      <div class="cpp-center">
        <button class="cpp-btn-primary" onClick={() => navigate('/account?tab=mySeries')}>
          {s().dashboard} →
        </button>
      </div>

      <div class="cpp-invite">
        <span>🎁</span>
        <div>
          <b>{s().inviteTitle}</b>
          <div class="cpp-hint">{s().inviteDesc}</div>
        </div>
        <button class="cpp-btn-ghost">👥 {s().invite}</button>
      </div>
    </div>
  )
}

const WizardNav = () => {
  const j = () => cp().join
  return (
    <div class="cpp-wiz-nav">
      <button class="cpp-btn-ghost" onClick={store.step === 1 ? actions.cancel : actions.back}>
        {store.step === 1 ? j().cancel : `← ${j().back}`}
      </button>
      <div class="cpp-wiz-nav-right">
        <Show when={store.step === 2}>
          <button class="cpp-btn-outline" onClick={() => { actions.deferPayout(); actions.next() }}>
            {j().doItLater}
          </button>
        </Show>
        <button class="cpp-btn-primary" disabled={!canAdvanceJoin()} onClick={actions.next}>
          {j().next} <span class="cpp-arrow">→</span>
        </button>
      </div>
    </div>
  )
}

const JoinWizard = () => {
  const navigate = useNavigate()
  return (
    <div class="cpp-main">
      <header class="cpp-topbar">
        <button class="cpp-back" onClick={store.step === 1 ? actions.cancel : actions.back}>←</button>
        <div>
          <h1 class="cpp-page-title">{cp().join.title}</h1>
          <p class="cpp-page-sub">{cp().join.subtitle}</p>
        </div>
        <div class="cpp-topbar-right">
          <span class="cpp-gems">💎 120</span>
          <span class="cpp-help">?</span>
        </div>
      </header>

      <div class="cpp-content">
        <div class="cpp-card cpp-stepper-card">
          <Stepper />
        </div>

        <Switch>
          <Match when={store.step === 1}><Step1 /></Match>
          <Match when={store.step === 2}><Step2 /></Match>
          <Match when={store.step === 3}><Step3 /></Match>
          <Match when={store.step === 4}><Step4 /></Match>
        </Switch>

        <Show when={store.step < JOIN_STEP_COUNT}>
          <WizardNav />
          <p class="cpp-step-footer">{cp().join.stepOf.replace('{n}', String(store.step))}</p>
        </Show>
        <Show when={store.step === 3}>
          <div class="cpp-needhelp">
            <span>❓ <b>{cp().step3.needHelp}</b> {cp().step3.needHelpDesc}</span>
            <button class="cpp-btn-ghost" onClick={() => navigate('/contact')}>💬 {cp().step3.contactSupport}</button>
          </div>
        </Show>
      </div>
    </div>
  )
}

// ── Page ──

const CreatorProgram = () => {
  onMount(() => {
    const u = accountStore.user
    if (u) actions.prefill(u.nickname || '', u.email || '', u.avatar || '')
  })
  return (
    <div class="cpp-layout">
      <Sidebar />
      <Switch>
        <Match when={creatorProgramStore.view === 'landing'}><Landing /></Match>
        <Match when={creatorProgramStore.view === 'join'}><JoinWizard /></Match>
      </Switch>
    </div>
  )
}

export default CreatorProgram
