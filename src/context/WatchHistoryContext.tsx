import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface WatchHistoryItem {
  seriesId: string
  seriesTitle: string
  episodeNumber: number
  poster: string
  tag: string
  timestamp: number // Unix timestamp for sorting by most recent
}

interface WatchHistoryContextType {
  watchHistory: WatchHistoryItem[]
  addToHistory: (item: Omit<WatchHistoryItem, 'timestamp'>) => void
  removeFromHistory: (seriesId: string) => void
  clearHistory: () => void
  getLastWatched: (seriesId: string) => WatchHistoryItem | undefined
}

const WatchHistoryContext = createContext<WatchHistoryContextType | undefined>(undefined)

interface WatchHistoryProviderProps {
  children: ReactNode
}

export const WatchHistoryProvider: React.FC<WatchHistoryProviderProps> = ({ children }) => {
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => {
    // Load watch history from localStorage on initial render
    const saved = localStorage.getItem('gcashtv-watch-history')
    return saved ? JSON.parse(saved) : []
  })

  // Save watch history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('gcashtv-watch-history', JSON.stringify(watchHistory))
  }, [watchHistory])

  const addToHistory = (item: Omit<WatchHistoryItem, 'timestamp'>) => {
    setWatchHistory(prev => {
      // Remove existing entry for this series if it exists
      const filtered = prev.filter(h => h.seriesId !== item.seriesId)
      // Add new entry at the beginning with current timestamp
      return [{
        ...item,
        timestamp: Date.now()
      }, ...filtered]
    })
  }

  const removeFromHistory = (seriesId: string) => {
    setWatchHistory(prev => prev.filter(h => h.seriesId !== seriesId))
  }

  const clearHistory = () => {
    setWatchHistory([])
  }

  const getLastWatched = (seriesId: string) => {
    return watchHistory.find(h => h.seriesId === seriesId)
  }

  return (
    <WatchHistoryContext.Provider value={{ 
      watchHistory, 
      addToHistory, 
      removeFromHistory, 
      clearHistory,
      getLastWatched 
    }}>
      {children}
    </WatchHistoryContext.Provider>
  )
}

export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext)
  if (context === undefined) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider')
  }
  return context
}
