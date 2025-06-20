import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// 단일 연결 관리자
class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager | null = null
  private channel: any = null
  private subscribers = new Set<() => void>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private isConnected = false
  private currentUserId: string | null = null

  static getInstance(): RealtimeConnectionManager {
    if (!RealtimeConnectionManager.instance) {
      RealtimeConnectionManager.instance = new RealtimeConnectionManager()
    }
    return RealtimeConnectionManager.instance
  }

  subscribe(callback: () => void) {
    this.subscribers.add(callback)
    
    // 첫 번째 구독자일 때만 연결 시작
    if (this.subscribers.size === 1 && !this.isConnected && !this.isConnecting) {
      this.connect()
    }
    
    return () => this.unsubscribe(callback)
  }

  private unsubscribe(callback: () => void) {
    this.subscribers.delete(callback)
    
    // 마지막 구독자가 해제되면 연결 종료
    if (this.subscribers.size === 0) {
      this.disconnect()
    }
  }

  private async connect() {
    if (this.isConnecting || this.isConnected) {
      console.log('이미 연결 중이거나 연결됨')
      return
    }

    this.isConnecting = true

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('사용자 인증 없음')
        this.isConnecting = false
        return
      }

      // 사용자가 변경된 경우 기존 연결 정리
      if (this.currentUserId && this.currentUserId !== user.id) {
        await this.cleanup()
      }
      this.currentUserId = user.id

      console.log(`📡 WebSocket 연결 시도... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts + 1})`)

      // 기존 채널 정리
      await this.cleanup()

      // 새 채널 생성
      const channelName = `notifications_${user.id}_${Date.now()}`
      this.channel = supabase.channel(channelName)

      this.channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_history',
          filter: `user_id=eq.${user.id}`
        }, (payload: any) => {
          console.log('🔔 새 알림 수신:', payload)
          this.notifySubscribers()
        })
        .subscribe((status: string) => {
          console.log('📡 Realtime status:', status)
          
          if (status === 'SUBSCRIBED') {
            this.isConnected = true
            this.isConnecting = false
            this.reconnectAttempts = 0
            console.log('✅ WebSocket 연결 성공')
            
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.isConnected = false
            this.isConnecting = false
            
            // 구독자가 있고 재연결 횟수가 남았을 때만 재연결
            if (this.subscribers.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect()
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              console.log('❌ WebSocket 재연결 포기 (최대 시도 횟수 초과)')
            }
          }
        })

    } catch (error) {
      console.error('❌ Realtime 연결 오류:', error)
      this.isConnecting = false
      this.isConnected = false
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = Math.min(3000 * this.reconnectAttempts, 15000) // 3초, 6초, 9초, 최대 15초
    
    console.log(`🔄 WebSocket 재연결 예약 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('❌ 콜백 실행 오류:', error)
      }
    })
  }

  private async cleanup() {
    if (this.channel) {
      try {
        const supabase = createClient()
        await supabase.removeChannel(this.channel)
      } catch (error) {
        console.error('채널 제거 오류:', error)
      }
      this.channel = null
    }
  }

  private async disconnect() {
    console.log('🔌 WebSocket 연결 종료')
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    await this.cleanup()
    
    this.isConnected = false
    this.isConnecting = false
    this.reconnectAttempts = 0
    this.currentUserId = null
  }
}

export function useRealtimeNotifications(onNewNotification: () => void) {
  const callbackRef = useRef(onNewNotification)
  callbackRef.current = onNewNotification

  useEffect(() => {
    const manager = RealtimeConnectionManager.getInstance()
    const unsubscribe = manager.subscribe(() => callbackRef.current())

    return unsubscribe
  }, [])
} 