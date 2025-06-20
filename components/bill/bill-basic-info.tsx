'use client'

import { Calendar, User, Clock, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateUTC } from '@/lib/utils'
import { Bill } from '@/types/bill'

interface BillBasicInfoProps {
  bill: Bill
}

const getStatusBadgeColor = (status: string | null) => {
  if (!status) return 'bg-gray-100 text-gray-800'
  
  const positiveStatuses = ['원안가결', '수정가결', '공포', '정부이송']
  const negativeStatuses = ['부결', '폐기', '철회']
  const pendingStatuses = ['계류의안', '접수', '소관위접수', '소관위심사']
  
  if (positiveStatuses.some(s => status.includes(s))) {
    return 'bg-green-100 text-green-800'
  } else if (negativeStatuses.some(s => status.includes(s))) {
    return 'bg-red-100 text-red-800'
  } else if (pendingStatuses.some(s => status.includes(s))) {
    return 'bg-yellow-100 text-yellow-800'
  }
  
  return 'bg-blue-100 text-blue-800'
}

export default function BillBasicInfo({ bill }: BillBasicInfoProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-3">{bill.bill_name || '제목 없음'}</CardTitle>
            
            {/* 제안자 목록 버튼 */}
            <div className="mb-4">
              <Button
                onClick={() => window.open(`https://likms.assembly.go.kr/bill/coactorListPopup.do?billId=${bill.bill_id}`, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')}
                variant="outline"
                size="sm"
              >
                <User className="w-4 h-4 mr-2" />
                제안자 목록
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {bill.pass_gubn && (
                <Badge className={getStatusBadgeColor(bill.pass_gubn)}>
                  {bill.pass_gubn}
                </Badge>
              )}
              {bill.proc_stage_cd && (
                <Badge className={getStatusBadgeColor(bill.proc_stage_cd)}>
                  {bill.proc_stage_cd}
                </Badge>
              )}
              {bill.general_result && (
                <Badge className={getStatusBadgeColor(bill.general_result)}>
                  {bill.general_result}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">법안번호</p>
              <p className="font-medium">{bill.bill_no || '-'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">제안일</p>
              <p className="font-medium">{formatDateUTC(bill.propose_dt)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm text-gray-500">처리일</p>
              <p className="font-medium">{formatDateUTC(bill.proc_dt)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-green-500" />
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-sm text-gray-500">제안자</p>
                <p className="font-medium">{bill.proposer_kind || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 요약 */}
        {bill.summary && (
          <div>
            <h3 className="text-lg font-semibold mb-4">법안 요약</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{bill.summary}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 