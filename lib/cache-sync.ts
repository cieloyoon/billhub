import { billCache } from './bill-cache'
import { favoritesCache } from './favorites-cache'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

class CacheSyncManager {
  private supabase = createClient()
  private syncInterval: NodeJS.Timeout | null = null
  private lastSyncTime: number = 0
  private cleanupListeners: (() => void) | null = null

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
    // 페이지 포커스 시 동기화
    const handleFocus = async () => {
      const now = Date.now()
      const oneMinute = 60 * 1000 // 1분

      // 마지막 체크로부터 1분 이상 지났을 때만 동기화
      if (now - this.lastSyncTime > oneMinute) {
        console.log('👁️ 페이지 포커스 - 캐시 동기화 체크...')
        await this.checkForUpdates()
        this.lastSyncTime = now
      }
    }

    // 페이지 가시성 변경 감지
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        await handleFocus()
      }
    }

    // beforeunload 이벤트 (페이지 떠날 때)
    const handleBeforeUnload = () => {
      console.log('📤 페이지 종료 - 동기화 정리...')
      this.stopSync()
    }

    // 이벤트 리스너 등록
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 정리 함수 저장 (나중에 제거용)
    this.cleanupListeners = () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }

    // 초기 동기화 체크
    handleFocus()
  }

  // 업데이트 체크
  private async checkForUpdates() {
    try {
      // 캐시된 데이터의 최신 업데이트 시간 확인
      const cachedMeta = await billCache.getCacheMetadata()
      if (!cachedMeta) return

      // 실제 DB에서 최신 업데이트 시간 확인
      const { data: latestBill } = await this.supabase
        .from('bills')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (latestBill && new Date(latestBill.updated_at) > new Date(cachedMeta.lastUpdated)) {
        console.log('🔄 새로운 데이터 감지, 캐시 무효화...')
        await billCache.clearCache()
      }
    } catch (error) {
      console.error('업데이트 체크 실패:', error)
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
          size: billMeta?.totalSize
        },
        syncActive: this.syncInterval !== null
      }
    } catch (error) {
      console.error('캐시 상태 확인 실패:', error)
      return null
    }
  }
}

export const cacheSyncManager = new CacheSyncManager() 