import { For, Show, Switch, Match, createSignal, onMount, type JSX } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
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

    {/* Test mode: skip AI cover generation, reuse the story cover for all episodes */}
    <label class="qc-testmode">
      <input
        type="checkbox"
        checked={quickCreateStore.testMode}
        onChange={(e) => quickCreateStoreActions.setTestMode(e.currentTarget.checked)}
      />
      <span class="qc-testmode-text">
        <span class="qc-testmode-title">🧪 {qc().step4.testMode}</span>
        <span class="qc-testmode-hint">{qc().step4.testModeHint}</span>
      </span>
    </label>
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
                <h3 class="qc-s6-videos-title">🎬 {s6().episodeVideoTitle}</h3>
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
                      <span class="qc-s6-video-label">
                        {s6().shotLabel} {v.shot_number ?? ''}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </div>

      <div class="qc-s6-notify">
        🔔 {s6().notify}
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
        {/* Generation runs in the background; user may leave freely */}
        <span class="qc-nav-hint">{qc().step6.mayLeave}</span>
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

  // Resuming an in-progress/completed generation from My Series (?production=<jobId>)
  onMount(() => {
    const jobId = searchParams.production
    if (typeof jobId === 'string' && jobId) {
      quickCreateStoreActions.resumeEpisode(jobId)
    }
  })

  // The plan-phase overlay covers step 4 → 5; step 6 shows its own progress inline.
  const showOverlay = () =>
    quickCreateStore.step !== 6 &&
    (quickCreateStore.pipeline.running || !!quickCreateStore.pipeline.error)

  return (
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
            <Match when={quickCreateStore.step === 6}>
              <Step6Generating />
            </Match>
          </Switch>
          <WizardNav />
        </div>
      </div>
      <Show when={showOverlay()}>
        <PipelineProgress />
      </Show>
    </div>
  )
}

export default QuickCreate
