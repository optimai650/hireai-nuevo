import api from './axios'

export interface User {
  id: string
  name: string
  email: string
  role: string
  companyId: string
}

export interface Company {
  id: string
  name: string
  domain: string | null
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  register: (data: {
    companyName: string
    email: string
    password: string
    name: string
    domain?: string
  }) => api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  me: () => api.get<User>('/auth/me'),

  updateMe: (data: { name: string }) => api.patch<User>('/auth/me', data),

  getCompany: () => api.get<Company>('/auth/company'),

  updateCompany: (data: { name: string; domain?: string }) =>
    api.patch<Company>('/auth/company', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
}
