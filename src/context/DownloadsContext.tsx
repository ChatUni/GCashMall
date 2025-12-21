import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface DownloadedEpisode {
  seriesId: string
  seriesTitle: string
  episodeNumber: number
  poster: string
  tag: string
  downloadedAt: number // Unix timestamp
  fileSize?: string // e.g., "1.2 GB"
}

interface DownloadsContextType {
  downloads: DownloadedEpisode[]
  addDownload: (item: Omit<DownloadedEpisode, 'downloadedAt'>) => void
  removeDownload: (seriesId: string, episodeNumber: number) => void
  removeAllDownloadsForSeries: (seriesId: string) => void
  clearAllDownloads: () => void
  isDownloaded: (seriesId: string, episodeNumber: number) => boolean
  getDownloadsForSeries: (seriesId: string) => DownloadedEpisode[]
}

const DownloadsContext = createContext<DownloadsContextType | undefined>(undefined)

interface DownloadsProviderProps {
  children: ReactNode
}

export const DownloadsProvider: React.FC<DownloadsProviderProps> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadedEpisode[]>(() => {
    // Load downloads from localStorage on initial render
    const saved = localStorage.getItem('gcashtv-downloads')
    return saved ? JSON.parse(saved) : []
  })

  // Save downloads to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gcashtv-downloads', JSON.stringify(downloads))
  }, [downloads])

  const addDownload = (item: Omit<DownloadedEpisode, 'downloadedAt'>) => {
    setDownloads(prev => {
      // Check if already downloaded
      const exists = prev.some(
        d => d.seriesId === item.seriesId && d.episodeNumber === item.episodeNumber
      )
      if (exists) {
        return prev
      }
      // Add new download at the beginning
      return [{
        ...item,
        downloadedAt: Date.now()
      }, ...prev]
    })
  }

  const removeDownload = (seriesId: string, episodeNumber: number) => {
    setDownloads(prev => 
      prev.filter(d => !(d.seriesId === seriesId && d.episodeNumber === episodeNumber))
    )
  }

  const removeAllDownloadsForSeries = (seriesId: string) => {
    setDownloads(prev => prev.filter(d => d.seriesId !== seriesId))
  }

  const clearAllDownloads = () => {
    setDownloads([])
  }

  const isDownloaded = (seriesId: string, episodeNumber: number) => {
    return downloads.some(
      d => d.seriesId === seriesId && d.episodeNumber === episodeNumber
    )
  }

  const getDownloadsForSeries = (seriesId: string) => {
    return downloads.filter(d => d.seriesId === seriesId)
  }

  return (
    <DownloadsContext.Provider value={{ 
      downloads, 
      addDownload, 
      removeDownload,
      removeAllDownloadsForSeries,
      clearAllDownloads,
      isDownloaded,
      getDownloadsForSeries
    }}>
      {children}
    </DownloadsContext.Provider>
  )
}

export const useDownloads = () => {
  const context = useContext(DownloadsContext)
  if (context === undefined) {
    throw new Error('useDownloads must be used within a DownloadsProvider')
  }
  return context
}
