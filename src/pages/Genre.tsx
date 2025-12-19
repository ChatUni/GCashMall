import React, { useState, useMemo, useEffect } from 'react'
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

const Genre: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useLanguage()
  const [activeGenre, setActiveGenre] = useState('All')

  // Read category from URL on mount and when URL changes
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      // Check if the category exists in our genres list
      const decodedCategory = decodeURIComponent(categoryParam)
      if (genres.includes(decodedCategory)) {
        setActiveGenre(decodedCategory)
      }
    }
  }, [searchParams])

  // Genre list from spec + common tags
  const genres = [
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

  // Mock series data with genres
  const allSeries: Series[] = [
    { id: '1', title: 'Love in the City', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster2.jpg', tag: 'Romance', genres: ['Romance', 'Teenagers'] },
    { id: '2', title: 'Mystery Manor', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster3.jpg', tag: 'Thriller', genres: ['Mystery & Suspense', 'Criminal Investigation'] },
    { id: '3', title: 'Comedy Central', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster4.jpg', tag: 'Comedy', genres: ['Humor'] },
    { id: '4', title: 'Action Heroes', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster5.jpg', tag: 'Action', genres: ['Security Guard', 'Hidden Identity'] },
    { id: '5', title: 'Fantasy World', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster6.jpg', tag: 'Fantasy', genres: ['Time Travel & Rebirth', 'Princess'] },
    { id: '6', title: 'Historical Drama', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster7.jpg', tag: 'Drama', genres: ['Revenge', 'Princess'] },
    { id: '7', title: 'Sci-Fi Adventures', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster8.jpg', tag: 'Sci-Fi', genres: ['Time Travel & Rebirth'] },
    { id: '8', title: 'Horror Nights', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster9.jpg', tag: 'Horror', genres: ['Mystery & Suspense'] },
    { id: '9', title: 'Fresh Start', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster10.jpg', tag: 'Drama', genres: ['Romance', 'Teenagers'] },
    { id: '10', title: 'New Horizons', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster11.jpg', tag: 'Adventure', genres: ['Hidden Identity', 'Revenge'] },
    { id: '11', title: 'Rising Stars', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster12.jpg', tag: 'Romance', genres: ['Celebrity', 'Romance'] },
    { id: '12', title: 'Breaking Dawn', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster13.jpg', tag: 'Fantasy', genres: ['Time Travel & Rebirth', 'Miracle Healer'] },
    { id: '13', title: 'First Light', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster14.jpg', tag: 'Thriller', genres: ['Criminal Investigation', 'Mystery & Suspense'] },
    { id: '14', title: 'New Chapter', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster15.jpg', tag: 'Comedy', genres: ['Humor', 'Teenagers'] },
    { id: '15', title: 'Debut Season', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster16.jpg', tag: 'Action', genres: ['Security Guard'] },
    { id: '16', title: 'Premier Night', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster17.jpg', tag: 'Drama', genres: ['Celebrity', 'Substitute'] },
  ]

  // Filter series based on active genre (check both tag and genres array)
  const filteredSeries = useMemo(() => {
    if (activeGenre === 'All') {
      return allSeries
    }
    return allSeries.filter(series =>
      series.tag === activeGenre || series.genres.includes(activeGenre)
    )
  }, [activeGenre])

  const handleSeriesClick = (seriesId: string) => {
    navigate(`/player/${seriesId}`)
  }

  const handleGenreClick = (genre: string) => {
    setActiveGenre(genre)
    // Update URL with selected category
    if (genre === 'All') {
      setSearchParams({})
    } else {
      setSearchParams({ category: genre })
    }
  }

  return (
    <div className="genre-page">
      <TopBar />
      <main className="genre-content">
        {/* Genre Filter Sidebar */}
        <aside className="genre-sidebar">
          <nav className="genre-list">
            {genres.map((genre) => (
              <button
                key={genre}
                className={`genre-item ${activeGenre === genre ? 'active' : ''}`}
                onClick={() => handleGenreClick(genre)}
              >
                {genre === 'All' ? t.genre.all : genre}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Grid Section */}
        <section className="genre-grid-section">
          {/* Section Header */}
          <div className="genre-header">
            <h2 className="genre-title">
              {activeGenre === 'All' ? t.genre.all : activeGenre}
            </h2>
            <span className="genre-count">
              {filteredSeries.length} {t.genre.results}
            </span>
          </div>

          {/* Content Grid */}
          <div className="genre-grid">
            {filteredSeries.map((series) => (
              <div
                key={series.id}
                className="genre-card"
                onClick={() => handleSeriesClick(series.id)}
              >
                <div className="genre-card-poster">
                  <img
                    src={series.poster}
                    alt={series.title}
                    className="genre-card-image"
                  />
                </div>
                <h3 className="genre-card-title">{series.title}</h3>
                <span className="genre-card-tag">{series.tag}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <BottomBar />
    </div>
  )
}

export default Genre
