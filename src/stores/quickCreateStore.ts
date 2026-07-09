// Quick Create wizard store - UI-only step-by-step wizard for generating a video series.
// No backend yet: all selections live in this store (Rule #7: shared state outside the tree).

import { createStore } from 'solid-js/store'
import {
  fetchTemplates,
  startProductionJob,
  fetchProductionStatus,
  type StarterTemplate,
} from '../services/dataService'

export type { StarterTemplate }

// 5 input steps are built; the stepper also shows the 6th (result) step for fidelity.
export const QUICK_CREATE_STEPS = 5

// ── Mockup-generated images, hosted on Cloudinary (GCash/quick create folder) ──

const QC_CDN = 'https://res.cloudinary.com/daqc8bim3/image/upload/GCash/quick%20create'
const cdn = (file: string) => `${QC_CDN}/${file}.webp`

const ideaImage = (id: string) => cdn(`idea-${id}`)
const genreImage = (id: string) => cdn(`genre-${id}`)
const styleImage = (id: string) => cdn(`style-${id}`)
const lengthImage = (id: string) => cdn(`length-${id}`)
const epImage = (id: string) => cdn(`ep-${id}`)

// Step 1 hero banner
export const heroImage = cdn('hero-idea')

// ── Static option data (UI only) ──

export interface PopularIdea {
  id: string
  image: string
}
export interface GenreOption {
  id: string
  icon: string
  image: string
}
export interface ArtStyleOption {
  id: string
  image: string
}
export interface EpisodeLengthOption {
  seconds: number
  image: string
  statKeys: [string, string, string]
}
export interface PlanEpisode {
  n: number
  image: string
  status: 'generating' | 'pending'
}

// Stepper labels shown in the top bar (i18n keys under quickCreate.steps)
export const STEPPER_KEYS = [
  'ideaInput',
  'chooseGenre',
  'artStyle',
  'episodeLength',
  'directorReview',
  'episodeReady',
]

export const POPULAR_IDEAS: PopularIdea[] = [
  { id: 'isekai', image: ideaImage('isekai') },
  { id: 'highSchoolRomance', image: ideaImage('highSchoolRomance') },
  { id: 'fantasyHero', image: ideaImage('fantasyHero') },
  { id: 'dragonAcademy', image: ideaImage('dragonAcademy') },
  { id: 'sciFiMecha', image: ideaImage('sciFiMecha') },
  { id: 'cuteAnimal', image: ideaImage('cuteAnimal') },
]

// Step 1 secondary action cards (i18n keys under quickCreate.step1.actions)
export const IDEA_ACTIONS = [
  { id: 'uploadStory', icon: '⬆️' },
  { id: 'importManga', icon: '📖' },
  { id: 'surpriseMe', icon: '🎲' },
]

export const GENRES: GenreOption[] = [
  { id: 'action', icon: '⚔️', image: genreImage('action') },
  { id: 'romance', icon: '💗', image: genreImage('romance') },
  { id: 'comedy', icon: '😄', image: genreImage('comedy') },
  { id: 'fantasy', icon: '🔮', image: genreImage('fantasy') },
  { id: 'horror', icon: '👻', image: genreImage('horror') },
  { id: 'sciFi', icon: '🛸', image: genreImage('sciFi') },
]

export const ART_STYLES: ArtStyleOption[] = [
  { id: 'modernAnime', image: styleImage('modernAnime') },
  { id: 'ghibli', image: styleImage('ghibli') },
  { id: 'shonen', image: styleImage('shonen') },
  { id: 'shojo', image: styleImage('shojo') },
  { id: 'cyberpunk', image: styleImage('cyberpunk') },
  { id: 'chibi', image: styleImage('chibi') },
]

export const EPISODE_LENGTHS: EpisodeLengthOption[] = [
  { seconds: 30, image: lengthImage('30'), statKeys: ['shots30', 'shot30', 'gen30'] },
  { seconds: 60, image: lengthImage('60'), statKeys: ['shots60', 'shot60', 'gen60'] },
]

// Icons for the episode-length stat chips (matching the mockup)
export const STAT_ICONS: Record<string, string> = {
  shots30: '🎬',
  shot30: '🕐',
  gen30: '⚡',
  shots60: '🎬',
  shot60: '🕐',
  gen60: '⭐',
}

// ── Step 5: hardcoded AI Director plan (based on the mockup) ──

export const SERIES_PLAN = {
  titleKey: 'dragonAcademy',
  image: ideaImage('dragonAcademy'),
  genreKey: 'fantasyAdventure',
  artStyleKey: 'modernAnime',
  lengthSeconds: 30,
  episodes: 5,
  confidence: 95,
}

export const PLAN_EPISODES: PlanEpisode[] = [
  { n: 1, image: epImage('1'), status: 'generating' },
  { n: 2, image: epImage('2'), status: 'pending' },
  { n: 3, image: epImage('3'), status: 'pending' },
  { n: 4, image: epImage('4'), status: 'pending' },
  { n: 5, image: epImage('5'), status: 'pending' },
]

// ── AI production pipeline (the 6 sequential OpenAI calls) ──

// Order + i18n key for each call. Titles come from quickCreate.pipeline.calls.<key>.
export const PIPELINE_CALLS: { key: string }[] = [
  { key: 'executiveProducer' },
  { key: 'aiDirector' },
  { key: 'characterDesigner' },
  { key: 'storyboardArchitect' },
  { key: 'storyOptimizer' },
  { key: 'promptCompiler' },
]

export type StepStatus = 'pending' | 'running' | 'done' | 'error'

export interface PipelineCallState {
  key: string
  status: StepStatus
}

export interface ReviewEpisode {
  n: number
  title: string
  desc: string
  cover: string
  coverLoading: boolean
}

// Raw per-call outputs keyed by call key
export type ProductionCalls = Record<string, Record<string, unknown>>

export interface Production {
  idea: string
  ideaTitle: string
  genre: string | null
  artStyle: string | null
  episodeLength: number | null
  calls: ProductionCalls
  episodes: ReviewEpisode[]
}

interface PipelineState {
  running: boolean
  error: string // '' when ok; '__signin__' when not logged in; otherwise a message
  jobId: string | null // the active background job being polled
  calls: PipelineCallState[]
  coverStatus: StepStatus
  production: Production | null
  savedId: string | null
}

const getInitialPipeline = (): PipelineState => ({
  running: false,
  error: '',
  jobId: null,
  calls: PIPELINE_CALLS.map((c) => ({ key: c.key, status: 'pending' as StepStatus })),
  coverStatus: 'pending',
  production: null,
  savedId: null,
})

// ── Wizard state ──

interface QuickCreateState {
  step: number
  idea: string
  ideaTitle: string // short series name (from template / generated / filename)
  genreId: string | null
  artStyleId: string | null
  episodeLength: number | null
  templates: StarterTemplate[]
  templatesLoaded: boolean
  pipeline: PipelineState
}

const getInitialState = (): QuickCreateState => ({
  step: 1,
  idea: '',
  ideaTitle: '',
  genreId: null,
  artStyleId: null,
  episodeLength: 30,
  templates: [],
  templatesLoaded: false,
  pipeline: getInitialPipeline(),
})

const [state, setState] = createStore<QuickCreateState>(getInitialState())

export const quickCreateStore = state

export const quickCreateStoreActions = {
  next: () => setState('step', (s) => Math.min(s + 1, QUICK_CREATE_STEPS)),
  back: () => setState('step', (s) => Math.max(s - 1, 1)),
  goToStep: (step: number) => setState({ step }),
  setIdea: (idea: string) => setState({ idea }),
  setIdeaTitle: (ideaTitle: string) => setState({ ideaTitle }),
  // Apply a story (prompt + its title) from a template / generation / upload
  applyStory: (idea: string, ideaTitle: string) => setState({ idea, ideaTitle }),
  selectGenre: (genreId: string) => setState({ genreId }),
  selectArtStyle: (artStyleId: string) => setState({ artStyleId }),
  selectEpisodeLength: (episodeLength: number) => setState({ episodeLength }),
  // Load starter-story templates from the DB (once)
  loadTemplates: async () => {
    if (state.templatesLoaded) return
    try {
      const templates = await fetchTemplates()
      setState({ templates, templatesLoaded: true })
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  },

  // Stop polling / dismiss the progress overlay (also cancels the poll loop)
  resetPipeline: () => setState('pipeline', getInitialPipeline()),

  // Kick off the 6-call pipeline in the Netlify background function, then poll its
  // job document for progress. On completion, advance to the review step (step 5).
  runPipeline: async () => {
    // Generation spends OpenAI credits — require a logged-in user.
    const token = localStorage.getItem('gcashmall_token')
    if (!token) {
      setState('pipeline', { ...getInitialPipeline(), error: '__signin__' })
      return
    }

    const jobId = newJobId()
    setState('pipeline', { ...getInitialPipeline(), running: true, jobId })

    try {
      await startProductionJob(jobId, {
        story: state.idea,
        ideaTitle: state.ideaTitle.trim(),
        genre: state.genreId,
        art_style: state.artStyleId,
        episode_length: state.episodeLength,
        target_audience: '',
      })
    } catch (error) {
      setState('pipeline', {
        running: false,
        error: error instanceof Error ? error.message : 'Failed to start generation',
      })
      return
    }

    pollProduction(jobId)
  },

  reset: () => setState(getInitialState()),
}

// ── Background-job polling ──

const newJobId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `job-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 15 * 60 * 1000

// Poll the job document until it completes, errors, or is cancelled (the pipeline's
// jobId changing — via reset/rerun — ends this loop).
const pollProduction = async (jobId: string): Promise<void> => {
  const startedAt = Date.now()

  while (state.pipeline.jobId === jobId) {
    await sleep(POLL_INTERVAL_MS)
    if (state.pipeline.jobId !== jobId) return // cancelled or restarted

    let job
    try {
      job = await fetchProductionStatus(jobId)
    } catch {
      continue // transient network/API error — keep polling
    }
    if (state.pipeline.jobId !== jobId) return

    applyJobProgress(job)

    if (job.status === 'done') {
      completeProduction(job)
      return
    }
    if (job.status === 'error') {
      setState('pipeline', { running: false, error: job.error || 'Generation failed' })
      return
    }
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      setState('pipeline', { running: false, error: 'Generation timed out' })
      return
    }
  }
}

// Mirror the job's per-call + cover progress into the pipeline state (for the overlay)
const applyJobProgress = (job: { progress?: { calls?: { key: string; status: string }[]; coverStatus?: string } }) => {
  const calls = job.progress?.calls
  if (Array.isArray(calls)) {
    calls.forEach((c, i) => {
      if (state.pipeline.calls[i]) {
        setState('pipeline', 'calls', i, 'status', c.status as StepStatus)
      }
    })
  }
  if (job.progress?.coverStatus) {
    setState('pipeline', 'coverStatus', job.progress.coverStatus as StepStatus)
  }
}

// Populate the review step from a finished job and advance to it
const completeProduction = (job: {
  episodes?: { n: number; title: string; desc: string; cover?: string }[]
  calls?: ProductionCalls
  ideaTitle?: string
  genre?: string | null
  artStyle?: string | null
  episodeLength?: number | null
}) => {
  const episodes: ReviewEpisode[] = (job.episodes || []).map((e) => ({
    n: e.n,
    title: e.title,
    desc: e.desc,
    cover: e.cover || '',
    coverLoading: false,
  }))
  setState('pipeline', {
    episodes,
    production: {
      idea: state.idea,
      ideaTitle: job.ideaTitle || state.ideaTitle,
      genre: job.genre ?? state.genreId,
      artStyle: job.artStyle ?? state.artStyleId,
      episodeLength: job.episodeLength ?? state.episodeLength,
      calls: job.calls || {},
      episodes,
    },
    savedId: state.pipeline.jobId,
    running: false,
  })
  setState('step', 5)
}

// Whether the current step has the input it needs to advance
export const canAdvance = (): boolean => {
  switch (state.step) {
    case 1:
      return state.idea.trim().length > 0
    case 2:
      return state.genreId !== null
    case 3:
      return state.artStyleId !== null
    case 4:
      return state.episodeLength !== null
    default:
      return true
  }
}
