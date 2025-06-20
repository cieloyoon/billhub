'use client'

import { BillCard } from '@/components/bill/bill-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateUTC } from '@/lib/utils'
import { useRouter } from 'next/navigation'

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

interface FavoritesGridProps {
  favorites: FavoriteBill[]
  viewMode: 'grid' | 'list'
  onRemoveFavorite: (billId: string) => void
}

export function FavoritesGrid({
  favorites,
  viewMode,
  onRemoveFavorite
}: FavoritesGridProps) {
  const router = useRouter()

  if (favorites.length === 0) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">⭐</div>
          <h3 className="text-lg font-semibold mb-2">즐겨찾기한 법안이 없습니다</h3>
          <p className="text-gray-600 mb-4">
            관심 있는 법안에 별표를 눌러 즐겨찾기에 추가해보세요
          </p>
          <Button onClick={() => router.push('/bill')} variant="default">
            법안 목록 보기
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`grid gap-6 ${
      viewMode === 'grid' 
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
        : 'grid-cols-1'
    }`}>
      {favorites.map((favorite) => (
        <BillCard
          key={favorite.bill_id}
          bill={favorite.bills}
          isFavorited={true}
          onFavoriteToggle={() => {}}
          onRemoveFavorite={onRemoveFavorite}
          extraDateInfo={`즐겨찾기 추가일: ${formatDateUTC(favorite.created_at)}`}
        />
      ))}
    </div>
  )
} 