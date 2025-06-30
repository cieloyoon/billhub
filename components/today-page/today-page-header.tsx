'use client'

import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface TodayPageHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date | undefined) => void
  isToday: boolean
}

export function TodayPageHeader({ selectedDate, onDateChange, isToday }: TodayPageHeaderProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value)
    if (!isNaN(newDate.getTime())) {
      onDateChange(newDate)
    }
  }

  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isToday ? '오늘의 의안' : '특정 날짜 의안'}
        </h1>
        <p className="text-muted-foreground">
          {format(selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })}의 의안 동향을 확인하세요
        </p>
      </div>
      
      <div className="flex items-center space-x-2 self-end sm:self-auto">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            className="w-[160px]"
          />
        </div>
        
        {!isToday && (
          <Button
            onClick={() => onDateChange(new Date())}
            variant="secondary"
            size="sm"
          >
            오늘로
          </Button>
        )}
      </div>
    </div>
  )
} 