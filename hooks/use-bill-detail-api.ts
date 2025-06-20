import { useState, useCallback, useRef, useMemo } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Bill, CommissionInfo, AdditionalApiInfo } from '@/types/bill'
import { parseCommissionXML, parseDeliberateXML, parseTransferredXML, parsePromulgationXML, parseAdditionalXML } from '@/utils/xmlParsers'

export function useBillDetailApi() {
  const [bill, setBill] = useState<Bill | null>(null)
  const [commissionInfo, setCommissionInfo] = useState<CommissionInfo | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState<AdditionalApiInfo>({})
  const [rawApiData, setRawApiData] = useState<{[key: string]: string}>({})
  const [loading, setLoading] = useState(true)
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [additionalLoading, setAdditionalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabaseRef = useRef<SupabaseClient | null>(null)

  // Supabase 클라이언트를 메모이제이션하여 한 번만 생성
  const supabase = useMemo(() => {
    if (supabaseRef.current) return supabaseRef.current
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return null
    }
    
    try {
      const client = createClient(supabaseUrl, supabaseKey)
      supabaseRef.current = client
      return client
    } catch {
      return null
    }
  }, [])

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

  const fetchBillDetails = useCallback(async (billId: string) => {
    if (!supabase) {
      setError('Supabase 연결 정보가 설정되지 않았습니다.')
      setLoading(false)
      return
    }
    
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
  }, [supabase, fetchCommissionInfo, fetchAdditionalApis])

  return {
    bill,
    commissionInfo,
    additionalInfo,
    rawApiData,
    loading,
    commissionLoading,
    additionalLoading,
    error,
    fetchBillDetails,
    fetchCommissionInfo,
    fetchAdditionalApis
  }
} 