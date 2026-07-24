import { For, Show, Switch, Match, createSignal, createEffect, onMount, type JSX } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { t } from '../stores/languageStore'
import {
  extractStory,
  generateStoryPrompt,
  startRandomFrames,
  fetchProductionStatus,
  publishQuickCreateEpisode,
  fetchGenres,
  fetchSeries,
  suggestDescription,
  startCoverGen,
  uploadCoverImage,
} from '../services/dataService'
import { SocialSharePopup } from '../components/SocialShare'
import { Toast } from '../components/PlayerModals'
import { toastStoreActions } from '../stores'
import { getShareText } from '../utils/playerHelpers'
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
  heroImage,
  type StepStatus,
} from '../stores/quickCreateStore'
import './QuickCreate.css'

// The 4 downstream steps shown (but not yet run) after the 6 calls in step 6
const FUTURE_STEP_KEYS: string[] = []

const qc = () => t().quickCreate
const pipelineT = () => qc().pipeline
const callT = (key: string) => (pipelineT().calls as Record<string, string>)[key] || key

// Dynamically-keyed i18n accessors
type NameDesc = { name: string; desc: string }
const ideaT = (id: string) => (qc().step1.ideas as Record<string, string>)[id]
const actionT = (id: string) => (qc().step1.actions as Record<string, { title: string; subtitle: string }>)[id]
const genreT = (id: string) => (qc().step2.genres as Record<string, NameDesc>)[id]
const styleT = (id: string) => (qc().step3.styles as Record<string, NameDesc>)[id]
const statT = (key: string) => (qc().step4.stats as Record<string, string>)[key]
const stepT = (key: string) => (qc().steps as Record<string, string>)[key]

const CheckBadge = () => (
  <span class="qc-check">
    <svg viewBox="0 0 24 24" width="16" height="16">
      <path d="M5 12l4 4 10-10" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </span>
)

// ── JSON → HTML viewer (renders a call's output as a readable formatted box) ──

// snake_case / camelCase key → "Title Case"
const prettyKey = (key: string): string =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const JsonView = (props: { value: unknown }): JSX.Element => (
  <Switch>
    <Match when={Array.isArray(props.value)}>
      <ul class="jv-list">
        <For each={props.value as unknown[]}>
          {(item) => (
            <li>
              <JsonView value={item} />
            </li>
          )}
        </For>
      </ul>
    </Match>
    <Match when={isPlainObject(props.value)}>
      <div class="jv-obj">
        <For each={Object.entries(props.value as Record<string, unknown>)}>
          {([k, v]) => (
            <div class="jv-row">
              <span class="jv-key">{prettyKey(k)}</span>
              <div class="jv-val">
                <JsonView value={v} />
              </div>
            </div>
          )}
        </For>
      </div>
    </Match>
    <Match when={props.value === '' || props.value === null || props.value === undefined}>
      <span class="jv-empty">—</span>
    </Match>
    <Match when={true}>
      <span class="jv-scalar">{String(props.value)}</span>
    </Match>
  </Switch>
)

// ── Pipeline progress (step-status icon + overlay) ──

const StatusIcon = (props: { status: StepStatus }) => (
  <Switch>
    <Match when={props.status === 'done'}>
      <span class="qc-pl-icon done">✓</span>
    </Match>
    <Match when={props.status === 'running'}>
      <span class="qc-pl-icon running">
        <span class="qc-spinner" />
      </span>
    </Match>
    <Match when={props.status === 'error'}>
      <span class="qc-pl-icon error">!</span>
    </Match>
    <Match when={true}>
      <span class="qc-pl-icon pending" />
    </Match>
  </Switch>
)

// Overlay shown while the "plan" phase (step 4 → 5) generates the episode plan + covers
const PipelineProgress = () => {
  const pl = () => quickCreateStore.pipeline
  const isSignin = () => pl().error === '__signin__'
  // Plan phase runs only Call 1 (story planning) + episode covers
  const planStatus = () => pl().calls[0]?.status ?? 'pending'
  return (
    <div class="qc-pl-overlay">
      <div class="qc-pl-panel">
        <Show
          when={!isSignin()}
          fallback={
            <>
              <h3 class="qc-pl-title">{pipelineT().signInRequired}</h3>
              <div class="qc-pl-actions">
                <button class="qc-primary-btn" onClick={() => quickCreateStoreActions.resetPipeline()}>
                  {pipelineT().cancel}
                </button>
              </div>
            </>
          }
        >
          <h3 class="qc-pl-title">{pipelineT().planTitle}</h3>
          <p class="qc-pl-subtitle">{pipelineT().planSubtitle}</p>

          <ul class="qc-pl-steps">
            <li class={`qc-pl-step ${planStatus()}`}>
              <StatusIcon status={planStatus()} />
              <span class="qc-pl-step-label">{pipelineT().planStep}</span>
            </li>
            <li class={`qc-pl-step ${pl().coverStatus}`}>
              <StatusIcon status={pl().coverStatus} />
              <span class="qc-pl-step-label">{pipelineT().coversStep}</span>
            </li>
          </ul>

          <Show when={pl().error && !isSignin()}>
            <div class="qc-pl-error">⚠ {pl().error}</div>
            <div class="qc-pl-actions">
              <button class="qc-back-btn" onClick={() => quickCreateStoreActions.resetPipeline()}>
                {pipelineT().cancel}
              </button>
              <button class="qc-primary-btn" onClick={() => quickCreateStoreActions.runPlan()}>
                🔄 {pipelineT().retry}
              </button>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}

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
        <button class="qc-pro-btn" onClick={() => navigate('/creator-program')}>
          {qc().sidebar.upgradeNow}
        </button>
      </div>
    </aside>
  )
}

// ── Top stepper ──

const Stepper = () => {
  let el: HTMLElement | undefined
  // Keep the active step visible in the horizontally-scrolling breadcrumb
  createEffect(() => {
    const step = quickCreateStore.step
    requestAnimationFrame(() => {
      const items = el?.querySelectorAll('.qc-stepper-item')
      ;(items?.[step - 1] as HTMLElement | undefined)?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    })
  })
  return (
  <header class="qc-stepper" ref={el}>
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
}

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

// ── Step 5: AI Director Review (real generated production) ──

// Fallback image before a cover has been generated
const fallbackSeriesImage = () => {
  const selectedGenre = GENRES.find((g) => g.id === quickCreateStore.genreId)
  const selectedStyle = ART_STYLES.find((s) => s.id === quickCreateStore.artStyleId)
  const selectedIdea = POPULAR_IDEAS.find((i) => ideaT(i.id) === quickCreateStore.idea.trim())
  return selectedIdea?.image || selectedGenre?.image || selectedStyle?.image || SERIES_PLAN.image
}

const Step5Review = () => {
  const s5 = () => qc().step5
  const plan = () => quickCreateStore.pipeline.plan
  const episodes = () => plan()?.episodes || []
  const seriesTitle = () => plan()?.ideaTitle || quickCreateStore.ideaTitle.trim() || s5().untitled
  const seriesImage = () => episodes().find((e) => e.cover)?.cover || fallbackSeriesImage()

  const genreText = () => (quickCreateStore.genreId ? genreT(quickCreateStore.genreId).name : '—')
  const styleText = () => (quickCreateStore.artStyleId ? styleT(quickCreateStore.artStyleId).name : '—')
  const lengthText = () => `${quickCreateStore.episodeLength} ${qc().step4.sec}`

  const logline = () => {
    const exec = plan()?.call1 as { series_blueprint?: { logline?: string } } | null
    return exec?.series_blueprint?.logline || s5().confidenceText
  }

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

      <Show when={plan()} fallback={<div class="qc-review-empty">{s5().noProduction}</div>}>
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
              <div class="qc-meta-row"><span>{s5().episodesLabel}</span><span>{episodes().length} {s5().episodesLabel}</span></div>
            </div>
            <div class="qc-confidence">
              <span class="qc-confidence-pct">{SERIES_PLAN.confidence}%</span>
              <div class="qc-confidence-body">
                <span class="qc-confidence-label">{s5().confidenceLabel}</span>
                <span class="qc-confidence-text">{logline()}</span>
              </div>
            </div>
          </div>

          <div class="qc-plan">
            <h3 class="qc-plan-title">{s5().planTitle}</h3>
            <div class="qc-plan-list">
              <For each={episodes()}>
                {(ep, i) => (
                  <div class="qc-plan-ep">
                    <div class="qc-plan-thumb-wrap">
                      <Show
                        when={ep.cover}
                        fallback={<img class="qc-plan-thumb" src={fallbackSeriesImage()} alt={ep.title} />}
                      >
                        <img class="qc-plan-thumb" src={ep.cover} alt={ep.title} loading="lazy" />
                      </Show>
                    </div>
                    <div class="qc-plan-ep-body">
                      <span class="qc-plan-ep-title">{ep.n}. {ep.title}</span>
                      <span class="qc-plan-ep-desc">{ep.desc}</span>
                    </div>
                    <Show
                      when={i() === 0}
                      fallback={
                        <button class="qc-ep-status planned" disabled>
                          🔒 {s5().statusPending}
                        </button>
                      }
                    >
                      <button class="qc-ep-status generating">
                        ✨ {s5().statusGenerating}
                      </button>
                    </Show>
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
      </Show>
    </div>
  )
}

// ── Step 6: Episode 1 generation (runs the 6 calls; shows live progress) ──

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

const Step6Generating = () => {
  const s6 = () => qc().step6
  const pl = () => quickCreateStore.pipeline
  const production = () => pl().production
  const episodes = () => production()?.episodes || []
  const seriesTitle = () => production()?.ideaTitle || quickCreateStore.ideaTitle.trim() || qc().step5.untitled
  const ep1 = () => episodes()[0]
  const heroCover = () => ep1()?.cover || fallbackSeriesImage()

  const genreText = () => (production()?.genre ? genreT(production()!.genre!).name : '—')
  const styleText = () => (production()?.artStyle ? styleT(production()!.artStyle!).name : '—')
  const lengthText = () => `${production()?.episodeLength ?? quickCreateStore.episodeLength} ${qc().step4.sec}`

  // Share popup — holds the video link currently being shared ('' = closed)
  const [shareUrl, setShareUrl] = createSignal('')
  const shareText = () => getShareText(seriesTitle(), 1)

  // Per-call detail expand/collapse (keyed by call key)
  const [expandedCalls, setExpandedCalls] = createSignal<Record<string, boolean>>({})
  const isExpanded = (key: string) => !!expandedCalls()[key]
  const toggleCall = (key: string) => setExpandedCalls((cur) => ({ ...cur, [key]: !cur[key] }))
  const callOutput = (key: string) => production()?.calls?.[key]

  return (
    <div class="qc-step qc-step6">
      <div class="qc-review-head">
        <div>
          <h2 class="qc-heading">{s6().heading}</h2>
          <p class="qc-subtitle">{s6().subtitle}</p>
        </div>
        <div class="qc-director qc-tip-card">
          <span class="qc-director-avatar">💡</span>
          <div class="qc-director-bubble">
            <span class="qc-director-name">{s6().tipTitle}</span>
            <span class="qc-director-note">{s6().tipText}</span>
          </div>
        </div>
      </div>

      <div class="qc-s6-grid">
        {/* Left: pipeline list + overall progress */}
        <div class="qc-s6-pipeline">
          <h3 class="qc-s6-pipeline-title">{s6().pipelineTitle}</h3>
          <p class="qc-s6-pipeline-sub">{s6().pipelineSubtitle}</p>

          <ul class="qc-pl-steps qc-s6-steps">
            <For each={pl().calls}>
              {(c, i) => {
                const done = () => c.status === 'done' && !!callOutput(c.key)
                return (
                  <li class={`qc-pl-step qc-s6-call ${c.status}`}>
                    <div class="qc-s6-step-head">
                      <span class="qc-s6-step-num">{i() + 1}</span>
                      <StatusIcon status={c.status} />
                      <span class="qc-pl-step-label">{callT(c.key)}</span>
                      <Show when={done()}>
                        <button
                          class="qc-detail-btn qc-s6-detail-toggle"
                          onClick={() => toggleCall(c.key)}
                        >
                          {isExpanded(c.key) ? qc().step5.hideDetail : qc().step5.detail}
                          <span class={`qc-detail-caret ${isExpanded(c.key) ? 'open' : ''}`}>▾</span>
                        </button>
                      </Show>
                    </div>
                    <Show when={done() && isExpanded(c.key)}>
                      <div class="qc-s6-call-detail">
                        <JsonView value={callOutput(c.key)} />
                      </div>
                    </Show>
                  </li>
                )
              }}
            </For>
            {/* Downstream steps — not run yet */}
            <For each={FUTURE_STEP_KEYS}>
              {(key, i) => (
                <li class="qc-pl-step future">
                  <span class="qc-s6-step-num">{pl().calls.length + i() + 1}</span>
                  <span class="qc-pl-icon pending" />
                  <span class="qc-pl-step-label">{(s6().future as Record<string, string>)[key]}</span>
                  <span class="qc-s6-soon">{s6().comingSoon}</span>
                </li>
              )}
            </For>
          </ul>

          <div class="qc-s6-progress-row">
            <span class="qc-s6-progress-label">{s6().overallProgress}</span>
            <span class="qc-s6-progress-pct">{pl().percent}%</span>
          </div>
          <div class="qc-s6-progress-track">
            <div class="qc-s6-progress-fill" style={{ width: `${pl().percent}%` }} />
          </div>

          {/* Video-generation sub-progress (shots completed), while it's running */}
          <Show
            when={pl().calls.find((c) => c.key === 'videoGeneration')?.status === 'running'}
          >
            <div class="qc-s6-progress-row qc-s6-subprogress-row">
              <span class="qc-s6-progress-label">
                🎬 {callT('videoGeneration')}
                <Show when={pl().videoProgress.total}>
                  {' '}({pl().videoProgress.done}/{pl().videoProgress.total})
                </Show>
              </span>
              <span class="qc-s6-progress-pct">{pl().videoProgress.percent}%</span>
            </div>
            <div class="qc-s6-progress-track">
              <div
                class="qc-s6-progress-fill video"
                style={{ width: `${pl().videoProgress.percent}%` }}
              />
            </div>
          </Show>

          <Show when={pl().error && pl().error !== '__signin__'}>
            <div class="qc-pl-error">⚠ {pl().error}</div>
          </Show>
        </div>

        {/* Right: hero cover + info cards */}
        <div class="qc-s6-main">
          <div class="qc-s6-hero">
            <img class="qc-s6-hero-img" src={heroCover()} alt={seriesTitle()} />
            <div class="qc-s6-hero-bar">
              <div class="qc-s6-hero-titles">
                <span class="qc-s6-hero-series">{seriesTitle()}</span>
                <span class="qc-s6-hero-ep">{s6().episodeLabel} 1: {ep1()?.title || ''}</span>
              </div>
              <Show when={pl().running}>
                <span class="qc-s6-hero-status">
                  <span class="qc-spinner" /> {s6().generating}
                </span>
              </Show>
              <Show when={!pl().running && pl().percent >= 100}>
                <span class="qc-s6-hero-status done">✓ {s6().done}</span>
              </Show>
            </div>
          </div>

          <div class="qc-s6-cards">
            <div class="qc-s6-card">
              <div class="qc-s6-card-title">📖 {s6().yourSeries}</div>
              <div class="qc-s6-series-row">
                <img class="qc-s6-series-thumb" src={heroCover()} alt={seriesTitle()} />
                <div class="qc-s6-series-info">
                  <span class="qc-s6-series-name">{seriesTitle()}</span>
                  <span class="qc-s6-series-meta">{episodes().length} {qc().step5.episodesLabel} · {genreText()}</span>
                  <span class="qc-s6-series-meta">{styleText()} · {lengthText()}</span>
                </div>
              </div>
            </div>

            <div class="qc-s6-card">
              <div class="qc-s6-card-title">🛡 {s6().qualityTitle}</div>
              <p class="qc-s6-card-text">{s6().qualityText}</p>
            </div>
          </div>

          {/* Composed episode video (with narration/audio) */}
          <Show when={production()?.episodeVideo} keyed>
            {(episodeUrl) => (
              <div class="qc-s6-videos">
                <div class="qc-s6-videos-head">
                  <h3 class="qc-s6-videos-title">🎬 {s6().episodeVideoTitle}</h3>
                  <button
                    class="qc-s6-share-btn"
                    title={s6().share}
                    onClick={() => setShareUrl(episodeUrl)}
                  >
                    <ShareIcon /> {s6().share}
                  </button>
                </div>
                <video class="qc-s6-episode-el" src={episodeUrl} controls preload="metadata" />
              </div>
            )}
          </Show>

          {/* Rendered shot videos (Seedance) — with audio once composed */}
          <Show when={(production()?.videos?.length ?? 0) > 0}>
            <div class="qc-s6-videos">
              <h3 class="qc-s6-videos-title">🎞 {s6().shotVideos}</h3>
              <div class="qc-s6-videos-grid">
                <For each={production()!.videos}>
                  {(v) => (
                    <div class="qc-s6-video">
                      <Show
                        when={v.audioUrl || v.url}
                        keyed
                        fallback={
                          <div class="qc-s6-video-error" title={v.error || 'Generation failed'}>
                            ⚠
                          </div>
                        }
                      >
                        {(url) => (
                          <video class="qc-s6-video-el" src={url} controls preload="metadata" />
                        )}
                      </Show>
                      <div class="qc-s6-video-label">
                        <span>
                          {s6().shotLabel} {v.shot_number ?? ''}
                        </span>
                        <Show when={v.audioUrl || v.url}>
                          <button
                            class="qc-s6-share-btn small"
                            title={s6().share}
                            onClick={() => setShareUrl(v.audioUrl || v.url)}
                          >
                            <ShareIcon />
                          </button>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </div>

      <Show when={shareUrl()}>
        <SocialSharePopup
          url={shareUrl()}
          text={shareText()}
          imageUrl={heroCover()}
          title={s6().shareTitle}
          closeLabel={s6().close}
          onClose={() => setShareUrl('')}
        />
      </Show>

      <div class="qc-s6-notify">
        🔔 {s6().notify}
      </div>
    </div>
  )
}

// ── Step 7: Episode 1 Ready (celebration + series overview) ──

const EPISODE_UNLOCK_PRICE = '0.99'

const Step7Ready = () => {
  const navigate = useNavigate()
  const s7 = () => qc().step7
  const pl = () => quickCreateStore.pipeline
  const production = () => pl().production
  const episodes = () => production()?.episodes || []
  const seriesTitle = () =>
    production()?.seriesName ||
    production()?.ideaTitle ||
    quickCreateStore.ideaTitle.trim() ||
    qc().step5.untitled
  const ep1 = () => episodes()[0]
  const heroCover = () => ep1()?.cover || fallbackSeriesImage()
  const episodeVideo = () => production()?.episodeVideo || ''

  const genreText = () => (production()?.genre ? genreT(production()!.genre!).name : '—')
  const styleText = () => (production()?.artStyle ? styleT(production()!.artStyle!).name : '—')
  const lengthText = () =>
    `${production()?.episodeLength ?? quickCreateStore.episodeLength} ${qc().step4.sec}`

  const [shareUrl, setShareUrl] = createSignal('')
  const shareText = () => getShareText(seriesTitle(), 1)
  const comingSoon = () => toastStoreActions.show(s7().comingSoon, 'info')

  // If published, prefer the actual published series cover + episode info
  const [pubSeriesCover, setPubSeriesCover] = createSignal('')
  const [pubEp, setPubEp] = createSignal<{
    title?: string
    description?: string
    thumbnail?: string
  } | null>(null)
  onMount(() => {
    const sid = production()?.seriesId
    if (!sid) return
    fetchSeries(sid)
      .then((series) => {
        if (series?.cover) setPubSeriesCover(series.cover)
        const ep = (series?.episodes || []).find((e) => e.episodeNumber === 1)
        if (ep) setPubEp({ title: ep.title, description: ep.description, thumbnail: ep.thumbnail })
      })
      .catch(() => {})
  })
  const seriesCoverImg = () => pubSeriesCover() || heroCover()
  const epThumb = () => pubEp()?.thumbnail || heroCover()
  const epTitle = () => pubEp()?.title || ep1()?.title || ''
  const epDesc = () => pubEp()?.description || ep1()?.desc || ''

  return (
    <div class="qc-step qc-step7">
      <div class="qc-s7-header">
        <button class="qc-s7-back" onClick={quickCreateStoreActions.back} title={qc().back}>
          ←
        </button>
        <div class="qc-s7-titles">
          <h2 class="qc-s7-heading">🎉 {s7().heading.replace('{n}', String(ep1()?.n ?? 1))}</h2>
          <p class="qc-subtitle">{s7().subtitle1}</p>
          <p class="qc-subtitle">{s7().subtitle2}</p>
        </div>
        <div class="qc-s7-momentum">
          <span class="qc-s7-momentum-gem">💎</span>
          <div>
            <div class="qc-s7-momentum-title">{s7().momentumTitle}</div>
            <div class="qc-s7-momentum-text">{s7().momentumText1}</div>
            <div class="qc-s7-momentum-text">{s7().momentumText2}</div>
          </div>
        </div>
      </div>

      <div class="qc-s7-body">
        {/* Left: episode player + info */}
        <div class="qc-s7-left">
          <Show
            when={episodeVideo()}
            keyed
            fallback={<img class="qc-s7-video" src={heroCover()} alt={ep1()?.title || ''} />}
          >
            {(url) => <video class="qc-s7-video" src={url} controls preload="metadata" />}
          </Show>

          <div class="qc-s7-epinfo">
            <img class="qc-s7-epinfo-thumb" src={epThumb()} alt={epTitle()} />
            <div class="qc-s7-epinfo-main">
              <span class="qc-s7-eyebrow">
                {s7().episodeLabel} {ep1()?.n ?? 1}
              </span>
              <h3 class="qc-s7-epinfo-title">{epTitle()}</h3>
              <p class="qc-s7-epinfo-desc">{epDesc()}</p>
            </div>
            <div class="qc-s7-epmeta">
              <span>🕐 {lengthText()}</span>
              <span>🎬 {genreText()}</span>
              <span>🎨 {styleText()}</span>
            </div>
          </div>

          <div class="qc-s7-next">
            <span class="qc-s7-next-icon">✨</span>
            <span>
              <b>{s7().whatsNextTitle}</b> {s7().whatsNextText}
            </span>
          </div>
        </div>

        {/* Right: series overview + episode list */}
        <div class="qc-s7-series">
          <div class="qc-s7-series-head">
            <img class="qc-s7-series-thumb" src={seriesCoverImg()} alt={seriesTitle()} />
            <div class="qc-s7-series-info">
              <div class="qc-s7-series-title-row">
                <span class="qc-s7-series-name">{seriesTitle()}</span>
                <span class="qc-s7-badge">{s7().newSeries}</span>
              </div>
              <span class="qc-s7-series-meta">
                {s7().season} · {episodes().length} {s7().episodesLabel}
              </span>
              <span class="qc-s7-series-meta">
                {genreText()} · {styleText()} · {lengthText()}
              </span>
            </div>
          </div>

          <ul class="qc-s7-eplist">
            <For each={episodes()}>
              {(ep, i) => (
                <li class={`qc-s7-ep ${i() === 0 ? 'unlocked' : ''}`}>
                  <div
                    class="qc-s7-ep-thumb"
                    style={{
                      'background-image': `url(${(i() === 0 ? epThumb() : ep.cover) || fallbackSeriesImage()})`,
                    }}
                  >
                    <Show when={i() === 0}>
                      <span class="qc-s7-ep-play">▶</span>
                    </Show>
                  </div>
                  <div class="qc-s7-ep-info">
                    <span class="qc-s7-ep-n">
                      {s7().episodeLabel} {ep.n}
                    </span>
                    <span class="qc-s7-ep-title">{i() === 0 ? epTitle() : ep.title}</span>
                  </div>
                  <Show
                    when={i() === 0}
                    fallback={<span class="qc-s7-ep-status locked">🔒 {s7().locked}</span>}
                  >
                    <span class="qc-s7-ep-status completed">✓ {s7().completed}</span>
                  </Show>
                  <Show
                    when={i() === 0}
                    fallback={
                      <button class="qc-s7-ep-price" onClick={comingSoon}>
                        ${EPISODE_UNLOCK_PRICE}
                      </button>
                    }
                  >
                    <button class="qc-s7-ep-watch" onClick={comingSoon}>
                      {s7().watch}
                    </button>
                  </Show>
                </li>
              )}
            </For>
          </ul>

          <div class="qc-s7-upsell">
            <div class="qc-s7-upsell-line">👑 {s7().unlockBanner}</div>
            <button class="qc-s7-upsell-btn" onClick={() => navigate('/creator-program')}>
              {s7().upgradeToPro}
            </button>
            <div class="qc-s7-upsell-note">{s7().purchasedForever}</div>
          </div>
        </div>
      </div>

      {/* Bottom action bar (replaces the wizard nav on this step) */}
      <div class="qc-s7-actions">
        <button class="qc-s7-action" onClick={quickCreateStoreActions.openPublish}>
          ⬆ {s7().publish}
        </button>
        <button class="qc-s7-action" onClick={() => episodeVideo() && setShareUrl(episodeVideo())}>
          🔗 {s7().share}
        </button>
        <button class="qc-s7-action outline" onClick={() => navigate('/account?tab=mySeries')}>
          ☰ {s7().viewSeries}
        </button>
        <div class="qc-s7-generate-wrap">
          <button class="qc-primary-btn qc-s7-generate" onClick={comingSoon}>
            ✨ {s7().generateNext}
          </button>
          <span class="qc-s7-generate-note">{s7().continueAdventure}</span>
        </div>
      </div>

      <Show when={shareUrl()}>
        <SocialSharePopup
          url={shareUrl()}
          text={shareText()}
          imageUrl={heroCover()}
          title={s7().shareTitle}
          closeLabel={s7().close}
          onClose={() => setShareUrl('')}
        />
      </Show>
    </div>
  )
}

// ── Publish Episode page (full-screen view over the wizard, no stepper) ──

const PublishEpisode = () => {
  const pub = () => qc().publish
  const pl = () => quickCreateStore.pipeline
  const production = () => pl().production
  const episodes = () => production()?.episodes || []
  const ep1 = () => episodes()[0]
  const seriesTitle = () =>
    production()?.seriesName ||
    production()?.ideaTitle ||
    quickCreateStore.ideaTitle.trim() ||
    qc().step5.untitled
  const heroCover = () => ep1()?.cover || fallbackSeriesImage()
  const episodeVideo = () => production()?.episodeVideo || ''
  const genreText = () => (production()?.genre ? genreT(production()!.genre!).name : '')
  const styleText = () => (production()?.artStyle ? styleT(production()!.artStyle!).name : '')
  const lengthText = () =>
    `${production()?.episodeLength ?? quickCreateStore.episodeLength} ${qc().step4.sec}`

  // Publishing Episode 1 also creates the series, so collect series-level details.
  const isEpisode1 = () => (ep1()?.n ?? 1) === 1
  const seriesLogline = () => {
    const exec = production()?.calls?.executiveProducer as
      | { series_blueprint?: { logline?: string } }
      | undefined
    return exec?.series_blueprint?.logline || ep1()?.desc || ''
  }

  const [seriesName, setSeriesName] = createSignal(seriesTitle())
  const [seriesDesc, setSeriesDesc] = createSignal(seriesLogline())
  const [seriesCover, setSeriesCover] = createSignal(heroCover())
  const [currentThumb, setCurrentThumb] = createSignal(heroCover())
  // Series cover: 'current' (Use Current), 'upload' (uploaded), or 'ai' (AI-generated)
  const [coverSel, setCoverSel] = createSignal<'current' | 'upload' | 'ai'>('current')
  const [uploadedCover, setUploadedCover] = createSignal('')
  const [aiCover, setAiCover] = createSignal('')
  const effectiveSeriesCover = () =>
    coverSel() === 'upload' ? uploadedCover() : coverSel() === 'ai' ? aiCover() : seriesCover()
  const [title, setTitle] = createSignal(ep1()?.title || '')
  const [desc, setDesc] = createSignal(ep1()?.desc || '')
  const [tags, setTags] = createSignal<string[]>([genreText(), styleText()].filter(Boolean))
  const [tagInput, setTagInput] = createSignal('')

  // Tags are genres. Load existing genres for the autocomplete, and title-case new tags.
  const [allGenres, setAllGenres] = createSignal<{ _id: string; name: string }[]>([])
  const [tagSuggestions, setTagSuggestions] = createSignal<string[]>([])
  onMount(() => {
    fetchGenres()
      .then(setAllGenres)
      .catch(() => {})
    // Edit mode: already published → seed the form from the actual series, not the production
    const sid = production()?.seriesId
    if (sid) {
      fetchSeries(sid)
        .then((series) => {
          if (!series) return
          if (series.name) setSeriesName(series.name)
          if (series.description) setSeriesDesc(series.description)
          if (series.cover) setSeriesCover(series.cover)
          if (Array.isArray(series.tags)) setTags(series.tags)
          const ep = (series.episodes || []).find((e) => e.episodeNumber === 1)
          if (ep) {
            if (ep.title) setTitle(ep.title)
            if (ep.description) setDesc(ep.description)
            if (ep.thumbnail) setCurrentThumb(ep.thumbnail)
          }
        })
        .catch(() => {})
    }
  })
  const titleCase = (s: string) =>
    s
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  let tagDebounce: ReturnType<typeof setTimeout> | undefined
  const onTagInput = (v: string) => {
    setTagInput(v)
    clearTimeout(tagDebounce)
    tagDebounce = setTimeout(() => {
      const q = v.trim().toLowerCase()
      if (!q) return setTagSuggestions([])
      const have = new Set(tags().map((t) => t.toLowerCase()))
      setTagSuggestions(
        allGenres()
          .map((g) => g.name)
          .filter((name) => name.toLowerCase().includes(q) && !have.has(name.toLowerCase()))
          .slice(0, 8),
      )
    }, 200)
  }
  const addTagValue = (value: string) => {
    const name = titleCase(value)
    if (name && tags().length < 10 && !tags().some((t) => t.toLowerCase() === name.toLowerCase())) {
      setTags((cur) => [...cur, name])
    }
    setTagInput('')
    setTagSuggestions([])
  }

  // AI Suggest: generate a series/episode description, preview it, and let the user apply it
  const [suggestTarget, setSuggestTarget] = createSignal<'series' | 'episode'>('series')
  const [suggestOpen, setSuggestOpen] = createSignal(false)
  const [suggestLoading, setSuggestLoading] = createSignal(false)
  const [suggestText, setSuggestText] = createSignal('')
  const [suggestError, setSuggestError] = createSignal(false)
  const openSuggest = (target: 'series' | 'episode') => {
    setSuggestTarget(target)
    setSuggestText('')
    setSuggestError(false)
    setSuggestLoading(true)
    setSuggestOpen(true)
    suggestDescription({
      type: target,
      seriesName: seriesName(),
      episodeTitle: title(),
      currentDesc: target === 'series' ? seriesDesc() : desc(),
      genres: tags(),
    })
      .then((text) => {
        setSuggestText(text)
        setSuggestLoading(false)
      })
      .catch(() => {
        setSuggestError(true)
        setSuggestLoading(false)
      })
  }
  const useSuggestion = () => {
    if (suggestTarget() === 'series') setSeriesDesc(suggestText())
    else setDesc(suggestText())
    setSuggestOpen(false)
  }

  // Series cover upload: single image, ≤ 1 MB, ≤ 1280×1280
  const MAX_COVER_BYTES = 1024 * 1024
  const MAX_COVER_DIM = 1280
  let coverInput: HTMLInputElement | undefined
  const [uploadingCover, setUploadingCover] = createSignal(false)
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  const checkCover = (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) return Promise.resolve(pub().coverNotImage)
    if (file.size > MAX_COVER_BYTES) return Promise.resolve(pub().coverTooLarge)
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(
          img.naturalWidth > MAX_COVER_DIM || img.naturalHeight > MAX_COVER_DIM
            ? pub().coverTooBig
            : null,
        )
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(pub().coverNotImage)
      }
      img.src = url
    })
  }
  const onCoverFile = async (e: Event & { currentTarget: HTMLInputElement }) => {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = '' // allow re-picking the same file
    if (!file) return
    const err = await checkCover(file)
    if (err) return toastStoreActions.show(err, 'error')
    setUploadingCover(true)
    try {
      const url = await uploadCoverImage(await fileToDataUrl(file))
      setUploadedCover(url)
      setCoverSel('upload')
    } catch {
      toastStoreActions.show(pub().coverUploadFailed, 'error')
    } finally {
      setUploadingCover(false)
    }
  }

  // AI Generate series cover: preview it in a dialog, apply on Use
  const [coverGenOpen, setCoverGenOpen] = createSignal(false)
  const [coverGenLoading, setCoverGenLoading] = createSignal(false)
  const [coverGenUrl, setCoverGenUrl] = createSignal('')
  const [coverGenError, setCoverGenError] = createSignal(false)
  const pollCoverGen = async (reqId: string) => {
    const id = jobId()
    if (!id) return
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2500))
      if (!coverGenOpen()) return
      let job
      try {
        job = await fetchProductionStatus(id)
      } catch {
        continue
      }
      if (job.coverGen?.id === reqId) {
        if (job.coverGen.error || !job.coverGen.url) setCoverGenError(true)
        else setCoverGenUrl(job.coverGen.url)
        setCoverGenLoading(false)
        return
      }
    }
    setCoverGenError(true) // timed out
    setCoverGenLoading(false)
  }
  const openCoverGen = () => {
    if (!jobId()) return comingSoon()
    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setCoverGenUrl('')
    setCoverGenError(false)
    setCoverGenLoading(true)
    setCoverGenOpen(true)
    startCoverGen(jobId()!, reqId, {
      name: seriesName(),
      description: seriesDesc(),
      genres: tags(),
      artStyle: styleText(),
    })
      .then(() => pollCoverGen(reqId))
      .catch(() => {
        setCoverGenError(true)
        setCoverGenLoading(false)
      })
  }
  const useCoverGen = () => {
    setAiCover(coverGenUrl())
    setCoverSel('ai')
    setCoverGenOpen(false)
  }

  // Thumbnail: 'current' (episode cover), 'shot' (a picked shot cover), or 'random'
  const [thumbSel, setThumbSel] = createSignal<'current' | 'shot' | 'random'>('current')
  const [shotCover, setShotCover] = createSignal('')
  const [shotCoverIsVideo, setShotCoverIsVideo] = createSignal(false)
  const [shotDialogOpen, setShotDialogOpen] = createSignal(false)
  const shots = () => (production()?.videos || []).filter((v) => v.coverUrl || v.audioUrl || v.url)
  // Prefer the saved static cover image; fall back to the shot video frame (legacy jobs)
  const shotCoverSrc = (v: { coverUrl?: string; audioUrl?: string; url?: string }) =>
    v.coverUrl || v.audioUrl || v.url || ''
  const chooseShot = (v: { coverUrl?: string; audioUrl?: string; url?: string }) => {
    setShotCover(shotCoverSrc(v))
    setShotCoverIsVideo(!v.coverUrl)
    setThumbSel('shot')
    setShotDialogOpen(false)
  }

  // Random Frame: extract a few frames from the episode video (ffmpeg) and pick one
  const jobId = () => quickCreateStore.pipeline.episodeJobId
  const [randomCover, setRandomCover] = createSignal('')
  const [randomDialogOpen, setRandomDialogOpen] = createSignal(false)
  const [randomLoading, setRandomLoading] = createSignal(false)
  const [randomFrames, setRandomFrames] = createSignal<string[]>([])

  const pollRandom = async (reqId: string) => {
    const id = jobId()
    if (!id) return
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 2500))
      if (!randomDialogOpen()) return
      let job
      try {
        job = await fetchProductionStatus(id)
      } catch {
        continue
      }
      if (job.randomFrames?.id === reqId) {
        setRandomFrames(job.randomFrames.urls || [])
        setRandomLoading(false)
        return
      }
    }
    setRandomLoading(false) // timed out
  }
  const openRandom = () => {
    if (!jobId()) return comingSoon()
    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setRandomFrames([])
    setRandomLoading(true)
    setRandomDialogOpen(true)
    startRandomFrames(jobId()!, reqId)
      .then(() => pollRandom(reqId))
      .catch(() => setRandomLoading(false))
  }
  const chooseRandom = (url: string) => {
    setRandomCover(url)
    setThumbSel('random')
    setRandomDialogOpen(false)
  }

  // The selected episode thumbnail URL (skip the shot-video fallback, which isn't an image)
  const effectiveThumbnail = () =>
    thumbSel() === 'random'
      ? randomCover()
      : thumbSel() === 'shot'
        ? shotCoverIsVideo()
          ? ''
          : shotCover()
        : currentThumb()

  // Publish → create/update the series + episode 1 (uploads the video to Bunny once)
  const navigate = useNavigate()
  const [publishing, setPublishing] = createSignal(false)
  const canPublish = () =>
    !!jobId() && titleOk() && descOk() && !!episodeVideo() && (!isEpisode1() || seriesOk())
  const onPublish = async () => {
    if (!canPublish() || publishing()) return
    setPublishing(true)
    try {
      const res = await publishQuickCreateEpisode({
        jobId: jobId()!,
        name: isEpisode1() ? seriesName() : seriesTitle(),
        description: seriesDesc(),
        cover: effectiveSeriesCover(),
        tags: tags(),
        episodeTitle: title(),
        episodeDescription: desc(),
        thumbnail: effectiveThumbnail(),
      })
      toastStoreActions.show(res.created ? pub().publishedSuccess : pub().updatedSuccess, 'success')
      quickCreateStoreActions.closePublish()
      navigate('/account?tab=mySeries')
    } catch (e) {
      toastStoreActions.show(e instanceof Error ? e.message : pub().publishFailed, 'error')
    } finally {
      setPublishing(false)
    }
  }

  const comingSoon = () => toastStoreActions.show(pub().comingSoon, 'info')

  const addTag = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    addTagValue(tagInput())
  }
  const removeTag = (tag: string) => setTags((cur) => cur.filter((t) => t !== tag))

  const titleOk = () => title().trim().length > 0
  const descOk = () => desc().trim().length > 0
  const seriesOk = () => seriesName().trim().length > 0 && seriesDesc().trim().length > 0

  return (
    <div class="qc-publish">
      <div class="qc-pub-header">
        <button class="qc-s7-back" onClick={quickCreateStoreActions.closePublish} title={qc().back}>
          ←
        </button>
        <div>
          <h2 class="qc-pub-heading">✦ {pub().heading}</h2>
          <p class="qc-subtitle">{pub().subtitle}</p>
        </div>
      </div>

      <div class="qc-pub-body">
        {/* Left: form */}
        <div class="qc-pub-form">
          {/* Series section — only when publishing Episode 1 (which creates the series) */}
          <Show when={isEpisode1()}>
            <div class="qc-pub-section">
              <h3 class="qc-pub-section-title">{pub().seriesSection}</h3>

              <div class="qc-pub-field">
                <label class="qc-pub-label">
                  {pub().seriesNameLabel} <span class="qc-pub-req">*</span>
                </label>
                <div class="qc-pub-input-wrap">
                  <input
                    class="qc-pub-input"
                    type="text"
                    maxlength="100"
                    placeholder={pub().seriesNamePlaceholder}
                    value={seriesName()}
                    onInput={(e) => setSeriesName(e.currentTarget.value)}
                  />
                  <span class="qc-pub-count">{seriesName().length}/100</span>
                </div>
              </div>

              <div class="qc-pub-field">
                <div class="qc-pub-label-row">
                  <label class="qc-pub-label">
                    {pub().seriesDescLabel} <span class="qc-pub-req">*</span>
                  </label>
                  <button class="qc-pub-ai" onClick={() => openSuggest('series')}>
                    ✦ {pub().aiSuggest}
                  </button>
                </div>
                <div class="qc-pub-input-wrap">
                  <textarea
                    class="qc-pub-textarea"
                    maxlength="500"
                    placeholder={pub().seriesDescPlaceholder}
                    value={seriesDesc()}
                    onInput={(e) => setSeriesDesc(e.currentTarget.value)}
                  />
                  <span class="qc-pub-count">{seriesDesc().length}/500</span>
                </div>
              </div>

              <div class="qc-pub-field">
                <label class="qc-pub-label">
                  {pub().seriesCoverLabel} <span class="qc-pub-req">*</span>
                </label>
                <p class="qc-pub-hint">{pub().seriesCoverHint}</p>
                <div class="qc-pub-thumbs">
                  {/* Use Current */}
                  <div
                    class={`qc-pub-thumb ${coverSel() === 'current' ? 'selected' : ''}`}
                    onClick={() => setCoverSel('current')}
                  >
                    <img src={seriesCover()} alt="" />
                    <Show when={coverSel() === 'current'}>
                      <span class="qc-pub-thumb-check">✓</span>
                    </Show>
                    <span class="qc-pub-thumb-use">{pub().useCurrent}</span>
                  </div>

                  {/* Upload — shows the uploaded image once chosen */}
                  <Show
                    when={uploadedCover()}
                    fallback={
                      <button
                        class="qc-pub-thumb-alt"
                        disabled={uploadingCover()}
                        onClick={() => coverInput?.click()}
                      >
                        <span class="qc-pub-thumb-icon">⬆</span>
                        {uploadingCover() ? pub().uploading : pub().upload}
                      </button>
                    }
                  >
                    <div
                      class={`qc-pub-thumb ${coverSel() === 'upload' ? 'selected' : ''}`}
                      onClick={() => setCoverSel('upload')}
                    >
                      <img src={uploadedCover()} alt="" />
                      <Show when={coverSel() === 'upload'}>
                        <span class="qc-pub-thumb-check">✓</span>
                      </Show>
                      <button
                        class="qc-pub-thumb-use"
                        onClick={(e) => {
                          e.stopPropagation()
                          coverInput?.click()
                        }}
                      >
                        {pub().upload}
                      </button>
                    </div>
                  </Show>

                  {/* AI Generate — shows the generated cover once created */}
                  <Show
                    when={aiCover()}
                    fallback={
                      <button class="qc-pub-thumb-alt" onClick={openCoverGen}>
                        <span class="qc-pub-thumb-icon">✦</span>
                        {pub().aiGenerate}
                      </button>
                    }
                  >
                    <div
                      class={`qc-pub-thumb ${coverSel() === 'ai' ? 'selected' : ''}`}
                      onClick={() => setCoverSel('ai')}
                    >
                      <img src={aiCover()} alt="" />
                      <Show when={coverSel() === 'ai'}>
                        <span class="qc-pub-thumb-check">✓</span>
                      </Show>
                      <button
                        class="qc-pub-thumb-use"
                        onClick={(e) => {
                          e.stopPropagation()
                          openCoverGen()
                        }}
                      >
                        {pub().aiGenerate}
                      </button>
                    </div>
                  </Show>
                  <input
                    ref={coverInput}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={onCoverFile}
                  />
                </div>
              </div>

              <div class="qc-pub-field">
                <div class="qc-pub-label-row">
                  <label class="qc-pub-label">{pub().tagsLabel}</label>
                  <span class="qc-pub-count">{tags().length}/10</span>
                </div>
                <p class="qc-pub-hint">{pub().tagsHint}</p>
                <Show when={tags().length > 0}>
                  <div class="qc-pub-tags">
                    <For each={tags()}>
                      {(tag) => (
                        <span class="qc-pub-tag">
                          {tag}
                          <button class="qc-pub-tag-x" onClick={() => removeTag(tag)}>
                            ✕
                          </button>
                        </span>
                      )}
                    </For>
                  </div>
                </Show>
                <div class="qc-pub-tag-input-wrap">
                  <input
                    class="qc-pub-input"
                    type="text"
                    placeholder={pub().addTag}
                    value={tagInput()}
                    onInput={(e) => onTagInput(e.currentTarget.value)}
                    onKeyDown={addTag}
                  />
                  <Show when={tagSuggestions().length > 0}>
                    <div class="qc-pub-tag-suggest">
                      <For each={tagSuggestions()}>
                        {(name) => (
                          <button class="qc-pub-tag-suggest-btn" onClick={() => addTagValue(name)}>
                            {name}
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
                <span class="qc-pub-hint qc-pub-hint-right">{pub().pressEnter}</span>
              </div>
            </div>
          </Show>

          <h3 class="qc-pub-section-title">
            {pub().episodeSection} {ep1()?.n ?? 1}
          </h3>
          <div class="qc-pub-field">
            <label class="qc-pub-label">
              {pub().titleLabel} <span class="qc-pub-req">*</span>
            </label>
            <div class="qc-pub-input-wrap">
              <input
                class="qc-pub-input"
                type="text"
                maxlength="100"
                placeholder={pub().titlePlaceholder}
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
              />
              <span class="qc-pub-count">{title().length}/100</span>
            </div>
          </div>

          <div class="qc-pub-field">
            <div class="qc-pub-label-row">
              <label class="qc-pub-label">
                {pub().descLabel} <span class="qc-pub-req">*</span>
              </label>
              <button class="qc-pub-ai" onClick={() => openSuggest('episode')}>
                ✦ {pub().aiSuggest}
              </button>
            </div>
            <div class="qc-pub-input-wrap">
              <textarea
                class="qc-pub-textarea"
                maxlength="500"
                placeholder={pub().descPlaceholder}
                value={desc()}
                onInput={(e) => setDesc(e.currentTarget.value)}
              />
              <span class="qc-pub-count">{desc().length}/500</span>
            </div>
          </div>

          <div class="qc-pub-field">
            <label class="qc-pub-label">
              {pub().thumbnailLabel} <span class="qc-pub-req">*</span>
            </label>
            <p class="qc-pub-hint">{pub().thumbnailHint}</p>
            <div class="qc-pub-thumbs">
              {/* Use Current (episode cover) */}
              <div
                class={`qc-pub-thumb ${thumbSel() === 'current' ? 'selected' : ''}`}
                onClick={() => setThumbSel('current')}
              >
                <img src={currentThumb()} alt="" />
                <Show when={thumbSel() === 'current'}>
                  <span class="qc-pub-thumb-check">✓</span>
                </Show>
                <span class="qc-pub-thumb-use">{pub().useCurrent}</span>
              </div>

              {/* Choose from Shot Covers — shows the picked shot frame once chosen */}
              <Show
                when={shotCover()}
                fallback={
                  <button class="qc-pub-thumb-alt" onClick={() => setShotDialogOpen(true)}>
                    <span class="qc-pub-thumb-icon">🎞</span>
                    {pub().chooseFromShots}
                  </button>
                }
              >
                <div
                  class={`qc-pub-thumb ${thumbSel() === 'shot' ? 'selected' : ''}`}
                  onClick={() => setThumbSel('shot')}
                >
                  <Show
                    when={shotCoverIsVideo()}
                    fallback={<img src={shotCover()} alt="" />}
                  >
                    <video src={shotCover()} muted preload="metadata" playsinline />
                  </Show>
                  <Show when={thumbSel() === 'shot'}>
                    <span class="qc-pub-thumb-check">✓</span>
                  </Show>
                  <button
                    class="qc-pub-thumb-use"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShotDialogOpen(true)
                    }}
                  >
                    {pub().chooseFromShots}
                  </button>
                </div>
              </Show>

              {/* Random Frame — extracts frames from the episode video to pick from */}
              <Show
                when={randomCover()}
                fallback={
                  <button class="qc-pub-thumb-alt" onClick={openRandom}>
                    <span class="qc-pub-thumb-icon">🎲</span>
                    {pub().randomFrame}
                  </button>
                }
              >
                <div
                  class={`qc-pub-thumb ${thumbSel() === 'random' ? 'selected' : ''}`}
                  onClick={() => setThumbSel('random')}
                >
                  <img src={randomCover()} alt="" />
                  <Show when={thumbSel() === 'random'}>
                    <span class="qc-pub-thumb-check">✓</span>
                  </Show>
                  <button
                    class="qc-pub-thumb-use"
                    onClick={(e) => {
                      e.stopPropagation()
                      openRandom()
                    }}
                  >
                    {pub().randomFrame}
                  </button>
                </div>
              </Show>
            </div>
          </div>

        </div>

        {/* Right: preview + checklist */}
        <div class="qc-pub-side">
          <h3 class="qc-pub-preview-title">{pub().preview}</h3>
          <div class="qc-pub-preview">
            <div class="qc-pub-preview-media">
              <Show
                when={episodeVideo()}
                keyed
                fallback={<img src={heroCover()} alt={title()} />}
              >
                {(url) => <video src={url} controls preload="metadata" />}
              </Show>
              <span class="qc-pub-preview-badge">
                {pub().episodeLabel} {ep1()?.n ?? 1}
              </span>
              <span class="qc-pub-preview-dur">{lengthText()}</span>
            </div>
            <div class="qc-pub-preview-info">
              <h4 class="qc-pub-preview-name">{title() || ep1()?.title || ''}</h4>
              <p class="qc-pub-preview-desc">{desc() || ep1()?.desc || ''}</p>
              <div class="qc-pub-preview-meta">
                <span>🕐 {lengthText()}</span>
                <span>🎬 {[genreText(), styleText()].filter(Boolean).join(', ')}</span>
                <span>🎨 {styleText()}</span>
              </div>
            </div>
          </div>

          <div class="qc-pub-checklist-row">
            <div class="qc-pub-checklist">
              <div class="qc-pub-check-title">{pub().beforePublish}</div>
              <Show when={isEpisode1()}>
                <div class={`qc-pub-check ${seriesOk() ? 'ok' : ''}`}>
                  <span>{seriesOk() ? '✓' : '○'}</span> {pub().checkSeries}
                </div>
                <div class="qc-pub-check ok">
                  <span>✓</span> {pub().checkSeriesCover}
                </div>
              </Show>
              <div class={`qc-pub-check ${episodeVideo() ? 'ok' : ''}`}>
                <span>{episodeVideo() ? '✓' : '○'}</span> {pub().checkVideo}
              </div>
              <div class={`qc-pub-check ${titleOk() && descOk() ? 'ok' : ''}`}>
                <span>{titleOk() && descOk() ? '✓' : '○'}</span> {pub().checkTitle}
              </div>
              <div class="qc-pub-check ok">
                <span>✓</span> {pub().checkThumbnail}
              </div>
            </div>
            <div class="qc-pub-tip">
              <span class="qc-pub-tip-icon">💡</span>
              <div>
                <div class="qc-pub-tip-title">{pub().tipTitle}</div>
                <div class="qc-pub-tip-text">{pub().tipText}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="qc-pub-actions">
        <div class="qc-pub-publish-wrap">
          <button
            class="qc-primary-btn qc-s7-generate"
            disabled={!canPublish() || publishing()}
            onClick={onPublish}
          >
            ⬆ {publishing() ? pub().publishing : pub().publishNow}
          </button>
          <span class="qc-s7-generate-note">{pub().liveImmediately}</span>
        </div>
      </div>

      {/* Shot-covers picker dialog */}
      <Show when={shotDialogOpen()}>
        <div class="qc-pub-dialog-overlay" onClick={() => setShotDialogOpen(false)}>
          <div class="qc-pub-dialog" onClick={(e) => e.stopPropagation()}>
            <div class="qc-pub-dialog-head">
              <h3 class="qc-pub-dialog-title">{pub().shotCoversTitle}</h3>
              <button class="qc-pub-dialog-x" onClick={() => setShotDialogOpen(false)}>
                ✕
              </button>
            </div>
            <div class="qc-pub-dialog-grid">
              <For each={shots()}>
                {(v) => (
                  <button
                    class={`qc-pub-shot ${shotCover() === shotCoverSrc(v) ? 'selected' : ''}`}
                    onClick={() => chooseShot(v)}
                  >
                    <Show
                      when={v.coverUrl}
                      fallback={<video src={v.audioUrl || v.url} muted preload="metadata" playsinline />}
                    >
                      <img src={v.coverUrl} alt="" />
                    </Show>
                    <span class="qc-pub-shot-label">
                      {pub().shotLabel} {v.shot_number ?? ''}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* Random-frame picker dialog */}
      <Show when={randomDialogOpen()}>
        <div class="qc-pub-dialog-overlay" onClick={() => setRandomDialogOpen(false)}>
          <div class="qc-pub-dialog" onClick={(e) => e.stopPropagation()}>
            <div class="qc-pub-dialog-head">
              <h3 class="qc-pub-dialog-title">{pub().randomFramesTitle}</h3>
              <button class="qc-pub-dialog-x" onClick={() => setRandomDialogOpen(false)}>
                ✕
              </button>
            </div>
            <Show
              when={!randomLoading()}
              fallback={
                <div class="qc-pub-loading">
                  <span class="qc-spinner" /> {pub().extractingFrames}
                </div>
              }
            >
              <Show
                when={randomFrames().length > 0}
                fallback={<div class="qc-pub-empty">{pub().noFrames}</div>}
              >
                <div class="qc-pub-dialog-grid">
                  <For each={randomFrames()}>
                    {(url) => (
                      <button
                        class={`qc-pub-shot ${randomCover() === url ? 'selected' : ''}`}
                        onClick={() => chooseRandom(url)}
                      >
                        <img src={url} alt="" />
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        </div>
      </Show>

      {/* AI Suggest description dialog */}
      <Show when={suggestOpen()}>
        <div class="qc-pub-dialog-overlay" onClick={() => setSuggestOpen(false)}>
          <div class="qc-pub-dialog qc-pub-suggest" onClick={(e) => e.stopPropagation()}>
            <div class="qc-pub-dialog-head">
              <h3 class="qc-pub-dialog-title">
                {suggestTarget() === 'series' ? pub().suggestSeriesTitle : pub().suggestEpisodeTitle}
              </h3>
              <button class="qc-pub-dialog-x" onClick={() => setSuggestOpen(false)}>
                ✕
              </button>
            </div>
            <Show
              when={!suggestLoading()}
              fallback={
                <div class="qc-pub-loading">
                  <span class="qc-spinner" /> {pub().generatingDesc}
                </div>
              }
            >
              <Show
                when={!suggestError()}
                fallback={<div class="qc-pub-empty">{pub().suggestFailed}</div>}
              >
                <p class="qc-pub-suggest-text">{suggestText()}</p>
                <div class="qc-pub-suggest-actions">
                  <button class="qc-s7-action" onClick={() => setSuggestOpen(false)}>
                    {pub().cancel}
                  </button>
                  <button class="qc-primary-btn" onClick={useSuggestion}>
                    {pub().use}
                  </button>
                </div>
              </Show>
            </Show>
          </div>
        </div>
      </Show>

      {/* AI Generate cover dialog */}
      <Show when={coverGenOpen()}>
        <div class="qc-pub-dialog-overlay" onClick={() => setCoverGenOpen(false)}>
          <div class="qc-pub-dialog qc-pub-covergen" onClick={(e) => e.stopPropagation()}>
            <div class="qc-pub-dialog-head">
              <h3 class="qc-pub-dialog-title">{pub().aiCoverTitle}</h3>
              <button class="qc-pub-dialog-x" onClick={() => setCoverGenOpen(false)}>
                ✕
              </button>
            </div>
            <Show
              when={!coverGenLoading()}
              fallback={
                <div class="qc-pub-loading">
                  <span class="qc-spinner" /> {pub().generatingCover}
                </div>
              }
            >
              <Show
                when={!coverGenError()}
                fallback={<div class="qc-pub-empty">{pub().coverGenFailed}</div>}
              >
                <img class="qc-pub-covergen-img" src={coverGenUrl()} alt="" />
                <div class="qc-pub-suggest-actions">
                  <button class="qc-s7-action" onClick={() => setCoverGenOpen(false)}>
                    {pub().cancel}
                  </button>
                  <button class="qc-primary-btn" onClick={useCoverGen}>
                    {pub().use}
                  </button>
                </div>
              </Show>
            </Show>
          </div>
        </div>
      </Show>
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
      <Match when={quickCreateStore.step === 1}>
        <button class="qc-primary-btn" disabled={!canAdvance()} onClick={quickCreateStoreActions.next}>
          ✨ {qc().continue}
        </button>
      </Match>
      <Match when={quickCreateStore.step === 4}>
        {/* Continue generates the 5-episode plan (cover/title/desc), then → step 5 */}
        <button
          class="qc-primary-btn"
          disabled={!canAdvance() || quickCreateStore.pipeline.running}
          onClick={() => quickCreateStoreActions.runPlan()}
        >
          ✨ {qc().step1.next}
        </button>
      </Match>
      <Match when={quickCreateStore.step === 5}>
        {/* Generate Episode 1 → creates the My Series entry, runs the 6 calls, → step 6 */}
        <button
          class="qc-primary-btn"
          disabled={!quickCreateStore.pipeline.plan}
          onClick={() => quickCreateStoreActions.runEpisode()}
        >
          🚀 {qc().step5.generate}
        </button>
      </Match>
      <Match when={quickCreateStore.step === 6}>
        {/* Generation runs in the background; once the episode video is ready, continue to step 7 */}
        <span class="qc-nav-hint">{qc().step6.mayLeave}</span>
        <Show when={quickCreateStore.pipeline.production?.episodeVideo}>
          <button class="qc-primary-btn" onClick={() => quickCreateStoreActions.goToStep(7)}>
            {qc().step6.continueToReady}
          </button>
        </Show>
      </Match>
      <Match when={true}>
        <button class="qc-primary-btn" disabled={!canAdvance()} onClick={quickCreateStoreActions.next}>
          {qc().continue}
        </button>
      </Match>
    </Switch>
  </div>
)

// ── Page ──

const QuickCreate = () => {
  const [searchParams] = useSearchParams()

  // Resuming from My Series (?production=<jobId>). ?view=ready opens the "Episode N is
  // Ready" page directly (used for already-published productions).
  onMount(() => {
    const jobId = searchParams.production
    if (typeof jobId === 'string' && jobId) {
      quickCreateStoreActions.resumeEpisode(jobId, searchParams.view === 'ready')
    }
  })

  // The plan-phase overlay covers step 4 → 5; step 6 shows its own progress inline.
  const showOverlay = () =>
    quickCreateStore.step !== 6 &&
    quickCreateStore.step !== 7 &&
    (quickCreateStore.pipeline.running || !!quickCreateStore.pipeline.error)

  return (
    <div class="qc-layout">
      <Sidebar />
      <div class="qc-main">
        {/* The Publish page is a full-screen view over the wizard — no stepper */}
        <Show when={!quickCreateStore.publishOpen}>
          <Stepper />
        </Show>
        <div class="qc-content">
          <Show when={!quickCreateStore.publishOpen} fallback={<PublishEpisode />}>
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
              <Match when={quickCreateStore.step === 6}>
                <Step6Generating />
              </Match>
              <Match when={quickCreateStore.step === 7}>
                <Step7Ready />
              </Match>
            </Switch>
            {/* Step 7 has its own bottom action bar */}
            <Show when={quickCreateStore.step !== 7}>
              <WizardNav />
            </Show>
          </Show>
        </div>
      </div>
      <Show when={showOverlay()}>
        <PipelineProgress />
      </Show>
      <Toast />
    </div>
  )
}

export default QuickCreate
