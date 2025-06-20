'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BillCategoryTabsProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
  dataLoaded: boolean
}

// 카테고리 정의
const CATEGORIES = [
  { id: 'all', name: '전체', description: '모든 법안', icon: '📋' },
  { id: 'pending', name: '계류중', description: '심사중인 법안', icon: '⏳' },
  { id: 'passed', name: '통과', description: '가결된 법안', icon: '✅' },
  { id: 'rejected', name: '불성립', description: '불성립된 법안', icon: '❌' },
  { id: 'recent', name: '최근', description: '최근 30일 법안', icon: '🆕' },
]

export function BillCategoryTabs({ 
  activeCategory, 
  onCategoryChange, 
  dataLoaded 
}: BillCategoryTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <Tabs value={activeCategory} onValueChange={onCategoryChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-transparent h-auto p-0">
            {CATEGORIES.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                disabled={!dataLoaded}
                className="flex flex-col items-center gap-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg">{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
} 