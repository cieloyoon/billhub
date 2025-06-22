'use client'

import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface BillSearchBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  activeFiltersCount: number
  onFilterOpen: () => void
}

export function BillSearchBar({ 
  searchTerm, 
  onSearchChange, 
  activeFiltersCount, 
  onFilterOpen 
}: BillSearchBarProps) {
  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="의안명, 의안번호, 내용으로 검색..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="relative whitespace-nowrap" onClick={onFilterOpen}>
          <Filter className="h-4 w-4 mr-2" />
          필터
          {activeFiltersCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  )
} 