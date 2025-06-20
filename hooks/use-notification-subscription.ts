import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface NotificationSubscription {
  id: string
  user_id: string
  bill_id: string
  is_active: boolean
  notification_types: string[]
  created_at: string
  updated_at: string
  bills: {
    bill_name: string
    bill_no: string
    proc_stage_cd: string
    proposer: string
    propose_dt: string
  } | null
}

export function useNotificationSubscription(billId?: string) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // 특정 법안의 구독 상태 확인
  const checkSubscription = async (targetBillId: string) => {
    if (!targetBillId) return false

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const response = await fetch(`/api/notifications/subscriptions?bill_id=${targetBillId}`)
      
      if (!response.ok) {
        console.error('Error checking subscription:', response.statusText)
        return false
      }

      const data = await response.json()
      return data.subscriptions.length > 0
    } catch (err) {
      console.error('Error checking subscription:', err)
      return false
    }
  }

  // 구독 상태 초기화
  useEffect(() => {
    if (billId) {
      checkSubscription(billId).then(setIsSubscribed)
    }
  }, [billId])

  // 알림 구독
  const subscribe = async (targetBillId: string, notificationTypes?: string[]) => {
    if (!targetBillId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bill_id: targetBillId,
          notification_types: notificationTypes || ['stage_change', 'general_result']
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to subscribe')
      }

      setIsSubscribed(true)
      
      // 구독 목록 새로고침
      if (billId === targetBillId) {
        await fetchSubscriptions()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // 알림 구독 해제
  const unsubscribe = async (targetBillId: string) => {
    if (!targetBillId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bill_id: targetBillId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unsubscribe')
      }

      setIsSubscribed(false)
      
      // 구독 목록 새로고침
      if (billId === targetBillId) {
        await fetchSubscriptions()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // 모든 구독 목록 가져오기
  const fetchSubscriptions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications/subscriptions')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions')
      }

      const data = await response.json()
      setSubscriptions(data.subscriptions)
      
      return data.subscriptions
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // 구독 토글
  const toggleSubscription = async (targetBillId: string) => {
    const currentlySubscribed = await checkSubscription(targetBillId)
    
    if (currentlySubscribed) {
      await unsubscribe(targetBillId)
    } else {
      await subscribe(targetBillId)
    }
  }

  return {
    isSubscribed,
    subscriptions,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    toggleSubscription,
    fetchSubscriptions,
    checkSubscription
  }
} 