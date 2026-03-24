import api from './axios'

export type PositionStatus = 'open' | 'closed' | 'paused'
export type PositionType = 'full-time' | 'part-time' | 'contract' | 'internship'

export interface Position {
  id: string
  company_id: string
  title: string
  department: string | null
  description: string | null
  requirements: string | null
  location: string | null
  type: PositionType
  status: PositionStatus
  salary_min: number | null
  salary_max: number | null
  created_by: string
  created_at: string
  updated_at: string
  candidate_count: number
  avg_score: number | null
  candidates?: {
    id: string
    name: string
    email: string
    status: string
    overall_score: number
    created_at: string
  }[]
}

export interface CreatePositionData {
  title: string
  department?: string
  description?: string
  requirements?: string
  location?: string
  type?: PositionType
  status?: PositionStatus
  salary_min?: number
  salary_max?: number
}

export const positionsApi = {
  list: () => api.get<Position[]>('/positions'),

  get: (id: string) => api.get<Position>('/positions/' + id),

  create: (data: CreatePositionData) => api.post<Position>('/positions', data),

  update: (id: string, data: Partial<CreatePositionData>) =>
    api.patch<Position>('/positions/' + id, data),

  delete: (id: string) => api.delete('/positions/' + id),
}
