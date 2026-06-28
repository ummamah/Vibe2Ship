import { useState, useRef, useEffect } from 'react'
import { ArrowLeftIcon, DocumentIcon, TrashIcon, XMarkIcon, ChatBubbleLeftIcon, LightBulbIcon, PlusIcon, PaperClipIcon } from '@heroicons/react/24/solid'
import { useNavigate, useParams } from 'react-router-dom'
import { ragService } from '../services/ragService'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Document {
  id: string
  title: string
  doc_type: string
  created_at: string
}

export default function StudyCollectionPage() {
  const navigate = useNavigate()
  const { collectionId } = useParams<{ collectionId: string }>()
  
  const [collectionName, setCollectionName] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadTab, setUploadTab] = useState<'text' | 'file'>('text')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadContent, setUploadContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [openDocMenuId, setOpenDocMenuId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEnd.current) {
      messagesEnd.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (collectionId) {
      loadCollectionInfo()
      loadDocuments()
    }
  }, [collectionId])

  const loadCollectionInfo = async () => {
    try {
      const data = await ragService.getCollections()
      const collection = data.collections.find(c => c.id === collectionId)
      if (collection) {
        setCollectionName(collection.name)
      } else {
        navigate('/study')
      }
    } catch (e) {
      console.error('Failed to load collection info', e)
    }
  }

  const loadDocuments = async () => {
    try {
      const data = await ragService.getDocuments(collectionId || 'default')
      setDocuments(data.documents || [])
    } catch (e) {
      console.error('Failed to load documents', e)
    }
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(''), 5000)
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  const handleChat = async () => {
    if (!inputText.trim() || isSending) return
    
    const userMsgId = Date.now().toString()
    const userMsg: Message = { id: userMsgId, role: 'user', content: inputText }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsSending(true)
    
    try {
      const res = await ragService.chat(userMsg.content)
      if (!res.response || res.response.trim() === '') {
        throw new Error('Empty response')
      }
      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: res.response 
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e: any) {
      console.error('Chat error:', e)
      showError('Chat error: ' + (e.message || 'Unknown error'))
      const errorMsg: Message = { 
        id: (Date.now() + 2).toString(), 
        role: 'assistant', 
        content: 'I am currently unable to answer your query. Please try again later.' 
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedFile) {
      showError('Please select a file first')
      return
    }
    
    setIsUploading(true)
    try {
      console.log('Uploading file:', selectedFile.name, 'to collection:', collectionId)
      const result = await ragService.uploadFileDocument(selectedFile, collectionId || 'default')
      console.log('Upload result:', result)
      showSuccess(`"${selectedFile.name}" uploaded successfully`)
      setSelectedFile(null)
      setShowUpload(false)
      await loadDocuments()
      await loadCollectionInfo()
    } catch (e: any) {
      console.error('File upload error:', e)
      showError('File upload failed: ' + (e.response?.data?.detail || e.message || 'Unknown error'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleTextUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadTitle.trim() || !uploadContent.trim()) { 
      showError('Title and content are required') 
      return 
    }
    
    setIsUploading(true)
    try {
      await ragService.uploadTextDocument({ 
        title: uploadTitle, 
        content: uploadContent, 
        collection_id: collectionId || 'default' 
      })
      showSuccess(`"${uploadTitle}" uploaded`)
      setUploadTitle('')
      setUploadContent('')
      setShowUpload(false)
      await loadDocuments()
    } catch (e: any) {
      showError('Upload failed: ' + (e.response?.data?.detail || e.message || 'Unknown error'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDocument = async (id: string, title: string) => {
    if (!confirm(`Delete document "${title}"?`)) return
    try {
      await ragService.deleteDocument(id)
      showSuccess('Document deleted')
      loadDocuments()
    } catch (e) {
      showError('Delete failed')
    }
    setOpenDocMenuId(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name)
      setSelectedFile(e.target.files[0])
    }
  }

  const quickSuggestions = [
    'Provide a concise summary of the materials',
    'Draft a list of key definitions & terms',
    'Create a 3-question revision quiz',
    'Explain the core concept in simple terms'
  ]

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top Bar */}
      <div className="bg-dark-surface border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/study')}
            className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Return to Folders</span>
          </button>
          
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <DocumentIcon className="h-6 w-6 text-yellow-400" />
            {collectionName || 'Collection'}
          </h1>
          
          <button
            onClick={() => setShowUpload(true)}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            Upload
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Documents List */}
        <div className="w-72 bg-dark-surface border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Uploaded Documents ({documents.length})
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DocumentIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documents yet</p>
                <p className="text-xs mt-1">Upload files to get started</p>
              </div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  className="group relative bg-dark-elevated rounded-lg p-3 border border-gray-700 hover:border-yellow-400/30"
                >
                  <div className="flex items-center gap-2">
                    <DocumentIcon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm truncate flex-1">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <span>{doc.doc_type.toUpperCase()}</span>
                  </div>
                  
                  {/* Delete menu */}
                  <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDocMenuId(openDocMenuId === doc.id ? null : doc.id)
                      }}
                      className="p-1 rounded hover:bg-gray-700"
                    >
                      <TrashIcon className="h-4 w-4 text-gray-400 hover:text-red-400" />
                    </button>
                    {openDocMenuId === doc.id && (
                      <div className="absolute right-0 top-8 w-32 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20 py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDocument(doc.id, doc.title)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Chat Interface */}
        <div className="flex-1 flex flex-col bg-dark-bg">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="mb-4">
                  <ChatBubbleLeftIcon className="h-16 w-16 text-gray-600 mx-auto" />
                </div>
                <h3 className="text-gray-400 text-lg font-medium">Ask AI About Folder Contents</h3>
                <p className="text-gray-500 text-sm mt-2 max-w-md">
                  Ask any question about the uploaded materials. AI will dynamically read through all folder contexts to formulate answers.
                </p>
                
                {/* Quick Suggestions */}
                <div className="mt-6 grid grid-cols-2 gap-3 max-w-2xl">
                  {quickSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputText(suggestion)}
                      className="bg-dark-elevated hover:bg-gray-700 border border-gray-700 hover:border-yellow-400/50 rounded-lg p-3 text-left text-sm text-gray-300 transition-all duration-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-yellow-400/20 text-gray-100 border border-yellow-400/30">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
                      </div>
                    ) : (
                      <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-dark-elevated text-gray-200 border border-gray-700">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEnd} />
              </>
            )}
          </div>

          {/* Error messages */}
          {errorMsg && (
            <div className="mx-6 mb-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mx-6 mb-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
              {successMsg}
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-700 bg-dark-surface p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Ask a question about these documents..."
                className="flex-1 px-4 py-3 bg-dark-elevated border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
              <button
                onClick={() => { /* Quick study */ }}
                disabled={isSending || !inputText.trim()}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="Quick Study"
              >
                <LightBulbIcon className="h-5 w-5 text-yellow-400" />
              </button>
              <button
                onClick={handleChat}
                disabled={isSending || !inputText.trim()}
                className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <span>{isSending ? 'Sending...' : 'Ask'}</span>
                <ChatBubbleLeftIcon className="h-5 w-5" />
              </button>
            </div>
            
            {isSending && (
              <div className="mt-2 text-sm text-yellow-400 flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                Gemini is thinking...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-surface rounded-xl p-6 w-[500px] border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Document</h3>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setUploadTab('text')}
                className={`flex-1 py-2 rounded-lg transition-all duration-200 ${
                  uploadTab === 'text' 
                    ? 'bg-yellow-400 text-black font-semibold' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Paste Text
              </button>
              <button
                onClick={() => setUploadTab('file')}
                className={`flex-1 py-2 rounded-lg transition-all duration-200 ${
                  uploadTab === 'file' 
                    ? 'bg-yellow-400 text-black font-semibold' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Upload File
              </button>
            </div>
            
            {uploadTab === 'text' ? (
              <form onSubmit={handleTextUpload} className="space-y-4">
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Document title"
                  className="w-full px-4 py-2 bg-dark-elevated border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                  required
                />
                <textarea
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Paste your study material here..."
                  className="w-full px-4 py-3 bg-dark-elevated border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 h-32 resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-semibold py-2 rounded-lg transition-all duration-200"
                >
                  {isUploading ? 'Uploading...' : 'Upload Text'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div 
                  className="border-2 border-dashed border-gray-600 hover:border-yellow-400 rounded-lg p-8 text-center transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".txt,.pdf,.md,.csv,.json"
                    className="hidden"
                  />
                  <PaperClipIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-white font-medium">
                    {selectedFile ? selectedFile.name : 'Click to browse or drag file here'}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Supports TXT, MD, CSV, JSON, PDF
                  </p>
                </div>
                {selectedFile && (
                  <p className="text-sm text-green-400 text-center">Selected: {selectedFile.name}</p>
                )}
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2 rounded-lg transition-all duration-200"
                >
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}