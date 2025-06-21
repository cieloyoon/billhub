'use client'

import { useEffect } from 'react'
import { cacheSyncManager } from '@/lib/cache-sync'

export function CacheSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 컴포넌트 마운트시 사용자 액션 기반 동기화 시작
    cacheSyncManager.setupUserActionSync()

    // 언마운트시 정리
    return () => {
      cacheSyncManager.stopSync()
    }
  }, [])

  return <>{children}</>
} 