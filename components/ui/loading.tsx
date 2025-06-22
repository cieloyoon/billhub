import { Loader2 } from 'lucide-react'

interface LoadingProps {
  message?: string
  className?: string
}

export function Loading({ 
  message = "정보를 불러오는 중...", 
  className = "" 
}: LoadingProps) {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

// 더 작은 사이즈의 로딩 컴포넌트 (플로팅 창 등에서 사용)
export function LoadingCompact({ 
  message = "정보를 불러오는 중...", 
  className = "" 
}: LoadingProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  )
} 