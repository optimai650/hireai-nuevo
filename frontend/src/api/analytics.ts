import api from './axios'

export interface AnalyticsOverview {
  totalCandidates: number
  totalPositions: number
  activePositions: number
  averageScore: number
  shortlistedCandidates: number
  totalInterviews: number
  completedInterviews: number
  interviewCompletionRate: number
}

export interface CandidatesByStatus {
  status: string
  count: number
}

export interface CandidatesOverTime {
  date: string
  count: number
  avg_score: number
}

export interface TopSkill {
  skill: string
  count: number
}

export interface ScoreDistribution {
  range: string
  count: number
}

export const analyticsApi = {
  overview: () => api.get<AnalyticsOverview>('/analytics/overview'),
  candidatesByStatus: () => api.get<CandidatesByStatus[]>('/analytics/candidates-by-status'),
  candidatesOverTime: () => api.get<CandidatesOverTime[]>('/analytics/candidates-over-time'),
  topSkills: () => api.get<TopSkill[]>('/analytics/top-skills'),
  scoreDistribution: () => api.get<ScoreDistribution[]>('/analytics/score-distribution'),
}
