import { Router, HashRouter, Route } from '@solidjs/router'
import { Show } from 'solid-js'
import { isCordova, shouldShowComingSoon } from './utils/cordova'
import { deviceStore } from './stores/deviceStore'
import { setAuthErrorHandler } from './utils/api'
import { loginModalStoreActions } from './stores'
import { topBarStoreActions } from './stores/topBarStore'
import { isQuickCreateV1 } from './services/quickCreateNav'
import ComingSoon from './pages/ComingSoon'

// Desktop Pages
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductCategoryList from './pages/ProductCategoryList'
import Genre from './pages/Genre'
import SeriesEdit from './pages/SeriesEdit'
import Player from './pages/Player'
import QuickCreate from './pages/QuickCreate'
import QuickCreateV1 from './pages/QuickCreateV1'
import WatchEpisode from './pages/WatchEpisode'
import CreatorProgram from './pages/CreatorProgram'
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

    {/* Quick Create wizard — VITE_QUICK_CREATE_VERSION selects v0 (default) or v1 */}
    <Route
      path="/quick-create"
      component={isQuickCreateV1 ? QuickCreateV1 : QuickCreate}
    />
    <Route path="/creator-program" component={CreatorProgram} />

    {/* Public share/watch page for a Quick Create episode (full watch, no trial limit) */}
    <Route path="/watch/:jobId" component={WatchEpisode} />

    {/* Desktop-only routes (admin/management features) */}
    <Route path="/products" component={ProductList} />
    <Route path="/categories" component={ProductCategoryList} />
    <Route path="/series/new" component={SeriesEdit} />
    <Route path="/series/:id/edit" component={SeriesEdit} />
    <Route path="/reset-password" component={ResetPassword} />
  </>
)

// When an authenticated API call is rejected for a missing/expired login token, the
// API client clears the stale token and calls this handler. Open the login dialog so the
// user can re-authenticate. Both modal render sites are covered (TopBar-based pages and
// the Player/phone pages that render the global loginModalStore modal).
setAuthErrorHandler(() => {
  topBarStoreActions.setShowLoginModal(true)
  loginModalStoreActions.open()
})

// Use HashRouter for Cordova (file:// protocol doesn't support BrowserRouter)
// Use Router for web (needed for OAuth redirects with query params)
const App = () => (
  <div class="App">
    <Show when={!shouldShowComingSoon()} fallback={<ComingSoon />}>
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
    </Show>
  </div>
)

export default App
