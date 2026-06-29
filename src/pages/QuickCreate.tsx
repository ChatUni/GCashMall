import { For, Show, Switch, Match } from 'solid-js'
import TopBar from '../components/TopBar'
import { t } from '../stores/languageStore'
import {
  quickCreateStore,
  quickCreateStoreActions,
  canAdvance,
  QUICK_CREATE_STEPS,
  POPULAR_IDEAS,
  GENRES,
  ART_STYLES,
  EPISODE_LENGTHS,
  SERIES_PLAN_EPISODES,
  reviewImage,
} from '../stores/quickCreateStore'
import './QuickCreate.css'

const qc = () => t().quickCreate

// Helpers to read the dynamically-keyed i18n maps
const ideaLabel = (key: string) => (qc().step1.ideas as Record<string, string>)[key]
const genreLabel = (key: string) => (qc().step2.genres as Record<string, string>)[key]
const styleLabel = (key: string) => (qc().step3.styles as Record<string, string>)[key]

// ── Step indicator ──

const StepIndicator = () => (
  <div class="qc-steps">
    <For each={Array.from({ length: QUICK_CREATE_STEPS }, (_, i) => i + 1)}>
      {(n) => (
        <>
          <Show when={n > 1}>
            <div class={`qc-step-line ${quickCreateStore.step >= n ? 'done' : ''}`} />
          </Show>
          <button
            class={`qc-step-dot ${quickCreateStore.step === n ? 'active' : ''} ${quickCreateStore.step > n ? 'done' : ''}`}
            disabled={n > quickCreateStore.step}
            onClick={() => quickCreateStoreActions.goToStep(n)}
          >
            {n}
          </button>
        </>
      )}
    </For>
  </div>
)

// ── Step 1: Idea input ──

const Step1Idea = () => (
  <div class="qc-step">
    <h2 class="qc-heading">{qc().step1.heading}</h2>
    <textarea
      class="qc-textarea"
      placeholder={qc().step1.placeholder}
      value={quickCreateStore.idea}
      onInput={(e) => quickCreateStoreActions.setIdea(e.currentTarget.value)}
    />

    <h3 class="qc-subheading">{qc().step1.popularIdeas}</h3>
    <div class="qc-ideas-grid">
      <For each={POPULAR_IDEAS}>
        {(idea) => (
          <button
            class={`qc-idea-card ${quickCreateStore.idea === ideaLabel(idea.title) ? 'selected' : ''}`}
            onClick={() => quickCreateStoreActions.setIdea(ideaLabel(idea.title))}
          >
            <img class="qc-idea-thumb" src={idea.image} alt={ideaLabel(idea.title)} loading="lazy" />
            <span class="qc-idea-title">{ideaLabel(idea.title)}</span>
          </button>
        )}
      </For>
    </div>

    <div class="qc-secondary-actions">
      <button class="qc-outline-btn">⬆ {qc().step1.uploadStory}</button>
      <button class="qc-outline-btn">📖 {qc().step1.importManga}</button>
    </div>
  </div>
)

// ── Step 2: Genre ──

const Step2Genre = () => (
  <div class="qc-step">
    <h2 class="qc-heading">{qc().step2.heading}</h2>
    <p class="qc-subtitle">{qc().step2.subtitle}</p>
    <div class="qc-option-grid">
      <For each={GENRES}>
        {(genre) => (
          <button
            class={`qc-option-card ${quickCreateStore.genreId === genre.id ? 'selected' : ''}`}
            onClick={() => quickCreateStoreActions.selectGenre(genre.id)}
          >
            <span class="qc-option-icon">{genre.icon}</span>
            <span class="qc-option-label">{genreLabel(genre.id)}</span>
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
    <div class="qc-style-grid">
      <For each={ART_STYLES}>
        {(style) => (
          <button
            class={`qc-style-card ${quickCreateStore.artStyleId === style.id ? 'selected' : ''}`}
            onClick={() => quickCreateStoreActions.selectArtStyle(style.id)}
          >
            <img class="qc-style-thumb" src={style.image} alt={styleLabel(style.id)} loading="lazy" />
            <span class="qc-style-label">{styleLabel(style.id)}</span>
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
            <span class="qc-length-icon">🕒</span>
            <span class="qc-length-number">{opt.seconds}</span>
            <span class="qc-length-unit">{qc().step4.seconds}</span>
            <span class="qc-length-desc">{opt.seconds === 30 ? qc().step4.desc30 : qc().step4.desc60}</span>
          </button>
        )}
      </For>
    </div>
  </div>
)

// ── Step 5: Review ──

const ReviewRow = (props: { label: string; value: string }) => (
  <div class="qc-review-row">
    <span class="qc-review-label">{props.label}</span>
    <span class="qc-review-value">{props.value}</span>
  </div>
)

const Step5Review = () => {
  const seriesTitle = () => quickCreateStore.idea.trim() || qc().step5.untitled
  const genreText = () =>
    quickCreateStore.genreId ? genreLabel(quickCreateStore.genreId) : qc().step5.none
  const styleText = () =>
    quickCreateStore.artStyleId ? styleLabel(quickCreateStore.artStyleId) : qc().step5.none
  const lengthText = () => `${quickCreateStore.episodeLength} ${qc().step4.seconds}`

  return (
    <div class="qc-step">
      <h2 class="qc-heading">{qc().step5.heading}</h2>
      <p class="qc-subtitle">{qc().step5.subtitle}</p>

      <div class="qc-review">
        <img class="qc-review-preview" src={reviewImage} alt={seriesTitle()} />
        <div class="qc-review-details">
          <ReviewRow label={qc().step5.seriesTitle} value={seriesTitle()} />
          <ReviewRow label={qc().step5.genre} value={genreText()} />
          <ReviewRow label={qc().step5.artStyle} value={styleText()} />
          <ReviewRow label={qc().step5.episodeLength} value={lengthText()} />
          <ReviewRow
            label={qc().step5.seriesPlan}
            value={qc().step5.seriesPlanValue.replace('{count}', String(SERIES_PLAN_EPISODES))}
          />
        </div>
      </div>

      <div class="qc-director-note">
        <span class="qc-director-title">✨ {qc().step5.directorSays}</span>
        <p class="qc-director-text">
          {qc().step5.directorNote.replace('{count}', String(SERIES_PLAN_EPISODES))}
        </p>
      </div>
    </div>
  )
}

// ── Wizard navigation ──

const WizardNav = () => (
  <div class="qc-nav">
    <Show when={quickCreateStore.step > 1}>
      <button class="qc-back-btn" onClick={quickCreateStoreActions.back}>
        ← {qc().back}
      </button>
    </Show>
    <Switch>
      <Match when={quickCreateStore.step === QUICK_CREATE_STEPS}>
        <button class="qc-primary-btn">🚀 {qc().step5.generate}</button>
      </Match>
      <Match when={quickCreateStore.step === 1}>
        <button class="qc-primary-btn" disabled={!canAdvance()} onClick={quickCreateStoreActions.next}>
          {qc().step1.next} →
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
  <div class="quick-create-page">
    <TopBar />
    <div class="qc-container">
      <div class="qc-header">
        <h1 class="qc-title">✨ {qc().title}</h1>
        <p class="qc-page-subtitle">{qc().subtitle}</p>
      </div>

      <StepIndicator />

      <div class="qc-card">
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
