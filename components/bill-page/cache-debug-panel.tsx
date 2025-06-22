'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, RefreshCw, Database, Smartphone, Monitor } from 'lucide-react'

interface CacheDebugPanelProps {
  totalCount: number
  displayedCount: number
  cacheHit: boolean
  backgroundLoading: boolean
  loadingProgress: number
  dataLoaded: boolean
  onClearCache: () => void
  onGetCacheStats: () => Promise<{
    isAvailable: boolean
    usedBytes: number
    quota: number
    cachedBillsCount: number
    lastUpdated: string | null
  }>
}

export function CacheDebugPanel({ 
  totalCount, 
  displayedCount, 
  cacheHit, 
  backgroundLoading, 
  loadingProgress,
  dataLoaded,
  onClearCache,
  onGetCacheStats
}: CacheDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)

  const handleGetCacheStats = async () => {
    const stats = await onGetCacheStats()
    setCacheStats(stats)
    
    // 모바일 환경 감지
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getLoadingStatus = () => {
    if (!dataLoaded) return '초기 로딩 중...'
    if (backgroundLoading) return `백그라운드 로딩 중... (${loadingProgress}%)`
    if (totalCount === displayedCount) return '전체 데이터 로드 완료'
    return `부분 로드 완료 (${displayedCount}/${totalCount})`
  }

  const getDataStatus = () => {
    const percentage = totalCount > 0 ? Math.round((displayedCount / totalCount) * 100) : 0
    
    if (percentage === 100) return 'success'
    if (percentage >= 50) return 'warning'
    return 'error'
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>데이터 상태</span>
            <Badge variant={getDataStatus() as any}>
              {displayedCount}/{totalCount}
            </Badge>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Card className="mt-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {isMobile ? (
                <Smartphone className="w-4 h-4 text-blue-500" />
              ) : (
                <Monitor className="w-4 h-4 text-green-500" />
              )}
              {isMobile ? '모바일' : '데스크탑'} 환경
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 로딩 상태 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">로딩 상태:</span>
              <div className="flex items-center gap-2">
                {backgroundLoading && (
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                )}
                <span className="text-sm font-medium">{getLoadingStatus()}</span>
              </div>
            </div>

            {/* 데이터 개수 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">로드된 데이터:</span>
              <Badge variant={getDataStatus() as any}>
                {displayedCount.toLocaleString()} / {totalCount.toLocaleString()}
              </Badge>
            </div>

            {/* 캐시 상태 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">캐시 상태:</span>
              <Badge variant={cacheHit ? 'default' : 'secondary'}>
                {cacheHit ? '캐시 히트' : '캐시 미스'}
              </Badge>
            </div>

            {/* 백그라운드 로딩 진행률 */}
            {backgroundLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">진행률:</span>
                  <span className="text-sm font-medium">{loadingProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 통합 전략 정보 */}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              🚀 통합 로딩: 전체 개수 즉시 표시 → 1000개 우선 → 백그라운드 완성
            </div>

            {/* 개수 정확도 표시 */}
            {displayedCount < totalCount && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                📊 탭별 개수는 샘플 기준 추정치입니다. 백그라운드 로딩 완료 후 정확해집니다.
              </div>
            )}

            {/* 버튼들 */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGetCacheStats}
                className="flex-1"
              >
                캐시 정보
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearCache}
                className="flex-1"
              >
                캐시 초기화
              </Button>
            </div>

            {/* 캐시 상세 정보 */}
            {cacheStats && (
              <div className="pt-2 border-t space-y-2">
                <div className="text-xs text-muted-foreground">캐시 상세 정보:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>사용량: {formatBytes(cacheStats.usedBytes)}</div>
                  <div>할당량: {formatBytes(cacheStats.quota)}</div>
                  <div>캐시된 법안: {cacheStats.cachedBillsCount}개</div>
                  <div>마지막 업데이트: {cacheStats.lastUpdated || '없음'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
} 