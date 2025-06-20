'use client'

import { ArrowLeft, AlertCircle, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface BillDetailStatesProps {
  loading: boolean
  error: string | null
  billNotFound: boolean
  onBack: () => void
}

export function BillDetailLoadingState() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function BillDetailErrorState({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-900 mb-2">오류가 발생했습니다</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
      </CardContent>
    </Card>
  )
}

export function BillDetailNotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">의안을 찾을 수 없습니다</h2>
        <p className="text-gray-600 mb-6">요청하신 의안이 존재하지 않습니다.</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
      </CardContent>
    </Card>
  )
} 