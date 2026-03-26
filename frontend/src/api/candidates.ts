import api from './axios'

export type CandidateStatus =
  | 'new'
  | 'reviewing'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_extended'
  | 'hired'
  | 'rejected'

export interface Candidate {
  id: string
  company_id: string
  position_id: string | null
  name: string
  email: string | null
  phone: string | null
  location: string | null
  cv_filename: string | null
  status: CandidateStatus
  overall_score: number
  experience_score: number
  skills_score: number
  education_score: number
  cultural_fit_score: number
  years_experience: number | null
  ai_summary: string | null
  ai_strengths: string | null
  ai_concerns: string | null
  extracted_skills: string | null
  extracted_experience: string | null
  extracted_education: string | null
  notes: string | null
  created_at: string
  updated_at: string
  position_title?: string | null
  interviews?: Interview[]
}

export interface Interview {
  id: string
  candidate_id: string
  position_id: string | null
  type: string
  status: string
  token: string | null
  expires_at: string | null
  completed_at: string | null
  score: number | null
  ai_evaluation: string | null
  created_at: string
  question_count?: number
}

export interface CandidatesResponse {
  data: Candidate[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface CandidateFilters {
  page?: number
  pageSize?: number
  sortBy?: string
  order?: 'asc' | 'desc'
  status?: CandidateStatus
  positionId?: string
  minScore?: number
  maxScore?: number
  search?: string
}

export const candidatesApi = {
  list: (filters: CandidateFilters = {}) =>
    api.get<CandidatesResponse>('/candidates', { params: filters }),

  get: (id: string) => api.get<Candidate>('/candidates/' + id),

  create: (data: FormData) =>
    api.post<Candidate>('/candidates', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: { status?: CandidateStatus; notes?: string }) =>
    api.patch<Candidate>('/candidates/' + id, data),

  delete: (id: string) => api.delete('/candidates/' + id),

  getCvUrl: (id: string) => `/api/candidates/${id}/cv`,

  exportCsvUrl: (filters: CandidateFilters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v))
    })
    return `/api/candidates/export/csv?${params.toString()}`
  },
}
