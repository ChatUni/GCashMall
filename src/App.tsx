import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/about" element={<div>About Page - Coming Soon</div>} />
          <Route path="/contact" element={<div>Contact Page - Coming Soon</div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
