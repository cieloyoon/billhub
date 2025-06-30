'use client'

import { BillCard } from './bill-card'
import { Bill } from '@/types/bill'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ChangedBillData {
  bill_id: string
  tracked_at: string
  old_value: string
  new_value: string
  bills: Bill
}

interface ChangedBillCardProps {
  item: ChangedBillData
  searchTerm?: string
  isFavorited: (billId: string) => boolean
  onFavoriteToggle: (billId: string, isFav: boolean) => void
  dateFormat?: 'full' | 'date-only'
}

export function ChangedBillCard({
  item,
  searchTerm = '',
  isFavorited,
  onFavoriteToggle,
  dateFormat = 'date-only'
}: ChangedBillCardProps) {
  const changeDate = dateFormat === 'full' 
    ? new Date(item.tracked_at).toLocaleDateString('ko-KR')
    : format(new Date(item.tracked_at), 'yyyy.MM.dd', { locale: ko })
  
  const statusChangeInfo = `🔄 ${item.old_value} → ${item.new_value} (${changeDate})`
  
  return (
    <BillCard
      key={`${item.bill_id}-${item.tracked_at}`}
      bill={item.bills}
      searchTerm={searchTerm}
      isFavorited={isFavorited(item.bill_id)}
      onFavoriteToggle={onFavoriteToggle}
      extraDateInfo={statusChangeInfo}
    />
  )
} 