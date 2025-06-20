/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ArrowLeft, FileText, Download, ExternalLink, Calendar, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { FavoriteButton } from '@/components/favorite-button'
import { VoteButtons } from '@/components/vote-buttons'
import { VoteStats } from '@/components/vote-stats'
import { useFavorites } from '@/hooks/use-favorites'
import { formatDateUTC } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface Bill {
  id: number
  bill_id: string
  bill_no: string | null
  bill_name: string | null
  proposer_kind: string | null
  propose_dt: string | null
  proc_dt: string | null
  general_result: string | null
  summary: string | null
  proc_stage_cd: string | null
  pass_gubn: string | null
  created_at: string | null
  updated_at: string | null
  last_api_check: string | null
}

interface CommissionInfo {
  committee_name?: string
  examination_date?: string
  examination_result?: string
  examination_report_url?: string
  review_report_url?: string
  examination_reports?: Array<{type: string; url: string}>
  proceedings?: Array<{name: string; date?: string; result?: string}>
  dates?: string[]
  result?: string
  submit_date?: string
  present_date?: string
  process_date?: string
  related_committees?: Array<{name: string; submit_date?: string; present_date?: string; process_date?: string}>
  error?: string
  raw_data?: string
  [key: string]: unknown
}

interface DeliberateInfo {
  conference_name?: string
  plenary_date?: string
  plenary_result?: string
  present_date?: string
  [key: string]: unknown
}

interface TransferredInfo {
  transfer_date?: string
  [key: string]: unknown
}

interface PromulgationInfo {
  promulgation_date?: string
  promulgation_number?: string
  law_title?: string
  [key: string]: unknown
}

interface AdditionalBillInfo {
  related_bills?: Array<{name: string, link: string}>
  alternative_bills?: Array<{name: string, link: string}>
  keywords?: string[]
  summary?: string
  memo?: string
  bill_gbn?: string
  [key: string]: unknown
}

interface AdditionalApiInfo {
  deliberate?: DeliberateInfo | { error: string } | string
  transferred?: TransferredInfo | { error: string } | string
  promulgation?: PromulgationInfo | { error: string } | string
  additional?: AdditionalBillInfo | { error: string } | string
}

interface BillDetailClientProps {
  billId: string
}

export default function BillDetailClient({ billId }: BillDetailClientProps) {
  const router = useRouter()
  const [bill, setBill] = useState<Bill | null>(null)
  const [commissionInfo, setCommissionInfo] = useState<CommissionInfo | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState<AdditionalApiInfo>({})
  const [rawApiData, setRawApiData] = useState<{[key: string]: string}>({})
  const [loading, setLoading] = useState(true)
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [additionalLoading, setAdditionalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const { isFavorited, toggleFavorite } = useFavorites()

  // Supabase 클라이언트 초기화
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Supabase 연결 정보가 설정되지 않았습니다.')
      setLoading(false)
      return
    }
    
    try {
      const client = createClient(supabaseUrl, supabaseKey)
      setSupabase(client)
    } catch {
      setError('Supabase 클라이언트 초기화 실패')
      setLoading(false)
    }
  }, [])

  const fetchBillDetails = useCallback(async () => {
    if (!supabase) return
    
    try {
      setLoading(true)
      setError(null)

      // 의안 정보 가져오기
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('bill_id', billId)
        .single()

      if (error) {
        throw new Error(`의안 정보를 가져올 수 없습니다: ${error.message}`)
      }

      setBill(data)

      // 위원회심사정보 API 호출
      if (data?.bill_id) {
        fetchCommissionInfo(data.bill_id)
        fetchAdditionalApis(data.bill_id)
      }
    } catch (err) {
      console.error('Error fetching bill details:', err)
      setError(err instanceof Error ? err.message : '의안 정보를 가져오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [supabase, billId])

  const fetchCommissionInfo = useCallback(async (billId: string) => {
    try {
      setCommissionLoading(true)
      
      console.log('위원회심사정보 API 호출 시작:', billId)
      
      const response = await fetch(`/api/bill-commission?bill_id=${billId}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API 응답 에러:', errorText)
        throw new Error(`위원회심사정보를 가져올 수 없습니다. (${response.status}: ${response.statusText})`)
      }

      const data = await response.text()
      const parsedData = parseCommissionXML(data)
      
      setCommissionInfo({ ...parsedData, raw_data: data })
    } catch (err) {
      console.error('Error fetching commission info:', err)
      setCommissionInfo({ error: err instanceof Error ? err.message : '위원회심사정보 로딩 실패' })
    } finally {
      setCommissionLoading(false)
    }
  }, [])

  const fetchAdditionalApis = useCallback(async (billId: string) => {
    try {
      setAdditionalLoading(true)
      console.log('추가 API들 호출 시작:', billId)
      
      const apis = [
        { name: 'deliberate', url: `/api/bill-deliberate?bill_id=${billId}` },
        { name: 'transferred', url: `/api/bill-transferred?bill_id=${billId}` },
        { name: 'promulgation', url: `/api/bill-promulgation?bill_id=${billId}` },
        { name: 'additional', url: `/api/bill-additional?bill_id=${billId}` }
      ]

      const results: AdditionalApiInfo = {}
      const rawResults: {[key: string]: string} = {}

      await Promise.allSettled(
        apis.map(async (api) => {
          try {
            const response = await fetch(api.url)
            if (response.ok) {
              const data = await response.text()
              rawResults[api.name] = data
              
              switch (api.name) {
                case 'deliberate':
                  results.deliberate = parseDeliberateXML(data)
                  break
                case 'transferred':
                  results.transferred = parseTransferredXML(data)
                  break
                case 'promulgation':
                  results.promulgation = parsePromulgationXML(data)
                  break
                case 'additional':
                  results.additional = parseAdditionalXML(data)
                  break
                default:
                  break
              }
            } else {
              results[api.name as keyof AdditionalApiInfo] = { error: `${response.status} ${response.statusText}` }
              rawResults[api.name] = `Error: ${response.status} ${response.statusText}`
            }
          } catch (error) {
            results[api.name as keyof AdditionalApiInfo] = { error: error instanceof Error ? error.message : '알 수 없는 오류' }
            rawResults[api.name] = `Error: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
          }
        })
      )

      setAdditionalInfo(results)
      setRawApiData(rawResults)
    } catch (err) {
      console.error('Error fetching additional APIs:', err)
    } finally {
      setAdditionalLoading(false)
    }
  }, [])

  const parseDeliberateXML = (xmlData: string): DeliberateInfo => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
      
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        console.error('본회의심의 XML 파싱 에러:', parserError.textContent)
        return {}
      }

      const items = xmlDoc.querySelectorAll('PlenarySessionExamination item')
      const info: DeliberateInfo = {}
      
      items.forEach(item => {
        const confName = item.querySelector('confName')?.textContent?.trim()
        const procDt = item.querySelector('procDt')?.textContent?.trim()
        const procResultCd = item.querySelector('procResultCd')?.textContent?.trim()
        const prsntDt = item.querySelector('prsntDt')?.textContent?.trim()
        
        if (confName) info.conference_name = confName
        if (procDt) info.plenary_date = procDt
        if (procResultCd) info.plenary_result = procResultCd
        if (prsntDt) info.present_date = prsntDt
      })
      
      return info
    } catch (error) {
      console.error('본회의심의 XML 파싱 중 오류:', error)
      return {}
    }
  }

  const parseTransferredXML = (xmlData: string): TransferredInfo => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
      
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        console.error('정부이송 XML 파싱 에러:', parserError.textContent)
        return {}
      }

      const items = xmlDoc.querySelectorAll('items item')
      const info: TransferredInfo = {}
      
      items.forEach(item => {
        const transDt = item.querySelector('transDt')?.textContent?.trim()
        if (transDt) info.transfer_date = transDt
      })
      
      return info
    } catch (error) {
      console.error('정부이송 XML 파싱 중 오류:', error)
      return {}
    }
  }

  const parsePromulgationXML = (xmlData: string): PromulgationInfo => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
      
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        console.error('공포 XML 파싱 에러:', parserError.textContent)
        return {}
      }

      const items = xmlDoc.querySelectorAll('items item')
      const info: PromulgationInfo = {}
      
      items.forEach(item => {
        const anounceDt = item.querySelector('anounceDt')?.textContent?.trim()
        const anounceNo = item.querySelector('anounceNo')?.textContent?.trim()
        const lawTitle = item.querySelector('lawTitle')?.textContent?.trim()
        
        if (anounceDt) info.promulgation_date = anounceDt
        if (anounceNo) info.promulgation_number = anounceNo
        if (lawTitle) info.law_title = lawTitle
      })
      
      return info
    } catch (error) {
      console.error('공포 XML 파싱 중 오류:', error)
      return {}
    }
  }

  const parseAdditionalXML = (xmlData: string): AdditionalBillInfo => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml')
      
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        console.error('부가정보 XML 파싱 에러:', parserError.textContent)
        return {}
      }

      const info: AdditionalBillInfo = {
        related_bills: [],
        alternative_bills: [] // 대안 의안들을 위한 새 필드
      }
      
      // commMemo 값 파싱
      const commMemoItems = xmlDoc.querySelectorAll('commMemo item')
      if (commMemoItems.length > 0) {
        const memoTexts: string[] = []
        commMemoItems.forEach(item => {
          const memoText = item.querySelector('commMemo')?.textContent?.trim()
          if (memoText) {
            memoTexts.push(memoText)
          }
        })
        if (memoTexts.length > 0) {
          info.memo = memoTexts.join('\n\n')
        }
      }

      // billGbnCd 값 파싱 (대안 카테고리)
      const billGbnCdItems = xmlDoc.querySelectorAll('billGbnCd item')
      billGbnCdItems.forEach(item => {
        const billName = item.querySelector('billName')?.textContent?.trim()
        const billLink = item.querySelector('billLink')?.textContent?.trim()
        
        if (billName) {
          // billLink에서 bill_id 추출하여 내부 링크로 변환
          let internalLink = ''
          if (billLink) {
            const billIdMatch = billLink.match(/bill_id=([^&]+)/)
            if (billIdMatch) {
              internalLink = `/bill/${billIdMatch[1]}`
            }
          }
          
          info.alternative_bills!.push({
            name: billName,
            link: internalLink
          })
        }
      })
      
      // 관련 의안 파싱 (exhaust item들에서)
      const exhaustItems = xmlDoc.querySelectorAll('exhaust item')
      exhaustItems.forEach(item => {
        const billName = item.querySelector('billName')?.textContent?.trim()
        const billLink = item.querySelector('billLink')?.textContent?.trim()
        
        if (billName) {
          // billLink에서 bill_id 추출하여 내부 링크로 변환
          let internalLink = ''
          if (billLink) {
            const billIdMatch = billLink.match(/bill_id=([^&]+)/)
            if (billIdMatch) {
              internalLink = `/bill/${billIdMatch[1]}`
            }
          }
          
          info.related_bills!.push({
            name: billName,
            link: internalLink
          })
        }
      })
      
      console.log('파싱된 부가정보:', info)
      return info
    } catch (error) {
      console.error('부가정보 XML 파싱 중 오류:', error)
      return {}
    }
  }

  const parseCommissionXML = (xmlData: string) => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlData, 'text/xml')
      
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        console.error('XML 파싱 에러:', parseError.textContent)
        return { parse_error: 'XML 파싱 오류: ' + parseError.textContent }
      }
      
      const result: {
        committee_name: string;
        examination_reports: Array<{type: string; url: string}>;
        proceedings: Array<{name: string; date?: string; result?: string}>;
        documents: unknown[];
        dates: string[];
        result: string;
        submit_date: string;
        present_date: string;
        process_date: string;
        related_committees: Array<{name: string; submit_date?: string; present_date?: string; process_date?: string}>;
      } = {
        committee_name: '',
        examination_reports: [],
        proceedings: [],
        documents: [],
        dates: [],
        result: '',
        submit_date: '',
        present_date: '',
        process_date: '',
        related_committees: []
      }

      // 소관위원회 정보
      const committeeElement = doc.querySelector('committeeName, COMMITTEE_NAME')
      if (committeeElement) {
        result.committee_name = committeeElement.textContent || ''
      }

      // 회부일 (submitDt)
      const submitDtElement = doc.querySelector('submitDt, SUBMIT_DT')
      if (submitDtElement) {
        result.submit_date = submitDtElement.textContent || ''
      }

      // 상정일
      const presentDtElement = doc.querySelector('presentDt, PRESENT_DT')
      if (presentDtElement) {
        result.present_date = presentDtElement.textContent || ''
      }

      // 처리일 (procDt)
      const procDtElement = doc.querySelector('procDt, PROC_DT')
      if (procDtElement) {
        result.process_date = procDtElement.textContent || ''
      }

      // 처리결과
      const procResultElement = doc.querySelector('procResultCd, PROC_RESULT_CD')
      if (procResultElement) {
        result.result = procResultElement.textContent || ''
      }

      // 문서 URL들 (docName1, docName2로 구분)
      const docName1 = doc.querySelector('docName1, DOC_NAME1')?.textContent
      const docName2 = doc.querySelector('docName2, DOC_NAME2')?.textContent
      const hwpUrl1 = doc.querySelector('hwpUrl1, HWP_URL1')?.textContent
      const hwpUrl2 = doc.querySelector('hwpUrl2, HWP_URL2')?.textContent
      const pdfUrl1 = doc.querySelector('pdfUrl1, PDF_URL1')?.textContent
      const pdfUrl2 = doc.querySelector('pdfUrl2, PDF_URL2')?.textContent

      // docName1 관련 문서들
      if (hwpUrl1) {
        result.examination_reports.push({
          type: `${docName1 || '검토보고서'} (HWP)`,
          url: hwpUrl1.replace('&amp;', '&')
        })
      }
      if (pdfUrl1) {
        result.examination_reports.push({
          type: `${docName1 || '검토보고서'} (PDF)`,
          url: pdfUrl1.replace('&amp;', '&')
        })
      }

      // docName2 관련 문서들
      if (hwpUrl2) {
        result.examination_reports.push({
          type: `${docName2 || '심사보고서'} (HWP)`,
          url: hwpUrl2.replace('&amp;', '&')
        })
      }
      if (pdfUrl2) {
        result.examination_reports.push({
          type: `${docName2 || '심사보고서'} (PDF)`,
          url: pdfUrl2.replace('&amp;', '&')
        })
      }

      // 관련위 심사정보 (comitExamination)
      const comitExaminationElements = doc.querySelectorAll('comitExamination item, COMIT_EXAMINATION item')
      comitExaminationElements.forEach(item => {
        const committeeName = item.querySelector('comitName, COMIT_NAME')?.textContent
        const submitDt = item.querySelector('submitDt, SUBMIT_DT')?.textContent
        const presentDt = item.querySelector('presentDt, PRESENT_DT')?.textContent
        const procDt = item.querySelector('procDt, PROC_DT')?.textContent
        
        if (committeeName) {
          result.related_committees.push({
            name: committeeName,
            submit_date: submitDt || undefined,
            present_date: presentDt || undefined,
            process_date: procDt || undefined
          })
        }
      })

      // 날짜 배열 (기존 로직 유지)
      const dates = xmlData.match(/\d{4}-\d{2}-\d{2}/g) || []
      result.dates = [...new Set(dates)]

      // 회의 진행 내역
      const meetings = doc.querySelectorAll('JurisdictionMeeting item, jurisdictionMeeting item')
      meetings.forEach(meeting => {
        const confName = meeting.querySelector('confName, CONF_NAME')?.textContent
        const confDt = meeting.querySelector('confDt, CONF_DT')?.textContent
        const confResult = meeting.querySelector('confResult, CONF_RESULT')?.textContent
        
        if (confName) {
          result.proceedings.push({
            name: confName,
            date: confDt || undefined,
            result: confResult || undefined
          })
        }
      })

      return result
    } catch (error) {
      console.error('XML 파싱 오류:', error)
      return { parse_error: 'XML 파싱 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류') }
    }
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

  useEffect(() => {
    if (supabase && billId) {
      fetchBillDetails()
    }
  }, [supabase, billId, fetchBillDetails])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 헤더 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">의안 상세정보</h1>
              <p className="text-gray-600">법안의 진행 과정과 상세 내용을 확인할 수 있습니다.</p>
            </div>
            
            {bill && (
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-3">
                  <VoteButtons billId={bill.bill_id} />
                  <FavoriteButton 
                    billId={bill.bill_id}
                    initialIsFavorited={isFavorited(bill.bill_id)}
                    onToggle={(isFav) => toggleFavorite(bill.bill_id, isFav)}
                  />
                </div>
                {/* 찬반 투표 통계 - 버튼 바로 아래 */}
                <VoteStats billId={bill.bill_id} />
              </div>
            )}
          </div>

        </div>

        {loading && (
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
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-900 mb-2">오류가 발생했습니다</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && !bill && (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">의안을 찾을 수 없습니다</h2>
              <p className="text-gray-600 mb-6">요청하신 의안이 존재하지 않습니다.</p>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
            </CardContent>
          </Card>
        )}

        {bill && (
          <div className="space-y-6">
            {/* 기본 정보 카드 */}
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

            {/* 탭 구조로 변경 */}
            <Tabs defaultValue="commission" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="commission">위원회심사</TabsTrigger>
                <TabsTrigger value="additional">진행정보</TabsTrigger>
              </TabsList>
              
              <TabsContent value="commission" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      위원회심사정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {commissionLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ) : commissionInfo ? (
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
                    ) : (
                      <p className="text-gray-500">위원회심사정보를 불러오는 중...</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="additional" className="space-y-6">
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
                      {additionalLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : additionalInfo.deliberate ? (
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
                        {additionalLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : additionalInfo.transferred ? (
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
                        {additionalLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : additionalInfo.promulgation ? (
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
                      {additionalLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      ) : additionalInfo.additional ? (
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
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
} 