import { Bill } from './bill'

export interface TodayBillsResponse {
  date: string
  proposed: Bill[]
  processed: Bill[]
  changed: ChangedBill[]
}

export interface ChangedBill {
  bill_id: string
  tracked_at: string
  old_value: string
  new_value: string
  bills: Bill
}

export interface TodayBillsData {
  date: string
  proposedCount: number
  processedCount: number
  changedCount: number
  proposed: Bill[]
  processed: Bill[]
  changed: ChangedBill[]
} 