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
  private dbVersion = 1
  private billsStore = 'bills'
  private metadataStore = 'metadata'
  private cacheExpiry = 24 * 60 * 60 * 1000 // 24시간
  private db: IDBDatabase | null = null

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Bills 스토어
        if (!db.objectStoreNames.contains(this.billsStore)) {
          const billsStore = db.createObjectStore(this.billsStore, { keyPath: 'bill_id' })
          billsStore.createIndex('propose_dt', 'propose_dt', { unique: false })
          billsStore.createIndex('proc_dt', 'proc_dt', { unique: false })
          billsStore.createIndex('bill_no', 'bill_no', { unique: false })
        }

        // Metadata 스토어
        if (!db.objectStoreNames.contains(this.metadataStore)) {
          db.createObjectStore(this.metadataStore, { keyPath: 'key' })
        }
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

      // 새 법안 데이터 저장 (배치로 처리)
      const batchSize = 100
      for (let i = 0; i < bills.length; i += batchSize) {
        const batch = bills.slice(i, i + batchSize)
        await Promise.all(
          batch.map(bill => new Promise<void>((resolve, reject) => {
            const request = billsStore.add(bill)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          }))
        )
        
        // 진행률 표시
        const progress = Math.round(((i + batch.length) / bills.length) * 100)
        console.log(`캐시 저장 진행률: ${progress}%`)
      }

      // 메타데이터 업데이트
      const metadataStore = transaction.objectStore(this.metadataStore)
      const metadata: CacheMetadata = {
        lastUpdated: Date.now(),
        version: '1.0',
        totalCount
      }

      await new Promise<void>((resolve, reject) => {
        const request = metadataStore.put({ key: 'main', ...metadata })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      console.log(`✅ ${bills.length}개 법안 데이터를 캐시에 저장완료`)
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