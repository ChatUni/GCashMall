import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import { useLanguage } from '../context/LanguageContext'
import './Genre.css'

interface Series {
  id: string
  title: string
  poster: string
  tag: string
  genres: string[]
}

const GENRES = [
  'All',
  'Romance',
  'Drama',
  'Thriller',
  'Comedy',
  'Action',
  'Fantasy',
  'Sci-Fi',
  'Horror',
  'Adventure',
  'Teenagers',
  'Humor',
  'Time Travel & Rebirth',
  'Mystery & Suspense',
  'Revenge',
  'Miracle Healer',
  'Substitute',
  'Celebrity',
  'Hidden Identity',
  'Princess',
  'Security Guard',
  'Criminal Investigation',
]

// Mock data for series
const mockSeries: Series[] = [
  {
    id: '1',
    title: 'Love in the City',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster2_ywfbxe.jpg',
    tag: 'Romance',
    genres: ['Romance', 'Teenagers'],
  },
  {
    id: '2',
    title: 'Dark Secrets',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster3_abc123.jpg',
    tag: 'Thriller',
    genres: ['Thriller', 'Mystery & Suspense'],
  },
  {
    id: '3',
    title: 'The Last Kingdom',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster4_def456.jpg',
    tag: 'Action',
    genres: ['Action', 'Adventure'],
  },
  {
    id: '4',
    title: 'Laugh Out Loud',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster5_ghi789.jpg',
    tag: 'Comedy',
    genres: ['Comedy', 'Humor'],
  },
  {
    id: '5',
    title: 'Eternal Love',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster6_jkl012.jpg',
    tag: 'Romance',
    genres: ['Romance', 'Fantasy'],
  },
  {
    id: '6',
    title: 'Time Traveler',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster7_mno345.jpg',
    tag: 'Sci-Fi',
    genres: ['Sci-Fi', 'Time Travel & Rebirth'],
  },
  {
    id: '7',
    title: 'The Haunting',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster8_pqr678.jpg',
    tag: 'Horror',
    genres: ['Horror', 'Mystery & Suspense'],
  },
  {
    id: '8',
    title: 'Royal Princess',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster9_stu901.jpg',
    tag: 'Drama',
    genres: ['Drama', 'Princess'],
  },
  {
    id: '9',
    title: 'Revenge of the Fallen',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster10_vwx234.jpg',
    tag: 'Action',
    genres: ['Action', 'Revenge'],
  },
  {
    id: '10',
    title: 'The Miracle Doctor',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster11_yza567.jpg',
    tag: 'Drama',
    genres: ['Drama', 'Miracle Healer'],
  },
  {
    id: '11',
    title: 'Hidden Identity',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster12_bcd890.jpg',
    tag: 'Thriller',
    genres: ['Thriller', 'Hidden Identity'],
  },
  {
    id: '12',
    title: 'Celebrity Life',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster13_efg123.jpg',
    tag: 'Drama',
    genres: ['Drama', 'Celebrity'],
  },
  {
    id: '13',
    title: 'The Substitute',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster14_hij456.jpg',
    tag: 'Romance',
    genres: ['Romance', 'Substitute'],
  },
  {
    id: '14',
    title: 'Security Guard Hero',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster15_klm789.jpg',
    tag: 'Action',
    genres: ['Action', 'Security Guard'],
  },
  {
    id: '15',
    title: 'Crime Investigation',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster16_nop012.jpg',
    tag: 'Thriller',
    genres: ['Thriller', 'Criminal Investigation'],
  },
  {
    id: '16',
    title: 'Teen Dreams',
    poster: 'https://res.cloudinary.com/ddicvtfvd/image/upload/v1735003800/poster17_qrs345.jpg',
    tag: 'Comedy',
    genres: ['Comedy', 'Teenagers'],
  },
]

function Genre() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useLanguage()
  const [activeGenre, setActiveGenre] = useState('All')

  // Read category from URL on mount
  useEffect(() => {
    const category = searchParams.get('category')
    if (category && GENRES.includes(category)) {
      setActiveGenre(category)
    }
  }, [searchParams])

  // Handle genre selection
  const handleGenreClick = (genre: string) => {
    setActiveGenre(genre)
    if (genre === 'All') {
      setSearchParams({})
    } else {
      setSearchParams({ category: genre })
    }
  }

  // Filter series based on active genre
  const filteredSeries = useMemo(() => {
    if (activeGenre === 'All') {
      return mockSeries
    }
    return mockSeries.filter(
      (series) => series.tag === activeGenre || series.genres.includes(activeGenre)
    )
  }, [activeGenre])

  // Handle card click - navigate to player
  const handleCardClick = (seriesId: string) => {
    navigate(`/player/${seriesId}`)
  }

  return (
    <div className="genre-page">
      <TopBar />
      <div className="genre-content">
        {/* Genre Sidebar */}
        <aside className="genre-sidebar">
          <div className="genre-list">
            {GENRES.map((genre) => (
              <button
                key={genre}
                className={`genre-item ${activeGenre === genre ? 'active' : ''}`}
                onClick={() => handleGenreClick(genre)}
              >
                {genre === 'All' ? t.genre.all : genre}
              </button>
            ))}
          </div>
        </aside>

        {/* Content Grid Section */}
        <main className="genre-grid-section">
          <div className="genre-header">
            <h1 className="genre-title">
              {activeGenre === 'All' ? t.genre.all : activeGenre}
            </h1>
            <span className="genre-count">
              {filteredSeries.length} {t.genre.results}
            </span>
          </div>

          <div className="genre-grid">
            {filteredSeries.map((series) => (
              <div
                key={series.id}
                className="genre-card"
                onClick={() => handleCardClick(series.id)}
              >
                <div className="genre-card-poster">
                  <img src={series.poster} alt={series.title} />
                </div>
                <h3 className="genre-card-title">{series.title}</h3>
                <span className="genre-card-tag">{series.tag}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
      <BottomBar />
    </div>
  )
}

export default Genre
