// Quick Create wizard store - UI-only step-by-step wizard for generating a video series.
// No backend yet: all selections live in this store (Rule #7: shared state outside the tree).

import { createStore } from 'solid-js/store'
import {
  fetchTemplates,
  startProductionJob,
  startVideoJob,
  startAudioJob,
  fetchProductionStatus,
  type StarterTemplate,
  type ProductionJob,
} from '../services/dataService'

export type { StarterTemplate }

// Steps 1-4 are inputs; step 5 is the AI Director review; step 6 is Episode 1
// generation. The last step reachable via "Continue"/next is 4 (then step 4 runs
// the plan and jumps to 5, and step 5 runs the episode and jumps to 6).
export const QUICK_CREATE_STEPS = 6

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
  { key: 'renderingEngine' },
  { key: 'videoGeneration' },
  { key: 'audioGeneration' },
  { key: 'composition' },
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

// A rendered shot video (from Seedance) — url on success, error otherwise.
// audioUrl is the same shot with narration/BGM muxed in.
export interface ShotVideo {
  shot_id: string
  shot_number: number | null
  url?: string
  audioUrl?: string
  narration?: string
  error?: string
}

export interface Production {
  idea: string
  ideaTitle: string
  genre: string | null
  artStyle: string | null
  episodeLength: number | null
  calls: ProductionCalls
  episodes: ReviewEpisode[]
  videos: ShotVideo[]
  episodeVideo: string // stitched episode video (with audio)
}

// Result of the "plan" phase (step 4): the 5-episode plan + covers, shown at step 5
export interface PlanResult {
  ideaTitle: string
  call1: Record<string, unknown> | null
  episodes: ReviewEpisode[]
}

// '' idle | 'plan' (step 4 → 5) | 'episode' (step 6, the 6 calls)
export type PipelinePhase = '' | 'plan' | 'episode'

interface PipelineState {
  running: boolean
  error: string // '' when ok; '__signin__' when not logged in; otherwise a message
  phase: PipelinePhase
  jobId: string | null // the background job currently being polled
  episodeJobId: string | null // the persistent My Series (episode) job id
  calls: PipelineCallState[] // per-step statuses (step 6)
  coverStatus: StepStatus // cover generation (plan phase)
  percent: number // overall episode-generation percent
  videoProgress: { done: number; total: number; percent: number } // averaged video-gen sub-progress
  audioTriggered: boolean // guard: audio continuation kicked off this session
  plan: PlanResult | null // step 5 review data
  production: Production | null // step 6 data (fills as calls complete)
}

const getInitialPipeline = (): PipelineState => ({
  running: false,
  error: '',
  phase: '',
  jobId: null,
  episodeJobId: null,
  calls: PIPELINE_CALLS.map((c) => ({ key: c.key, status: 'pending' as StepStatus })),
  coverStatus: 'pending',
  percent: 0,
  videoProgress: { done: 0, total: 0, percent: 0 },
  audioTriggered: false,
  plan: null,
  production: null,
})

// ── Wizard state ──

interface QuickCreateState {
  step: number
  idea: string
  ideaTitle: string // short series name (from template / generation / filename)
  genreId: string | null
  artStyleId: string | null
  episodeLength: number | null
  testMode: boolean // skip cover generation, reuse the story cover for all episodes
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
  testMode: false,
  templates: [],
  templatesLoaded: false,
  pipeline: getInitialPipeline(),
})

// The "story cover" reused for all episodes in test mode: the selected template's
// cover if the idea came from one, else a genre/art-style image, else the hero.
const getStoryCover = (): string => {
  const tpl = state.templates.find((t) => t.prompt === state.idea)
  if (tpl?.cover) return tpl.cover
  const genre = GENRES.find((g) => g.id === state.genreId)
  if (genre) return genre.image
  const style = ART_STYLES.find((s) => s.id === state.artStyleId)
  if (style) return style.image
  return heroImage
}

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
  setTestMode: (testMode: boolean) => setState({ testMode }),
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

  // Step 4 "Continue": generate the 5-episode plan (Call 1) + covers in the
  // background, then advance to the review (step 5).
  runPlan: async () => {
    const token = localStorage.getItem('gcashmall_token')
    if (!token) {
      setState('pipeline', { ...getInitialPipeline(), error: '__signin__' })
      return
    }
    const jobId = newJobId()
    setState('pipeline', { ...getInitialPipeline(), running: true, phase: 'plan', jobId })
    try {
      await startProductionJob(jobId, {
        mode: 'plan',
        story: state.idea,
        ideaTitle: state.ideaTitle.trim(),
        genre: state.genreId,
        art_style: state.artStyleId,
        episode_length: state.episodeLength,
        target_audience: '',
        testMode: state.testMode,
        storyCover: getStoryCover(),
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

  // Step 5 "Generate Episode 1": create the persistent episode job (the My Series
  // entry), reuse the plan's Call-1 output, run Calls 2-6, and jump to step 6.
  runEpisode: async () => {
    const plan = state.pipeline.plan
    if (!plan) return
    const token = localStorage.getItem('gcashmall_token')
    if (!token) {
      setState('pipeline', { error: '__signin__', running: false, phase: '' })
      return
    }
    // Reuse the plan-phase job id so step 6 UPDATES the same production document
    // (which already holds Call 1 + covers) rather than creating a second one.
    const jobId = state.pipeline.jobId || newJobId()
    const seriesTitle = plan.ideaTitle
    setState('pipeline', {
      running: true,
      phase: 'episode',
      error: '',
      jobId,
      episodeJobId: jobId,
      coverStatus: 'done',
      percent: Math.round((1 / PIPELINE_CALLS.length) * 100),
      calls: PIPELINE_CALLS.map((c, i) => ({
        key: c.key,
        status: (i === 0 ? 'done' : 'pending') as StepStatus,
      })),
      production: {
        idea: state.idea,
        ideaTitle: seriesTitle,
        genre: state.genreId,
        artStyle: state.artStyleId,
        episodeLength: state.episodeLength,
        calls: plan.call1 ? { executiveProducer: plan.call1 } : {},
        episodes: plan.episodes,
        videos: [],
        episodeVideo: '',
      },
    })
    setState('step', 6)
    try {
      await startProductionJob(jobId, {
        mode: 'episode',
        story: state.idea,
        ideaTitle: seriesTitle,
        genre: state.genreId,
        art_style: state.artStyleId,
        episode_length: state.episodeLength,
        call1: plan.call1,
        episodes: plan.episodes,
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

  // Resume an existing episode job (opened from My Series) directly at step 6.
  resumeEpisode: async (jobId: string) => {
    setState('pipeline', {
      ...getInitialPipeline(),
      running: true,
      phase: 'episode',
      jobId,
      episodeJobId: jobId,
    })
    setState('step', 6)
    try {
      const job = await fetchProductionStatus(jobId)
      if (state.pipeline.jobId !== jobId) return
      hydrateEpisodeFromJob(job)
      applyJobProgress(job)

      // If the calls finished but video generation failed, retry it automatically.
      if (videoStepFailed(job)) {
        await retryVideoGeneration(jobId)
        return
      }
      // If video finished but audio/composition didn't, continue them automatically.
      if (audioStepsIncomplete(job)) {
        await continueAudioGeneration(jobId)
        return
      }
      if (job.status === 'done') {
        finishEpisode(job)
        return
      }
      if (job.status === 'error') {
        setState('pipeline', { running: false, error: job.error || 'Generation failed' })
        return
      }
    } catch {
      // fall through to polling, which will retry
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
const POLL_TIMEOUT_MS = 20 * 60 * 1000

const mapEpisodes = (episodes?: { n: number; title: string; desc: string; cover?: string }[]): ReviewEpisode[] =>
  (episodes || []).map((e) => ({
    n: e.n,
    title: e.title,
    desc: e.desc,
    cover: e.cover || '',
    coverLoading: false,
  }))

// Poll the job until it completes, errors, or is cancelled (jobId changing ends it).
const pollProduction = async (jobId: string): Promise<void> => {
  const startedAt = Date.now()
  let audioStalePolls = 0

  while (state.pipeline.jobId === jobId) {
    await sleep(POLL_INTERVAL_MS)
    if (state.pipeline.jobId !== jobId) return

    let job: ProductionJob
    try {
      job = await fetchProductionStatus(jobId)
    } catch {
      continue // transient error — keep polling
    }
    if (state.pipeline.jobId !== jobId) return

    applyJobProgress(job)

    // Video finished but audio/composition never started (server hand-off didn't fire)
    // and isn't running — after a short grace period, kick it off from the client.
    if (state.pipeline.phase === 'episode' && !state.pipeline.audioTriggered) {
      const audioRunning = (job.progress?.calls || []).some(
        (c) => AUDIO_STEP_KEYS.includes(c.key) && c.status === 'running',
      )
      if (audioStepsIncomplete(job) && !audioRunning && job.status !== 'done') {
        audioStalePolls++
        if (audioStalePolls >= 3) {
          continueAudioGeneration(jobId)
          return
        }
      } else {
        audioStalePolls = 0
      }
    }
    // Keep step 6's production.calls (and any rendered videos) fresh as work completes
    if (state.pipeline.phase === 'episode') {
      if (job.calls) setState('pipeline', 'production', (p) => (p ? { ...p, calls: job.calls! } : p))
      if (job.videos) {
        setState('pipeline', 'production', (p) =>
          p ? { ...p, videos: job.videos as ShotVideo[] } : p,
        )
      }
      if (job.episodeVideo) {
        setState('pipeline', 'production', (p) =>
          p ? { ...p, episodeVideo: job.episodeVideo! } : p,
        )
      }
    }

    if (job.status === 'done') {
      if (state.pipeline.phase === 'plan') finishPlan(job)
      else if (audioStepsIncomplete(job) && !state.pipeline.audioTriggered) {
        // Video done but audio/composition didn't run/finish — kick them off (once)
        continueAudioGeneration(jobId)
      } else finishEpisode(job)
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

const AUDIO_STEP_KEYS = ['audioGeneration', 'composition']

// Whether the video-generation step failed (whole step errored, or a shot failed)
const videoStepFailed = (job: ProductionJob): boolean => {
  const vStep = job.progress?.calls?.find((c) => c.key === 'videoGeneration')
  if (vStep?.status === 'error') return true
  return (job.videos || []).some((v) => v.error && !v.url)
}

// Video finished (shots rendered) but there's no final episode video yet → audio +
// composition still need to run (covers never-ran, partial, and silently-failed cases
// where the steps were wrongly marked done but produced no episodeVideo).
const audioStepsIncomplete = (job: ProductionJob): boolean => {
  const videoDone =
    (job.progress?.calls || []).find((c) => c.key === 'videoGeneration')?.status === 'done'
  if (!videoDone) return false
  if (!(job.videos || []).some((v) => v.url)) return false
  return !job.episodeVideo
}

// Continue audio + composition on a resumed production: flip the unfinished audio
// steps to running, (re)start the audio job, wait until it takes over, then poll.
const continueAudioGeneration = async (jobId: string): Promise<void> => {
  setState('pipeline', 'audioTriggered', true)
  state.pipeline.calls.forEach((c, i) => {
    if (AUDIO_STEP_KEYS.includes(c.key) && c.status !== 'done') {
      setState('pipeline', 'calls', i, 'status', 'running')
    }
  })
  setState('pipeline', { running: true, error: '' })
  try {
    await startAudioJob(jobId)
    await waitForAudioRestart(jobId)
  } catch (error) {
    console.error('Failed to continue audio generation:', error)
  }
  pollProduction(jobId)
}

// Wait until the (re)started audio job flips the doc back to 'running', so the main
// poll loop doesn't finish on a stale 'done' from a failed/partial run.
const waitForAudioRestart = async (jobId: string): Promise<void> => {
  for (let i = 0; i < 8; i++) {
    await sleep(1500)
    if (state.pipeline.jobId !== jobId) return
    try {
      const job = await fetchProductionStatus(jobId)
      const running = (job.progress?.calls || []).some(
        (c) => AUDIO_STEP_KEYS.includes(c.key) && c.status === 'running',
      )
      if (job.status === 'running' && running) return
    } catch {
      // keep waiting
    }
  }
}

// Retry video generation for a resumed production: flip the step back to running,
// (re)start the video job, wait until it takes over, then resume polling.
const retryVideoGeneration = async (jobId: string): Promise<void> => {
  const idx = state.pipeline.calls.findIndex((c) => c.key === 'videoGeneration')
  if (idx >= 0) setState('pipeline', 'calls', idx, 'status', 'running')
  setState('pipeline', { running: true, error: '' })
  try {
    await startVideoJob(jobId)
    await waitForVideoRestart(jobId)
  } catch (error) {
    console.error('Failed to retry video generation:', error)
  }
  pollProduction(jobId)
}

// Poll briefly until the retry job flips the doc back to 'running', so the main
// poll loop doesn't finish on the stale 'done' status from the failed run.
const waitForVideoRestart = async (jobId: string): Promise<void> => {
  for (let i = 0; i < 8; i++) {
    await sleep(1500)
    if (state.pipeline.jobId !== jobId) return
    try {
      const job = await fetchProductionStatus(jobId)
      const vStep = job.progress?.calls?.find((c) => c.key === 'videoGeneration')
      if (job.status === 'running' || vStep?.status === 'running') return
    } catch {
      // keep waiting
    }
  }
}

// Mirror the job's per-call + cover progress + percent into pipeline state
const applyJobProgress = (job: ProductionJob) => {
  const calls = job.progress?.calls
  if (Array.isArray(calls) && calls.length > 0) {
    if (state.pipeline.phase === 'episode') {
      // Mirror the server's exact step list (it may omit e.g. audioGeneration for
      // Seedance 2.0), so the displayed steps + percent always match the backend.
      setState(
        'pipeline',
        'calls',
        calls.map((c) => ({ key: c.key, status: c.status as StepStatus })),
      )
    } else {
      calls.forEach((c, i) => {
        if (state.pipeline.calls[i]) {
          setState('pipeline', 'calls', i, 'status', c.status as StepStatus)
        }
      })
    }
  }
  if (job.progress?.coverStatus) {
    setState('pipeline', 'coverStatus', job.progress.coverStatus as StepStatus)
  }
  if (job.videoProgress) {
    setState('pipeline', 'videoProgress', {
      done: job.videoProgress.done ?? 0,
      total: job.videoProgress.total ?? 0,
      percent: job.videoProgress.percent ?? 0,
    })
  }
  // Compute the episode percent from the steps the client actually shows (so it can't
  // read 100% while audio/composition are still pending); fall back to the server value.
  if (state.pipeline.phase === 'episode') {
    const total = state.pipeline.calls.length
    const done = state.pipeline.calls.filter((c) => c.status === 'done').length
    setState('pipeline', 'percent', total ? Math.round((done / total) * 100) : 0)
  } else if (typeof job.percent === 'number') {
    setState('pipeline', 'percent', job.percent)
  }
}

// Plan phase done → store the plan and advance to the review step
const finishPlan = (job: ProductionJob) => {
  const episodes = mapEpisodes(job.episodes)
  setState('pipeline', {
    running: false,
    phase: '',
    plan: {
      ideaTitle: job.ideaTitle || state.ideaTitle.trim() || 'Untitled Series',
      call1: (job.calls?.executiveProducer as Record<string, unknown>) || null,
      episodes,
    },
  })
  setState('step', 5)
}

// Episode phase done → populate the full production for step 6
const finishEpisode = (job: ProductionJob) => {
  setState('pipeline', {
    running: false,
    percent: 100,
    production: {
      idea: state.idea || job.idea || '',
      ideaTitle: job.ideaTitle || job.title || state.ideaTitle,
      genre: job.genre ?? state.genreId,
      artStyle: job.artStyle ?? state.artStyleId,
      episodeLength: job.episodeLength ?? state.episodeLength,
      calls: job.calls || {},
      episodes: mapEpisodes(job.episodes),
      videos: job.videos || [],
      episodeVideo: job.episodeVideo || '',
    },
  })
}

// Populate step-6 state from a job doc when resuming (from My Series)
const hydrateEpisodeFromJob = (job: ProductionJob) => {
  const episodes = mapEpisodes(job.episodes)
  const title = job.ideaTitle || job.title || 'Untitled Series'
  setState('pipeline', {
    production: {
      idea: job.idea || '',
      ideaTitle: title,
      genre: job.genre ?? null,
      artStyle: job.artStyle ?? null,
      episodeLength: job.episodeLength ?? null,
      calls: job.calls || {},
      episodes,
      videos: job.videos || [],
      episodeVideo: job.episodeVideo || '',
    },
    plan: {
      ideaTitle: title,
      call1: (job.calls?.executiveProducer as Record<string, unknown>) || null,
      episodes,
    },
  })
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
