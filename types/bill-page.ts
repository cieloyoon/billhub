export interface Bill {
  id: number
  bill_id: string
  bill_no: string | null
  bill_name: string | null
  proposer_kind: string | null
  proposer: string | null
  propose_dt: string | null
  proc_dt: string | null
  general_result: string | null
  summary: string | null
  proc_stage_cd: string | null
  pass_gubn: string | null
  created_at: string | null
  updated_at: string | null
  last_api_check: string | null
}

export interface FilterState {
  general_result: string
  proc_stage_cd: string
  pass_gubn: string
  proposer_kind: string
  date_range: string
}

export interface RecentBillsData {
  recentProposed: Bill[]
  recentProcessed: Bill[]
  recentUpdated: Array<{
    bill_id: string
    tracked_at: string
    old_value: string
    new_value: string
    bills: Bill
  }>
}

export interface CacheMetadata {
  lastUpdated: number
  version: string
  totalCount: number
}

export interface CacheStats {
  size: number
  lastUpdated: Date | null
  totalCount: number
}

export interface BillCacheData {
  bills: Bill[]
  metadata: CacheMetadata
}