import dynamic from 'next/dynamic'

// 동적 import로 클라이언트 컴포넌트 로드 (SSR 비활성화)
const BillPageClient = dynamic(() => import('@/components/bill-page-client'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  )
})

export default function BillPage() {
  return <BillPageClient />
}