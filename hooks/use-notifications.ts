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
  const [fetchTimer, setFetchTimer] = useState<NodeJS.Timeout | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0) // 강제 리렌더링용
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

  const debouncedFetchNotifications = () => {
    // 기존 타이머가 있으면 취소
    if (fetchTimer) {
      clearTimeout(fetchTimer)
    }
    
    // 500ms 후에 fetch 실행
    const timer = setTimeout(() => {
      fetchNotifications()
      setFetchTimer(null)
    }, 500)
    
    setFetchTimer(timer)
  }

  const markAsRead = async (notificationId: string) => {
    console.log('📖 markAsRead 호출:', notificationId)
    console.log('📋 현재 notifications 배열:', notifications.map(n => ({ id: n.id, title: n.title, is_read: n.is_read })))
    
    // 읽을 알림을 미리 저장
    const targetNotification = notifications.find(n => n.id === notificationId)
    console.log('🎯 대상 알림:', targetNotification)
    
    // 로컬 상태에 알림이 없어도 API 호출은 진행
    if (targetNotification && targetNotification.is_read) {
      console.log('✅ 이미 읽음 상태:', notificationId)
      return
    }

    try {
      console.log('🔄 로컬 상태 업데이트 중...')
      // 로컬 상태를 먼저 업데이트 (낙관적 업데이트)
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
      
      // refreshTrigger 제거 - 상태 변경으로 자동 리렌더링됨

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
      
      // API 성공 후 전체 데이터 새로고침 (로컬 상태에 없었던 경우)
      if (!wasUpdated) {
        console.log('🔄 전체 데이터 새로고침')
        debouncedFetchNotifications()
      }
      
    } catch (err) {
      console.error('❌ markAsRead 에러:', err)
      
      // API 실패 시 상태 롤백 (로컬 상태에 있었던 경우만)
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
  }

  const markAllAsRead = async () => {
    // 읽지 않은 알림들 미리 저장
    const unreadNotifications = notifications.filter(n => !n.is_read)
    if (unreadNotifications.length === 0) {
      return // 읽지 않은 알림이 없으면 리턴
    }

    try {
      // 로컬 상태를 먼저 업데이트 (낙관적 업데이트)
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
      // API 실패 시 상태 롤백
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
  }

  const deleteNotification = async (notificationId: string) => {
    console.log('🗑️ deleteNotification 호출:', notificationId)
    console.log('📋 삭제 전 notifications 배열:', notifications.map(n => ({ id: n.id, title: n.title })))
    
    // 삭제할 알림을 미리 저장
    const deletedNotification = notifications.find(n => n.id === notificationId)
    console.log('🎯 삭제 대상 알림:', deletedNotification)
    
    try {
      console.log('🔄 로컬 상태에서 알림 제거 중...')
      
      // 로컬 상태에서 알림을 찾을 수 없어도 UI에서 제거 시도
      if (!deletedNotification) {
        console.log('⚠️ 로컬 상태에서 알림을 찾을 수 없음. 서버에서 삭제 시도:', notificationId)
        // UI에서 해당 ID의 알림이 있다면 제거
        setNotifications(prev => {
          const filtered = prev.filter(n => n.id !== notificationId)
          if (filtered.length !== prev.length) {
            console.log('✅ UI에서 알림 제거됨:', notificationId)
          }
          return filtered
        })
      } else {
        // 로컬 상태에서 알림이 있는 경우 낙관적 업데이트
        console.log('✅ 로컬 상태에서 알림 제거')
        setNotifications(prev => {
          const filtered = prev.filter(n => n.id !== notificationId)
          console.log('🔄 필터링 결과:', { 이전: prev.length, 이후: filtered.length })
          return filtered
        })
        
        // 읽지 않은 알림이었다면 카운트 감소
        if (!deletedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
      
      // refreshTrigger 제거 - 상태 변경으로 자동 리렌더링됨

      console.log('🌐 API 삭제 호출 중...')
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // 404는 이미 삭제된 것이므로 성공으로 처리
        if (response.status === 404) {
          console.log('✅ 서버에서 이미 삭제된 알림:', notificationId)
          return
        }
        const errorText = await response.text()
        console.error('❌ API 삭제 오류:', response.status, errorText)
        throw new Error(`Failed to delete notification: ${response.status}`)
      }

      console.log('✅ 서버에서 알림 삭제 성공:', notificationId)
      
      // 삭제 성공 후 알림 목록 강제 새로고침 (로컬 상태에 없었던 경우)
      if (!deletedNotification) {
        console.log('알림 목록 새로고침 중...')
        forceRefresh()
      }
    } catch (err) {
      console.error('알림 삭제 API 오류:', err)
      
      // API 실패 시 상태 롤백 (로컬 상태에 있었던 경우만)
      if (deletedNotification) {
        setNotifications(prev => [...prev, deletedNotification].sort((a, b) => 
          new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        ))
        if (!deletedNotification.is_read) {
          setUnreadCount(prev => prev + 1)
        }
      } else {
        // 로컬 상태에 없었던 경우 전체 목록 새로고침
        forceRefresh()
      }
      
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  const forceRefresh = () => {
    console.log('🔄 강제 새로고침 - 알림 목록 재로드')
    // refreshTrigger는 정말 필요한 경우에만 (컴포넌트 키 변경용)
    setRefreshTrigger(prev => prev + 1)
    fetchNotifications() // debouncedFetchNotifications 대신 즉시 실행
  }

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

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    forceRefresh,
    refreshTrigger
  }
} 