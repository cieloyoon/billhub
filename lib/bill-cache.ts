import { Bill } from '@/types/bill-page'

interface CacheMetadata {
  lastUpdated: number
  version: string
  totalCount: number
}

interface CachedData {
  bills: Bill[]
  metadata: CacheMetadata
}

class BillCacheManager {
  private dbName = 'lawpage-bills'
  private dbVersion = 2
  private billsStore = 'bills'
  private metadataStore = 'metadata'
  private cacheExpiry = 24 * 60 * 60 * 1000 // 24시간
  private db: IDBDatabase | null = null

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('IndexedDB 초기화 실패:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = (event.target as IDBOpenDBRequest).transaction!

        // 기존 스토어 삭제 (필요시)
        if (db.objectStoreNames.contains(this.billsStore)) {
          db.deleteObjectStore(this.billsStore)
        }
        if (db.objectStoreNames.contains(this.metadataStore)) {
          db.deleteObjectStore(this.metadataStore)
        }

        // Bills 스토어 재생성
        const billsStore = db.createObjectStore(this.billsStore, { keyPath: 'bill_id' })
        billsStore.createIndex('propose_dt', 'propose_dt', { unique: false })
        billsStore.createIndex('proc_dt', 'proc_dt', { unique: false })
        billsStore.createIndex('bill_no', 'bill_no', { unique: false })

        // Metadata 스토어 재생성
        db.createObjectStore(this.metadataStore, { keyPath: 'key' })

        console.log('IndexedDB 스키마 업그레이드 완료')
      }

      request.onblocked = () => {
        console.warn('IndexedDB 업그레이드가 차단됨. 다른 탭을 닫아주세요.')
      }
    })
  }

  async getCachedBills(): Promise<Bill[] | null> {
    try {
      const db = await this.initDB()
      
      // 캐시 메타데이터 확인
      const metadata = await this.getMetadata()
      if (!metadata || this.isCacheExpired(metadata.lastUpdated)) {
        console.log('캐시가 만료되었거나 존재하지 않음')
        return null
      }

      // 캐시된 법안 데이터 가져오기
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.billsStore], 'readonly')
        const store = transaction.objectStore(this.billsStore)
        const request = store.getAll()

        request.onsuccess = () => {
          const bills = request.result as Bill[]
          console.log(`캐시에서 ${bills.length}개 법안 로드됨`)
          resolve(bills)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('캐시 로드 실패:', error)
      return null
    }
  }

  async setCachedBills(bills: Bill[], totalCount: number): Promise<void> {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.billsStore, this.metadataStore], 'readwrite')

      // 기존 데이터 삭제 후 새 데이터 저장
      const billsStore = transaction.objectStore(this.billsStore)
      await new Promise<void>((resolve, reject) => {
        const clearRequest = billsStore.clear()
        clearRequest.onsuccess = () => resolve()
        clearRequest.onerror = () => reject(clearRequest.error)
      })

      // 병렬 배치 저장으로 더 빠르게 처리
      const batchSize = 1000 // 배치 크기 대폭 증가 (200 → 1000)
      const maxConcurrentBatches = 3 // 동시 처리할 배치 수
      
      console.log(`🚀 ${bills.length}개 법안을 ${batchSize}개씩 ${maxConcurrentBatches}개 배치로 병렬 저장 시작`)

      for (let i = 0; i < bills.length; i += batchSize * maxConcurrentBatches) {
        // 여러 배치를 동시에 처리
        const concurrentBatches = []
        
        for (let j = 0; j < maxConcurrentBatches && (i + j * batchSize) < bills.length; j++) {
          const startIdx = i + j * batchSize
          const endIdx = Math.min(startIdx + batchSize, bills.length)
          const batch = bills.slice(startIdx, endIdx)
          
          // 각 배치를 병렬로 저장
          const batchPromise = Promise.all(
            batch.map(bill => new Promise<void>((resolve, reject) => {
              const request = billsStore.add(bill)
              request.onsuccess = () => resolve()
              request.onerror = () => reject(request.error)
            }))
          )
          
          concurrentBatches.push(batchPromise)
        }
        
        // 모든 병렬 배치 완료 대기
        await Promise.all(concurrentBatches)
        
        // 진행률 표시
        const processedCount = Math.min(i + batchSize * maxConcurrentBatches, bills.length)
        const progress = Math.round((processedCount / bills.length) * 100)
        console.log(`⚡ 병렬 캐시 저장 진행률: ${progress}% (${processedCount}/${bills.length})`)
      }

      // 메타데이터 업데이트
      const metadataStore = transaction.objectStore(this.metadataStore)
      const metadata: CacheMetadata = {
        lastUpdated: Date.now(),
        version: '2.0', // 병렬처리 버전
        totalCount
      }

      await new Promise<void>((resolve, reject) => {
        const request = metadataStore.put({ key: 'main', ...metadata })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      console.log(`✅ ${bills.length}개 법안 데이터를 병렬 캐시에 저장완료`)
    } catch (error) {
      console.error('캐시 저장 실패:', error)
      throw error
    }
  }

  async getMetadata(): Promise<CacheMetadata | null> {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.metadataStore], 'readonly')
        const store = transaction.objectStore(this.metadataStore)
        const request = store.get('main')

        request.onsuccess = () => {
          const result = request.result
          resolve(result ? {
            lastUpdated: result.lastUpdated,
            version: result.version,
            totalCount: result.totalCount
          } : null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('메타데이터 로드 실패:', error)
      return null
    }
  }

  private isCacheExpired(lastUpdated: number): boolean {
    return Date.now() - lastUpdated > this.cacheExpiry
  }

  async clearCache(): Promise<void> {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([this.billsStore, this.metadataStore], 'readwrite')
      
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore(this.billsStore).clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore(this.metadataStore).clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      ])

      console.log('캐시가 삭제되었습니다')
    } catch (error) {
      console.error('캐시 삭제 실패:', error)
    }
  }

  // getCacheMetadata 별칭 추가 (cache-sync.ts 호환성을 위해)
  async getCacheMetadata(): Promise<CacheMetadata | null> {
    return this.getMetadata()
  }

  async getCacheStats(): Promise<{ size: number; lastUpdated: Date | null; totalCount: number }> {
    try {
      const bills = await this.getCachedBills()
      const metadata = await this.getMetadata()
      
      return {
        size: bills?.length || 0,
        lastUpdated: metadata ? new Date(metadata.lastUpdated) : null,
        totalCount: metadata?.totalCount || 0
      }
    } catch (error) {
      console.error('캐시 통계 로드 실패:', error)
      return { size: 0, lastUpdated: null, totalCount: 0 }
    }
  }
}

export const billCache = new BillCacheManager() 