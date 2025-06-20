'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AdditionalApiInfo, DeliberateInfo, TransferredInfo, PromulgationInfo, AdditionalBillInfo } from '@/types/bill'

interface BillAdditionalInfoProps {
  additionalInfo: AdditionalApiInfo
  loading: boolean
}

export default function BillAdditionalInfo({ additionalInfo, loading }: BillAdditionalInfoProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              본회의 심의
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 본회의 심의 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            본회의 심의
          </CardTitle>
        </CardHeader>
        <CardContent>
          {additionalInfo.deliberate ? (
            typeof additionalInfo.deliberate === 'object' && 'error' in additionalInfo.deliberate ? (
              <p className="text-red-600 text-sm">
                {String(additionalInfo.deliberate.error)}
              </p>
            ) : typeof additionalInfo.deliberate === 'object' ? (
              <div>
                <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 본회의 심의정보</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">상정일</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">의결일</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회의명</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회의결과</th>
                        <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">회의록</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {(additionalInfo.deliberate as DeliberateInfo).present_date || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {(additionalInfo.deliberate as DeliberateInfo).plenary_date || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {(additionalInfo.deliberate as DeliberateInfo).conference_name || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                          {(additionalInfo.deliberate as DeliberateInfo).plenary_result || '-'}
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
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">데이터 로딩 중...</p>
            )
          ) : (
            <p className="text-gray-500 text-sm">로딩 중...</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 정부이송 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              정부이송
            </CardTitle>
          </CardHeader>
          <CardContent>
            {additionalInfo.transferred ? (
              typeof additionalInfo.transferred === 'object' && 'error' in additionalInfo.transferred ? (
                <p className="text-red-600 text-sm">
                  {String(additionalInfo.transferred.error)}
                </p>
              ) : typeof additionalInfo.transferred === 'object' ? (
                <div>
                  <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 정부이송정보</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300">
                      <thead>
                        <tr className="bg-green-50">
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">정부이송일</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">문서</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                            {(additionalInfo.transferred as TransferredInfo).transfer_date || '-'}
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
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">데이터 로딩 중...</p>
              )
            ) : (
              <p className="text-gray-500 text-sm">로딩 중...</p>
            )}
          </CardContent>
        </Card>

        {/* 공포 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              공포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {additionalInfo.promulgation ? (
              typeof additionalInfo.promulgation === 'object' && 'error' in additionalInfo.promulgation ? (
                <p className="text-red-600 text-sm">
                  {String(additionalInfo.promulgation.error)}
                </p>
              ) : typeof additionalInfo.promulgation === 'object' ? (
                <div>
                  <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 공포정보</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300">
                      <thead>
                        <tr className="bg-purple-50">
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">공포일자</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">공포번호</th>
                          <th className="border border-gray-300 px-3 py-2 text-sm font-medium text-center">공포법률</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                            {(additionalInfo.promulgation as PromulgationInfo).promulgation_date || '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                            {(additionalInfo.promulgation as PromulgationInfo).promulgation_number || '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center max-w-xs">
                            <div className="truncate" title={(additionalInfo.promulgation as PromulgationInfo).law_title || '-'}>
                              {(additionalInfo.promulgation as PromulgationInfo).law_title || '-'}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">데이터 로딩 중...</p>
              )
            ) : (
              <p className="text-gray-500 text-sm">로딩 중...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 부가정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            부가정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          {additionalInfo.additional ? (
            typeof additionalInfo.additional === 'object' && 'error' in additionalInfo.additional ? (
              <p className="text-red-600 text-sm">
                {String(additionalInfo.additional.error)}
              </p>
            ) : typeof additionalInfo.additional === 'object' ? (
              <div className="space-y-6">
                {/* 대안 */}
                {(additionalInfo.additional as AdditionalBillInfo).alternative_bills && (additionalInfo.additional as AdditionalBillInfo).alternative_bills!.length > 0 && (
                  <div>
                    <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 대안</h4>
                    <div className="space-y-0">
                      {(additionalInfo.additional as AdditionalBillInfo).alternative_bills!.map((altBill, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1 pr-4">
                            <p className="text-sm text-gray-900">{altBill.name}</p>
                          </div>
                          {altBill.link && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(altBill.link, '_blank')}
                              className="h-8 px-3 text-xs flex items-center gap-1"
                            >
                              🔗 링크
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 비고 */}
                {(additionalInfo.additional as AdditionalBillInfo).memo && (
                  <div>
                    <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 비고</h4>
                    <div className="space-y-0">
                      <div className="flex items-start py-3">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {(additionalInfo.additional as AdditionalBillInfo).memo}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 관련 의안 */}
                {(additionalInfo.additional as AdditionalBillInfo).related_bills && (additionalInfo.additional as AdditionalBillInfo).related_bills!.length > 0 && (
                  <div>
                    <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 관련 의안</h4>
                    <div className="space-y-0">
                      {(additionalInfo.additional as AdditionalBillInfo).related_bills!.map((relatedBill, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1 pr-4">
                            <p className="text-sm text-gray-900">{relatedBill.name}</p>
                          </div>
                          {relatedBill.link && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(relatedBill.link, '_blank')}
                              className="h-8 px-3 text-xs flex items-center gap-1"
                            >
                              🔗 링크
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 빈 상태 메시지 */}
                {!(additionalInfo.additional as AdditionalBillInfo).memo && 
                 (!(additionalInfo.additional as AdditionalBillInfo).alternative_bills || (additionalInfo.additional as AdditionalBillInfo).alternative_bills!.length === 0) && 
                 (!(additionalInfo.additional as AdditionalBillInfo).related_bills || (additionalInfo.additional as AdditionalBillInfo).related_bills!.length === 0) && (
                  <div>
                    <h4 className="text-base font-semibold mb-3 pb-2 border-b border-gray-200">▶ 부가정보</h4>
                    <p className="text-gray-500 text-sm">부가정보가 없습니다.</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">데이터 로딩 중...</p>
            )
          ) : (
            <p className="text-gray-500 text-sm">로딩 중...</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 