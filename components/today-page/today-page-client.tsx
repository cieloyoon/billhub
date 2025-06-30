'use client'

import { useState, useEffect } from 'react'
import { TodayPageHeader } from './today-page-header'
import { TodayBillsTabs } from './today-bills-tabs'
import { TodayBillsResponse } from '@/types/today-bills'
import { useFavorites } from '@/hooks/use-favorites'
import { format } from 'date-fns'

export function TodayPageClient() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [data, setData] = useState<TodayBillsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { isFavorited, toggleFavorite } = useFavorites()
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const fetchTodayBills = async (date: Date) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const dateString = format(date, 'yyyy-MM-dd')
      const response = await fetch(`/api/today-bills?date=${dateString}`)
      
      if (!response.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다')
      }
      
      const result: TodayBillsResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  useEffect(() => {
    fetchTodayBills(selectedDate)
  }, [selectedDate])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <TodayPageHeader 
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              isToday={isToday}
            />
          </div>
        </div>

        {/* 오류 메시지 */}
        <div className="container mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">오류: {error}</p>
            <button 
              onClick={() => fetchTodayBills(selectedDate)}
              className="mt-2 text-red-600 underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <TodayPageHeader 
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            isToday={isToday}
          />
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-6">
        <TodayBillsTabs
          proposed={data?.proposed || []}
          processed={data?.processed || []}
          changed={data?.changed || []}
          isLoading={isLoading}
          isFavorited={isFavorited}
          onFavoriteToggle={toggleFavorite}
        />
      </div>
    </div>
  )
} 