import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import SeriesList from './pages/SeriesList'
import Account from './pages/Account'
import { LanguageProvider } from './context/LanguageContext'
import './App.css'

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/series" element={<SeriesList />} />
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
