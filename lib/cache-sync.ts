import { billCache } from './bill-cache'
import { favoritesCache } from './favorites-cache'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

class CacheSyncManager {
  private supabase = createClient()
  private syncInterval: NodeJS.Timeout | null = null
  private lastSyncTime: number = 0
  private cleanupListeners: (() => void) | null = null
  private forceRefreshCallbacks: Set<() => void> = new Set()

  // 사용자 액션 기반 동기화 설정
  setupUserActionSync() {
    console.log('🔄 사용자 액션 기반 캐시 동기화 시작...')

    // 1. 법안 데이터 변경 감지 (실시간)
    this.supabase
      .channel('bills-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bills' },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('📊 법안 데이터 변경 감지:', payload.eventType)
          this.handleBillChange(payload)
        }
      )
      .subscribe()

    // 2. 즐겨찾기 변경 감지 (실시간)
    this.supabase
      .channel('favorites-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'favorites' },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('⭐ 즐겨찾기 변경 감지:', payload.eventType)
          this.handleFavoriteChange(payload)
        }
      )
      .subscribe()

    // 3. 페이지 포커스시 동기화 체크
    this.setupFocusBasedSync()
  }

  // 법안 데이터 변경 처리
  private async handleBillChange(payload: RealtimePostgresChangesPayload<any>) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload

      switch (eventType) {
        case 'INSERT':
          console.log('➕ 새 법안 추가:', (newRecord as any)?.bill_id)
          await this.addBillToCache(newRecord)
          break
          
        case 'UPDATE':
          console.log('✏️ 법안 수정:', (newRecord as any)?.bill_id)
          await this.updateBillInCache(newRecord)
          break
          
        case 'DELETE':
          console.log('🗑️ 법안 삭제:', (oldRecord as any)?.bill_id)
          await this.removeBillFromCache((oldRecord as any)?.bill_id)
          break
      }
    } catch (error) {
      console.error('법안 변경 처리 실패:', error)
    }
  }

  // 즐겨찾기 변경 처리
  private async handleFavoriteChange(payload: RealtimePostgresChangesPayload<any>) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload
      const userId = (newRecord as any)?.user_id || (oldRecord as any)?.user_id

      if (!userId) return

      switch (eventType) {
        case 'INSERT':
          console.log('⭐ 즐겨찾기 추가:', (newRecord as any)?.bill_id)
          // 즐겨찾기 캐시 무효화 (다음 로드시 새로고침)
          await favoritesCache.invalidateUserCache(userId)
          break
          
        case 'DELETE':
          console.log('💔 즐겨찾기 제거:', (oldRecord as any)?.bill_id)
          await favoritesCache.invalidateUserCache(userId)
          break
      }
    } catch (error) {
      console.error('즐겨찾기 변경 처리 실패:', error)
    }
  }

  // 캐시에 법안 추가
  private async addBillToCache(billData: any) {
    try {
      const existingBills = await billCache.getCachedBills()
      if (existingBills) {
        const updatedBills = [billData, ...existingBills]
        await billCache.setCachedBills(updatedBills, updatedBills.length)
        console.log('✅ 캐시에 새 법안 추가됨')
      }
    } catch (error) {
      console.error('캐시 법안 추가 실패:', error)
    }
  }

  // 캐시에서 법안 수정
  private async updateBillInCache(billData: any) {
    try {
      const existingBills = await billCache.getCachedBills()
      if (existingBills) {
        const updatedBills = existingBills.map(bill => 
          bill.bill_id === billData.bill_id ? billData : bill
        )
        await billCache.setCachedBills(updatedBills, updatedBills.length)
        console.log('✅ 캐시 법안 수정됨')
      }
    } catch (error) {
      console.error('캐시 법안 수정 실패:', error)
    }
  }

  // 캐시에서 법안 제거
  private async removeBillFromCache(billId: string) {
    try {
      const existingBills = await billCache.getCachedBills()
      if (existingBills) {
        const updatedBills = existingBills.filter(bill => bill.bill_id !== billId)
        await billCache.setCachedBills(updatedBills, updatedBills.length)
        console.log('✅ 캐시에서 법안 제거됨')
      }
    } catch (error) {
      console.error('캐시 법안 제거 실패:', error)
    }
  }

  // 페이지 포커스 기반 동기화
  private setupFocusBasedSync() {
    let isCheckingForUpdates = false // 중복 실행 방지

    // 페이지 포커스 시 동기화
    const handleFocus = async () => {
      if (isCheckingForUpdates) return // 이미 체크 중이면 스킵
      
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000 // 5분으로 늘림

      // 마지막 체크로부터 5분 이상 지났을 때만 동기화
      if (now - this.lastSyncTime > fiveMinutes) {
        console.log('👁️ 페이지 포커스 - 캐시 동기화 체크...')
        isCheckingForUpdates = true
        try {
          await this.checkForUpdates()
          this.lastSyncTime = now
        } finally {
          isCheckingForUpdates = false
        }
      }
    }

    // 페이지 로드 시 즉시 동기화 체크
    const handleLoad = async () => {
      if (isCheckingForUpdates) return // 이미 체크 중이면 스킵
      
      console.log('🔄 페이지 로드 - 캐시 동기화 체크...')
      isCheckingForUpdates = true
      try {
        // 새 세션이거나 오래된 캐시면 무효화
        const shouldInvalidate = await this.shouldInvalidateOnLoad()
        if (shouldInvalidate) {
          console.log('🧹 새 세션 감지 - 캐시 무효화 수행')
          await this.invalidateAllCaches()
        } else {
          await this.checkForUpdates()
        }
        this.lastSyncTime = Date.now()
      } finally {
        isCheckingForUpdates = false
      }
    }

    // 새 세션에서 돌아왔을 때 체크
    const handlePageShow = async (event: PageTransitionEvent) => {
      if (event.persisted && !isCheckingForUpdates) {
        // 브라우저 캐시에서 복원된 경우
        console.log('📱 페이지 복원 감지 - 캐시 동기화 체크')
        isCheckingForUpdates = true
        try {
          await this.checkForUpdates()
        } finally {
          isCheckingForUpdates = false
        }
      }
    }

    // 페이지 가시성 변경 감지
    const handleVisibilityChange = async () => {
      if (!document.hidden && !isCheckingForUpdates) {
        await handleFocus()
      }
    }

    // beforeunload 이벤트 (페이지 떠날 때)
    const handleBeforeUnload = () => {
      // 새로고침/종료 시간 저장
      sessionStorage.setItem('lastPageExit', Date.now().toString())
      console.log('📤 페이지 종료 - 동기화 정리...')
      this.stopSync()
    }

    // 이벤트 리스너 등록
    window.addEventListener('focus', handleFocus)
    window.addEventListener('load', handleLoad)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 정리 함수 저장 (나중에 제거용)
    this.cleanupListeners = () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('load', handleLoad)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }

    // 즉시 동기화 체크 (새로고침 대응)
    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      // DOM이 아직 로딩 중이면 로드 완료를 기다림
      window.addEventListener('load', handleLoad, { once: true })
    }
  }

  // 로드시 캐시 무효화 필요성 체크
  private async shouldInvalidateOnLoad(): Promise<boolean> {
    try {
      // 1. 새 세션 체크 (30분 이상 지났으면 새 세션으로 간주)
      const lastExit = sessionStorage.getItem('lastPageExit')
      const thirtyMinutes = 30 * 60 * 1000 // 30분
      
      if (lastExit) {
        const timeSinceExit = Date.now() - parseInt(lastExit)
        if (timeSinceExit > thirtyMinutes) {
          console.log('⏰ 30분 이상 지난 세션 - 캐시 무효화 필요')
          return true
        }
      }

      // 2. 하드 새로고침 체크 (Ctrl+F5, Cmd+Shift+R)
      if (performance.navigation?.type === 1) { // TYPE_RELOAD
        console.log('🔄 하드 새로고침 감지 - 캐시 무효화 필요')
        return true
      }

      // 3. 캐시 데이터 존재 여부 체크
      const cachedBills = await billCache.getCachedBills()
      if (!cachedBills || cachedBills.length === 0) {
        console.log('📭 캐시 데이터 없음 - 새로운 로드 필요')
        return false // 이 경우는 무효화가 아니라 첫 로드
      }

      // 4. 일정 시간마다 강제 무효화 (하루에 한 번)
      const lastFullSync = localStorage.getItem('lastFullCacheSync')
      const oneDay = 24 * 60 * 60 * 1000 // 24시간
      
      if (lastFullSync) {
        const timeSinceSync = Date.now() - parseInt(lastFullSync)
        if (timeSinceSync > oneDay) {
          console.log('📅 일일 캐시 무효화 시간 도달')
          return true
        }
      } else {
        // 처음 방문이면 시간 저장
        localStorage.setItem('lastFullCacheSync', Date.now().toString())
      }

      return false
    } catch (error) {
      console.error('캐시 무효화 체크 실패:', error)
      return false
    }
  }

  // 업데이트 체크 (개선된 버전)
  private async checkForUpdates() {
    try {
      // 캐시된 데이터의 최신 업데이트 시간 확인
      const cachedMeta = await billCache.getCacheMetadata()
      if (!cachedMeta) {
        console.log('📭 캐시 메타데이터 없음 - 동기화 불필요')
        return
      }

      console.log('🔍 캐시 동기화 체크 중...')

      // 실제 DB에서 최신 업데이트 시간 확인
      const { data: latestBill } = await this.supabase
        .from('bills')
        .select('updated_at, propose_dt, bill_no')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .single()

      if (latestBill) {
        const latestUpdate = new Date(latestBill.updated_at).getTime()
        const cacheTime = cachedMeta.lastUpdated
        const timeDiff = latestUpdate - cacheTime

        console.log(`📊 동기화 체크: 최신 업데이트 ${new Date(latestUpdate).toLocaleString()}, 캐시 ${new Date(cacheTime).toLocaleString()}`)

        // 캐시가 1시간 이상 오래되었거나 새로운 업데이트가 있으면 무효화
        if (timeDiff > 60 * 60 * 1000) { // 1시간
          console.log(`🔄 캐시가 오래됨 (${Math.round(timeDiff / (60 * 1000))}분) - 캐시 무효화`)
          await billCache.clearCache()
          
          // 캐시 무효화 이벤트 발생 (다른 컴포넌트에서 감지 가능)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cache-invalidated', { 
              detail: { reason: 'outdated', timeDiff } 
            }))
          }
        } else {
          console.log('✅ 캐시가 최신 상태')
        }
      }
    } catch (error) {
      console.error('업데이트 체크 실패:', error)
      // 체크 실패해도 에러 발생시키지 않음 (캐시 유지)
    }
  }

  // 동기화 중단
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    
    // 이벤트 리스너 정리
    if (this.cleanupListeners) {
      this.cleanupListeners()
      this.cleanupListeners = null
    }
    
    // Supabase 구독 해제
    this.supabase.removeAllChannels()
    console.log('🛑 캐시 동기화 중단됨')
  }

  // 수동 전체 동기화
  async forceSyncAll() {
    console.log('🔄 전체 캐시 강제 동기화...')
    
    try {
      // 모든 캐시 무효화
      await Promise.all([
        billCache.clearCache(),
        favoritesCache.clearAllCache()
      ])
      
      console.log('✅ 전체 캐시 무효화 완료')
      
      // 페이지 새로고침 권장
      if (typeof window !== 'undefined') {
        const shouldReload = confirm('캐시가 초기화되었습니다. 페이지를 새로고침하시겠습니까?')
        if (shouldReload) {
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('강제 동기화 실패:', error)
    }
  }

  // 캐시 상태 확인
  async getCacheStatus() {
    try {
      const [billMeta, billsCount] = await Promise.all([
        billCache.getCacheMetadata(),
        billCache.getCachedBills().then(bills => bills?.length || 0)
      ])

      return {
        bills: {
          cached: billsCount > 0,
          count: billsCount,
          lastUpdated: billMeta?.lastUpdated,
          size: billMeta?.totalCount
        },
        syncActive: this.syncInterval !== null
      }
    } catch (error) {
      console.error('캐시 상태 확인 실패:', error)
      return null
    }
  }

  // 강제 새로고침 콜백 등록
  registerForceRefreshCallback(callback: () => void) {
    this.forceRefreshCallbacks.add(callback)
    return () => this.forceRefreshCallbacks.delete(callback)
  }

  // 강제 새로고침 실행
  triggerForceRefresh() {
    console.log('🔄 강제 새로고침 트리거됨')
    this.forceRefreshCallbacks.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('강제 새로고침 콜백 실행 실패:', error)
      }
    })
  }

  // 캐시 완전 무효화 (새로고침시 사용)
  async invalidateAllCaches(triggerRefresh = false) {
    console.log('🧹 모든 캐시 무효화...')
    try {
      // 모든 캐시 클리어
      await billCache.clearCache()
      await favoritesCache.clearAllCache()
      
      // 전체 동기화 시간 갱신
      localStorage.setItem('lastFullCacheSync', Date.now().toString())
      
      // 필요시에만 강제 새로고침 트리거
      if (triggerRefresh) {
        this.triggerForceRefresh()
      }
      
      console.log('✅ 모든 캐시 무효화 완료')
      return true
    } catch (error) {
      console.error('❌ 캐시 무효화 실패:', error)
      return false
    }
  }
}

export const cacheSyncManager = new CacheSyncManager() 