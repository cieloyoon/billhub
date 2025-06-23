import { useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bill, CommissionInfo, AdditionalApiInfo } from '@/types/bill'
import { parseCommissionXML, parseDeliberateXML, parseTransferredXML, parsePromulgationXML, parseAdditionalXML } from '@/utils/xmlParsers'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useBillDetailApi() {
  const [bill, setBill] = useState<Bill | null>(null)
  const [commissionInfo, setCommissionInfo] = useState<CommissionInfo | null>(null)
  const [additionalInfo, setAdditionalInfo] = useState<AdditionalApiInfo>({})
  const [rawApiData, setRawApiData] = useState<{[key: string]: string}>({})
  const [loading, setLoading] = useState(true)
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [additionalLoading, setAdditionalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  const supabaseRef = useRef<SupabaseClient | null>(null)

  // Supabase 클라이언트를 메모이제이션하여 한 번만 생성
  const supabase = useMemo(() => {
    if (supabaseRef.current) return supabaseRef.current
    
    try {
      const client = createClient()
      supabaseRef.current = client
      return client
    } catch {
      return null
    }
  }, [])

  const fetchCommissionInfo = useCallback(async (billId: string, isBackground = false) => {
    try {
      if (!isBackground) {
        setCommissionLoading(true)
      }
      
      console.log(`${isBackground ? '🔄 백그라운드' : '⚡'} 위원회심사정보 API 호출 시작:`, billId)
      
      const response = await fetch(`/api/bill-commission?bill_id=${billId}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API 응답 에러:', errorText)
        throw new Error(`위원회심사정보를 가져올 수 없습니다. (${response.status}: ${response.statusText})`)
      }

      const data = await response.text()
      const parsedData = parseCommissionXML(data)
      
      setCommissionInfo({ ...parsedData, raw_data: data })
      console.log(`✅ 위원회심사정보 로딩 완료 (${isBackground ? '백그라운드' : '일반'})`)
    } catch (err) {
      console.error('Error fetching commission info:', err)
      setCommissionInfo({ error: err instanceof Error ? err.message : '위원회심사정보 로딩 실패' })
    } finally {
      if (!isBackground) {
        setCommissionLoading(false)
      }
    }
  }, [])

  const fetchAdditionalApis = useCallback(async (billId: string, isBackground = false) => {
    try {
      if (!isBackground) {
        setAdditionalLoading(true)
      }
      console.log(`${isBackground ? '🔄 백그라운드' : '⚡'} 추가 API들 병렬 호출 시작:`, billId)
      
      const apis = [
        { name: 'deliberate', url: `/api/bill-deliberate?bill_id=${billId}` },
        { name: 'transferred', url: `/api/bill-transferred?bill_id=${billId}` },
        { name: 'promulgation', url: `/api/bill-promulgation?bill_id=${billId}` },
        { name: 'additional', url: `/api/bill-additional?bill_id=${billId}` }
      ]

      const results: AdditionalApiInfo = {}
      const rawResults: {[key: string]: string} = {}
      let completedCount = 0
      const totalCount = apis.length

      // 모든 API를 완전히 병렬로 호출하여 최대 성능 확보
      const promises = apis.map(async (api) => {
        try {
          console.log(`🚀 API 호출 시작: ${api.name}`)
          const startTime = Date.now()
          
          const response = await fetch(api.url)
          
          const endTime = Date.now()
          console.log(`⚡ API 응답: ${api.name} (${endTime - startTime}ms)`)
          
          if (response.ok) {
            const data = await response.text()
            rawResults[api.name] = data
            
            // 파싱도 병렬로 진행
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
            console.log(`✅ 파싱 완료: ${api.name}`)
          } else {
            results[api.name as keyof AdditionalApiInfo] = { error: `${response.status} ${response.statusText}` }
            rawResults[api.name] = `Error: ${response.status} ${response.statusText}`
            console.log(`❌ API 에러: ${api.name} - ${response.status}`)
          }
        } catch (error) {
          results[api.name as keyof AdditionalApiInfo] = { error: error instanceof Error ? error.message : '알 수 없는 오류' }
          rawResults[api.name] = `Error: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
          console.error(`💥 API 예외: ${api.name}`, error)
        } finally {
          completedCount++
          if (isBackground) {
            const progress = Math.round((completedCount / totalCount) * 100)
            setLoadingProgress(progress)
            console.log(`📈 병렬 API 진행률: ${progress}% (${completedCount}/${totalCount})`)
          }
        }
      })

      // 모든 API 병렬 처리 완료 대기
      await Promise.allSettled(promises)

      setAdditionalInfo(results)
      setRawApiData(rawResults)
      console.log(`🎉 모든 추가 API 병렬 로딩 완료 (${isBackground ? '백그라운드' : '일반'})`)
    } catch (err) {
      console.error('Error fetching additional APIs:', err)
    } finally {
      if (!isBackground) {
        setAdditionalLoading(false)
      }
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
      setLoadingProgress(0)

      console.log('⚡ 의안 기본정보 로딩 시작:', billId)
      
      // 1단계: 의안 기본정보 빠르게 로딩
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('bill_id', billId)
        .single()

      if (error) {
        throw new Error(`의안 정보를 가져올 수 없습니다: ${error.message}`)
      }

      setBill(data)
      setLoading(false) // 기본정보 로딩 완료
      console.log('✅ 의안 기본정보 로딩 완료 - 화면 표시 시작')

      // 2단계: 백그라운드에서 상세정보 로딩
      if (data?.bill_id) {
        setBackgroundLoading(true)
        console.log('🔄 백그라운드 상세정보 로딩 시작')

        // 위원회심사정보와 추가 API들을 병렬로 로딩
        try {
          await Promise.allSettled([
            fetchCommissionInfo(data.bill_id, true),
            fetchAdditionalApis(data.bill_id, true)
          ])
          
          setLoadingProgress(100)
          console.log('🎉 모든 상세정보 백그라운드 로딩 완료')
        } catch (backgroundError) {
          console.error('백그라운드 로딩 중 일부 오류:', backgroundError)
          // 백그라운드 오류는 기본정보 표시에 영향주지 않음
        } finally {
          setBackgroundLoading(false)
        }
      }
    } catch (err) {
      console.error('Error fetching bill details:', err)
      setError(err instanceof Error ? err.message : '의안 정보를 가져오는 중 오류가 발생했습니다.')
      setLoading(false)
      setBackgroundLoading(false)
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
    backgroundLoading,
    loadingProgress,
    error,
    fetchBillDetails,
    fetchCommissionInfo,
    fetchAdditionalApis
  }
} 