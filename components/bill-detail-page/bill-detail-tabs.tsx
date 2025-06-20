'use client'

import BillCommissionInfo from '@/components/bill/bill-commission-info'
import BillAdditionalInfo from '@/components/bill/bill-additional-info'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
        <TabsTrigger value="commission">위원회심사</TabsTrigger>
        <TabsTrigger value="additional">진행정보</TabsTrigger>
      </TabsList>
      
      <TabsContent value="commission" className="space-y-6">
        <BillCommissionInfo 
          commissionInfo={commissionInfo} 
          loading={commissionLoading} 
        />
      </TabsContent>
      
      <TabsContent value="additional" className="space-y-6">
        <BillAdditionalInfo 
          additionalInfo={additionalInfo}
          loading={additionalLoading}
        />
      </TabsContent>
    </Tabs>
  )
} 