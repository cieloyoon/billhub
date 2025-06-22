'use client'

import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FilterState } from '@/types/bill-page'

interface BillFilterSheetProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFilterChange: (key: keyof FilterState, value: string) => void
  onClearFilters: () => void
  activeFiltersCount: number
}

// 필터 옵션들
const FILTER_OPTIONS = {
  general_result: [
    { value: 'all', label: '전체' },
    { value: '원안가결', label: '원안가결' },
    { value: '수정가결', label: '수정가결' },
    { value: '부결', label: '부결' },
    { value: '폐기', label: '폐기' },
    { value: '대안반영폐기', label: '대안반영폐기' },
    { value: '수정안반영폐기', label: '수정안반영폐기' },
    { value: '철회', label: '철회' },
  ],
  proc_stage_cd: [
    { value: 'all', label: '전체' },
    { value: '접수', label: '접수' },
    { value: '소관위접수', label: '소관위접수' },
    { value: '소관위심사', label: '소관위심사' },
    { value: '소관위심사보고', label: '소관위심사보고' },
    { value: '체계자구심사', label: '체계자구심사' },
    { value: '본회의부의안건', label: '본회의부의안건' },
    { value: '본회의의결', label: '본회의의결' },
    { value: '정부이송', label: '정부이송' },
    { value: '공포', label: '공포' },
  ],
  pass_gubn: [
    { value: 'all', label: '전체' },
    { value: '계류의안', label: '계류의안' },
    { value: '처리의안', label: '처리의안' },
  ],
  proposer_kind: [
    { value: 'all', label: '전체' },
    { value: '의원', label: '의원' },
    { value: '정부', label: '정부' },
    { value: '위원회', label: '위원회' },
  ],
  date_range: [
    { value: 'all', label: '전체' },
    { value: '7', label: '최근 7일' },
    { value: '30', label: '최근 30일' },
    { value: '90', label: '최근 90일' },
    { value: '365', label: '최근 1년' },
  ]
}

export function BillFilterSheet({ 
  isOpen, 
  onClose, 
  filters, 
  onFilterChange, 
  onClearFilters, 
  activeFiltersCount 
}: BillFilterSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-xl">고급 필터</SheetTitle>
              <SheetDescription className="text-sm text-gray-500">
                원하는 조건으로 의안을 정확하게 필터링하세요
              </SheetDescription>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <span className="font-medium">{activeFiltersCount}개의 필터가 적용됨</span>
              <Button onClick={onClearFilters} variant="ghost" size="sm" className="h-6 px-2 text-blue-600 hover:text-blue-700">
                초기화
              </Button>
            </div>
          )}
        </SheetHeader>

        <div className="mt-8 space-y-8">
          {/* 처리 상태 그룹 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-green-500 rounded-full"></div>
              <h3 className="font-semibold text-gray-900">처리 상태</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4 pl-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  처리결과
                </label>
                <Select value={filters.general_result} onValueChange={(value: string) => onFilterChange('general_result', value)}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500/20">
                    <SelectValue placeholder="처리결과를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.general_result.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  처리단계
                </label>
                <Select value={filters.proc_stage_cd} onValueChange={(value: string) => onFilterChange('proc_stage_cd', value)}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500/20">
                    <SelectValue placeholder="처리단계를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.proc_stage_cd.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  처리구분
                </label>
                <Select value={filters.pass_gubn} onValueChange={(value: string) => onFilterChange('pass_gubn', value)}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500/20">
                    <SelectValue placeholder="처리구분을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.pass_gubn.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 발의 정보 그룹 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
              <h3 className="font-semibold text-gray-900">발의 정보</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4 pl-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  발의자
                </label>
                <Select value={filters.proposer_kind} onValueChange={(value: string) => onFilterChange('proposer_kind', value)}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20">
                    <SelectValue placeholder="발의자를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.proposer_kind.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  발의일
                </label>
                <Select value={filters.date_range} onValueChange={(value: string) => onFilterChange('date_range', value)}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20">
                    <SelectValue placeholder="발의일 범위를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.date_range.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 