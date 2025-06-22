'use client'

import React, { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFloatingWindow } from '@/hooks/use-floating-window'
import { Loading } from '@/components/ui/loading'
import BillDetailClient from '@/components/bill-detail-page/bill-detail-client'

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

interface BillDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function BillDetailPage({ params }: BillDetailPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openBillDetail } = useFloatingWindow()
  const isNewTab = searchParams.get('tab') === 'true'

  useEffect(() => {
    if (!isNewTab) {
      const initPage = async () => {
        const { id } = await params
        // 새 탭이 아닌 경우에만 플로팅 창으로 열고 홈으로 리다이렉트
        openBillDetail(id, `의안 ${id}`)
        router.replace('/')
      }
      
      initPage()
    }
  }, [params, router, openBillDetail, isNewTab])

  // 새 탭으로 열린 경우 일반 페이지 표시
  if (isNewTab) {
    return <BillDetailPageContent params={params} />
  }

  return <Loading message="의안 상세 정보 불러오는 중..." />
}

// 새 탭에서 보여줄 일반 페이지 컴포넌트
function BillDetailPageContent({ params }: BillDetailPageProps) {
  const [billId, setBillId] = React.useState<string>()

  useEffect(() => {
    const initPage = async () => {
      const { id } = await params
      setBillId(id)
    }
    
    initPage()
  }, [params])

  if (!billId) {
    return <Loading message="의안 상세 정보 불러오는 중..." />
  }

  return <BillDetailClient billId={billId} />
} 