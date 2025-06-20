import BillDetailClient from '@/components/bill-detail-client'

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

interface BillDetailPageProps {
  params: {
    id: string
  }
}

export default function BillDetailPage({ params }: BillDetailPageProps) {
  return <BillDetailClient billId={params.id} />
} 