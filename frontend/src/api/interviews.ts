import api from './axios'

export interface InterviewQuestion {
  id: string
  interview_id: string
  question: string
  type: string
  expected_keywords?: string
  order_index: number
  response?: {
    id: string
    response_text: string
    response_score: number
    ai_feedback: string
    created_at: string
  } | null
}

export interface Interview {
  id: string
  company_id: string
  candidate_id: string
  position_id: string | null
  type: string
  status: 'pending' | 'completed'
  public_token?: string
  expires_at: string | null
  completed_at: string | null
  score: number | null
  ai_evaluation: string | null
  created_at: string
  candidate_name?: string
  candidate_email?: string
  position_title?: string | null
  questions?: InterviewQuestion[]
}

export interface PublicInterview {
  id: string
  type: string
  status: string
  expires_at: string | null
  candidate_name: string
  position_title: string | null
  questions: {
    id: string
    question: string
    type: string
    order_index: number
  }[]
}

export const interviewsApi = {
  list: () => api.get<Interview[]>('/interviews'),

  get: (id: string) => api.get<Interview>('/interviews/' + id),

  generate: (data: {
    candidateId: string
    type?: 'general' | 'technical' | 'behavioral' | 'cultural'
    numQuestions?: number
  }) => api.post<Interview>('/interviews/generate', data),

  delete: (id: string) => api.delete('/interviews/' + id),

  // Public endpoints (no auth)
  getPublic: (token: string) => api.get<PublicInterview>('/interviews/public/' + token),

  respond: (
    id: string,
    data: { token: string; responses: Record<string, string> }
  ) => api.post('/interviews/' + id + '/respond', data),
}
