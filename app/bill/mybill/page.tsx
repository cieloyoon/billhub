'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FavoriteButton } from '@/components/favorite-button'
import { VoteButtons } from '@/components/vote-buttons'
import { VoteStats } from '@/components/vote-stats'
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
  const [supabase, setSupabase] = useState<any>(null)

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

  const getStatusBadgeColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    
    const statusColors: { [key: string]: string } = {
      '계류의안': 'bg-yellow-100 text-yellow-800',
      '처리의안': 'bg-green-100 text-green-800',
      '원안가결': 'bg-green-100 text-green-800',
      '수정가결': 'bg-blue-100 text-blue-800',
      '부결': 'bg-red-100 text-red-800',
      '폐기': 'bg-gray-100 text-gray-800',
      '철회': 'bg-gray-100 text-gray-800',
      '대안반영폐기': 'bg-purple-100 text-purple-800',
    }
    
    return statusColors[status] || 'bg-gray-100 text-gray-800'
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
              <div 
                key={favorite.bill_id} 
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/bill/${favorite.bill_id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {favorite.bills.bill_name || '제목 없음'}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <span>법안번호: <strong>{favorite.bills.bill_no || '-'}</strong></span>
                      <span>제안자: <strong>{favorite.bills.proposer_kind || '-'}</strong></span>
                      <span>제안일: <strong>{formatDateUTC(favorite.bills.propose_dt)}</strong></span>
                      <span>즐겨찾기 추가일: <strong>{formatDateUTC(favorite.created_at)}</strong></span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <div className="flex items-center gap-2">
                      <FavoriteButton 
                        billId={favorite.bill_id}
                        initialIsFavorited={true}
                        onToggle={(isFav) => !isFav && handleRemoveFavorite(favorite.bill_id)}
                      />
                    </div>
                    <VoteButtons 
                      billId={favorite.bill_id} 
                    />
                    <VoteStats 
                      billId={favorite.bill_id} 
                      className="mt-2" 
                    />
                    {favorite.bills.pass_gubn && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(favorite.bills.pass_gubn)}`}>
                        {favorite.bills.pass_gubn}
                      </span>
                    )}
                    {favorite.bills.proc_stage_cd && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(favorite.bills.proc_stage_cd)}`}>
                        {favorite.bills.proc_stage_cd}
                      </span>
                    )}
                    {favorite.bills.general_result && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(favorite.bills.general_result)}`}>
                        {favorite.bills.general_result}
                      </span>
                    )}
                  </div>
                </div>

                {favorite.bills.summary && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">요약</h4>
                    <p className="text-sm text-gray-600 leading-relaxed max-h-32 overflow-y-auto">
                      {favorite.bills.summary}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    법안 ID: {favorite.bill_id}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/bill/${favorite.bill_id}`)
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    자세히 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 