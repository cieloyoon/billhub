'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'
import { BillCard } from '@/components/bill-card'
import { ArrowLeft } from 'lucide-react'
import { formatDateUTC } from '@/lib/utils'

interface FavoriteBill {
  bill_id: string
  created_at: string
  bills: {
    id: number
    bill_id: string
    bill_no: string | null
    bill_name: string | null
    proposer_kind: string | null
    propose_dt: string | null
    general_result: string | null
    proc_stage_cd: string | null
    pass_gubn: string | null
    summary: string | null
  }
}

export default function MyBillPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    try {
      const client = createClient()
      setSupabase(client)
    } catch {
      setError('서비스에 연결할 수 없습니다.')
      setLoading(false)
    }
  }, [])

  const loadFavorites = useCallback(async () => {
    if (!supabase) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/api/favorites')
      if (response.ok) {
        const { favorites: favoritesList } = await response.json()
        // 의안번호 내림차순으로 정렬
        const sortedFavorites = favoritesList.sort((a: FavoriteBill, b: FavoriteBill) => {
          const aIsNumber = /^\d/.test(a.bills.bill_no || '')
          const bIsNumber = /^\d/.test(b.bills.bill_no || '')
          
          // 숫자로 시작하는 것을 앞에, 문자로 시작하는 것을 뒤에
          if (aIsNumber && !bIsNumber) return -1
          if (!aIsNumber && bIsNumber) return 1
          
          // 둘 다 숫자로 시작하면 숫자 값으로 내림차순 정렬
          if (aIsNumber && bIsNumber) {
            const aNum = parseInt(a.bills.bill_no || '0', 10)
            const bNum = parseInt(b.bills.bill_no || '0', 10)
            return bNum - aNum
          }
          
          // 둘 다 문자로 시작하면 문자열로 내림차순 정렬
          return (b.bills.bill_no || '').localeCompare(a.bills.bill_no || '')
        })
        setFavorites(sortedFavorites)
      } else {
        const errorData = await response.json()
        setError(errorData.error || '즐겨찾기 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
      setError('즐겨찾기 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (supabase) {
      loadFavorites()
    }
  }, [supabase, loadFavorites])

  const handleRemoveFavorite = (billId: string) => {
    setFavorites(prev => prev.filter(fav => fav.bill_id !== billId))
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">즐겨찾기 목록을 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={loadFavorites}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">내 즐겨찾기</h1>
          </div>
          <p className="text-gray-600">즐겨찾기로 저장한 법안들을 확인할 수 있습니다.</p>
        </div>

        {/* 즐겨찾기 목록 */}
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">즐겨찾기한 법안이 없습니다.</div>
            <div className="text-sm text-gray-400 mb-4">
              관심 있는 법안에 별표를 눌러 즐겨찾기에 추가해보세요.
            </div>
            <button
              onClick={() => router.push('/bill')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              법안 목록 보기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <BillCard
                key={favorite.bill_id}
                bill={favorite.bills}
                isFavorited={true}
                onFavoriteToggle={() => {}}
                onRemoveFavorite={handleRemoveFavorite}
                extraDateInfo={`즐겨찾기 추가일: ${formatDateUTC(favorite.created_at)}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 