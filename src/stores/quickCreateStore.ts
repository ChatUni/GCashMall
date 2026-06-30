// Quick Create wizard store - UI-only step-by-step wizard for generating a video series.
// No backend yet: all selections live in this store (Rule #7: shared state outside the tree).

import { createStore } from 'solid-js/store'

// 5 input steps are built; the stepper also shows the 6th (result) step for fidelity.
export const QUICK_CREATE_STEPS = 5

// ── Mockup-generated images, loaded by category and keyed by option id ──

const loadImages = (glob: Record<string, string>, prefix: string) => (id: string) =>
  glob[`../assets/quick-create/${prefix}-${id}.webp`]

const ideaImage = loadImages(
  import.meta.glob('../assets/quick-create/idea-*.webp', { eager: true, import: 'default' }) as Record<string, string>,
  'idea',
)
const genreImage = loadImages(
  import.meta.glob('../assets/quick-create/genre-*.webp', { eager: true, import: 'default' }) as Record<string, string>,
  'genre',
)
const styleImage = loadImages(
  import.meta.glob('../assets/quick-create/style-*.webp', { eager: true, import: 'default' }) as Record<string, string>,
  'style',
)
const lengthImage = loadImages(
  import.meta.glob('../assets/quick-create/length-*.webp', { eager: true, import: 'default' }) as Record<string, string>,
  'length',
)
const epImage = loadImages(
  import.meta.glob('../assets/quick-create/ep-*.webp', { eager: true, import: 'default' }) as Record<string, string>,
  'ep',
)

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
  { id: 'myDrafts', icon: '📝' },
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
  genreId: string | null
  artStyleId: string | null
  episodeLength: number | null
}

const getInitialState = (): QuickCreateState => ({
  step: 1,
  idea: '',
  genreId: null,
  artStyleId: null,
  episodeLength: 30,
})

const [state, setState] = createStore<QuickCreateState>(getInitialState())

export const quickCreateStore = state

export const quickCreateStoreActions = {
  next: () => setState('step', (s) => Math.min(s + 1, QUICK_CREATE_STEPS)),
  back: () => setState('step', (s) => Math.max(s - 1, 1)),
  goToStep: (step: number) => setState({ step }),
  setIdea: (idea: string) => setState({ idea }),
  selectGenre: (genreId: string) => setState({ genreId }),
  selectArtStyle: (artStyleId: string) => setState({ artStyleId }),
  selectEpisodeLength: (episodeLength: number) => setState({ episodeLength }),
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
