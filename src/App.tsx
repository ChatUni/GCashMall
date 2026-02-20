import { Router, HashRouter, Route } from '@solidjs/router'
import { Show } from 'solid-js'
import { isCordova } from './utils/cordova'
import { deviceStore } from './stores/deviceStore'

// Desktop Pages
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductCategoryList from './pages/ProductCategoryList'
import Genre from './pages/Genre'
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

import './App.css'

// Responsive component that renders different versions based on device type
const ResponsiveRoute = (props: { desktop: () => any; phone: () => any }) => (
  <Show when={deviceStore.deviceType === 'phone'} fallback={<>{props.desktop()}</>}>
    {props.phone()}
  </Show>
)

const routes = (
  <>
    {/* Home */}
    <Route path="/" component={() => <ResponsiveRoute desktop={() => <Home />} phone={() => <PhoneHome />} />} />

    {/* Genre */}
    <Route path="/genre" component={() => <ResponsiveRoute desktop={() => <Genre />} phone={() => <PhoneGenre />} />} />

    {/* Search (Phone only, desktop uses TopBar search) */}
    <Route path="/search" component={() => <ResponsiveRoute desktop={() => <Genre />} phone={() => <PhoneSearch />} />} />

    {/* Player */}
    <Route path="/player/:id" component={() => <ResponsiveRoute desktop={() => <Player />} phone={() => <PhonePlayer />} />} />

    {/* Account */}
    <Route path="/account" component={() => <ResponsiveRoute desktop={() => <Account />} phone={() => <PhoneAccount />} />} />

    {/* About */}
    <Route path="/about" component={() => <ResponsiveRoute desktop={() => <About />} phone={() => <PhoneAbout />} />} />

    {/* Contact */}
    <Route path="/contact" component={() => <ResponsiveRoute desktop={() => <Contact />} phone={() => <PhoneContact />} />} />

    {/* Desktop-only routes (admin/management features) */}
    <Route path="/products" component={ProductList} />
    <Route path="/categories" component={ProductCategoryList} />
    <Route path="/series/new" component={SeriesEdit} />
    <Route path="/series/:id/edit" component={SeriesEdit} />
    <Route path="/reset-password" component={ResetPassword} />
  </>
)

// Use HashRouter for Cordova (file:// protocol doesn't support BrowserRouter)
// Use Router for web (needed for OAuth redirects with query params)
const App = () => (
  <div class="App">
    <Show
      when={isCordova()}
      fallback={
        <Router root={(props) => props.children}>
          {routes}
        </Router>
      }
    >
      <HashRouter root={(props) => props.children}>
        {routes}
      </HashRouter>
    </Show>
  </div>
)

export default App
