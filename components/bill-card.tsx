'use client'

import { useRouter } from 'next/navigation'
import { Calendar, User, FileText, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import { FavoriteButton } from '@/components/favorite-button'
import { VoteButtons } from '@/components/vote-buttons'
import { VoteStats } from '@/components/vote-stats'
import { formatDateUTC } from '@/lib/utils'
import { useBillSync } from '@/hooks/use-bill-sync'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
  extraDateInfo?: string
}

// 투표 상태에 따라 조건부로 통계를 보여주는 컴포넌트
function VoteStatsConditional({ billId }: { billId: string }) {
  const { getVote } = useBillSync()
  const currentVote = getVote(billId)
  
  // 투표하지 않았으면 안내 문구 표시
  if (!currentVote) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
        <TrendingUp className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">투표 후 결과 확인 가능</span>
      </div>
    )
  }
  
  return (
    <div className="text-xs text-muted-foreground flex justify-end">
      <VoteStats 
        billId={billId} 
        className="inline truncate" 
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
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{part}</mark> : 
        part
    )
  }

  const getStatusBadgeVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return 'secondary'
    
    const statusColors: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      // 처리구분
      '계류의안': 'outline',
      '처리의안': 'default',
      
      // 처리결과
      '원안가결': 'default',
      '수정가결': 'default',
      '부결': 'destructive',
      '폐기': 'secondary',
      '철회': 'secondary',
      '대안반영폐기': 'outline',
      '수정안반영폐기': 'outline',
      
      // 처리단계
      '접수': 'outline',
      '소관위접수': 'outline',
      '소관위심사': 'outline',
      '소관위심사보고': 'outline',
      '체계자구심사': 'outline',
      '본회의부의안건': 'outline',
      '본회의의결': 'default',
      '정부이송': 'default',
      '공포': 'default',
      '재의요구': 'destructive',
      '재의(가결)': 'default',
      '재의(부결)': 'destructive',
    }
    
    return statusColors[status] || 'secondary'
  }

  const getStatusIcon = (status: string | null) => {
    if (!status) return null
    
    if (['원안가결', '수정가결', '본회의의결', '정부이송', '공포', '재의(가결)'].includes(status)) {
      return <CheckCircle className="h-3 w-3" />
    }
    if (['부결', '재의요구', '재의(부결)'].includes(status)) {
      return <XCircle className="h-3 w-3" />
    }
    if (['계류의안', '소관위심사', '본회의부의안건'].includes(status)) {
      return <Clock className="h-3 w-3" />
    }
    return null
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

  const handleClick = () => {
    router.push(`/bill/${bill.bill_id}`)
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500 hover:border-l-blue-600 h-full flex flex-col pb-0" onClick={handleClick}>
      {/* ========== 상단 구역: 제목과 기본 정보 ========== */}
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-foreground group-hover:text-blue-600 transition-colors line-clamp-2 mb-3 leading-tight">
              {searchTerm ? 
                highlightSearchTerm(bill.bill_name || '제목 없음', searchTerm) : 
                (bill.bill_name || '제목 없음')
              }
            </CardTitle>
            
            {/* 상태 배지들 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {bill.pass_gubn && (
                <Badge variant={getStatusBadgeVariant(bill.pass_gubn)} className="text-xs flex items-center gap-1">
                  {getStatusIcon(bill.pass_gubn)}
                  {bill.pass_gubn}
                </Badge>
              )}
              {bill.proc_stage_cd && (
                <Badge variant={getStatusBadgeVariant(bill.proc_stage_cd)} className="text-xs flex items-center gap-1">
                  {getStatusIcon(bill.proc_stage_cd)}
                  {bill.proc_stage_cd}
                </Badge>
              )}
              {bill.general_result && (
                <Badge variant={getStatusBadgeVariant(bill.general_result)} className="text-xs flex items-center gap-1">
                  {getStatusIcon(bill.general_result)}
                  {bill.general_result}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium">
                  {searchTerm ? 
                    highlightSearchTerm(bill.bill_no || '-', searchTerm) : 
                    (bill.bill_no || '-')
                  }
                </span>
              </div>
              
              {bill.proposer_kind && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{bill.proposer_kind}</span>
                </div>
              )}
            </div>
          </div>
          
          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            <FavoriteButton 
              billId={bill.bill_id}
              initialIsFavorited={isFavorited}
              onToggle={handleFavoriteToggle}
            />
          </div>
        </div>
      </CardHeader>

      {/* ========== 중단 구역: 내용 요약 ========== */}
      <CardContent className="flex-1 px-6 py-0 pb-4">
        {/* 법안 내용 요약 */}
        {bill.summary ? (
          <CardDescription className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
            {searchTerm ? 
              highlightSearchTerm(bill.summary, searchTerm) : 
              bill.summary
            }
          </CardDescription>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            법안 요약 정보가 없습니다.
          </div>
        )}
      </CardContent>

      {/* ========== 날짜 정보 - 하단 경계선 바로 위 ========== */}
      <div className="px-6 pb-1">
        <div className="flex justify-end">
          <div className="text-right">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-end gap-2">
                <span>발의: {formatDateUTC(bill.propose_dt)}</span>
                <Calendar className="h-3 w-3 flex-shrink-0" />
              </div>
              {bill.proc_dt && (
                <div className="flex items-center justify-end gap-2">
                  <span>처리: {formatDateUTC(bill.proc_dt)}</span>
                  <Clock className="h-3 w-3 flex-shrink-0" />
                </div>
              )}
              {extraDateInfo && (
                <div className="flex items-center justify-end gap-2 text-blue-600 font-medium">
                  <span>{extraDateInfo}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== 하단 구역: 찬반 버튼과 통계 (세로 가운데 정렬) ========== */}
      <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0 flex items-center">
        <div className="flex justify-between items-center w-full">
          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            <VoteButtons 
              billId={bill.bill_id}
              className="gap-1"
            />
          </div>
          
          <div className="text-right flex-shrink-0 ml-4">
            <VoteStatsConditional billId={bill.bill_id} />
          </div>
        </div>
      </div>
    </Card>
  )
} 