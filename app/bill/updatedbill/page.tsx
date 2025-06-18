'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateUTC } from '@/lib/utils'

interface Bill {
  id: number
  bill_id: string
  bill_no: string | null
  bill_name: string | null
  proposer_kind: string | null
  propose_dt: string | null
  proc_dt: string | null
  general_result: string | null
  proc_stage_cd: string | null
}

interface UpdatedBill {
  bill_id: string
  bill_no: string | null
  bill_name: string | null
  tracked_at: string
  old_value: string | null
  new_value: string | null
  bills: Bill
}

interface RecentBillsResponse {
  recentProposed: Bill[]
  recentProcessed: Bill[]
  recentUpdated: UpdatedBill[]
}

export default function UpdatedBillsPage() {
  const [data, setData] = useState<RecentBillsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecentBills()
  }, [])

  const fetchRecentBills = async () => {
    try {
      const response = await fetch('/api/recent-bills')
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }



  const getStageLabel = (stageCode: string | null) => {
    const stageMap: { [key: string]: string } = {
      '01': '접수',
      '02': '소관위접수',
      '03': '소관위심사',
      '04': '소관위통과',
      '05': '법제사법위접수',
      '06': '법제사법위심사',
      '07': '법제사법위통과',
      '08': '본회의상정',
      '09': '본회의통과',
      '10': '정부이송',
      '11': '공포',
      '12': '폐기',
      '13': '철회',
      '14': '임기만료폐기',
      '15': '계류'
    }
    return stageMap[stageCode || ''] || stageCode || '알 수 없음'
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">최근 업데이트된 법안</h1>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">최근 업데이트된 법안</h1>
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">최근 업데이트된 법안</h1>
      
      {/* 3분할 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 최근 접수된 법안 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-green-700 border-b border-green-200 pb-2">
            📥 최근 접수된 법안 (7일 이내)
          </h2>
          {data?.recentProposed.length === 0 ? (
            <p className="text-gray-500 text-sm">최근 접수된 법안이 없습니다.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {data?.recentProposed.map((bill) => (
                <Card key={bill.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <Link 
                      href={`/bill/${bill.bill_id}`}
                      className="font-medium text-blue-600 hover:underline text-sm block mb-2"
                    >
                      {bill.bill_name || '제목 없음'}
                    </Link>
                    <div className="text-xs text-gray-600 mb-1">
                      의안번호: {bill.bill_no || '미정'}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      접수일: {formatDateUTC(bill.propose_dt)}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {getStageLabel(bill.proc_stage_cd)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 최근 갱신된 법안 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-yellow-700 border-b border-yellow-200 pb-2">
            🔄 최근 진행 상태 변경된 법안 (7일 이내)
          </h2>
          {data?.recentUpdated.length === 0 ? (
            <p className="text-gray-500 text-sm">최근 갱신된 법안이 없습니다.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {data?.recentUpdated.map((item, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <Link 
                      href={`/bill/${item.bill_id}`}
                      className="font-medium text-blue-600 hover:underline text-sm block mb-2"
                    >
                      {item.bill_name || '제목 없음'}
                    </Link>
                    <div className="text-xs text-gray-600 mb-1">
                      의안번호: {item.bill_no || '미정'}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      갱신일: {formatDateUTC(item.tracked_at)}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {getStageLabel(item.old_value)}
                      </Badge>
                      <span className="text-gray-400">→</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {getStageLabel(item.new_value)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 최근 처리된 법안 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-blue-700 border-b border-blue-200 pb-2">
            ✅ 최근 처리 완료된 법안 (7일 이내)
          </h2>
          {data?.recentProcessed.length === 0 ? (
            <p className="text-gray-500 text-sm">최근 처리된 법안이 없습니다.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {data?.recentProcessed.map((bill) => (
                <Card key={bill.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <Link 
                      href={`/bill/${bill.bill_id}`}
                      className="font-medium text-blue-600 hover:underline text-sm block mb-2"
                    >
                      {bill.bill_name || '제목 없음'}
                    </Link>
                    <div className="text-xs text-gray-600 mb-1">
                      의안번호: {bill.bill_no || '미정'}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      처리일: {formatDateUTC(bill.proc_dt)}
                    </div>
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {getStageLabel(bill.proc_stage_cd)}
                      </Badge>
                      {bill.general_result && (
                        <div>
                          <Badge 
                            variant={
                              bill.general_result.includes('가결') || bill.general_result.includes('통과') 
                                ? 'default' 
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {bill.general_result}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 