// Quick Create wizard store - UI-only step-by-step wizard for generating a video series.
// No backend yet: all selections live in this store (Rule #7: shared state outside the tree).

import { createStore } from 'solid-js/store'
import reviewImage from '../assets/quick-create/review.webp'

export const QUICK_CREATE_STEPS = 5

// Series preview image shown on the review step (extracted from the mockup)
export { reviewImage }

// Thumbnails extracted from the Quick Create mockup, keyed by option id
const ideaImages = import.meta.glob('../assets/quick-create/idea-*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>
const styleImages = import.meta.glob('../assets/quick-create/style-*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const ideaImage = (id: string) => ideaImages[`../assets/quick-create/idea-${id}.webp`]
const styleImage = (id: string) => styleImages[`../assets/quick-create/style-${id}.webp`]

// ── Static option data (UI only) ──

export interface PopularIdea {
  id: string
  title: string // i18n key suffix
  image: string
}

export interface GenreOption {
  id: string
  icon: string // emoji icon
}

export interface ArtStyleOption {
  id: string
  image: string
}

export interface EpisodeLengthOption {
  seconds: number
}

export const POPULAR_IDEAS: PopularIdea[] = [
  { id: 'isekai', title: 'isekai', image: ideaImage('isekai') },
  { id: 'highSchoolRomance', title: 'highSchoolRomance', image: ideaImage('highSchoolRomance') },
  { id: 'fantasyHero', title: 'fantasyHero', image: ideaImage('fantasyHero') },
  { id: 'dragonAcademy', title: 'dragonAcademy', image: ideaImage('dragonAcademy') },
  { id: 'sciFiMecha', title: 'sciFiMecha', image: ideaImage('sciFiMecha') },
  { id: 'cuteAnimal', title: 'cuteAnimal', image: ideaImage('cuteAnimal') },
]

export const GENRES: GenreOption[] = [
  { id: 'action', icon: '🚀' },
  { id: 'romance', icon: '❤️' },
  { id: 'fantasy', icon: '🔮' },
  { id: 'horror', icon: '👻' },
  { id: 'comedy', icon: '😂' },
  { id: 'sciFi', icon: '🛸' },
]

export const ART_STYLES: ArtStyleOption[] = [
  { id: 'modernAnime', image: styleImage('modernAnime') },
  { id: 'ghibli', image: styleImage('ghibli') },
  { id: 'shojo', image: styleImage('shojo') },
  { id: 'cyberpunk', image: styleImage('cyberpunk') },
  { id: 'watercolor', image: styleImage('watercolor') },
  { id: 'chibi', image: styleImage('chibi') },
]

export const EPISODE_LENGTHS: EpisodeLengthOption[] = [{ seconds: 30 }, { seconds: 60 }]

// Static series plan shown on the review step (UI only)
export const SERIES_PLAN_EPISODES = 8

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
