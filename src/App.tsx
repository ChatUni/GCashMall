import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductCategoryList from './pages/ProductCategoryList'
import Genre from './pages/Genre'
import SeriesList from './pages/SeriesList'
import Series from './pages/Series'
import SeriesEdit from './pages/SeriesEdit'
import Player from './pages/Player'
import Account from './pages/Account'
import ResetPassword from './pages/ResetPassword'
import Contact from './pages/Contact'
import About from './pages/About'
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
            <Route path="/categories" element={<ProductCategoryList />} />
            <Route path="/genre" element={<Genre />} />
            <Route path="/series" element={<SeriesList />} />
            <Route path="/series/new" element={<SeriesEdit />} />
            <Route path="/series/:id" element={<Series />} />
            <Route path="/series/:id/edit" element={<SeriesEdit />} />
            <Route path="/player/:id" element={<Player />} />
            <Route path="/account" element={<Account />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  )
}

export default App
