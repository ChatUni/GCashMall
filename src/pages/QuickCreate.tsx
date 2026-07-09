import { For, Show, Switch, Match, createSignal, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { t } from '../stores/languageStore'
import { extractStory, generateStoryPrompt } from '../services/dataService'
import {
  quickCreateStore,
  quickCreateStoreActions,
  canAdvance,
  QUICK_CREATE_STEPS,
  STEPPER_KEYS,
  POPULAR_IDEAS,
  IDEA_ACTIONS,
  GENRES,
  ART_STYLES,
  EPISODE_LENGTHS,
  STAT_ICONS,
  SERIES_PLAN,
  PLAN_EPISODES,
  heroImage,
} from '../stores/quickCreateStore'
import './QuickCreate.css'

const qc = () => t().quickCreate

// Dynamically-keyed i18n accessors
type NameDesc = { name: string; desc: string }
const ideaT = (id: string) => (qc().step1.ideas as Record<string, string>)[id]
const actionT = (id: string) => (qc().step1.actions as Record<string, { title: string; subtitle: string }>)[id]
const genreT = (id: string) => (qc().step2.genres as Record<string, NameDesc>)[id]
const styleT = (id: string) => (qc().step3.styles as Record<string, NameDesc>)[id]
const statT = (key: string) => (qc().step4.stats as Record<string, string>)[key]
const stepT = (key: string) => (qc().steps as Record<string, string>)[key]
const epT = (n: number) =>
  (qc().step5.episodes as Record<string, { title: string; desc: string }>)[`ep${n}`]

const CheckBadge = () => (
  <span class="qc-check">
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M5 12l4 4 10-10" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </span>
)

// ── Sidebar ──

const Sidebar = () => {
  const navigate = useNavigate()
  const features = () => qc().sidebar.features
  return (
    <aside class="qc-sidebar">
      <div class="qc-logo" onClick={() => navigate('/')}>
        <span class="qc-logo-mark">G</span>
        <span class="qc-logo-text">Ganime</span>
      </div>

      <button class="qc-create-btn">
        <span class="qc-create-plus">+</span> {qc().sidebar.create}
      </button>

      <div class="qc-sidebar-spacer" />

      <div class="qc-creator-pro">
        <div class="qc-pro-head">
          <div>
            <div class="qc-pro-upgrade">{qc().sidebar.upgradeTo}</div>
            <div class="qc-pro-title">{qc().sidebar.creatorProTitle}</div>
          </div>
          <span class="qc-pro-crown">👑</span>
        </div>
        <ul class="qc-pro-features">
          <For each={[features().unlock, features().quality, features().faster, features().noWatermark]}>
            {(f) => (
              <li>
                <span class="qc-pro-check">✓</span> {f}
              </li>
            )}
          </For>
        </ul>
        <button class="qc-pro-btn">{qc().sidebar.upgradeNow}</button>
      </div>
    </aside>
  )
}

// ── Top stepper ──

const Stepper = () => (
  <header class="qc-stepper">
    <For each={STEPPER_KEYS}>
      {(key, i) => {
        const n = i() + 1
        return (
          <>
            <Show when={n > 1}>
              <div class={`qc-stepper-line ${quickCreateStore.step >= n ? 'done' : ''}`} />
            </Show>
            <button
              class={`qc-stepper-item ${quickCreateStore.step === n ? 'active' : ''} ${quickCreateStore.step > n ? 'done' : ''}`}
              disabled={n > quickCreateStore.step || n > QUICK_CREATE_STEPS}
              onClick={() => quickCreateStoreActions.goToStep(n)}
            >
              <span class="qc-stepper-num">{n}</span>
              <span class="qc-stepper-label">{stepT(key)}</span>
            </button>
          </>
        )
      }}
    </For>
  </header>
)

// ── Step 1: Idea input ──

const MAX_UPLOAD_MB = 4
const IDEA_MIN_ROWS = 5
const IDEA_MAX_ROWS = 30

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read error'))
    reader.readAsDataURL(file)
  })

const Step1Idea = () => {
  // While focused, grow the textarea to fit its content (5–30 rows) with a
  // smooth height animation; collapse back to the minimum on blur.
  const [ideaFocused, setIdeaFocused] = createSignal(false)
  let ideaTextareaRef: HTMLTextAreaElement | undefined

  const autoSizeIdea = () => {
    const el = ideaTextareaRef
    if (!el) return
    const cs = getComputedStyle(el)
    const lineHeight = parseFloat(cs.lineHeight) || 22
    const vExtra =
      parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) +
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
    const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
    const minH = Math.round(IDEA_MIN_ROWS * lineHeight + vExtra)
    const maxH = Math.round(IDEA_MAX_ROWS * lineHeight + vExtra)

    if (!ideaFocused()) {
      el.style.height = minH + 'px'
      return
    }

    // Measure the content height without animating the measurement step.
    const prevTransition = el.style.transition
    const prevHeight = el.style.height
    el.style.transition = 'none'
    el.style.height = 'auto'
    const contentH = el.scrollHeight + border
    el.style.height = prevHeight
    void el.offsetHeight // reflow so the animation starts from the current height
    el.style.transition = prevTransition
    el.style.height = Math.min(maxH, Math.max(minH, contentH)) + 'px'
  }
  const [uploading, setUploading] = createSignal(false)
  const [generating, setGenerating] = createSignal(false)
  const [actionError, setActionError] = createSignal('')
  const busy = () => uploading() || generating()
  let fileInputRef: HTMLInputElement | undefined
  onMount(() => quickCreateStoreActions.loadTemplates())

  // Upload Story / Import Manga both open a single-file picker (pdf/docx) and
  // extract the story text (via OpenAI) into the textarea.
  const openFilePicker = () => {
    if (busy()) return
    setActionError('')
    fileInputRef?.click()
  }

  const onFileChange = async (e: Event & { currentTarget: HTMLInputElement }) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    input.value = '' // allow re-selecting the same file
    if (!file) return
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setActionError(qc().step1.uploadInvalid)
      return
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setActionError(qc().step1.uploadTooLarge)
      return
    }
    setActionError('')
    setUploading(true)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const text = await extractStory(dataUrl, file.name)
      // Use the file name (without extension) as the series title
      const title = file.name.replace(/\.[^.]+$/, '').trim()
      quickCreateStoreActions.applyStory(text, title)
    } catch {
      setActionError(qc().step1.uploadFailed)
    } finally {
      setUploading(false)
    }
  }

  // Surprise Me: expand the current idea into a full template-format prompt
  const onSurprise = async () => {
    if (busy()) return
    setActionError('')
    setGenerating(true)
    try {
      const { title, text } = await generateStoryPrompt(quickCreateStore.idea)
      quickCreateStoreActions.applyStory(text, title)
    } catch {
      setActionError(qc().step1.surpriseFailed)
    } finally {
      setGenerating(false)
    }
  }

  const isUploadAction = (id: string) => id === 'uploadStory' || id === 'importManga'

  return (
  <div class="qc-step">
    <div class="qc-hero">
      <img class="qc-hero-img" src={heroImage} alt="" />
      <div class="qc-hero-scrim" />
      <div class="qc-hero-titlebar">
        <span class="qc-hero-icon">✨</span>
        <div>
          <h1 class="qc-hero-title">{qc().title}</h1>
          <p class="qc-hero-desc">{qc().subtitle}</p>
        </div>
      </div>
      <h2 class="qc-heading qc-hero-heading">{qc().step1.heading}</h2>
      <textarea
        ref={ideaTextareaRef}
        class="qc-textarea qc-hero-textarea"
        placeholder={qc().step1.placeholder}
        value={quickCreateStore.idea}
        onInput={(e) => {
          quickCreateStoreActions.setIdea(e.currentTarget.value)
          autoSizeIdea()
        }}
        onFocus={() => {
          setIdeaFocused(true)
          autoSizeIdea()
        }}
        onBlur={() => {
          setIdeaFocused(false)
          autoSizeIdea()
        }}
      />
    </div>

    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      style={{ display: 'none' }}
      onChange={onFileChange}
    />
    <div class="qc-action-cards">
      <For each={IDEA_ACTIONS}>
        {(action) => (
          <button
            class="qc-action-card"
            disabled={busy()}
            onClick={() => {
              if (isUploadAction(action.id)) openFilePicker()
              else if (action.id === 'surpriseMe') onSurprise()
            }}
          >
            <span class="qc-action-icon">{action.icon}</span>
            <span class="qc-action-text">
              <span class="qc-action-title">{actionT(action.id).title}</span>
              <span class="qc-action-subtitle">{actionT(action.id).subtitle}</span>
            </span>
          </button>
        )}
      </For>
    </div>

    <Show when={busy()}>
      <div class="qc-upload-status">
        <span class="qc-spinner" />
        {uploading() ? qc().step1.reading : qc().step1.surprising}
      </div>
    </Show>
    <Show when={actionError()}>
      <div class="qc-upload-error">⚠ {actionError()}</div>
    </Show>

    <div class="qc-popular-head">
      <h3 class="qc-subheading">{qc().step1.popularIdeas}</h3>
      <span class="qc-popular-hint">{qc().step1.popularHint}</span>
    </div>
    <div class="qc-templates-grid">
      <For each={quickCreateStore.templates}>
        {(tpl) => (
          <button
            class={`qc-template-card ${quickCreateStore.idea === tpl.prompt ? 'selected' : ''}`}
            onClick={() => quickCreateStoreActions.applyStory(tpl.prompt, tpl.name)}
          >
            <img class="qc-template-cover" src={tpl.cover} alt={tpl.name} loading="lazy" />
            <div class="qc-template-body">
              <span class="qc-template-name">{tpl.name}</span>
              <span class="qc-template-hook">{tpl.hook}</span>
              <div class="qc-template-tags">
                <For each={tpl.tags}>{(tag) => <span class="qc-template-tag">{tag}</span>}</For>
              </div>
              <span class="qc-template-audience">👥 {tpl.targetAudience}</span>
            </div>
          </button>
        )}
      </For>
    </div>
  </div>
  )
}

// ── Step 2: Genre ──

const Step2Genre = () => (
  <div class="qc-step">
    <h2 class="qc-heading">{qc().step2.heading}</h2>
    <p class="qc-subtitle">{qc().step2.subtitle}</p>
    <div class="qc-card-grid">
      <For each={GENRES}>
        {(genre) => (
          <button
            class={`qc-media-card ${quickCreateStore.genreId === genre.id ? 'selected' : ''}`}
            onClick={() => quickCreateStoreActions.selectGenre(genre.id)}
          >
            <div class="qc-media-thumb-wrap">
              <img class="qc-media-thumb" src={genre.image} alt={genreT(genre.id).name} loading="lazy" />
              <span class="qc-media-badge">{genre.icon}</span>
              <Show when={quickCreateStore.genreId === genre.id}>
                <CheckBadge />
              </Show>
            </div>
            <div class="qc-media-body">
              <span class="qc-media-title">{genreT(genre.id).name}</span>
              <span class="qc-media-desc">{genreT(genre.id).desc}</span>
            </div>
          </button>
        )}
      </For>
    </div>
  </div>
)

// ── Step 3: Art style ──

const Step3ArtStyle = () => (
  <div class="qc-step">
    <h2 class="qc-heading">{qc().step3.heading}</h2>
    <p class="qc-subtitle">{qc().step3.subtitle}</p>
    <div class="qc-card-grid">
      <For each={ART_STYLES}>
        {(style) => (
          <button
            class={`qc-media-card ${quickCreateStore.artStyleId === style.id ? 'selected' : ''}`}
            onClick={() => quickCreateStoreActions.selectArtStyle(style.id)}
          >
            <div class="qc-media-thumb-wrap">
              <img class="qc-media-thumb" src={style.image} alt={styleT(style.id).name} loading="lazy" />
              <Show when={quickCreateStore.artStyleId === style.id}>
                <CheckBadge />
              </Show>
            </div>
            <div class="qc-media-body">
              <span class="qc-media-title">{styleT(style.id).name}</span>
              <span class="qc-media-desc">{styleT(style.id).desc}</span>
            </div>
          </button>
        )}
      </For>
    </div>
  </div>
)

// ── Step 4: Episode length ──

const Step4Length = () => (
  <div class="qc-step">
    <h2 class="qc-heading">{qc().step4.heading}</h2>
    <p class="qc-subtitle">{qc().step4.subtitle}</p>
    <div class="qc-length-grid">
      <For each={EPISODE_LENGTHS}>
        {(opt) => (
          <button
            class={`qc-length-card ${quickCreateStore.episodeLength === opt.seconds ? 'selected' : ''}`}
            onClick={() => quickCreateStoreActions.selectEpisodeLength(opt.seconds)}
          >
            <div class="qc-length-thumb-wrap">
              <img class="qc-length-thumb" src={opt.image} alt={`${opt.seconds}`} loading="lazy" />
              <span class="qc-length-badge">
                <span class="qc-length-badge-num">{opt.seconds}</span>
                <span class="qc-length-badge-sec">{qc().step4.sec}</span>
              </span>
              <Show when={quickCreateStore.episodeLength === opt.seconds}>
                <CheckBadge />
              </Show>
            </div>
            <div class="qc-length-body">
              <span class="qc-length-name">{opt.seconds === 30 ? qc().step4.name30 : qc().step4.name60}</span>
              <span class="qc-length-desc">{opt.seconds === 30 ? qc().step4.desc30 : qc().step4.desc60}</span>
              <div class="qc-length-stats">
                <For each={opt.statKeys}>
                  {(k) => (
                    <span class="qc-stat-chip">
                      <span class="qc-stat-icon">{STAT_ICONS[k]}</span>
                      {statT(k)}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </button>
        )}
      </For>
    </div>
  </div>
)

// ── Step 5: AI Director Review (hardcoded plan) ──

const Step5Review = () => {
  const s5 = () => qc().step5
  // The summary reflects the user's selections from the previous steps.
  // Only the episode plan (right side) is hardcoded.
  const selectedGenre = () => GENRES.find((g) => g.id === quickCreateStore.genreId)
  const selectedStyle = () => ART_STYLES.find((s) => s.id === quickCreateStore.artStyleId)
  const selectedIdea = () => POPULAR_IDEAS.find((i) => ideaT(i.id) === quickCreateStore.idea.trim())
  const seriesTitle = () => quickCreateStore.ideaTitle.trim() || s5().untitled
  const seriesImage = () =>
    selectedIdea()?.image || selectedGenre()?.image || selectedStyle()?.image || SERIES_PLAN.image
  const genreText = () => (quickCreateStore.genreId ? genreT(quickCreateStore.genreId).name : '—')
  const styleText = () => (quickCreateStore.artStyleId ? styleT(quickCreateStore.artStyleId).name : '—')
  const lengthText = () => `${quickCreateStore.episodeLength} ${qc().step4.sec}`
  return (
    <div class="qc-step">
      <div class="qc-review-head">
        <div>
          <h2 class="qc-heading">{s5().heading}</h2>
          <p class="qc-subtitle">{s5().subtitle}</p>
        </div>
        <div class="qc-director">
          <span class="qc-director-avatar">🎬</span>
          <div class="qc-director-bubble">
            <span class="qc-director-name">{s5().directorName}</span>
            <span class="qc-director-note">{s5().directorNote}</span>
          </div>
        </div>
      </div>

      <div class="qc-review-grid">
        <div class="qc-series-card">
          <img class="qc-series-img" src={seriesImage()} alt={seriesTitle()} />
          <div class="qc-series-title-row">
            <span class="qc-series-title">{seriesTitle()}</span>
            <span class="qc-series-tag">{s5().miniSeries}</span>
          </div>
          <div class="qc-series-meta">
            <div class="qc-meta-row"><span>{s5().genre}</span><span>{genreText()}</span></div>
            <div class="qc-meta-row"><span>{s5().artStyle}</span><span>{styleText()}</span></div>
            <div class="qc-meta-row"><span>{s5().episodeLength}</span><span>{lengthText()}</span></div>
            <div class="qc-meta-row"><span>{s5().episodesLabel}</span><span>{s5().episodesValue}</span></div>
          </div>
          <div class="qc-confidence">
            <span class="qc-confidence-pct">{SERIES_PLAN.confidence}%</span>
            <div class="qc-confidence-body">
              <span class="qc-confidence-label">{s5().confidenceLabel}</span>
              <span class="qc-confidence-text">{s5().confidenceText}</span>
            </div>
          </div>
        </div>

        <div class="qc-plan">
          <h3 class="qc-plan-title">{s5().planTitle}</h3>
          <div class="qc-plan-list">
            <For each={PLAN_EPISODES}>
              {(ep) => (
                <div class="qc-plan-ep">
                  <img class="qc-plan-thumb" src={ep.image} alt={epT(ep.n).title} loading="lazy" />
                  <div class="qc-plan-ep-body">
                    <span class="qc-plan-ep-title">
                      {ep.n}. {epT(ep.n).title}
                    </span>
                    <span class="qc-plan-ep-desc">{epT(ep.n).desc}</span>
                  </div>
                  <span class={`qc-plan-status ${ep.status}`}>
                    {ep.status === 'generating' ? s5().statusGenerating : s5().statusPending}
                  </span>
                </div>
              )}
            </For>
          </div>
          <div class="qc-director-tip">
            <span class="qc-tip-label">💡 {s5().directorTipLabel}</span>
            <span class="qc-tip-text">{s5().directorTip}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Wizard navigation ──

const stepHint = () => {
  switch (quickCreateStore.step) {
    case 1:
      return qc().step1.nextHint
    case 2:
      return qc().step2.hint
    case 3:
      return qc().step3.hint
    case 4:
      return qc().step4.hint
    default:
      return ''
  }
}

const WizardNav = () => (
  <div class="qc-nav">
    <button class="qc-back-btn" classList={{ hidden: quickCreateStore.step === 1 }} onClick={quickCreateStoreActions.back}>
      ← {qc().back}
    </button>
    <span class="qc-nav-hint">{stepHint()}</span>
    <Switch>
      <Match when={quickCreateStore.step === QUICK_CREATE_STEPS}>
        <button class="qc-primary-btn">🚀 {qc().step5.generate}</button>
      </Match>
      <Match when={quickCreateStore.step === 1}>
        <button class="qc-primary-btn" disabled={!canAdvance()} onClick={quickCreateStoreActions.next}>
          ✨ {qc().step1.next} →
        </button>
      </Match>
      <Match when={true}>
        <button class="qc-primary-btn" disabled={!canAdvance()} onClick={quickCreateStoreActions.next}>
          {qc().continue} →
        </button>
      </Match>
    </Switch>
  </div>
)

// ── Page ──

const QuickCreate = () => (
  <div class="qc-layout">
    <Sidebar />
    <div class="qc-main">
      <Stepper />
      <div class="qc-content">
        <Switch>
          <Match when={quickCreateStore.step === 1}>
            <Step1Idea />
          </Match>
          <Match when={quickCreateStore.step === 2}>
            <Step2Genre />
          </Match>
          <Match when={quickCreateStore.step === 3}>
            <Step3ArtStyle />
          </Match>
          <Match when={quickCreateStore.step === 4}>
            <Step4Length />
          </Match>
          <Match when={quickCreateStore.step === 5}>
            <Step5Review />
          </Match>
        </Switch>
        <WizardNav />
      </div>
    </div>
  </div>
)

export default QuickCreate
