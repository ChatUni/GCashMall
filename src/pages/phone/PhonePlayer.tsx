import { createSignal, createEffect, onCleanup, Show, For, untrack } from 'solid-js'
import { useParams, useSearchParams, useNavigate } from '@solidjs/router'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCarousel from '../../components/phone/PhoneSeriesCarousel'
import CommentSection from '../../components/CommentSection'
import LoginModal from '../../components/LoginModal'
import { PurchasePopup, ResultModal, FavoriteModal, Toast } from '../../components/PlayerModals'
import { RatingSection, RatingModal } from '../../components/StarRating'
import { t } from '../../stores/languageStore'
import {
  playerStore,
  loginModalStore,
  playerStoreActions,
  loginModalStoreActions,
  recommendationsStore,
  newReleasesStore,
} from '../../stores'
import { accountStore, accountStoreActions } from '../../stores/accountStore'
import {
  playerPageStore,
  playerPageStoreActions,
  checkSeriesFavorited,
  isCurrentEpisodePurchased,
  getFilteredEpisodes,
  getEpisodeRangeOptions,
  checkEpisodePurchased,
  initializePlayerJsWithTrialLimit,
  updatePlayerJsPurchaseStatus,
  TIME_LIMIT,
} from '../../stores/playerStore'
import { isIOS } from '../../utils/cordova'
import {
  getIframeUrl,
  formatLikeCount,
  getShareUrl,
  getShareText,
  shareNative,
  shareTwitter,
  sharePinterest,
  shareWhatsApp,
  shareReddit,
} from '../../utils/playerHelpers'
import type { User } from '../../types'
import './PhonePlayer.css'

const PhonePlayer = () => {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  let iframeRef: HTMLIFrameElement | undefined
  let descriptionRef: HTMLParagraphElement | undefined

  const [iframeLoaded, setIframeLoaded] = createSignal(false)
  // iOS only: true once the free preview has been spent for the current episode.
  const [previewConsumed, setPreviewConsumed] = createSignal(false)

  // Initialize data
  createEffect(() => {
    const id = params.id
    if (id) {
      playerPageStoreActions.initialize(id, true) // true = fetch recommendations
    }
  })

  // Episode selection logic
  createEffect(() => {
    const episodeNumberFromUrl = (searchParams.episode as string | undefined) || null
    if (playerStore.episodes.length > 0 && !playerStore.loading && params.id) {
      playerPageStoreActions.selectEpisodeFromUrlOrWatchList(episodeNumberFromUrl)
    }
  })

  // Derived state from store
  const isFavorited = () => checkSeriesFavorited(params.id)
  const isPurchased = () => isCurrentEpisodePurchased()
  const filteredEpisodes = () => getFilteredEpisodes()
  const ranges = () => getEpisodeRangeOptions()

  // Share helpers
  const shareUrl = () => getShareUrl()
  const shareText = () =>
    getShareText(
      playerStore.series?.name || '',
      playerStore.currentEpisode?.episodeNumber,
    )

  // Check description truncation
  createEffect(() => {
    // Track dependencies
    void playerStore.currentEpisode
    void playerStore.series

    playerPageStoreActions.setDescriptionExpanded(false)
    const timer = setTimeout(() => {
      if (descriptionRef) {
        const isTruncated = descriptionRef.scrollHeight > descriptionRef.clientHeight
        playerPageStoreActions.setShowExpandButton(isTruncated)
      }
    }, 100)

    onCleanup(() => clearTimeout(timer))
  })

  // Player.js initialization - reset iframe loaded state when video changes
  // Note: Do NOT track accountStore.user here. When user logs in, iframeLoaded must
  // stay true so that updatePlayerJsPurchaseStatus can run and update the Player.js
  // purchase ref. If we reset iframeLoaded on user change, the iframe doesn't actually
  // reload (same video), onLoad never fires, and the purchase status never updates.
  createEffect(() => {
    const videoId = playerStore.currentEpisode?.videoId
    void videoId
    setIframeLoaded(false)
    setPreviewConsumed(false)
  })

  const handleIframeLoad = () => {
    setIframeLoaded(true)
  }

  // Initialize Player.js with trial limit enforcement
  // Note: Use untrack for isPurchased() so this effect only re-runs on video/iframe changes.
  // Purchase status updates are handled separately by updatePlayerJsPurchaseStatus below.
  createEffect(() => {
    const currentVideoId = playerStore.currentEpisode?.videoId
    const loaded = iframeLoaded()

    if (!currentVideoId || !loaded) return

    const purchased = untrack(() => isPurchased())
    const iframeRefObj = { current: iframeRef || null }
    const cleanup = initializePlayerJsWithTrialLimit(
      iframeRefObj,
      currentVideoId,
      purchased,
      playerPageStoreActions.handleTimeLimitReached,
    )

    onCleanup(() => {
      if (cleanup) cleanup()
    })
  })

  createEffect(() => {
    const currentVideoId = playerStore.currentEpisode?.videoId
    const purchased = isPurchased()
    const loaded = iframeLoaded()

    if (!loaded) return
    updatePlayerJsPurchaseStatus(currentVideoId, purchased)
  })

  // iOS fallback for the preview time limit.
  // Under the app:// WKWebView origin the Player.js <-> Bunny iframe postMessage bridge
  // is unreliable, so its 'timeupdate' enforcement never fires. Enforce the limit with a
  // wall-clock timer and stop playback by reloading the iframe with autoplay disabled —
  // the one form of control that doesn't depend on the bridge.
  createEffect(() => {
    if (!isIOS()) return
    const episode = playerStore.currentEpisode
    const purchased = isPurchased()
    if (!episode?.videoId || purchased) return

    const videoId = episode.videoId
    const timer = setTimeout(() => {
      if (untrack(isPurchased)) return
      if (iframeRef) iframeRef.src = getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, videoId, false)
      setPreviewConsumed(true)
      playerPageStoreActions.handleTimeLimitReached()
    }, TIME_LIMIT * 1000)

    onCleanup(() => clearTimeout(timer))
  })

  // iOS: resume playback after purchase by reloading the iframe that the fallback stopped.
  createEffect(() => {
    if (!isIOS()) return
    const episode = playerStore.currentEpisode
    const purchased = isPurchased()
    if (purchased && episode?.videoId && iframeRef && iframeRef.src.includes('autoplay=false')) {
      iframeRef.src = getIframeUrl(import.meta.env.VITE_BUNNY_LIBRARY_ID, episode.videoId, true)
    }
  })

  const handleLoginSuccess = (user: User) => {
    accountStoreActions.setUser(user)
    accountStoreActions.setLoading(false)
    accountStoreActions.initializeUserData(user)
    loginModalStoreActions.close()
  }

  return (
    <Show
      when={!playerStore.loading}
      fallback={
        <PhoneLayout showHeader={true} showBackButton={true} title="">
          <div class="phone-player-loading">Loading...</div>
        </PhoneLayout>
      }
    >
      <Show
        when={playerStore.series}
        fallback={
          <PhoneLayout showHeader={true} showBackButton={true} title="">
            <div class="phone-player-error">Series not found</div>
          </PhoneLayout>
        }
      >
        <PhoneLayout showHeader={false}>
          <div class="phone-player">
            {/* Video Player */}
            <div class="phone-video-container">
              <button class="phone-player-back" onClick={() => navigate(-1)}>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <Show
                when={playerStore.currentEpisode?.videoId}
                fallback={
                  <div class="phone-video-placeholder">No video available</div>
                }
              >
                <iframe
                  ref={iframeRef}
                  src={getIframeUrl(
                    import.meta.env.VITE_BUNNY_LIBRARY_ID,
                    playerStore.currentEpisode!.videoId!,
                  )}
                  loading="lazy"
                  class="phone-video-iframe"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowfullscreen
                  onLoad={handleIframeLoad}
                />
                {/* iOS: once the preview is spent, block the iframe's native replay and
                    reopen the purchase dialog instead. */}
                <Show when={isIOS() && !isPurchased() && previewConsumed()}>
                  <div class="phone-preview-lock" onClick={playerPageStoreActions.handleUnlockClick}>
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>{t().player.unlockMessage}</span>
                  </div>
                </Show>
              </Show>
            </div>

            {/* Episode Info */}
            <div class="phone-player-info">
              {/* Series Name */}
              <h1 class="phone-player-title">{playerStore.series!.name}</h1>

              {/* Episode Number and Name */}
              <span class="phone-player-episode">
                EP {playerStore.currentEpisode?.episodeNumber.toString().padStart(2, '0')}
                {playerStore.currentEpisode?.title
                  ? ` - ${playerStore.currentEpisode.title}`
                  : ''}
              </span>

              {/* Tags */}
              <div class="phone-player-tags">
                <For each={playerStore.series!.tags || []}>
                  {(tag) => <span class="phone-player-tag">{tag}</span>}
                </For>
                <For each={playerStore.series!.genre || []}>
                  {(genre) => <span class="phone-player-tag">{genre.name}</span>}
                </For>
              </div>

              {/* Action Buttons */}
              <div class="phone-player-actions">
                  <span class="phone-player-views">
                    {t().player.views.replace('{count}', formatLikeCount(playerPageStore.viewCount))}
                  </span>
                  {/* Share Button */}
                  <button
                    class="phone-action-btn phone-action-btn-large phone-share-btn"
                    onClick={playerPageStoreActions.toggleSharePopup}
                    title={t().player.share}
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span class="phone-share-count">{formatLikeCount(playerPageStore.shareCount)}</span>
                  </button>

                  <button
                    class={`phone-action-btn phone-action-btn-large phone-like-btn ${playerPageStore.isLiked ? 'active' : ''}`}
                    onClick={playerPageStoreActions.handleLikeToggle}
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path
                        fill={playerPageStore.isLiked ? '#FFD700' : 'none'}
                        stroke={playerPageStore.isLiked ? '#FFD700' : 'currentColor'}
                        stroke-width="2"
                        d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
                      />
                    </svg>
                    <span class="phone-like-count">{formatLikeCount(playerPageStore.likeCount)}</span>
                  </button>

                  <button
                    class={`phone-action-btn phone-action-btn-large ${isFavorited() ? 'active' : ''}`}
                    onClick={playerPageStoreActions.handleFavoriteToggle}
                  >
                    <svg viewBox="0 0 24 24" width="32" height="32">
                      <path
                        fill={isFavorited() ? '#ef4444' : 'none'}
                        stroke={isFavorited() ? '#ef4444' : 'currentColor'}
                        stroke-width="2"
                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                      />
                    </svg>
                  </button>
                  <Show when={!isPurchased()}>
                    <button
                      class="phone-action-btn phone-action-btn-large locked"
                      onClick={playerPageStoreActions.handleUnlockClick}
                    >
                      <svg viewBox="0 0 24 24" width="32" height="32">
                        <path
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"
                        />
                      </svg>
                    </button>
                  </Show>
              </div>

              {/* Star Rating */}
              <RatingSection />

              {/* Description */}
              <div class="phone-player-description-container">
                <p
                  ref={descriptionRef}
                  class={`phone-player-description ${playerPageStore.isDescriptionExpanded ? 'expanded' : ''}`}
                >
                  {playerStore.currentEpisode?.description || playerStore.series!.description}
                </p>
                <Show when={playerPageStore.showExpandButton}>
                  <button
                    class={`phone-player-expand-btn ${playerPageStore.isDescriptionExpanded ? 'expanded' : ''}`}
                    onClick={playerPageStoreActions.toggleDescription}
                  >
                    {playerPageStore.isDescriptionExpanded
                      ? (t().player as unknown as Record<string, string>).collapse || 'Show Less'
                      : (t().player as unknown as Record<string, string>).expand || 'Show More'}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  </button>
                </Show>
              </div>
            </div>

            {/* Episode List Toggle */}
            <button
              class="phone-episode-toggle"
              onClick={playerPageStoreActions.toggleEpisodeList}
            >
              <span>
                {t().player.episodes} ({playerStore.episodes.length})
              </span>
              <svg
                class={`phone-episode-arrow ${playerPageStore.showEpisodeList ? 'open' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>

            {/* Episode List */}
            <Show when={playerPageStore.showEpisodeList}>
              <div class="phone-episode-list">
                {/* Range Selector */}
                <Show when={ranges().length > 1}>
                  <div class="phone-episode-ranges">
                    <For each={ranges()}>
                      {([start, end]) => (
                        <button
                          class={`phone-range-btn ${
                            playerStore.episodeRange[0] === start &&
                            playerStore.episodeRange[1] === end
                              ? 'active'
                              : ''
                          }`}
                          onClick={() => playerStoreActions.setEpisodeRange([start, end])}
                        >
                          {start.toString().padStart(2, '0')}-{end.toString().padStart(2, '0')}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Episode Grid */}
                <div class="phone-episode-grid">
                  <For each={filteredEpisodes()}>
                    {(episode) => (
                      <div
                        class={`phone-episode-thumbnail ${
                          playerStore.currentEpisode?.episodeNumber === episode.episodeNumber
                            ? 'active'
                            : ''
                        }`}
                        onClick={() => playerPageStoreActions.handleEpisodeClick(episode, navigate)}
                      >
                        <img
                          src={
                            episode.thumbnail
                              || (episode.videoId
                                ? `https://vz-918d4e7e-1fb.b-cdn.net/${episode.videoId}/thumbnail.jpg`
                                : playerStore.series?.cover || '/placeholder.jpg')
                          }
                          alt={`Episode ${episode.episodeNumber}`}
                          class="phone-episode-thumb-img"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            if (img.dataset.fallback) return
                            img.dataset.fallback = 'true'
                            img.src = playerStore.series?.cover || '/placeholder.jpg'
                          }}
                        />
                        <span class="phone-episode-badge">
                          EP {episode.episodeNumber.toString().padStart(2, '0')}
                        </span>
                        <Show when={checkEpisodePurchased(episode._id, episode.episodeNumber)}>
                          <span class="phone-episode-ribbon" />
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Comments */}
            <CommentSection />

            {/* Recommendations */}
            <PhoneSeriesCarousel
              title={t().home.youMightLike}
              series={recommendationsStore.series}
              excludeSeriesId={params.id}
            />

            {/* New Releases */}
            <PhoneSeriesCarousel
              title={t().home.newReleases}
              series={newReleasesStore.series}
              excludeSeriesId={params.id}
            />
          </div>

          {/* Share Popup */}
          <Show when={playerPageStore.showSharePopup}>
            <div class="phone-share-overlay" onClick={playerPageStoreActions.hideSharePopup}>
              <div class="phone-share-popup" onClick={(e) => e.stopPropagation()}>
                <div class="phone-share-header">
                  <h3 class="phone-share-title">{t().player.shareTitle}</h3>
                  <button class="phone-share-close" onClick={playerPageStoreActions.hideSharePopup}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div class="phone-share-buttons">
                  {/* Facebook has no web/URL way to share into its app, so on the
                      phone (both Cordova app and mobile web) we show a generic
                      Share button that opens the native share sheet instead. */}
                  <button
                    class="phone-share-btn-item"
                    onClick={() => playerPageStoreActions.handleShareAction(() => shareNative(shareUrl(), shareText()))}
                  >
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>Share</span>
                  </button>
                  <button
                    class="phone-share-btn-item"
                    onClick={() => playerPageStoreActions.handleShareAction(() => shareTwitter(shareUrl(), shareText()))}
                  >
                    <svg viewBox="0 0 24 24" width="32" height="32">
                      <path
                        fill="#1DA1F2"
                        d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
                      />
                    </svg>
                    <span>Twitter</span>
                  </button>
                  <button
                    class="phone-share-btn-item"
                    onClick={() => playerPageStoreActions.handleShareAction(() => sharePinterest(shareUrl(), shareText()))}
                  >
                    <svg viewBox="0 0 24 24" width="32" height="32">
                      <path
                        fill="#E60023"
                        d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"
                      />
                    </svg>
                    <span>Pinterest</span>
                  </button>
                  <button
                    class="phone-share-btn-item"
                    onClick={() => playerPageStoreActions.handleShareAction(() => shareWhatsApp(shareUrl(), shareText()))}
                  >
                    <svg viewBox="0 0 24 24" width="32" height="32">
                      <path
                        fill="#25D366"
                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                      />
                    </svg>
                    <span>WhatsApp</span>
                  </button>
                  <button
                    class="phone-share-btn-item"
                    onClick={() => playerPageStoreActions.handleShareAction(() => shareReddit(shareUrl(), shareText()))}
                  >
                    <svg viewBox="0 0 24 24" width="32" height="32">
                      <path
                        fill="#FF4500"
                        d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.07 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"
                      />
                    </svg>
                    <span>Reddit</span>
                  </button>
                </div>
              </div>
            </div>
          </Show>

          {/* Login Modal */}
          <Show when={loginModalStore.isOpen}>
            <LoginModal
              onClose={loginModalStoreActions.close}
              onLoginSuccess={handleLoginSuccess}
            />
          </Show>

          {/* Purchase Popup */}
          <Show when={playerPageStore.showPurchasePopup && playerStore.currentEpisode}>
            <PurchasePopup
              seriesName={playerStore.series?.name || ''}
              episodeNumber={playerStore.currentEpisode!.episodeNumber}
              episodeTitle={playerStore.currentEpisode!.title}
              userBalance={accountStore.user?.balance || 0}
              isPurchasing={playerPageStore.isPurchasing}
              onConfirm={() => playerPageStoreActions.handlePurchaseConfirm(t())}
              onCancel={playerPageStoreActions.hidePurchasePopup}
              t={t().player}
            />
          </Show>

          {/* Favorite Modal */}
          <Show when={playerPageStore.showFavoriteModal}>
            <FavoriteModal
              action={playerPageStore.pendingFavoriteAction || 'add'}
              seriesName={playerStore.series?.name || ''}
              dontShowAgain={playerPageStore.favoriteModalDontShowAgain}
              onDontShowAgainChange={playerPageStoreActions.setFavoriteModalDontShowAgain}
              onConfirm={playerPageStoreActions.handleFavoriteConfirm}
              onCancel={playerPageStoreActions.hideFavoriteModal}
              t={t().player}
            />
          </Show>

          {/* Result Modal */}
          <Show when={playerPageStore.showResultModal}>
            <ResultModal
              type={playerPageStore.resultModalType}
              title={
                playerPageStore.resultModalType === 'success'
                  ? t().player.unlockSuccess
                  : t().player.unlockFailed
              }
              message={playerPageStore.resultModalMessage}
              buttonText={
                playerPageStore.resultModalType === 'error' &&
                playerPageStore.resultModalMessage.includes('balance')
                  ? t().player.goToWallet
                  : 'OK'
              }
              onClose={() => playerPageStoreActions.handleResultModalClose(navigate)}
            />
          </Show>

          {/* Rating Modal */}
          <Show when={playerPageStore.showRatingModal}>
            <RatingModal />
          </Show>

          {/* Toast */}
          <Toast />
        </PhoneLayout>
      </Show>
    </Show>
  )
}

export default PhonePlayer
