'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CommissionInfo } from '@/types/bill'

interface BillCommissionInfoProps {
  commissionInfo: CommissionInfo | null
  loading: boolean
}

export default function BillCommissionInfo({ commissionInfo, loading }: BillCommissionInfoProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            위원회심사정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!commissionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            위원회심사정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">위원회심사정보를 불러오는 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          위원회심사정보
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {commissionInfo.error ? (
            <div className="text-red-600 bg-red-50 p-4 rounded-lg">
              <p>⚠️ {String(commissionInfo.error)}</p>
            </div>
          ) : (
            <>
              {/* 소관위 심사정보 */}
              <div>
                <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 소관위 심사정보</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">소관위원회</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회부일</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">상정일</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">처리일</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">처리결과</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">문서</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {commissionInfo.committee_name || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {commissionInfo.submit_date || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {commissionInfo.present_date || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {commissionInfo.process_date || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {commissionInfo.result || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {commissionInfo.examination_reports && commissionInfo.examination_reports.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {commissionInfo.examination_reports.map((report, index) => (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(report.url, '_blank')}
                                  className="h-6 px-2 text-xs"
                                >
                                  📄 {report.type}
                                </Button>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 소관위 회의정보 */}
              {commissionInfo.proceedings && commissionInfo.proceedings.length > 0 && (
                <div>
                  <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 소관위 회의정보</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회의명</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회의일</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회의결과</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회의록</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissionInfo.proceedings.map((proceeding, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              {proceeding.name || '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              {proceeding.date || '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              {proceeding.result || '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                disabled
                              >
                                📄 회의록
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 관련위 심사정보 */}
              <div>
                <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 관련위 심사정보</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">관련위원회</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회부일</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">상정일</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">처리일</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">문서</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionInfo.related_committees && commissionInfo.related_committees.length > 0 ? (
                        commissionInfo.related_committees.map((committee, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              {committee.name || '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              {committee.submit_date || '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              {committee.present_date || '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              {committee.process_date || '-'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                disabled
                              >
                                📄 문서
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="border border-gray-300 px-3 py-4 text-sm text-center text-gray-500">
                            관련위 심사정보가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 