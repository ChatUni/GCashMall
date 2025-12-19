import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import Account from './pages/Account'
import Genre from './pages/Genre'
import Player from './pages/Player'
import { LanguageProvider } from './context/LanguageContext'
import './App.css'

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/genre" element={<Genre />} />
            <Route path="/player/:seriesId" element={<Player />} />
            <Route path="/player/:seriesId/:episodeId" element={<Player />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/account" element={<Account />} />
            <Route path="/about" element={<div>About Page - Coming Soon</div>} />
            <Route path="/contact" element={<div>Contact Page - Coming Soon</div>} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  )
}

export default App
