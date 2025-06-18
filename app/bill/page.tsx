import BillPageClient from '@/components/bill-page-client'

// 동적 렌더링 강제 (static generation 방지)
export const dynamic = 'force-dynamic'

export default function BillPage() {
  return <BillPageClient />
}