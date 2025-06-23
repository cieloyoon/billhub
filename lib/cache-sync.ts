import { billCache } from './bill-cache'
import { favoritesCache } from './favorites-cache'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Bill } from '@/types/bill-page'

// 전역 데이터 상태 관리
interface GlobalDataState {
  bills: Bill[] | null
  totalCount: number
  lastLoaded: number
  isLoading: boolean
  error: string | null
  recentUpdated: Array<{
    bill_id: string
    tracked_at: string
    old_value: string
    new_value: string
    bills: Bill
  }> | null
  recentUpdatedLastLoaded: number
}

class CacheSyncManager {
  private supabase = createClient()
  private syncInterval: NodeJS.Timeout | null = null
  private lastSyncTime: number = 0
  private cleanupListeners: (() => void) | null = null
  private forceRefreshCallbacks: Set<() => void> = new Set()
  
  // 전역 데이터 상태
  private globalDataState: GlobalDataState = {
    bills: null,
    totalCount: 0,
    lastLoaded: 0,
    isLoading: false,
    error: null,
    recentUpdated: null,
    recentUpdatedLastLoaded: 0
  }
  
  // 전역 상태 변경 콜백들
  private dataStateCallbacks: Set<(state: GlobalDataState) => void> = new Set()
  
  // 전역 데이터 상태 구독
  subscribeToGlobalData(callback: (state: GlobalDataState) => void) {
    this.dataStateCallbacks.add(callback)
    
    // 즉시 현재 상태 전달
    callback({ ...this.globalDataState })
    
    // 구독 해제 함수 반환
    return () => {
      this.dataStateCallbacks.delete(callback)
    }
  }
  
  // 전역 상태 업데이트 및 콜백 호출
  private updateGlobalState(updates: Partial<GlobalDataState>) {
    this.globalDataState = { ...this.globalDataState, ...updates }
    
    // 모든 구독자에게 상태 변경 알림
    this.dataStateCallbacks.forEach(callback => {
      try {
        callback({ ...this.globalDataState })
      } catch (error) {
        console.error('전역 상태 콜백 에러:', error)
      }
    })
  }
  
  // 전역 데이터 로드 (한 번만 실행)
  async loadGlobalData(force = false): Promise<Bill[] | null> {
    // 이미 로딩 중이면 대기
    if (this.globalDataState.isLoading && !force) {
      console.log('⏳ 이미 전역 데이터 로딩 중...')
      return this.globalDataState.bills
    }
    
    // 이미 로드된 데이터가 있고 강제가 아니면 재사용
    if (this.globalDataState.bills && this.globalDataState.bills.length > 0 && !force) {
      const timeSinceLoad = Date.now() - this.globalDataState.lastLoaded
      const oneHour = 60 * 60 * 1000
      
      if (timeSinceLoad < oneHour) {
        console.log('✨ 전역 캐시 데이터 재사용 (로드 후 ' + Math.round(timeSinceLoad/1000/60) + '분 경과)')
        return this.globalDataState.bills
      }
    }
    
    console.log('🚀 전역 데이터 로딩 시작...')
    this.updateGlobalState({ isLoading: true, error: null })
    
    try {
      // 1. 캐시에서 먼저 시도
      let bills = await billCache.getCachedBills()
      
      if (bills && bills.length > 0) {
        console.log(`💾 캐시에서 ${bills.length}개 전역 데이터 로드`)
        this.updateGlobalState({
          bills,
          totalCount: bills.length,
          lastLoaded: Date.now(),
          isLoading: false
        })
        return bills
      }
      
      // 2. 캐시에 없으면 DB에서 로드
      console.log('🔄 DB에서 전역 데이터 로딩...')
      
      // 전체 개수 확인
      const { count } = await this.supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
      
      const totalCount = count || 0
      console.log(`📊 전체 법안 개수: ${totalCount}개`)
      
      // 전체 데이터 로드 (병렬 처리)
      bills = await this.loadAllBillsParallel(totalCount)
      
      if (bills && bills.length > 0) {
        // 캐시에 저장
        await billCache.setCachedBills(bills, bills.length)
        
        this.updateGlobalState({
          bills,
          totalCount: bills.length,
          lastLoaded: Date.now(),
          isLoading: false
        })
        
        console.log(`✅ 전역 데이터 로딩 완료: ${bills.length}개`)
        return bills
      }
      
      throw new Error('데이터 로딩 실패')
      
    } catch (error) {
      console.error('❌ 전역 데이터 로딩 실패:', error)
      this.updateGlobalState({
        isLoading: false,
        error: error instanceof Error ? error.message : '데이터 로딩 실패'
      })
      return null
    }
  }
  
  // 병렬로 모든 법안 데이터 로드
  private async loadAllBillsParallel(totalCount: number): Promise<Bill[]> {
    const SUPABASE_LIMIT = 1000
    const maxConcurrentChunks = 6
    const allBills: Bill[] = []
    let offset = 0
    
    console.log(`🏭 병렬 로딩 시작 - 총 ${totalCount}개를 ${SUPABASE_LIMIT}개씩 ${maxConcurrentChunks}개 동시처리`)
    
    while (offset < totalCount) {
      const chunkPromises: Promise<Bill[]>[] = []
      
      // 6개 청크 동시 처리
      for (let i = 0; i < maxConcurrentChunks && offset < totalCount; i++) {
        const currentOffset = offset
        const currentLimit = Math.min(SUPABASE_LIMIT, totalCount - offset)
        
        const chunkPromise = this.supabase
          .from('bills')
          .select('*')
          .order('propose_dt', { ascending: false, nullsFirst: false })
          .order('bill_no', { ascending: false, nullsFirst: false })
          .range(currentOffset, currentOffset + currentLimit - 1)
          .then(({ data, error }) => {
            if (error) {
              console.error(`❌ 청크 ${currentOffset}-${currentOffset + currentLimit} 실패:`, error)
              return []
            }
            const bills = data || []
            console.log(`⚡ 청크 완료: ${bills.length}개 (${currentOffset}-${currentOffset + currentLimit})`)
            return bills
          })
        
        chunkPromises.push(chunkPromise)
        offset += currentLimit
      }
      
      // 현재 배치 완료 대기
      const batchResults = await Promise.allSettled(chunkPromises)
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          allBills.push(...result.value)
        }
      })
      
      console.log(`📈 진행률: ${Math.round((allBills.length / totalCount) * 100)}% (${allBills.length}/${totalCount}개)`)
      
      // 배치 간 짧은 대기
      if (offset < totalCount) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    // 최종 정렬
    return allBills.sort((a, b) => {
      const aDate = new Date(a.propose_dt || '').getTime()
      const bDate = new Date(b.propose_dt || '').getTime()
      if (bDate !== aDate) return bDate - aDate
      
      const aNum = parseInt(a.bill_no?.replace(/\D/g, '') || '0')
      const bNum = parseInt(b.bill_no?.replace(/\D/g, '') || '0')
      return bNum - aNum
    })
  }
  
  // 전역 데이터 가져오기 (로드되지 않았으면 로드)
  async getGlobalData(): Promise<Bill[] | null> {
    if (this.globalDataState.bills && this.globalDataState.bills.length > 0) {
      return this.globalDataState.bills
    }
    
    return await this.loadGlobalData()
  }
  
  // 전역 데이터 강제 새로고침
  async refreshGlobalData(): Promise<Bill[] | null> {
    console.log('🔄 전역 데이터 강제 새로고침...')
    return await this.loadGlobalData(true)
  }
  
  // 최근 진행 단계 변경 데이터 로드
  async loadRecentUpdatedData(force = false): Promise<Array<{
    bill_id: string
    tracked_at: string
    old_value: string
    new_value: string
    bills: Bill
  }> | null> {
    // 이미 로드된 데이터가 있고 강제가 아니면 재사용
    if (this.globalDataState.recentUpdated && !force) {
      const timeSinceLoad = Date.now() - this.globalDataState.recentUpdatedLastLoaded
      const thirtyMinutes = 30 * 60 * 1000 // 30분 캐시 (더 자주 갱신)
      
      if (timeSinceLoad < thirtyMinutes) {
        console.log('✨ 최근 진행 단계 변경 캐시 재사용 (로드 후 ' + Math.round(timeSinceLoad/1000/60) + '분 경과)')
        return this.globalDataState.recentUpdated
      }
    }
    
    console.log('🔄 최근 진행 단계 변경 데이터 로딩...')
    
    try {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const { data, error } = await this.supabase
        .from('bill_history')
        .select(`
          bill_id, 
          bill_no, 
          bill_name, 
          tracked_at,
          old_value,
          new_value,
          bills!inner(*)
        `)
        .eq('change_type', 'stage_changed')
        .gte('tracked_at', oneWeekAgo.toISOString())
        .order('tracked_at', { ascending: false })
        .order('bill_no', { ascending: false })

      if (error) throw error

      // 타입 안전하게 변환
      const typedData = (data || []).map(item => ({
        bill_id: item.bill_id,
        tracked_at: item.tracked_at,
        old_value: item.old_value,
        new_value: item.new_value,
        bills: Array.isArray(item.bills) ? item.bills[0] : item.bills
      }))

      // 전역 상태 업데이트
      this.updateGlobalState({
        recentUpdated: typedData,
        recentUpdatedLastLoaded: Date.now()
      })
      
      console.log(`✅ 최근 진행 단계 변경 데이터 로드 완료: ${typedData.length}개`)
      return typedData
      
    } catch (error) {
      console.error('❌ 최근 진행 단계 변경 데이터 로드 실패:', error)
      this.updateGlobalState({
        recentUpdated: [],
        recentUpdatedLastLoaded: Date.now()
      })
      return []
    }
  }
  
  // 최근 진행 단계 변경 데이터 가져오기
  async getRecentUpdatedData(): Promise<Array<{
    bill_id: string
    tracked_at: string
    old_value: string
    new_value: string
    bills: Bill
  }> | null> {
    if (this.globalDataState.recentUpdated) {
      return this.globalDataState.recentUpdated
    }
    
    return await this.loadRecentUpdatedData()
  }

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

  // 업데이트 체크 (병렬처리 개선 버전)
  private async checkForUpdates() {
    try {
      console.log('🔍 캐시 동기화 체크 중...')

      // 병렬로 캐시 메타데이터와 최신 법안 정보 동시 가져오기
      const [cachedMeta, latestBillResponse] = await Promise.allSettled([
        billCache.getCacheMetadata(),
        this.supabase
          .from('bills')
          .select('updated_at, propose_dt, bill_no')
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .single()
      ])

      // 캐시 메타데이터 체크
      if (cachedMeta.status === 'rejected' || !cachedMeta.value) {
        console.log('📭 캐시 메타데이터 없음 - 동기화 불필요')
        return
      }

      // 최신 법안 정보 체크
      if (latestBillResponse.status === 'rejected' || !latestBillResponse.value.data) {
        console.log('⚠️ 최신 법안 정보 가져오기 실패 - 동기화 스킵')
        return
      }

      const latestBill = latestBillResponse.value.data
      const latestUpdate = new Date(latestBill.updated_at).getTime()
      const cacheTime = cachedMeta.value.lastUpdated
      const timeDiff = latestUpdate - cacheTime

      console.log(`📊 동기화 체크: 최신 업데이트 ${new Date(latestUpdate).toLocaleString()}, 캐시 ${new Date(cacheTime).toLocaleString()}`)

      // 캐시가 1시간 이상 오래되었거나 새로운 업데이트가 있으면 무효화
      if (timeDiff > 60 * 60 * 1000) { // 1시간
        console.log(`🔄 캐시가 오래됨 (${Math.round(timeDiff / (60 * 1000))}분) - 캐시 무효화`)
        
        // 캐시 무효화도 병렬로 처리
        await Promise.allSettled([
          billCache.clearCache(),
          favoritesCache.clearAllCache()
        ])
        
        // 캐시 무효화 이벤트 발생 (다른 컴포넌트에서 감지 가능)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cache-invalidated', { 
            detail: { reason: 'outdated', timeDiff } 
          }))
        }
      } else {
        console.log('✅ 캐시가 최신 상태')
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