import { onCleanup, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { t } from '../../stores/languageStore'
import {
  topBarStore,
  topBarStoreActions,
  watchHistory,
} from '../../stores/topBarStore'
import type { WatchListItem } from '../../types'

const HistoryPopover = () => {
  const navigate = useNavigate()
  let historyRef: HTMLDivElement | undefined
  let historyTimeoutRef: ReturnType<typeof setTimeout> | null = null

  const handleClickOutside = (event: MouseEvent) => {
    if (historyRef && !historyRef.contains(event.target as Node)) {
      topBarStoreActions.setShowHistoryPopover(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  onCleanup(() => document.removeEventListener('mousedown', handleClickOutside))

  const handleMouseEnter = () => {
    clearPendingTimeout()
    topBarStoreActions.setShowHistoryPopover(true)
  }

  const handleMouseLeave = () => {
    historyTimeoutRef = setTimeout(() => {
      topBarStoreActions.setShowHistoryPopover(false)
    }, 150)
  }

  const clearPendingTimeout = () => {
    if (historyTimeoutRef) {
      clearTimeout(historyTimeoutRef)
      historyTimeoutRef = null
    }
  }

  const handleIconClick = () => {
    if (topBarStore.isLoggedIn) {
      navigate('/account?tab=watchHistory')
    } else {
      topBarStoreActions.setShowLoginModal(true)
    }
  }

  const handleItemClick = (item: WatchListItem) => {
    navigate(`/player/${item.seriesId}?episode=${item.episodeNumber}`)
    topBarStoreActions.setShowHistoryPopover(false)
  }

  return (
    <div
      class="history-wrapper"
      ref={historyRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div class="icon-button history-icon" onClick={handleIconClick}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
      </div>

      <Show when={topBarStore.showHistoryPopover}>
        <div class="history-popover">
          <div class="popover-header">{t().topBar.historyTitle}</div>
          <Show
            when={watchHistory().length > 0}
            fallback={
              <div class="popover-empty">{t().topBar.noHistory}</div>
            }
          >
            <div class="popover-list">
              <For each={watchHistory()}>
                {(item) => (
                  <div
                    class="popover-item"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleItemClick(item)
                    }}
                  >
                    <img
                      src={item.seriesCover}
                      alt={item.seriesName}
                      class="popover-item-cover"
                    />
                    <div class="popover-item-info">
                      <span class="popover-item-title">
                        {item.seriesName}
                      </span>
                      <span class="popover-item-episode">
                        EP {item.episodeNumber}
                      </span>
                    </div>
                    <svg
                      class="popover-item-resume"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export default HistoryPopover
