import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js'
import { useParams, useSearchParams, useNavigate } from '@solidjs/router'
import PhoneLayout from '../../layouts/PhoneLayout'
import PhoneSeriesCarousel from '../../components/phone/PhoneSeriesCarousel'
import LoginModal from '../../components/LoginModal'
import { PurchasePopup, ResultModal, FavoriteModal, Toast } from '../../components/PlayerModals'
import { t } from '../../stores/languageStore'
import {
  playerStore,
  loginModalStore,
  playerStoreActions,
  loginModalStoreActions,
  recommendationsStore,
  newReleasesStore,
  toastStore,
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
} from '../../stores/playerStore'
import { getIframeUrl } from '../../utils/playerHelpers'
import type { User } from '../../types'
import './PhonePlayer.css'

const PhonePlayer = () => {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  let iframeRef: HTMLIFrameElement | undefined
  let descriptionRef: HTMLParagraphElement | undefined

  const [iframeLoaded, setIframeLoaded] = createSignal(false)

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

  // Check description truncation
  createEffect(() => {
    // Track dependencies
    const _ep = playerStore.currentEpisode
    const _series = playerStore.series

    playerPageStoreActions.setDescriptionExpanded(false)
    const timer = setTimeout(() => {
      if (descriptionRef) {
        const isTruncated = descriptionRef.scrollHeight > descriptionRef.clientHeight
        playerPageStoreActions.setShowExpandButton(isTruncated)
      }
    }, 100)

    onCleanup(() => clearTimeout(timer))
  })

  // Player.js initialization
  createEffect(() => {
    const currentVideoId = playerStore.currentEpisode?.videoId
    const _userId = accountStore.user?._id
    setIframeLoaded(false)
  })

  const handleIframeLoad = () => {
    setIframeLoaded(true)
  }

  createEffect(() => {
    const currentVideoId = playerStore.currentEpisode?.videoId
    const purchased = isPurchased()
    const loaded = iframeLoaded()

    if (!currentVideoId || !loaded) return

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
              </Show>
            </div>

            {/* Episode Info */}
            <div class="phone-player-info">
              <div class="phone-player-header">
                <div class="phone-player-title-section">
                  <h1 class="phone-player-title">{playerStore.series!.name}</h1>
                  <span class="phone-player-episode">
                    EP {playerStore.currentEpisode?.episodeNumber.toString().padStart(2, '0')}
                    {playerStore.currentEpisode?.title
                      ? ` - ${playerStore.currentEpisode.title}`
                      : ''}
                  </span>
                </div>
                <div class="phone-player-actions">
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
              </div>

              {/* Tags */}
              <div class="phone-player-tags">
                <For each={playerStore.series!.tags || []}>
                  {(tag) => (
                    <span class="phone-player-tag">{tag}</span>
                  )}
                </For>
                <For each={playerStore.series!.genre || []}>
                  {(genre) => (
                    <span class="phone-player-tag">{genre.name}</span>
                  )}
                </For>
              </div>

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
                          src={`https://vz-918d4e7e-1fb.b-cdn.net/${episode.videoId}/thumbnail.jpg`}
                          alt={`Episode ${episode.episodeNumber}`}
                          class="phone-episode-thumb-img"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              playerStore.series?.cover || '/placeholder.jpg'
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

          {/* Toast */}
          <Toast
            message={toastStore.message}
            type={toastStore.type}
            isVisible={toastStore.isVisible}
          />
        </PhoneLayout>
      </Show>
    </Show>
  )
}

export default PhonePlayer
