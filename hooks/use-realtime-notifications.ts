import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// 전역 상태로 구독 관리
let globalChannel: any = null
let isGlobalSubscribed = false
let subscribers: Set<() => void> = new Set()

export function useRealtimeNotifications(onNewNotification: () => void) {
  const callbackRef = useRef(onNewNotification)
  callbackRef.current = onNewNotification

  useEffect(() => {
    const supabase = createClient()
    
    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 콜백을 구독자 목록에 추가
        const callback = () => callbackRef.current()
        subscribers.add(callback)

        // 이미 구독 중이면 새로운 콜백만 추가하고 리턴
        if (isGlobalSubscribed && globalChannel) {
          return
        }

        // 기존 채널이 있으면 제거
        if (globalChannel) {
          await supabase.removeChannel(globalChannel)
          globalChannel = null
          isGlobalSubscribed = false
        }

        // 새 채널 생성
        const channelName = `notifications_${user.id}_${Math.random().toString(36).substr(2, 9)}`
        globalChannel = supabase.channel(channelName)

        globalChannel
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notification_history',
            filter: `user_id=eq.${user.id}`
          }, (payload: any) => {
            console.log('New notification received:', payload)
            // 모든 구독자에게 알림
            subscribers.forEach(cb => {
              try {
                cb()
              } catch (error) {
                console.error('Error calling notification callback:', error)
              }
            })
          })
          .subscribe((status: string) => {
            console.log('Realtime subscription status:', status)
            if (status === 'SUBSCRIBED') {
              isGlobalSubscribed = true
            } else if (status === 'CLOSED') {
              isGlobalSubscribed = false
            }
          })

        return callback
      } catch (error) {
        console.error('Error setting up realtime notifications:', error)
        return null
      }
    }

    const callbackPromise = setupRealtime()

    return () => {
      callbackPromise.then(callback => {
        if (callback) {
          subscribers.delete(callback)
        }

        // 더 이상 구독자가 없으면 채널 정리
        if (subscribers.size === 0 && globalChannel) {
          const supabase = createClient()
          supabase.removeChannel(globalChannel).then(() => {
            globalChannel = null
            isGlobalSubscribed = false
          }).catch(error => {
            console.error('Error removing channel:', error)
          })
        }
      })
    }
  }, [])
} 