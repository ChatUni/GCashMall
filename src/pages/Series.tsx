import React from 'react'
import TopBar from '../components/TopBar'
import BottomBar from '../components/BottomBar'
import './Series.css'

const Series: React.FC = () => {
  const videoEmbedUrl =
    'https://player.mediadelivery.net/embed/569096/32784eaf-9a31-437f-80bd-e59f205bc6a4?autoplay=true'

  return (
    <div className="series-page">
      <TopBar />
      <main className="series-player-container">
        <iframe
          className="series-player"
          src={videoEmbedUrl}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Series Player"
        />
      </main>
      <BottomBar />
    </div>
  )
}

export default Series