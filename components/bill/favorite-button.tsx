'use client'

import { useState } from 'react'
import { Star, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useBillSync } from '@/hooks/use-bill-sync'
import { useNotificationSubscription } from '@/hooks/use-notification-subscription'

interface FavoriteButtonProps {
  billId: string
  initialIsFavorited?: boolean
  onToggle?: (isFavorited: boolean) => void
}

export function FavoriteButton({ billId, initialIsFavorited = false, onToggle }: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { isFavorited: contextIsFavorited, addFavorite, removeFavorite } = useBillSync()
  const { subscribe, unsubscribe } = useNotificationSubscription(billId)
  
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
        // 즐겨찾기 제거 + 알림 구독 해제
        const favoriteResponse = await fetch(`/api/favorites?bill_id=${billId}`, {
          method: 'DELETE',
        })
        
        if (favoriteResponse.ok) {
          removeFavorite(billId)
          // 알림 구독도 해제
          await unsubscribe(billId)
          onToggle?.(false)
        } else {
          const error = await favoriteResponse.json()
          console.error('Error removing favorite:', error)
          alert(`즐겨찾기 제거 중 오류가 발생했습니다: ${error.error || 'Unknown error'}`)
        }
      } else {
        // 즐겨찾기 추가 + 알림 구독
        const favoriteResponse = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bill_id: billId }),
        })
        
        if (favoriteResponse.ok) {
          addFavorite(billId)
          // 알림 구독도 추가
          await subscribe(billId)
          onToggle?.(true)
        } else {
          const error = await favoriteResponse.json()
          if (favoriteResponse.status === 409) {
            // 이미 즐겨찾기에 있음
            addFavorite(billId)
            await subscribe(billId)
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
      className={`p-1.5 rounded-full transition-colors relative ${
        isFavorited 
          ? 'text-yellow-500 hover:text-yellow-600' 
          : 'text-gray-400 hover:text-yellow-500'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isFavorited ? '즐겨찾기 및 알림 해제' : '즐겨찾기 및 알림 설정'}
    >
      <Star 
        size={18} 
        className={isFavorited ? 'fill-current' : ''} 
      />
      {isFavorited && (
        <Bell 
          size={8} 
          className="absolute -top-0.5 -right-0.5 text-blue-500 fill-current"
        />
      )}
    </button>
  )
} 