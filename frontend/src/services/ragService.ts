import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export interface Collection {
  id: string
  name: string
  description: string
  document_count: number
}

export interface Document {
  id: string
  title: string
  collection_id: string
  collection_name: string
  doc_type: string
  created_at: string
}

export interface ChatResponse {
  response: string
  sources: Array<{ doc_id: string; title: string; relevance: number }>
  confidence: number
}

export interface QuickStudyResponse {
  key_points: string[]
  summary: string
  sources: Array<{ title: string; relevance: number }>
}

export interface UploadTextParams {
  title: string
  content: string
  collection_id?: string
}

export interface CreateCollectionParams {
  name: string
  description?: string
}

export const ragService = {
  // Collection operations
  getCollections: async (): Promise<{ collections: Collection[] }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/study-ai/collections`)
      return response.data
    } catch (error) {
      console.error('API Error getCollections:', error)
      throw error
    }
  },

  createCollection: async (params: CreateCollectionParams): Promise<{ id: string; name: string; message: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/study-ai/collections`, params)
      return response.data
    } catch (error) {
      console.error('API Error createCollection:', error)
      throw error
    }
  },

  deleteCollection: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/study-ai/collections/${id}`)
      return response.data
    } catch (error) {
      console.error('API Error deleteCollection:', error)
      throw error
    }
  },

  // Document operations
  getDocuments: async (collectionId: string = 'default'): Promise<{ documents: Document[]; count: number }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/study-ai/documents`, {
        params: { collection_id: collectionId }
      })
      return response.data
    } catch (error) {
      console.error('API Error getDocuments:', error)
      throw error
    }
  },

  uploadTextDocument: async (params: UploadTextParams): Promise<{ message: string; document: Document }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/study-ai/documents/upload-text`, params)
      return response.data
    } catch (error) {
      console.error('API Error uploadTextDocument:', error)
      throw error
    }
  },

  uploadFileDocument: async (file: File, collectionId: string = 'default'): Promise<{ message: string; document: Document }> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('collection_id', collectionId)
      
      // Do NOT set 'Content-Type' header manually - let browser set it with proper boundary
      const response = await axios.post(`${API_BASE_URL}/study-ai/documents/upload-file`, formData)
      return response.data
    } catch (error) {
      console.error('API Error uploadFileDocument:', error)
      throw error
    }
  },

  deleteDocument: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/study-ai/documents/${id}`)
      return response.data
    } catch (error) {
      console.error('API Error deleteDocument:', error)
      throw error
    }
  },

  // Chat operations
  chat: async (message: string, userId: string = 'default'): Promise<ChatResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/study-ai/chat`, {
        message,
        user_id: userId
      })
      return response.data
    } catch (error) {
      console.error('API Error chat:', error)
      throw error
    }
  },

  quickStudy: async (message: string, userId: string = 'default'): Promise<QuickStudyResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/study-ai/quick-study`, {
        message,
        user_id: userId
      })
      return response.data
    } catch (error) {
      console.error('API Error quickStudy:', error)
      throw error
    }
  }
}