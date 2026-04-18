export interface Feedback {
  id: number
  product_id: string
  type: 'bug' | 'suggestion' | 'other'
  content: string
  contact: string | null
  device_info: string | null
  metadata: string | null
  created_at: string
  status: 'pending' | 'reviewed' | 'resolved' | 'ignored'
}

export interface SubmitFeedbackBody {
  product_id: string
  type: 'bug' | 'suggestion' | 'other'
  content: string
  contact?: string
  device_info?: string
  metadata?: Record<string, unknown>
}

export interface UpdateStatusBody {
  status: 'pending' | 'reviewed' | 'resolved' | 'ignored'
}

export interface ListQuery {
  product_id?: string
  type?: string
  status?: string
  page?: string
  page_size?: string
}

export interface StatsQuery {
  product_id?: string
}
