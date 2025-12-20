import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface FavoriteSeries {
  id: string
  title: string
  poster: string
  tag: string
}

interface FavoritesContextType {
  favorites: FavoriteSeries[]
  addFavorite: (series: FavoriteSeries) => void
  removeFavorite: (seriesId: string) => void
  isFavorite: (seriesId: string) => boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

interface FavoritesProviderProps {
  children: ReactNode
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteSeries[]>(() => {
    // Load favorites from localStorage on initial render
    const saved = localStorage.getItem('gcashtv-favorites')
    return saved ? JSON.parse(saved) : []
  })

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gcashtv-favorites', JSON.stringify(favorites))
  }, [favorites])

  const addFavorite = (series: FavoriteSeries) => {
    setFavorites(prev => {
      // Check if already exists
      if (prev.some(fav => fav.id === series.id)) {
        return prev
      }
      return [...prev, series]
    })
  }

  const removeFavorite = (seriesId: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== seriesId))
  }

  const isFavorite = (seriesId: string) => {
    return favorites.some(fav => fav.id === seriesId)
  }

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
