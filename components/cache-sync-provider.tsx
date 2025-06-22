'use client'

import { useEffect, useState } from 'react'
import { cacheSyncManager } from '@/lib/cache-sync'

export function CacheSyncProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    let mounted = true

    const initializeSync = async () => {
      try {
        console.log('🚀 캐시 동기화 시스템 초기화...')
        
        // 사용자 액션 기반 동기화 시작
        cacheSyncManager.setupUserActionSync()
        
        if (mounted) {
          setIsInitialized(true)
          console.log('✅ 캐시 동기화 시스템 초기화 완료')
        }
      } catch (error) {
        console.error('❌ 캐시 동기화 초기화 실패:', error)
      }
    }

    // 즉시 초기화
    initializeSync()

    // 캐시 무효화 이벤트 리스너 등록
    const handleCacheInvalidated = (event: CustomEvent) => {
      console.log('🔄 캐시 무효화 이벤트 감지:', event.detail)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('cache-invalidated', handleCacheInvalidated as EventListener)
    }

    // 언마운트시 정리
    return () => {
      mounted = false
      cacheSyncManager.stopSync()
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('cache-invalidated', handleCacheInvalidated as EventListener)
      }
      
      console.log('🛑 캐시 동기화 시스템 종료')
    }
  }, [])

  return <>{children}</>
} 