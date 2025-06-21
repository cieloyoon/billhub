'use client'

import { ArrowLeft, AlertCircle, FileText, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface BillDetailStatesProps {
  loading: boolean
  error: string | null
  billNotFound: boolean
  onBack: () => void
}

// 기본 로딩 상태 - 의안 기본 정보 로딩
export function BillDetailLoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 헤더 스켈레톤 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 탭 스켈레톤 */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로딩 인디케이터 */}
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">의안 정보를 불러오는 중...</span>
        </div>
      </div>
    </div>
  )
}

// 탭 내용 로딩 상태 - 위원회심사 정보 등
export function TabContentLoadingState({ message = '정보를 불러오는 중...' }: { message?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">{message}</span>
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 부분 로딩 상태 - 특정 섹션 로딩
export function SectionLoadingState({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/20">
      <CardContent className="pt-6">
        <div className="flex items-center justify-center py-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {title}
              </Badge>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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

// 프로그레스 로딩 상태 - 단계별 로딩 진행률 표시
export function ProgressLoadingState({ 
  steps, 
  currentStep, 
  message 
}: { 
  steps: string[]
  currentStep: number
  message?: string 
}) {
  const progress = Math.round((currentStep / steps.length) * 100)
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-lg font-medium">의안 정보 로딩 중</span>
            </div>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>

          {/* 프로그레스 바 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">진행률</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 단계 표시 */}
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                  index < currentStep 
                    ? 'bg-green-500 text-white' 
                    : index === currentStep 
                    ? 'bg-primary text-white animate-pulse' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span className={`text-sm ${
                  index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step}
                </span>
                {index === currentStep && (
                  <RefreshCw className="w-3 h-3 animate-spin text-primary ml-auto" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 플로팅 창 전용 컴팩트 로딩 상태
export function FloatingLoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* 상단 로딩 바 */}
      <div className="w-full bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 h-1 rounded-full">
        <div className="bg-blue-500 h-1 rounded-full animate-pulse w-1/3"></div>
      </div>
      
      {/* 컴팩트한 기본 정보 스켈레톤 */}
      <Card className="border-dashed border-2 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-blue-600 font-medium">의안 기본정보 로딩 중</span>
          </div>
          <Skeleton className="h-6 w-3/4 bg-blue-100" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 bg-blue-100" />
            <Skeleton className="h-4 w-12 bg-blue-100" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            <Skeleton className="h-3 w-full bg-blue-100" />
            <Skeleton className="h-3 w-5/6 bg-blue-100" />
            <Skeleton className="h-3 w-4/6 bg-blue-100" />
          </div>
        </CardContent>
      </Card>

      {/* 컴팩트한 탭 스켈레톤 */}
      <Card className="border-dashed border-2 border-green-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 animate-spin text-green-500" />
            <span className="text-sm text-green-600 font-medium">상세정보 준비 중</span>
          </div>
          <div className="flex space-x-1 rounded-lg bg-muted p-1">
            <Skeleton className="h-8 w-24 bg-green-100" />
            <Skeleton className="h-8 w-24 bg-green-100" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full bg-green-100" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full bg-green-100" />
              <Skeleton className="h-3 w-4/5 bg-green-100" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 중앙 로딩 인디케이터 */}
      <div className="flex items-center justify-center py-6 bg-gradient-to-r from-transparent via-blue-50 to-transparent rounded-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <div className="absolute inset-0 w-8 h-8 border-2 border-blue-200 rounded-full animate-ping opacity-20"></div>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-blue-700">의안 정보 로딩 중...</span>
            <span className="text-xs text-blue-500">잠시만 기다려주세요</span>
          </div>
        </div>
      </div>
    </div>
  )
} 