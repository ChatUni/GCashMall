// Quick Create wizard store - UI-only step-by-step wizard for generating a video series.
// No backend yet: all selections live in this store (Rule #7: shared state outside the tree).

import { createStore } from 'solid-js/store'
import { fetchTemplates, type StarterTemplate } from '../services/dataService'

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
  reset: () => setState(getInitialState()),
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
