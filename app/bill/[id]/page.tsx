'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
import { FavoriteButton } from '@/components/favorite-button'
import { VoteButtons } from '@/components/vote-buttons'
import { VoteStats } from '@/components/vote-stats'
import { useFavorites } from '@/hooks/use-favorites'
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
  keywords?: string[]
  summary?: string
  [key: string]: unknown
}

interface AdditionalApiInfo {
  deliberate?: DeliberateInfo | { error: string } | string
  transferred?: TransferredInfo | { error: string } | string
  promulgation?: PromulgationInfo | { error: string } | string
  additional?: AdditionalBillInfo | { error: string } | string
}

export default function BillDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [bill, setBill] = useState<Bill | null>(null)
  const [commissionInfo, setCommissionInfo] = useState<CommissionInfo | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState<AdditionalApiInfo>({})
  const [rawApiData, setRawApiData] = useState<{[key: string]: string}>({})
  const [loading, setLoading] = useState(true)
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [additionalLoading, setAdditionalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const { isFavorited, toggleFavorite } = useFavorites()

  const billId = params?.id as string

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
    } catch (err) {
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
  }, [supabase, billId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCommissionInfo = useCallback(async (billId: string) => {
    try {
      setCommissionLoading(true)
      
      console.log('위원회심사정보 API 호출 시작:', billId)
      
      // CORS 이슈로 인해 서버 API 라우트를 통해 호출
      const response = await fetch(`/api/bill-commission?bill_id=${billId}`)
      
      console.log('API 응답 상태:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API 응답 에러:', errorText)
        throw new Error(`위원회심사정보를 가져올 수 없습니다. (${response.status}: ${response.statusText})`)
      }

      const data = await response.text()
      console.log('API 응답 데이터 길이:', data.length)
      console.log('API 응답 일부:', data.substring(0, 200))
      
      // XML 데이터 파싱하여 구조화된 데이터 생성
      const parsedData = parseCommissionXML(data)
      console.log('파싱된 데이터:', parsedData)
      
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

      // 모든 API를 병렬로 호출
      await Promise.allSettled(
        apis.map(async (api) => {
          try {
            const response = await fetch(api.url)
            if (response.ok) {
              const data = await response.text()
              console.log(`${api.name} API 성공:`, data.length, '바이트')
              
              // 원본 데이터 저장
              rawResults[api.name] = data
              
              // XML 파싱 적용
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
              console.warn(`${api.name} API 실패:`, response.status)
              results[api.name as keyof AdditionalApiInfo] = { error: `${response.status} ${response.statusText}` }
              rawResults[api.name] = `Error: ${response.status} ${response.statusText}`
            }
          } catch (error) {
            console.error(`${api.name} API 오류:`, error)
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

      const items = xmlDoc.querySelectorAll('exhaust item')
      const info: AdditionalBillInfo = {
        related_bills: []
      }
      
      items.forEach(item => {
        const billName = item.querySelector('billName')?.textContent?.trim()
        const billLink = item.querySelector('billLink')?.textContent?.trim()
        
        if (billName) {
          info.related_bills!.push({
            name: billName,
            link: billLink || ''
          })
        }
      })
      
      return info
    } catch (error) {
      console.error('부가정보 XML 파싱 중 오류:', error)
      return {}
    }
  }

  const parseCommissionXML = (xmlData: string) => {
    try {
      console.log('XML 파싱 시작, 데이터 길이:', xmlData.length)
      
      // 간단한 XML 파싱 (DOMParser 사용)
      const parser = new DOMParser()
      const doc = parser.parseFromString(xmlData, 'text/xml')
      
      // 파싱 에러 확인
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
      } = {
        committee_name: '',
        examination_reports: [],
        proceedings: [],
        documents: [],
        dates: [],
        result: ''
      }

      // 위원회명 추출
      const committeeElement = doc.querySelector('committeeName, COMMITTEE_NAME')
      if (committeeElement) {
        result.committee_name = committeeElement.textContent || ''
        console.log('위원회명 찾음:', result.committee_name)
      }

      // 처리결과 추출
      const procResultElement = doc.querySelector('procResultCd, PROC_RESULT_CD')
      if (procResultElement) {
        result.result = procResultElement.textContent || ''
        console.log('처리결과 찾음:', result.result)
      }

      // 문서 링크 추출
      const hwpUrl1 = doc.querySelector('hwpUrl1, HWP_URL1')?.textContent
      const hwpUrl2 = doc.querySelector('hwpUrl2, HWP_URL2')?.textContent
      const pdfUrl1 = doc.querySelector('pdfUrl1, PDF_URL1')?.textContent
      const pdfUrl2 = doc.querySelector('pdfUrl2, PDF_URL2')?.textContent

      if (hwpUrl1) {
        result.examination_reports.push({
          type: '검토보고서 (HWP)',
          url: hwpUrl1.replace('&amp;', '&')
        })
      }
      if (hwpUrl2) {
        result.examination_reports.push({
          type: '심사보고서 (HWP)',
          url: hwpUrl2.replace('&amp;', '&')
        })
      }
      if (pdfUrl1) {
        result.examination_reports.push({
          type: '검토보고서 (PDF)',
          url: pdfUrl1.replace('&amp;', '&')
        })
      }
      if (pdfUrl2) {
        result.examination_reports.push({
          type: '심사보고서 (PDF)',
          url: pdfUrl2.replace('&amp;', '&')
        })
      }

      // 일정 정보 추출
      const dates = xmlData.match(/\d{4}-\d{2}-\d{2}/g) || []
      result.dates = [...new Set(dates)]
      console.log('날짜 정보:', result.dates)

      // 회의 정보 추출
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

      console.log('파싱 완료:', result)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">의안을 찾을 수 없습니다</h2>
            <p className="text-gray-600 mb-6">요청하신 의안이 존재하지 않습니다.</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            목록으로 돌아가기
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">의안 상세정보</h1>
            <div className="flex items-center gap-4">
              <VoteButtons 
                billId={bill.bill_id} 
              />
              <FavoriteButton 
                billId={bill.bill_id}
                initialIsFavorited={isFavorited(bill.bill_id)}
                onToggle={(isFav) => toggleFavorite(bill.bill_id, isFav)}
              />
            </div>
          </div>
        </div>

        {/* 의안 기본 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{bill.bill_name || '제목 없음'}</h2>
            <button
              onClick={() => window.open(`https://likms.assembly.go.kr/bill/coactorListPopup.do?billId=${bill.bill_id}`, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              제안자 목록
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <span className="text-sm font-medium text-gray-500">법안번호</span>
              <p className="text-gray-900">{bill.bill_no || '-'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">법안 ID</span>
              <p className="text-gray-900">{bill.bill_id}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">제안자</span>
              <p className="text-gray-900">{bill.proposer_kind || '-'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">제안일</span>
              <p className="text-gray-900">{formatDateUTC(bill.propose_dt)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">처리일</span>
              <p className="text-gray-900">{formatDateUTC(bill.proc_dt)}</p>
            </div>
          </div>

          {/* 상태 배지들 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {bill.pass_gubn && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(bill.pass_gubn)}`}>
                {bill.pass_gubn}
              </span>
            )}
            {bill.proc_stage_cd && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(bill.proc_stage_cd)}`}>
                {bill.proc_stage_cd}
              </span>
            )}
            {bill.general_result && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(bill.general_result)}`}>
                {bill.general_result}
              </span>
            )}
          </div>

          {/* 투표 통계 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">시민 의견</h3>
            <VoteStats 
              billId={bill.bill_id} 
            />
          </div>

          {/* 요약 */}
          {bill.summary && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">법안 요약</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{bill.summary}</p>
              </div>
            </div>
          )}
        </div>

        {/* 위원회심사정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">위원회심사정보</h3>
          
          {commissionLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
            </div>
          ) : commissionInfo ? (
            <div className="space-y-4">
              {commissionInfo.error ? (
                <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                  <p>⚠️ {String(commissionInfo.error)}</p>
                </div>
              ) : (
                <>
                  {/* 구조화된 정보 표시 */}
                  {commissionInfo.committee_name && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">소관위원회</h4>
                      <p className="text-blue-800">{commissionInfo.committee_name}</p>
                    </div>
                  )}

                  {commissionInfo.result && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">심사결과</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(String(commissionInfo.result))}`}>
                        {String(commissionInfo.result)}
                      </span>
                    </div>
                  )}

                  {commissionInfo.dates && Array.isArray(commissionInfo.dates) && commissionInfo.dates.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">관련 일정</h4>
                      <div className="flex flex-wrap gap-2">
                        {commissionInfo.dates.map((date: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-white rounded border text-sm text-gray-700">
                            {date}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {commissionInfo.examination_reports && Array.isArray(commissionInfo.examination_reports) && commissionInfo.examination_reports.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-3">관련 문서</h4>
                      <div className="space-y-2">
                        {commissionInfo.examination_reports.map((report: { type: string; url: string }, index: number) => (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                            <span className="text-yellow-800 font-medium">{report.type}</span>
                            <a
                              href={report.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              문서 보기
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {commissionInfo.proceedings && Array.isArray(commissionInfo.proceedings) && commissionInfo.proceedings.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-3">회의 진행 내역</h4>
                      <div className="space-y-3">
                        {commissionInfo.proceedings.map((proceeding: { name: string; date: string; result: string }, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="font-medium text-purple-800 mb-1">{proceeding.name}</div>
                            <div className="text-sm text-gray-600 mb-1">일시: {proceeding.date}</div>
                            <div className="text-sm text-gray-700">{proceeding.result}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 원본 데이터 표시 (접을 수 있는 형태) */}
                  <details className="bg-gray-50 rounded-lg">
                    <summary className="p-4 cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                      원본 API 응답 데이터 보기
                    </summary>
                    <div className="px-4 pb-4">
                      <pre className="text-sm text-gray-700 bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {typeof commissionInfo.raw_data === 'string' 
                          ? commissionInfo.raw_data 
                          : JSON.stringify(commissionInfo, null, 2)
                        }
                      </pre>
                    </div>
                  </details>
                </>
              )}
            </div>
          ) : (
            <div className="text-gray-500">위원회심사정보를 불러오는 중...</div>
          )}
        </div>

        {/* 추가 의안 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">추가 의안 정보</h3>
          
          {additionalLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
            </div>
          ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* 본회의심의 정보 */}
               <div className="bg-blue-50 p-4 rounded-lg">
                 <h4 className="font-medium text-blue-900 mb-2">본회의심의 정보</h4>
                 {additionalInfo.deliberate ? (
                   typeof additionalInfo.deliberate === 'object' && 'error' in additionalInfo.deliberate ? (
                     <p className="text-red-600 text-sm">
                       {String(additionalInfo.deliberate.error)}
                     </p>
                   ) : typeof additionalInfo.deliberate === 'object' ? (
                     <div className="space-y-2 text-sm">
                       {(additionalInfo.deliberate as DeliberateInfo).conference_name && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-blue-800">회의명:</span>
                           <span className="ml-2">{(additionalInfo.deliberate as DeliberateInfo).conference_name}</span>
                         </div>
                       )}
                       {(additionalInfo.deliberate as DeliberateInfo).plenary_date && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-blue-800">처리일자:</span>
                           <span className="ml-2">{(additionalInfo.deliberate as DeliberateInfo).plenary_date}</span>
                         </div>
                       )}
                       {(additionalInfo.deliberate as DeliberateInfo).plenary_result && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-blue-800">처리결과:</span>
                           <span className="ml-2">{(additionalInfo.deliberate as DeliberateInfo).plenary_result}</span>
                         </div>
                       )}
                       {(additionalInfo.deliberate as DeliberateInfo).present_date && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-blue-800">상정일자:</span>
                           <span className="ml-2">{(additionalInfo.deliberate as DeliberateInfo).present_date}</span>
                         </div>
                       )}
                       {Object.keys(additionalInfo.deliberate as DeliberateInfo).length === 0 && (
                         <p className="text-gray-500 text-sm">본회의심의 정보가 없습니다.</p>
                       )}
                       
                       {/* 원본 API 데이터 */}
                       {rawApiData.deliberate && (
                         <details className="mt-3">
                           <summary className="cursor-pointer text-blue-700 hover:text-blue-900 text-sm font-medium">
                             원본 API 응답 데이터 보기
                           </summary>
                           <pre className="mt-2 text-xs bg-blue-50 p-3 rounded border max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                             {rawApiData.deliberate}
                           </pre>
                         </details>
                       )}
                     </div>
                   ) : (
                     <details className="text-sm">
                       <summary className="cursor-pointer text-blue-700 hover:text-blue-900">원본 데이터 보기</summary>
                       <pre className="mt-2 text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap">
                         {String(additionalInfo.deliberate).substring(0, 300)}...
                       </pre>
                     </details>
                   )
                 ) : (
                   <p className="text-gray-500 text-sm">로딩 중...</p>
                 )}
               </div>

                             {/* 정부이송 정보 */}
               <div className="bg-green-50 p-4 rounded-lg">
                 <h4 className="font-medium text-green-900 mb-2">정부이송 정보</h4>
                 {additionalInfo.transferred ? (
                   typeof additionalInfo.transferred === 'object' && 'error' in additionalInfo.transferred ? (
                     <p className="text-red-600 text-sm">
                       {String(additionalInfo.transferred.error)}
                     </p>
                   ) : typeof additionalInfo.transferred === 'object' ? (
                     <div className="space-y-2 text-sm">
                       {(additionalInfo.transferred as TransferredInfo).transfer_date && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-green-800">정부이송일:</span>
                           <span className="ml-2">{(additionalInfo.transferred as TransferredInfo).transfer_date}</span>
                         </div>
                       )}
                       {Object.keys(additionalInfo.transferred as TransferredInfo).length === 0 && (
                         <p className="text-gray-500 text-sm">정부이송 정보가 없습니다.</p>
                       )}
                       
                       {/* 원본 API 데이터 */}
                       {rawApiData.transferred && (
                         <details className="mt-3">
                           <summary className="cursor-pointer text-green-700 hover:text-green-900 text-sm font-medium">
                             원본 API 응답 데이터 보기
                           </summary>
                           <pre className="mt-2 text-xs bg-green-50 p-3 rounded border max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                             {rawApiData.transferred}
                           </pre>
                         </details>
                       )}
                     </div>
                   ) : (
                     <details className="text-sm">
                       <summary className="cursor-pointer text-green-700 hover:text-green-900">원본 데이터 보기</summary>
                       <pre className="mt-2 text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap">
                         {String(additionalInfo.transferred).substring(0, 300)}...
                       </pre>
                     </details>
                   )
                 ) : (
                   <p className="text-gray-500 text-sm">로딩 중...</p>
                 )}
               </div>

                             {/* 공포 정보 */}
               <div className="bg-yellow-50 p-4 rounded-lg">
                 <h4 className="font-medium text-yellow-900 mb-2">공포 정보</h4>
                 {additionalInfo.promulgation ? (
                   typeof additionalInfo.promulgation === 'object' && 'error' in additionalInfo.promulgation ? (
                     <p className="text-red-600 text-sm">
                       {String(additionalInfo.promulgation.error)}
                     </p>
                   ) : typeof additionalInfo.promulgation === 'object' ? (
                     <div className="space-y-2 text-sm">
                       {(additionalInfo.promulgation as PromulgationInfo).promulgation_date && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-yellow-800">공포일자:</span>
                           <span className="ml-2">{(additionalInfo.promulgation as PromulgationInfo).promulgation_date}</span>
                         </div>
                       )}
                       {(additionalInfo.promulgation as PromulgationInfo).promulgation_number && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-yellow-800">공포번호:</span>
                           <span className="ml-2">{(additionalInfo.promulgation as PromulgationInfo).promulgation_number}</span>
                         </div>
                       )}
                       {(additionalInfo.promulgation as PromulgationInfo).law_title && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-yellow-800">공포법률:</span>
                           <span className="ml-2">{(additionalInfo.promulgation as PromulgationInfo).law_title}</span>
                         </div>
                       )}
                       {Object.keys(additionalInfo.promulgation as PromulgationInfo).length === 0 && (
                         <p className="text-gray-500 text-sm">공포 정보가 없습니다.</p>
                       )}
                       
                       {/* 원본 API 데이터 */}
                       {rawApiData.promulgation && (
                         <details className="mt-3">
                           <summary className="cursor-pointer text-yellow-700 hover:text-yellow-900 text-sm font-medium">
                             원본 API 응답 데이터 보기
                           </summary>
                           <pre className="mt-2 text-xs bg-yellow-50 p-3 rounded border max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                             {rawApiData.promulgation}
                           </pre>
                         </details>
                       )}
                     </div>
                   ) : (
                     <details className="text-sm">
                       <summary className="cursor-pointer text-yellow-700 hover:text-yellow-900">원본 데이터 보기</summary>
                       <pre className="mt-2 text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap">
                         {String(additionalInfo.promulgation).substring(0, 300)}...
                       </pre>
                     </details>
                   )
                 ) : (
                   <p className="text-gray-500 text-sm">로딩 중...</p>
                 )}
               </div>

                             {/* 부가 정보 */}
               <div className="bg-purple-50 p-4 rounded-lg">
                 <h4 className="font-medium text-purple-900 mb-2">부가 정보</h4>
                 {additionalInfo.additional ? (
                   typeof additionalInfo.additional === 'object' && 'error' in additionalInfo.additional ? (
                     <p className="text-red-600 text-sm">
                       {String(additionalInfo.additional.error)}
                     </p>
                   ) : typeof additionalInfo.additional === 'object' ? (
                     <div className="space-y-2 text-sm">
                       {(additionalInfo.additional as AdditionalBillInfo).related_bills && (additionalInfo.additional as AdditionalBillInfo).related_bills!.length > 0 && (
                         <div className="bg-white p-2 rounded">
                           <span className="font-medium text-purple-800">대안반영폐기 의안목록:</span>
                           <div className="mt-2 space-y-1">
                             {(additionalInfo.additional as AdditionalBillInfo).related_bills!.map((bill, index) => (
                               <div key={index} className="text-sm">
                                 <a 
                                   href={bill.link} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="text-purple-700 hover:text-purple-900 hover:underline"
                                 >
                                   • {bill.name}
                                 </a>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                       {(!additionalInfo.additional || Object.keys(additionalInfo.additional as AdditionalBillInfo).length === 0 || !(additionalInfo.additional as AdditionalBillInfo).related_bills?.length) && (
                         <p className="text-gray-500 text-sm">부가 정보가 없습니다.</p>
                       )}
                       
                       {/* 원본 API 데이터 */}
                       {rawApiData.additional && (
                         <details className="mt-3">
                           <summary className="cursor-pointer text-purple-700 hover:text-purple-900 text-sm font-medium">
                             원본 API 응답 데이터 보기
                           </summary>
                           <pre className="mt-2 text-xs bg-purple-50 p-3 rounded border max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                             {rawApiData.additional}
                           </pre>
                         </details>
                       )}
                     </div>
                   ) : (
                     <details className="text-sm">
                       <summary className="cursor-pointer text-purple-700 hover:text-purple-900">원본 데이터 보기</summary>
                       <pre className="mt-2 text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap">
                         {String(additionalInfo.additional).substring(0, 300)}...
                       </pre>
                     </details>
                   )
                 ) : (
                   <p className="text-gray-500 text-sm">로딩 중...</p>
                 )}
               </div>
            </div>
          )}
        </div>

        {/* 메타 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">메타 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">생성일시</span>
              <p className="text-gray-900">{formatDateUTC(bill.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">수정일시</span>
              <p className="text-gray-900">{formatDateUTC(bill.updated_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">마지막 API 확인</span>
              <p className="text-gray-900">{formatDateUTC(bill.last_api_check)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 