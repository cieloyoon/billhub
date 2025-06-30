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

export interface CommissionInfo {
  committee_name?: string
  examination_date?: string
  examination_result?: string
  examination_report_url?: string
  review_report_url?: string
  examination_reports?: Array<{type: string; url: string}>
  proceedings?: Array<{name: string; date?: string; result?: string}>
  dates?: string[]
  result?: string
  submit_date?: string
  present_date?: string
  process_date?: string
  related_committees?: Array<{name: string; submit_date?: string; present_date?: string; process_date?: string}>
  error?: string
  raw_data?: string
  [key: string]: unknown
}

export interface DeliberateInfo {
  conference_name?: string
  plenary_date?: string
  plenary_result?: string
  present_date?: string
  [key: string]: unknown
}

export interface TransferredInfo {
  transfer_date?: string
  [key: string]: unknown
}

export interface PromulgationInfo {
  promulgation_date?: string
  promulgation_number?: string
  law_title?: string
  [key: string]: unknown
}

export interface AdditionalBillInfo {
  related_bills?: Array<{name: string, link: string}>
  alternative_bills?: Array<{name: string, link: string}>
  keywords?: string[]
  summary?: string
  memo?: string
  bill_gbn?: string
  [key: string]: unknown
}

export interface AdditionalApiInfo {
  deliberate?: DeliberateInfo | { error: string } | string
  transferred?: TransferredInfo | { error: string } | string
  promulgation?: PromulgationInfo | { error: string } | string
  additional?: AdditionalBillInfo | { error: string } | string
} 