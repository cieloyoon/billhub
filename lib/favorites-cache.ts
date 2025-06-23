import { Bill } from '@/types/bill-page'

interface FavoriteCacheData {
  favoriteIds: string[]
  favoriteDetails: Array<{
    bill_id: string
    created_at: string
    bills: Bill
  }>
  lastUpdated: number
  userId: string
}

class FavoritesCacheManager {
  private dbName = 'lawpage-favorites'
  private dbVersion = 2  // 버전 업
  private storeName = 'favorites'
  private cacheExpiry = 30 * 60 * 1000 // 30분
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

        // 기존 스토어 삭제 (필요시)
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName)
        }

        // 스토어 재생성
        const store = db.createObjectStore(this.storeName, { keyPath: 'userId' })
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false })

        console.log('즐겨찾기 IndexedDB 스키마 업그레이드 완료')
      }

      request.onblocked = () => {
        console.warn('IndexedDB 업그레이드가 차단됨. 다른 탭을 닫아주세요.')
      }
    })
  }

  async getCachedFavorites(userId: string): Promise<FavoriteCacheData | null> {
    try {
      const db = await this.initDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(userId)

        request.onsuccess = () => {
          const result = request.result as FavoriteCacheData | undefined
          
          if (!result) {
            console.log('즐겨찾기 캐시 미스 - 데이터 없음')
            resolve(null)
            return
          }

          // 캐시 만료 체크
          if (Date.now() - result.lastUpdated > this.cacheExpiry) {
            console.log('즐겨찾기 캐시 만료됨')
            resolve(null)
            return
          }

          console.log(`⚡ 즐겨찾기 캐시 히트! ${result.favoriteDetails.length}개 항목`)
          resolve(result)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('즐겨찾기 캐시 로드 실패:', error)
      return null
    }
  }

  async setCachedFavorites(
    userId: string, 
    favoriteIds: string[], 
    favoriteDetails: Array<{
      bill_id: string
      created_at: string
      bills: Bill
    }>
  ): Promise<void> {
    try {
      const db = await this.initDB()
      
      const cacheData: FavoriteCacheData = {
        userId,
        favoriteIds,
        favoriteDetails,
        lastUpdated: Date.now()
      }

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.put(cacheData)

        request.onsuccess = () => {
          console.log(`✅ 즐겨찾기 ${favoriteDetails.length}개 캐시 저장 완료`)
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('즐겨찾기 캐시 저장 실패:', error)
      throw error
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const db = await this.initDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.delete(userId)

        request.onsuccess = () => {
          console.log('즐겨찾기 캐시 무효화됨')
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('즐겨찾기 캐시 무효화 실패:', error)
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const db = await this.initDB()
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.clear()

        request.onsuccess = () => {
          console.log('모든 즐겨찾기 캐시 삭제됨')
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('즐겨찾기 캐시 삭제 실패:', error)
    }
  }

  // 즐겨찾기 ID 목록만 빠르게 가져오기 (메인 법안 데이터와 조합용)
  async getCachedFavoriteIds(userId: string): Promise<string[] | null> {
    const cached = await this.getCachedFavorites(userId)
    return cached ? cached.favoriteIds : null
  }

  // 단일 즐겨찾기 추가/제거시 캐시 업데이트
  async updateFavoriteInCache(
    userId: string, 
    billId: string, 
    action: 'add' | 'remove',
    billData?: Bill
  ): Promise<void> {
    try {
      const cached = await this.getCachedFavorites(userId)
      if (!cached) {
        console.log('캐시가 없어서 업데이트 건너뜀')
        return // 캐시가 없으면 업데이트하지 않음
      }

      if (action === 'add' && billData) {
        // 이미 있는지 체크
        if (!cached.favoriteIds.includes(billId)) {
          cached.favoriteIds.unshift(billId) // 최신이 앞에 오도록
          cached.favoriteDetails.unshift({
            bill_id: billId,
            created_at: new Date().toISOString(),
            bills: billData
          })
          console.log(`✅ 캐시에 즐겨찾기 추가: ${billId}`)
        }
      } else if (action === 'remove') {
        cached.favoriteIds = cached.favoriteIds.filter(id => id !== billId)
        cached.favoriteDetails = cached.favoriteDetails.filter(item => item.bill_id !== billId)
        console.log(`✅ 캐시에서 즐겨찾기 제거: ${billId}`)
      }

      cached.lastUpdated = Date.now()
      
      await this.setCachedFavorites(
        userId, 
        cached.favoriteIds, 
        cached.favoriteDetails
      )

      // 브라우저 이벤트 발생 (관심의안 페이지 실시간 업데이트용)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('favoritesUpdated', {
          detail: { userId, billId, action, favorites: cached.favoriteDetails }
        }))
      }
    } catch (error) {
      console.error('즐겨찾기 캐시 업데이트 실패:', error)
    }
  }
}

export const favoritesCache = new FavoritesCacheManager() 