'use client'

import { useState, useEffect } from 'react'
import { Settings, Database, Trash2, RefreshCw, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface CacheDebugPanelProps {
  getCacheStats: () => Promise<{ size: number; lastUpdated: Date | null; totalCount: number }>
  clearCache: () => Promise<void>
}

export function CacheDebugPanel({ getCacheStats, clearCache }: CacheDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState<{ size: number; lastUpdated: Date | null; totalCount: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const loadStats = async () => {
    setLoading(true)
    try {
      const cacheStats = await getCacheStats()
      setStats(cacheStats)
    } catch (error) {
      console.error('캐시 통계 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = async () => {
    if (confirm('캐시를 모두 삭제하시겠습니까? 다음 방문시 데이터를 다시 로드해야 합니다.')) {
      setLoading(true)
      try {
        await clearCache()
        await loadStats()
        alert('캐시가 성공적으로 삭제되었습니다.')
      } catch (error) {
        console.error('캐시 삭제 실패:', error)
        alert('캐시 삭제 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (isOpen && !stats) {
      loadStats()
    }
  }, [isOpen])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* 토글 버튼 */}
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="shadow-lg bg-white/90 backdrop-blur-sm border border-gray-200"
          >
            <Settings className="w-4 h-4 mr-2" />
            캐시 정보
          </Button>
        </CollapsibleTrigger>

        {/* 패널 내용 */}
        <CollapsibleContent className="mt-2">
          <Card className="w-80 shadow-lg bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                브라우저 캐시 상태
              </CardTitle>
              <CardDescription className="text-xs">
                IndexedDB를 이용한 법안 데이터 캐싱
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">로딩 중...</span>
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  {/* 캐시 크기 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">캐시된 법안 수:</span>
                    <Badge variant="secondary" className="text-xs">
                      {stats.size.toLocaleString()}개
                    </Badge>
                  </div>

                  {/* 전체 법안 수와 비교 */}
                  {stats.totalCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">전체 대비:</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round((stats.size / stats.totalCount) * 100)}%
                      </Badge>
                    </div>
                  )}

                  {/* 마지막 업데이트 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">마지막 업데이트:</span>
                    <span className="text-xs text-gray-500">
                      {stats.lastUpdated 
                        ? stats.lastUpdated.toLocaleString('ko-KR')
                        : '없음'
                      }
                    </span>
                  </div>

                  {/* 캐시 상태 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">상태:</span>
                    <Badge variant={stats.size > 0 ? 'default' : 'destructive'} className="text-xs">
                      {stats.size > 0 ? '활성' : '비어있음'}
                    </Badge>
                  </div>

                  {/* 예상 용량 (대략적) */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">예상 용량:</span>
                    <span className="text-xs text-gray-500">
                      ~{Math.round(stats.size * 2 / 1024)}KB
                    </span>
                  </div>

                  {/* 관리 버튼들 */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadStats}
                      disabled={loading}
                      className="flex-1"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      새로고침
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleClearCache}
                      disabled={loading || stats.size === 0}
                      className="flex-1"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      삭제
                    </Button>
                  </div>

                  {/* 정보 메시지 */}
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                    <Info className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                      캐시는 24시간 후 자동 만료됩니다. 
                      다른 페이지에서 돌아올 때 빠른 로딩을 위해 사용됩니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">캐시 정보를 불러올 수 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
} 