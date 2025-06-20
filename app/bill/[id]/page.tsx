import BillDetailClient from '@/components/bill/bill-detail-client'

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

interface BillDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { id } = await params
  return <BillDetailClient billId={id} />
} 