import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeNotifications } from './use-realtime-notifications'

export interface Notification {
  id: string
  user_id: string
  bill_id: string
  notification_type: string
  title: string
  message: string
  is_read: boolean
  sent_at: string
  read_at: string | null
  related_stage_code: string | null
  bills: {
    bill_name: string
    bill_no: string
    proc_stage_cd: string
  } | null
}

export interface NotificationResponse {
  notifications: Notification[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  unreadCount: number
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchNotifications = async (page = 1, unreadOnly = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(unreadOnly && { unread_only: 'true' })
      })

      const response = await fetch(`/api/notifications?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data: NotificationResponse = await response.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // 실시간 알림 구독
  useRealtimeNotifications(() => {
    fetchNotifications()
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  }
} 