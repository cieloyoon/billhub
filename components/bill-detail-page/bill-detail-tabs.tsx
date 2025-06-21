'use client'

import BillCommissionInfo from '@/components/bill/bill-commission-info'
import BillAdditionalInfo from '@/components/bill/bill-additional-info'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabContentLoadingState } from './bill-detail-states'
import { BillDetailTabsProps } from '@/types/bill-detail'

export function BillDetailTabs({ 
  commissionInfo, 
  additionalInfo, 
  commissionLoading, 
  additionalLoading 
}: BillDetailTabsProps) {
  return (
    <Tabs defaultValue="commission" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="commission" disabled={commissionLoading}>
          위원회심사
          {commissionLoading && (
            <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </TabsTrigger>
        <TabsTrigger value="additional" disabled={additionalLoading}>
          진행정보
          {additionalLoading && (
            <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="commission" className="space-y-6">
        {commissionLoading ? (
          <TabContentLoadingState message="위원회심사 정보를 불러오는 중..." />
        ) : (
          <BillCommissionInfo 
            commissionInfo={commissionInfo} 
            loading={commissionLoading} 
          />
        )}
      </TabsContent>
      
      <TabsContent value="additional" className="space-y-6">
        {additionalLoading ? (
          <TabContentLoadingState message="진행정보를 불러오는 중..." />
        ) : (
          <BillAdditionalInfo 
            additionalInfo={additionalInfo}
            loading={additionalLoading}
          />
        )}
      </TabsContent>
    </Tabs>
  )
} 