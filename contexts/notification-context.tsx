'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'

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

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  fetchNotifications: (page?: number, unreadOnly?: boolean) => Promise<NotificationResponse>
  fetchUnreadCount: () => Promise<number>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  forceRefresh: () => void
  refreshTrigger: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchTimer, setFetchTimer] = useState<NodeJS.Timeout | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const supabase = createClient()

  const fetchNotifications = useCallback(async (page = 1, unreadOnly = false) => {
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
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?count_only=true')
      
      if (!response.ok) {
        throw new Error('Failed to fetch unread count')
      }

      const data = await response.json()
      setUnreadCount(data.unreadCount)
      
      return data.unreadCount
    } catch (err) {
      console.error('읽지 않은 알림 개수 가져오기 실패:', err)
      return 0
    }
  }, [])

  const debouncedFetchNotifications = useCallback(() => {
    if (fetchTimer) {
      clearTimeout(fetchTimer)
    }
    
    const timer = setTimeout(() => {
      fetchNotifications()
      setFetchTimer(null)
    }, 500)
    
    setFetchTimer(timer)
  }, [fetchTimer, fetchNotifications])

  const markAsRead = useCallback(async (notificationId: string) => {
    console.log('📖 markAsRead 호출:', notificationId)
    
    const targetNotification = notifications.find(n => n.id === notificationId)
    console.log('🎯 대상 알림:', targetNotification)
    
    if (targetNotification && targetNotification.is_read) {
      console.log('✅ 이미 읽음 상태:', notificationId)
      return
    }

    try {
      console.log('🔄 로컬 상태 업데이트 중...')
      const readAt = new Date().toISOString()
      let wasUpdated = false
      
      setNotifications(prev => {
        const updated = prev.map(n => {
          if (n.id === notificationId) {
            wasUpdated = true
            return { ...n, is_read: true, read_at: readAt }
          }
          return n
        })
        console.log('🔄 로컬 상태 업데이트 결과:', wasUpdated ? '성공' : '실패 (알림 없음)')
        return updated
      })
      
      if (targetNotification && !targetNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      console.log('🌐 API 호출 중...')
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API 응답 오류:', response.status, errorText)
        throw new Error(`Failed to mark notification as read: ${response.status}`)
      }
      
      console.log('✅ API 성공')
      
      if (!wasUpdated) {
        console.log('🔄 전체 데이터 새로고침')
        debouncedFetchNotifications()
      }
      
    } catch (err) {
      console.error('❌ markAsRead 에러:', err)
      
      if (targetNotification) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: false, read_at: null }
              : n
          )
        )
        if (!targetNotification.is_read) {
          setUnreadCount(prev => prev + 1)
        }
      }
      
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [notifications, debouncedFetchNotifications])

  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read)
    if (unreadNotifications.length === 0) {
      return
    }

    try {
      const readAt = new Date().toISOString()
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: n.read_at || readAt }))
      )
      setUnreadCount(0)

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }
    } catch (err) {
      setNotifications(prev => 
        prev.map(n => {
          const originalNotification = unreadNotifications.find(un => un.id === n.id)
          return originalNotification 
            ? { ...n, is_read: false, read_at: null }
            : n
        })
      )
      setUnreadCount(unreadNotifications.length)
      
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [notifications])

  const deleteNotification = useCallback(async (notificationId: string) => {
    console.log('🗑️ deleteNotification 호출:', notificationId)
    
    const deletedNotification = notifications.find(n => n.id === notificationId)
    console.log('🎯 삭제 대상 알림:', deletedNotification)
    
    try {
      console.log('🔄 로컬 상태에서 알림 제거 중...')
      
      if (!deletedNotification) {
        console.log('⚠️ 로컬 상태에서 알림을 찾을 수 없음. 서버에서 삭제 시도:', notificationId)
        setNotifications(prev => {
          const filtered = prev.filter(n => n.id !== notificationId)
          if (filtered.length !== prev.length) {
            console.log('✅ UI에서 알림 제거됨:', notificationId)
          }
          return filtered
        })
      } else {
        console.log('✅ 로컬 상태에서 알림 제거')
        setNotifications(prev => {
          const filtered = prev.filter(n => n.id !== notificationId)
          console.log('🔄 필터링 결과:', { 이전: prev.length, 이후: filtered.length })
          return filtered
        })
        
        if (!deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }

      console.log('🌐 API 삭제 호출 중...')
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log('✅ 서버에서 이미 삭제된 알림:', notificationId)
          return
        }
        const errorText = await response.text()
        console.error('❌ API 삭제 오류:', response.status, errorText)
        throw new Error(`Failed to delete notification: ${response.status}`)
      }

      console.log('✅ 서버에서 알림 삭제 성공:', notificationId)
      
      if (!deletedNotification) {
        console.log('알림 목록 새로고침 중...')
        forceRefresh()
      }
    } catch (err) {
      console.error('알림 삭제 API 오류:', err)
      
      if (deletedNotification) {
        setNotifications(prev => [...prev, deletedNotification].sort((a, b) => 
          new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        ))
        if (!deletedNotification.is_read) {
          setUnreadCount(prev => prev + 1)
        }
      } else {
        forceRefresh()
      }
      
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }, [notifications])

  const forceRefresh = useCallback(() => {
    console.log('🔄 강제 새로고침 - 알림 목록 재로드')
    setRefreshTrigger(prev => prev + 1)
    fetchNotifications()
  }, [fetchNotifications])

  // 초기 알림 개수 로딩
  useEffect(() => {
    console.log('🔄 초기 읽지 않은 알림 개수 로딩 시작...')
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // 실시간 알림 구독
  useRealtimeNotifications(() => {
    debouncedFetchNotifications()
  })

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (fetchTimer) {
        clearTimeout(fetchTimer)
      }
    }
  }, [fetchTimer])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    forceRefresh,
    refreshTrigger
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
} 