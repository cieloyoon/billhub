// Bill Detail 페이지에서 사용하는 타입들 - 기존 타입 재사용
import { Bill, CommissionInfo, AdditionalApiInfo } from './bill'

export interface BillDetailTabsProps {
  commissionInfo: CommissionInfo | null
  additionalInfo: AdditionalApiInfo
  commissionLoading: boolean
  additionalLoading: boolean
  backgroundLoading?: boolean
  loadingProgress?: number
}

export interface BillDetailContentProps {
  bill: Bill | null
  commissionInfo: CommissionInfo | null
  additionalInfo: AdditionalApiInfo
  loading: boolean
  commissionLoading: boolean
  additionalLoading: boolean
  backgroundLoading?: boolean
  loadingProgress?: number
  error: string | null
  onBack: () => void
} 