import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useDeviceType } from './hooks/useDeviceType'

// Desktop Pages
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

// Phone Pages
import PhoneHome from './pages/phone/PhoneHome'
import PhoneGenre from './pages/phone/PhoneGenre'
import PhoneSearch from './pages/phone/PhoneSearch'
import PhonePlayer from './pages/phone/PhonePlayer'
import PhoneAccount from './pages/phone/PhoneAccount'
import PhoneAbout from './pages/phone/PhoneAbout'
import PhoneContact from './pages/phone/PhoneContact'

import { LanguageProvider } from './context/LanguageContext'
import './App.css'

// Responsive component that renders different versions based on device type
interface ResponsiveRouteProps {
  desktop: React.ReactNode
  phone: React.ReactNode
}

const ResponsiveRoute: React.FC<ResponsiveRouteProps> = ({ desktop, phone }) => {
  const deviceType = useDeviceType()
  
  if (deviceType === 'phone') {
    return <>{phone}</>
  }
  
  // Tablet and desktop use the desktop version (which already has responsive CSS)
  return <>{desktop}</>
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Home */}
            <Route
              path="/"
              element={
                <ResponsiveRoute
                  desktop={<Home />}
                  phone={<PhoneHome />}
                />
              }
            />

            {/* Genre */}
            <Route
              path="/genre"
              element={
                <ResponsiveRoute
                  desktop={<Genre />}
                  phone={<PhoneGenre />}
                />
              }
            />

            {/* Search (Phone only, desktop uses TopBar search) */}
            <Route
              path="/search"
              element={
                <ResponsiveRoute
                  desktop={<Genre />}
                  phone={<PhoneSearch />}
                />
              }
            />

            {/* Player */}
            <Route
              path="/player/:id"
              element={
                <ResponsiveRoute
                  desktop={<Player />}
                  phone={<PhonePlayer />}
                />
              }
            />

            {/* Account */}
            <Route
              path="/account"
              element={
                <ResponsiveRoute
                  desktop={<Account />}
                  phone={<PhoneAccount />}
                />
              }
            />

            {/* About */}
            <Route
              path="/about"
              element={
                <ResponsiveRoute
                  desktop={<About />}
                  phone={<PhoneAbout />}
                />
              }
            />

            {/* Contact */}
            <Route
              path="/contact"
              element={
                <ResponsiveRoute
                  desktop={<Contact />}
                  phone={<PhoneContact />}
                />
              }
            />

            {/* Desktop-only routes (admin/management features) */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/categories" element={<ProductCategoryList />} />
            <Route path="/series" element={<SeriesList />} />
            <Route path="/series/new" element={<SeriesEdit />} />
            <Route path="/series/:id" element={<Series />} />
            <Route path="/series/:id/edit" element={<SeriesEdit />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  )
}

export default App
