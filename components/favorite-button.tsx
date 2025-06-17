'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useBillSync } from '@/hooks/use-bill-sync'

interface FavoriteButtonProps {
  billId: string
  initialIsFavorited?: boolean
  onToggle?: (isFavorited: boolean) => void
}

export function FavoriteButton({ billId, initialIsFavorited = false, onToggle }: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { isFavorited: contextIsFavorited, addFavorite, removeFavorite } = useBillSync()
  
  const isFavorited = contextIsFavorited(billId) || initialIsFavorited

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      setIsLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('로그인이 필요합니다.')
        return
      }

      if (isFavorited) {
        // 즐겨찾기 제거
        const response = await fetch(`/api/favorites?bill_id=${billId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          removeFavorite(billId)
          onToggle?.(false)
        } else {
          const error = await response.json()
          console.error('Error removing favorite:', error)
          alert(`즐겨찾기 제거 중 오류가 발생했습니다: ${error.error || 'Unknown error'}`)
        }
      } else {
        // 즐겨찾기 추가
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bill_id: billId }),
        })
        
        if (response.ok) {
          addFavorite(billId)
          onToggle?.(true)
        } else {
          const error = await response.json()
          if (response.status === 409) {
            // 이미 즐겨찾기에 있음
            addFavorite(billId)
            onToggle?.(true)
          } else {
            console.error('Error adding favorite:', error)
            alert(`즐겨찾기 추가 중 오류가 발생했습니다: ${error.error || 'Unknown error'}`)
          }
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`p-2 rounded-full transition-colors ${
        isFavorited 
          ? 'text-yellow-500 hover:text-yellow-600' 
          : 'text-gray-400 hover:text-yellow-500'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isFavorited ? '즐겨찾기 제거' : '즐겨찾기 추가'}
    >
      <Star 
        size={20} 
        className={isFavorited ? 'fill-current' : ''} 
      />
    </button>
  )
} 