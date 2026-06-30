import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export interface User {
  id: string
  email: string
  created_at: string
  last_login?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface SendOTPResponse {
  message: string
  expires_in: number
  email: string
}

class AuthService {
  private token: string | null = null

  constructor() {
    // Initialize token from localStorage
    this.token = localStorage.getItem('auth_token')
  }

  get isAuthenticated(): boolean {
    return !!this.token
  }

  get authToken(): string | null {
    return this.token
  }

  get authHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {}
  }

  sendOTP(email: string): Promise<SendOTPResponse> {
    return axios.post(`${API_BASE_URL}/auth/send-otp`, { email }).then((res) => res.data)
  }

  verifyOTP(email: string, code: string): Promise<LoginResponse> {
    return axios
      .post(`${API_BASE_URL}/auth/verify-otp`, { email, code })
      .then((res) => {
        const { access_token, user } = res.data
        this.token = access_token
        localStorage.setItem('auth_token', access_token)
        return res.data
      })
  }

  async getMe(): Promise<User | null> {
    if (!this.token) return null
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: this.authHeaders,
      })
      return response.data
    } catch {
      this.logout()
      return null
    }
  }

  logout(): void {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  restoreToken(): boolean {
    const token = localStorage.getItem('auth_token')
    if (token) {
      this.token = token
      return true
    }
    return false
  }
}

export const authService = new AuthService()
