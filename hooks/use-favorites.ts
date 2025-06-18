'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/favorites')
      if (response.ok) {
        const { favorites: favoritesList } = await response.json()
        const favoriteIds = new Set<string>(favoritesList.map((fav: { bill_id: string }) => fav.bill_id))
        setFavorites(favoriteIds)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const isFavorited = (billId: string) => favorites.has(billId)

  const toggleFavorite = (billId: string, isFavorited: boolean) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (isFavorited) {
        newFavorites.add(billId)
      } else {
        newFavorites.delete(billId)
      }
      return newFavorites
    })
  }

  return {
    favorites,
    loading,
    isFavorited,
    toggleFavorite,
    loadFavorites
  }
} 