'use client'

import { useRouter } from 'next/navigation'
import { FavoriteButton } from '@/components/favorite-button'
import { VoteButtons } from '@/components/vote-buttons'
import { VoteStats } from '@/components/vote-stats'
import { formatDateUTC } from '@/lib/utils'
import { useBillSync } from '@/hooks/use-bill-sync'

interface BaseBill {
  id?: number
  bill_id: string
  bill_no: string | null
  bill_name: string | null
  proposer_kind: string | null
  propose_dt: string | null
  proc_dt?: string | null
  general_result: string | null
  summary: string | null
  proc_stage_cd: string | null
  pass_gubn: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface BillCardProps {
  bill: BaseBill
  searchTerm?: string
  isFavorited?: boolean
  onFavoriteToggle?: (billId: string, isFav: boolean) => void
  onRemoveFavorite?: (billId: string) => void
  extraDateInfo?: string // 즐겨찾기 추가일 등
}

// 투표 상태에 따라 조건부로 통계를 보여주는 컴포넌트
function VoteStatsConditional({ billId }: { billId: string }) {
  const { getVote } = useBillSync()
  const currentVote = getVote(billId)
  
  // 투표하지 않았으면 안내 문구 표시
  if (!currentVote) {
    return (
      <div className="text-xs text-gray-500">
        결과 투표 후 확인 가능
      </div>
    )
  }
  
  return (
    <div className="text-xs text-gray-600">
      <span className="text-gray-500"></span>
      <VoteStats 
        billId={billId} 
        className="inline" 
      />
    </div>
  )
}

export function BillCard({
  bill,
  searchTerm = '',
  isFavorited = false,
  onFavoriteToggle,
  onRemoveFavorite,
  extraDateInfo
}: BillCardProps) {
  const router = useRouter()

  const highlightSearchTerm = (text: string | null, searchTerm: string) => {
    if (!text || !searchTerm) return text

    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark> : 
        part
    )
  }

  const getStatusBadgeColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    
    const statusColors: { [key: string]: string } = {
      // 처리구분
      '계류의안': 'bg-yellow-100 text-yellow-800',
      '처리의안': 'bg-green-100 text-green-800',
      
      // 처리결과
      '원안가결': 'bg-green-100 text-green-800',
      '수정가결': 'bg-blue-100 text-blue-800',
      '부결': 'bg-red-100 text-red-800',
      '폐기': 'bg-gray-100 text-gray-800',
      '철회': 'bg-gray-100 text-gray-800',
      '대안반영폐기': 'bg-purple-100 text-purple-800',
      '수정안반영폐기': 'bg-purple-100 text-purple-800',
      
      // 처리단계
      '접수': 'bg-blue-100 text-blue-800',
      '소관위접수': 'bg-blue-100 text-blue-800',
      '소관위심사': 'bg-yellow-100 text-yellow-800',
      '소관위심사보고': 'bg-yellow-100 text-yellow-800',
      '체계자구심사': 'bg-yellow-100 text-yellow-800',
      '본회의부의안건': 'bg-orange-100 text-orange-800',
      '본회의의결': 'bg-green-100 text-green-800',
      '정부이송': 'bg-green-100 text-green-800',
      '공포': 'bg-green-100 text-green-800',
      '재의요구': 'bg-red-100 text-red-800',
      '재의(가결)': 'bg-green-100 text-green-800',
      '재의(부결)': 'bg-red-100 text-red-800',
    }
    
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleFavoriteToggle = (isFav: boolean) => {
    if (onFavoriteToggle) {
      onFavoriteToggle(bill.bill_id, isFav)
    }
    // 즐겨찾기에서 제거하는 경우 (mybill 페이지)
    if (!isFav && onRemoveFavorite) {
      onRemoveFavorite(bill.bill_id)
    }
  }

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer group"
      onClick={() => router.push(`/bill/${bill.bill_id}`)}
    >
      <div className="w-full">
        <div className="flex justify-between items-start gap-4 mb-3">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors overflow-hidden flex-1" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
            {searchTerm ? 
              highlightSearchTerm(bill.bill_name || '제목 없음', searchTerm) : 
              (bill.bill_name || '제목 없음')
            }
          </h3>
          <div onClick={(e) => e.stopPropagation()}>
            <FavoriteButton 
              billId={bill.bill_id}
              initialIsFavorited={isFavorited}
              onToggle={handleFavoriteToggle}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
          <span>법안번호: <strong className="text-gray-800">
            {searchTerm ? 
              highlightSearchTerm(bill.bill_no || '-', searchTerm) : 
              (bill.bill_no || '-')
            }
          </strong></span>

          <span>제안일: <strong className="text-gray-800">{formatDateUTC(bill.propose_dt)}</strong></span>
          {bill.proc_dt && (
            <span>처리일: <strong className="text-gray-800">{formatDateUTC(bill.proc_dt)}</strong></span>
          )}
          {extraDateInfo && (
            <span className="text-blue-600 text-xs"><strong>{extraDateInfo}</strong></span>
          )}
        </div>

        {/* 상태 배지들 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {bill.pass_gubn && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.pass_gubn)}`}>
              {bill.pass_gubn}
            </span>
          )}
          {bill.proc_stage_cd && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.proc_stage_cd)}`}>
              {bill.proc_stage_cd}
            </span>
          )}
          {bill.general_result && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.general_result)}`}>
              {bill.general_result}
            </span>
          )}
        </div>

        {bill.summary && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 leading-relaxed overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'}}>
              {searchTerm ? 
                highlightSearchTerm(bill.summary, searchTerm) : 
                bill.summary
              }
            </p>
          </div>
        )}

        {/* 하단 액션 영역 */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div onClick={(e) => e.stopPropagation()}>
            <VoteButtons 
              billId={bill.bill_id} 
            />
          </div>
          <VoteStatsConditional 
            billId={bill.bill_id} 
          />
        </div>
      </div>
    </div>
  )
} 