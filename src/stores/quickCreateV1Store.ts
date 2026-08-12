// Quick Create V1 store — the 4-page flow:
//   Page 1 Create Your Anime → Call 1 → Page 2 Review Proposal → Approve →
//   Calls 2–6 (Ganime Studio) → Page 4 Episode Ready.
// Shared state lives outside the component tree (Rule #7); components subscribe directly.

import { createStore, reconcile } from 'solid-js/store'
import {
  startV1Job,
  startTranscribeBackfill,
  fetchProductionStatus,
  fetchMyProductions,
  generateStoryPrompt,
  type V1Proposal,
  type ProductionJob,
} from '../services/dataService'

export type { V1Proposal }

// V1 has exactly four pages (see Development Summary).
export const V1_STEPS = 4

// Step-progress bar labels (i18n keys under quickCreateV1.steps)
export const V1_STEPPER_KEYS = ['idea', 'proposal', 'studio', 'ready']

// Popular Ideas shown on Page 1 — exact order/ids from the mockup. Title + description
// live in i18n (quickCreateV1.ideas.<id>); the card image is idea-<id>.webp.
export const STORY_TEMPLATES = [
  'schoolMysteryClub',
  'reincarnatedHero',
  'ghostRoommate',
  'childhoodFriends',
  'aiGirlfriend',
  'dragonAcademy',
  'magicSchool',
  'sportsUnderdog',
  'idolBand',
  'spaceAdventure',
]

// The seven studio production stages (Page 3). `serverKeys` maps a display stage to the
// job's progress.calls keys; the Episode Renderer covers both video + composition.
export interface StudioStage {
  key: string
  serverKeys: string[]
}
const IS_S1 = import.meta.env.VITE_VIDEO_STORAGE === 's1'
export const STUDIO_STAGES: StudioStage[] = [
  { key: 'executiveProducer', serverKeys: ['executiveProducer'] },
  { key: 'characterDirector', serverKeys: ['characterDirector'] },
  { key: 'episodeDirector', serverKeys: ['episodeDirector'] },
  { key: 'visualAssetDirector', serverKeys: ['visualAssetDirector'] },
  { key: 'audioDirector', serverKeys: ['audioDirector'] },
  { key: 'episodeProducer', serverKeys: ['episodeProducer'] },
  // Per-shot rendering: dynamic "Rendering Shots n/total"; its bar shows the current
  // shot's progress and resets between shots. Episode Renderer is the final encode.
  { key: 'renderingShots', serverKeys: ['videoGeneration'] },
  { key: 'episodeRenderer', serverKeys: ['audioGeneration', 'composition'] },
  // s1 only: extract audio → transcribe → translate → upload subtitles. Its bar reflects
  // the combined progress of all four tasks (job.transcribeProgress.percent).
  ...(IS_S1 ? [{ key: 'transcribe', serverKeys: ['transcribe'] }] : []),
]

export interface ShotVideo {
  shot_id: string
  shot_number?: number | null
  url?: string
  audioUrl?: string
  coverUrl?: string
  error?: string
}

// A sibling production of the same series (for the Ready page's Generated Episodes list).
export interface SeriesEpisode {
  episode: number
  jobId: string
  title: string
  status: string
  cover: string
}

export interface V1State {
  step: number
  idea: string
  surprising: boolean
  jobId: string | null
  // Proposal (Page 2)
  proposalLoading: boolean
  proposalError: string
  proposal: V1Proposal | null
  selectedEpisode: number // which season-roadmap episode is shown in Episode Details
  // AI Edit Assistant
  aiEditing: boolean
  aiEditError: string
  aiEditInstruction: string
  // Studio (Page 3) + Ready (Page 4)
  producing: boolean
  produceError: string
  progress: { key: string; status: string }[]
  percent: number
  stagePct: Record<string, number> // per-stage display percent (0-100)
  videos: ShotVideo[]
  videoDone: number
  videoTotal: number
  videoPercent: number // avg render progress across shots (0-100), from the server
  renderStartMs: number // when shot rendering began (for the time estimate)
  resumed: boolean // opened from My Series (disallow going back into the Studio)
  resuming: boolean // loading a resumed production — hide the wizard until the step is known
  episodeShots: PreviewShot[] // shot list for the live preview
  previewIndex: number // which shot the preview panel is showing
  previewPinned: boolean // user browsed manually → stop auto-advancing the preview
  episodeVideo: string
  episodeBunnyVideoId: string // s1 storage: the episode's Bunny video guid
  episodeNumber: number // which episode is being produced / shown (1-based)
  episodeKeyMoments: string[] // key beats of the generated episode (from its shot list)
  seriesEpisodes: SeriesEpisode[] // all productions of this series (Generated Episodes list)
  seriesId: string // set once published — puts the publish page into edit mode
  activityLog: LogLine[]
  createdAt: number // ms timestamp when production started (for total-time display)
  totalTimeSec: number // frozen total creation time (start→finish), 0 = unknown
  wantPublish: boolean // open the shared publish page when the Ready page mounts
}

export interface PreviewShot {
  n: number
  title: string
  location: string
  summary: string
}
export interface LogLine {
  time: string
  key: string // i18n key or literal
  text?: string // pre-resolved text (for dynamic lines)
}

const getInitialState = (): V1State => ({
  step: 1,
  idea: '',
  surprising: false,
  jobId: null,
  proposalLoading: false,
  proposalError: '',
  proposal: null,
  selectedEpisode: 1,
  aiEditing: false,
  aiEditError: '',
  aiEditInstruction: '',
  producing: false,
  produceError: '',
  progress: [],
  percent: 0,
  stagePct: {},
  videos: [],
  videoDone: 0,
  videoTotal: 0,
  videoPercent: 0,
  renderStartMs: 0,
  resumed: false,
  resuming: false,
  episodeShots: [],
  previewIndex: 0,
  previewPinned: false,
  episodeVideo: '',
  episodeBunnyVideoId: '',
  episodeNumber: 1,
  episodeKeyMoments: [],
  seriesEpisodes: [],
  seriesId: '',
  activityLog: [],
  createdAt: 0,
  totalTimeSec: 0,
  wantPublish: false,
})

const [state, setState] = createStore<V1State>(getInitialState())
export const quickCreateV1Store = state

// ── Helpers ──

const newJobId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `job-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 20 * 60 * 1000

const isSignedIn = (): boolean => !!localStorage.getItem('gcashmall_token')

// ── Actions ──

export const quickCreateV1Actions = {
  reset: () => setState(reconcile(getInitialState())),
  goToStep: (step: number) => setState({ step }),
  setIdea: (idea: string) => setState({ idea }),
  applyTemplate: (idea: string) => setState({ idea }),
  selectEpisode: (n: number) => setState({ selectedEpisode: n }),
  setAiEditInstruction: (v: string) => setState({ aiEditInstruction: v }),

  // Page 1 — "Surprise Me": generate a random story idea
  surpriseMe: async () => {
    if (state.surprising) return
    setState({ surprising: true })
    try {
      const { text } = await generateStoryPrompt('')
      setState({ idea: text })
    } catch {
      /* ignore — user can type their own */
    } finally {
      setState({ surprising: false })
    }
  },

  // Page 1 → Call 1 → Page 2. Starts the proposal job and polls until it's ready.
  generateProposal: async () => {
    if (!state.idea.trim()) return
    if (!isSignedIn()) {
      setState({ proposalError: '__signin__' })
      return
    }
    const jobId = newJobId()
    setState({
      jobId,
      step: 2,
      proposal: null,
      proposalLoading: true,
      proposalError: '',
    })
    try {
      await startV1Job(jobId, { mode: 'proposal', idea: state.idea.trim() })
    } catch (e) {
      setState({ proposalLoading: false, proposalError: (e as Error).message })
      return
    }
    pollProposal(jobId)
  },

  // Page 2 — "Regenerate Proposal": re-run Call 1 from the original idea.
  regenerateProposal: async () => {
    const jobId = state.jobId
    if (!jobId || state.proposalLoading) return
    setState({ proposalLoading: true, proposalError: '' })
    try {
      await startV1Job(jobId, { mode: 'proposal', idea: state.idea.trim() })
    } catch (e) {
      setState({ proposalLoading: false, proposalError: (e as Error).message })
      return
    }
    pollProposal(jobId)
  },

  // Page 2 — AI Edit Assistant: apply an instruction, regenerating only the affected part.
  applyAiEdit: async () => {
    const jobId = state.jobId
    const instruction = state.aiEditInstruction.trim()
    if (!jobId || !instruction || state.aiEditing) return
    const reqId = newJobId()
    setState({ aiEditing: true, aiEditError: '' })
    try {
      await startV1Job(jobId, {
        mode: 'edit',
        reqId,
        instruction,
        proposal: state.proposal,
      })
    } catch (e) {
      setState({ aiEditing: false, aiEditError: (e as Error).message })
      return
    }
    pollEdit(jobId, reqId)
  },

  // Local (client-side) edits to the working proposal copy.
  updateProposal: (path: (string | number)[], value: unknown) => {
    setState('proposal', ...(path as [never]), value as never)
  },

  addCharacter: () => {
    const list = state.proposal?.mainCharacters || []
    setState('proposal', 'mainCharacters', [...list, { name: '', role: '', importance: 'Main' }])
  },
  removeCharacter: (idx: number) => {
    const list = state.proposal?.mainCharacters || []
    setState(
      'proposal',
      'mainCharacters',
      list.filter((_, i) => i !== idx),
    )
  },

  // Page 2 → Approve & Continue → Calls 2–6 → Page 3.
  approve: async () => {
    const jobId = state.jobId
    if (!jobId || !state.proposal) return
    setState({
      step: 3,
      episodeNumber: 1,
      producing: true,
      produceError: '',
      progress: STUDIO_STAGES.map((st, i) => ({
        key: st.serverKeys[0],
        status: i === 0 ? 'done' : 'pending',
      })),
      percent: 0,
      stagePct: { executiveProducer: 100 },
      videos: [],
      videoDone: 0,
      videoTotal: 0,
      episodeShots: [],
      previewIndex: 0,
      episodeVideo: '',
      episodeKeyMoments: [],
      activityLog: [logNow('started')],
      createdAt: nowMs(),
    })
    startStageTicker()
    try {
      await startV1Job(jobId, { mode: 'produce', proposal: state.proposal })
    } catch (e) {
      stopStageTicker()
      setState({ producing: false, produceError: (e as Error).message })
      return
    }
    pollProduce(jobId)
  },

  // Open an existing v1 production (from My Series). Jumps to the Ready page when the
  // episode is finished, otherwise re-enters the Studio and resumes polling.
  openProduction: async (jobId: string, publish = false) => {
    // resuming=true hides the wizard (so step 1 never flashes) until the real step is known.
    setState({ ...getInitialState(), jobId, resumed: true, resuming: true })
    let job: ProductionJob
    try {
      job = await fetchProductionStatus(jobId)
    } catch (e) {
      setState({ step: 4, resuming: false, produceError: (e as Error).message })
      return
    }
    // A proposal-only production (never approved) resumes on the Review Proposal page.
    if (job.mode === 'v1proposal') {
      setState({
        proposal: job.proposal || null,
        seriesId: job.seriesId || '',
        proposalLoading: false,
        step: 2,
        resuming: false,
      })
      return
    }
    const doc = job as { createdAt?: string | number; updatedAt?: string | number }
    const startedMs = doc.createdAt ? new Date(doc.createdAt).getTime() : nowMs()
    const finishedMs = doc.updatedAt ? new Date(doc.updatedAt).getTime() : 0
    setState({
      proposal: job.proposal || null,
      episodeVideo: job.episodeVideo || '',
      episodeBunnyVideoId: job.episodeBunnyVideoId || '',
      episodeNumber: (job as { episode?: number }).episode || 1,
      episodeKeyMoments: job.keyMoments || [],
      seriesId: job.seriesId || '',
      videos: (job.videos as ShotVideo[]) || [],
      videoDone: job.videoProgress?.done || 0,
      videoTotal: job.videoProgress?.total || 0,
      progress: job.progress?.calls || [],
      createdAt: startedMs,
      totalTimeSec:
        job.episodeVideo && finishedMs > startedMs
          ? Math.round((finishedMs - startedMs) / 1000)
          : 0,
      wantPublish: publish,
    })
    if (job.episodeVideo || job.status === 'done') {
      // s1 episodes produced before the Transcribe step have no subtitles yet — kick off
      // the backfill and show the pipeline page with the Transcribe task's live progress.
      const tr = job.progress?.calls?.find((c) => c.key === 'transcribe')
      const needsSubtitles = IS_S1 && !!job.episodeBunnyVideoId && tr?.status !== 'done'
      if (needsSubtitles) {
        startTranscribeBackfill(jobId)
        setState({ step: 3, producing: true, resuming: false })
        pollTranscribe(jobId)
      } else {
        setState({ step: 4, producing: false, resuming: false })
      }
      quickCreateV1Actions.loadSeriesEpisodes()
    } else if (job.status === 'error') {
      setState({ step: 4, producing: false, resuming: false, produceError: job.error || 'Generation failed' })
    } else {
      setState({ step: 3, producing: true, resuming: false })
      startStageTicker()
      pollProduce(jobId)
    }
  },
  setResuming: (resuming: boolean) => setState({ resuming }),
  openPublish: () => setState({ wantPublish: true }),
  closePublish: () => setState({ wantPublish: false }),
  setSeriesId: (seriesId: string) => setState({ seriesId }),

  // Load every production of this series (episode 1 + follow-ups) for the Ready page's
  // "Generated Episodes" list. Groups by the same key My Series uses.
  loadSeriesEpisodes: async () => {
    const jobId = state.jobId
    if (!jobId) return
    let prods: ProductionJob[]
    try {
      prods = await fetchMyProductions()
    } catch {
      return
    }
    if (state.jobId !== jobId) return
    // Group key = the root (episode-1) production's jobId — stable regardless of which
    // episodes are published (seriesId is added only after publishing).
    const keyOf = (p: ProductionJob) => `grp:${p.parentJobId || p.jobId}`
    const cur = prods.find((p) => p.jobId === jobId)
    if (!cur) return
    const k = keyOf(cur)
    const members = prods.filter((p) => p.v === 1 && keyOf(p) === k && p.jobId)
    const eps: SeriesEpisode[] = members
      .map((p) => ({
        episode: p.episode || 1,
        jobId: p.jobId as string,
        title: p.title || p.ideaTitle || '',
        status: p.status || '',
        cover: p.cover || p.videos?.find((v) => v.coverUrl)?.coverUrl || '',
      }))
      .sort((a, b) => a.episode - b.episode)
    // Adopt the group's published series id so publishing a follow-up episode edits the
    // existing series (seeds its saved name/cover) instead of creating a new one.
    const publishedSeriesId = members.find((p) => p.seriesId)?.seriesId || state.seriesId || ''
    setState({ seriesEpisodes: eps, seriesId: publishedSeriesId })
  },

  // Manual browsing pins the preview so live polling stops yanking it to the newest shot.
  prevShot: () => setState({ previewPinned: true, previewIndex: Math.max(0, state.previewIndex - 1) }),
  nextShot: () =>
    setState({
      previewPinned: true,
      previewIndex: Math.min(Math.max(0, state.episodeShots.length - 1), state.previewIndex + 1),
    }),
  setPreviewIndex: (i: number) => setState({ previewIndex: i, previewPinned: true }),

  // Start generating a follow-up episode (already charged/unlocked server-side). Points
  // the store at the new production, resets studio state, and runs the pipeline for it.
  startNextEpisode: async (newJobId: string, episode: number) => {
    const proposal = state.proposal
    setState({
      jobId: newJobId,
      episodeNumber: episode,
      step: 3,
      resumed: false,
      producing: true,
      produceError: '',
      progress: STUDIO_STAGES.map((st, i) => ({
        key: st.serverKeys[0],
        status: i === 0 ? 'done' : 'pending',
      })),
      percent: 0,
      stagePct: { executiveProducer: 100 },
      videos: [],
      videoDone: 0,
      videoTotal: 0,
      videoPercent: 0,
      renderStartMs: 0,
      totalTimeSec: 0,
      episodeShots: [],
      previewIndex: 0,
      previewPinned: false,
      episodeVideo: '',
      episodeBunnyVideoId: '',
      episodeKeyMoments: [],
      seriesId: '',
      activityLog: [logNow('started')],
      createdAt: nowMs(),
    })
    startStageTicker()
    try {
      await startV1Job(newJobId, { mode: 'produce', proposal, episode })
    } catch (e) {
      stopStageTicker()
      setState({ producing: false, produceError: (e as Error).message })
      return
    }
    pollProduce(newJobId)
  },
}

// ── Polling loops ──

// Wait for the proposal (Call 1) to land on the job doc.
const pollProposal = async (jobId: string): Promise<void> => {
  const startedAt = Date.now()
  while (state.jobId === jobId) {
    await sleep(POLL_INTERVAL_MS)
    if (state.jobId !== jobId) return
    let job: ProductionJob
    try {
      job = await fetchProductionStatus(jobId)
    } catch {
      continue
    }
    if (state.jobId !== jobId) return

    if (job.proposal) {
      setState({ proposal: job.proposal, proposalLoading: false })
    }
    if (job.status === 'done' && job.proposal) {
      setState({ proposalLoading: false })
      return
    }
    if (job.status === 'error') {
      setState({ proposalLoading: false, proposalError: job.error || 'Failed to create proposal' })
      return
    }
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      setState({ proposalLoading: false, proposalError: 'Timed out creating proposal' })
      return
    }
  }
}

// Wait for a single AI-edit request to complete, then apply the updated proposal.
const pollEdit = async (jobId: string, reqId: string): Promise<void> => {
  const startedAt = Date.now()
  while (state.jobId === jobId && state.aiEditing) {
    await sleep(POLL_INTERVAL_MS)
    let job: ProductionJob
    try {
      job = await fetchProductionStatus(jobId)
    } catch {
      continue
    }
    if (job.editResult?.id === reqId && job.editResult.status === 'done') {
      setState({
        proposal: job.proposal || state.proposal,
        aiEditing: false,
        aiEditInstruction: '',
      })
      return
    }
    if (job.status === 'error') {
      setState({ aiEditing: false, aiEditError: job.error || 'AI edit failed' })
      return
    }
    if (Date.now() - startedAt > 3 * 60 * 1000) {
      setState({ aiEditing: false, aiEditError: 'AI edit timed out' })
      return
    }
  }
}

// Poll the production job through Calls 2–6 + rendering until the episode video is ready.
const pollProduce = async (jobId: string): Promise<void> => {
  const startedAt = Date.now()
  while (state.jobId === jobId) {
    await sleep(POLL_INTERVAL_MS)
    if (state.jobId !== jobId) return
    let job: ProductionJob
    try {
      job = await fetchProductionStatus(jobId)
    } catch {
      continue
    }
    if (state.jobId !== jobId) return

    applyProduceProgress(job)

    if (job.episodeVideo) {
      stopStageTicker()
      setState({
        episodeVideo: job.episodeVideo,
        episodeBunnyVideoId: job.episodeBunnyVideoId || '',
        episodeKeyMoments: job.keyMoments || state.episodeKeyMoments,
        producing: false,
        step: 4,
        totalTimeSec: state.createdAt ? Math.round((nowMs() - state.createdAt) / 1000) : 0,
      })
      quickCreateV1Actions.loadSeriesEpisodes()
      return
    }
    if (job.status === 'error') {
      stopStageTicker()
      setState({ producing: false, produceError: job.error || 'Generation failed' })
      return
    }
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      stopStageTicker()
      setState({ producing: false, produceError: 'Generation timed out' })
      return
    }
  }
}

// Poll a finished episode's subtitle backfill: the video is already done, so we only
// watch the Transcribe step and advance to the Ready page once it finishes (or errors).
const pollTranscribe = async (jobId: string): Promise<void> => {
  const startedAt = Date.now()
  const finish = (): void => setState({ producing: false, step: 4 })
  while (state.jobId === jobId) {
    await sleep(POLL_INTERVAL_MS)
    if (state.jobId !== jobId) return
    let job: ProductionJob
    try {
      job = await fetchProductionStatus(jobId)
    } catch {
      continue
    }
    if (state.jobId !== jobId) return
    applyProduceProgress(job)
    const tr = job.progress?.calls?.find((c) => c.key === 'transcribe')
    if (tr?.status === 'done' || tr?.status === 'error') return finish()
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) return finish()
  }
}

// ── Time + log helpers ──

const nowMs = (): number => (typeof Date !== 'undefined' ? Date.now() : 0)
const timeStr = (): string => {
  try {
    return new Date().toLocaleTimeString([], { hour12: false })
  } catch {
    return ''
  }
}
const logNow = (key: string, text?: string): LogLine => ({ time: timeStr(), key, text })

// One activity-log line per stage completion (i18n key under quickCreateV1.studio.log).
const STAGE_DONE_LOG: Record<string, string> = {
  characterDirector: 'characterDone',
  episodeDirector: 'storyboardDone',
  visualAssetDirector: 'keyframesDone',
  audioDirector: 'audioDone',
  episodeProducer: 'packageDone',
}

// ── Simulated per-stage progress ticker ──
// GPT calls are atomic (no sub-progress), so while a non-render stage is "running" we
// animate its bar climbing toward ~92% for a live feel; done → 100, render → real %.
let stageTimer: ReturnType<typeof setInterval> | null = null
const startStageTicker = (): void => {
  stopStageTicker()
  stageTimer = setInterval(() => {
    if (!state.producing) return stopStageTicker()
    const runningGpt = STUDIO_STAGES.find(
      (st) =>
        st.key !== 'episodeRenderer' &&
        st.key !== 'transcribe' && // transcribe shows real per-task progress, don't animate it
        state.progress.find((c) => c.key === st.serverKeys[0])?.status === 'running',
    )
    if (runningGpt) {
      const cur = state.stagePct[runningGpt.key] || 4
      if (cur < 92) setState('stagePct', runningGpt.key, Math.min(92, cur + 6))
    }
  }, 500)
}
const stopStageTicker = (): void => {
  if (stageTimer) {
    clearInterval(stageTimer)
    stageTimer = null
  }
}

const applyProduceProgress = (job: ProductionJob): void => {
  const calls = job.progress?.calls || []
  setState('progress', reconcile(calls, { key: 'key' }))
  if (typeof job.percent === 'number') setState({ percent: job.percent })
  if (job.videos) setState('videos', reconcile(job.videos as ShotVideo[], { key: 'shot_id' }))
  if (job.videoProgress) {
    setState({
      videoDone: job.videoProgress.done ?? 0,
      videoTotal: job.videoProgress.total ?? 0,
      videoPercent: job.videoProgress.percent ?? 0,
    })
  }
  // Stamp when shot rendering began, for the time estimate.
  if (!state.renderStartMs && calls.find((c) => c.key === 'videoGeneration')?.status === 'running') {
    setState({ renderStartMs: nowMs() })
  }

  // Capture the shot list for the live preview once Call 3 (episode plan) lands.
  if (state.episodeShots.length === 0) {
    const shots = (job.callsV1?.episodeDirector?.episodePlan?.shots || []) as Array<
      Record<string, unknown>
    >
    if (shots.length > 0) {
      setState(
        'episodeShots',
        shots.map((sh, i) => ({
          n: typeof sh.shot === 'number' ? (sh.shot as number) : i + 1,
          title: String(sh.title || `Shot ${i + 1}`),
          location: String(sh.location || ''),
          summary: String(sh.summary || sh.action || ''),
        })),
      )
    }
  }

  // Update per-stage display percent from server status.
  for (const st of STUDIO_STAGES) {
    const status = calls.find((c) => c.key === st.serverKeys[0])?.status
    if (st.key === 'episodeRenderer') {
      const vg = calls.find((c) => c.key === 'videoGeneration')
      if (vg?.status === 'done' || job.episodeVideo) setState('stagePct', st.key, 100)
      else if (vg?.status === 'running' && job.videoProgress?.percent != null)
        setState('stagePct', st.key, job.videoProgress.percent)
    } else if (st.key === 'transcribe') {
      // Combined progress of the 4 subtitle tasks while running.
      if (status === 'done') setState('stagePct', st.key, 100)
      else if (status === 'running') setState('stagePct', st.key, job.transcribeProgress?.percent ?? 0)
      else if (status === 'pending') setState('stagePct', st.key, 0)
    } else if (status === 'done') {
      setState('stagePct', st.key, 100)
    } else if (status === 'pending') {
      setState('stagePct', st.key, 0)
    }
  }

  // Append newly-completed stage messages + render progress to the activity log.
  const log = [...state.activityLog]
  const hasKey = (k: string) => log.some((l) => l.key === k)
  for (const c of calls) {
    if (c.status === 'done' && STAGE_DONE_LOG[c.key] && !hasKey(STAGE_DONE_LOG[c.key])) {
      log.push(logNow(STAGE_DONE_LOG[c.key]))
    }
  }
  const vg = calls.find((c) => c.key === 'videoGeneration')
  if (vg?.status === 'running' && job.videoProgress) {
    const total = job.videoProgress.total ?? 0
    // Show the shot currently being rendered (1-based), not the completed count.
    const cur = Math.min((job.videoProgress.done ?? 0) + 1, total)
    const rk = `rendering:${cur}/${total}`
    if (log[log.length - 1]?.key !== rk) log.push(logNow(rk))
  }
  // Shots done, final composition/encoding running (incl. the Bunny-encode wait in s1).
  const comp = calls.find((c) => c.key === 'composition')
  if (vg?.status === 'done' && comp?.status === 'running' && !job.episodeVideo && !hasKey('encoding')) {
    log.push(logNow('encoding'))
  }
  // Transcribe step: surface each of the 4 subtitle sub-tasks as it starts.
  const tr = calls.find((c) => c.key === 'transcribe')
  if (tr?.status === 'running' && job.transcribeProgress?.task) {
    const tk = `transcribe:${job.transcribeProgress.task}`
    if (!hasKey(tk)) log.push(logNow(tk))
  }
  if (tr?.status === 'done' && !hasKey('subsReady')) log.push(logNow('subsReady'))
  if (log.length !== state.activityLog.length) setState({ activityLog: log })

  // Auto-advance the preview to the most recently COMPLETED shot — its thumbnail is
  // ready (covers are only captured after a shot finishes rendering). The in-progress
  // shot has no thumb yet, so jumping to it would show only a placeholder. Skip while
  // the user is browsing manually (previewPinned).
  if (!state.previewPinned && state.episodeShots.length > 0) {
    let lastReady = -1
    state.episodeShots.forEach((sh, i) => {
      const v = state.videos.find((x) => x.shot_number === sh.n)
      if (v && v.coverUrl) lastReady = i // coverUrl = thumbnail is ready to display
    })
    if (lastReady >= 0) setState('previewIndex', lastReady)
  }
}
