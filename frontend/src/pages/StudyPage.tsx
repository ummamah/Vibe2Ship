import { useState, useRef, useCallback, useEffect } from 'react'
import { AcademicCapIcon, FolderIcon, DocumentIcon, TrashIcon, PlusIcon, XMarkIcon, ChatBubbleLeftIcon, LightBulbIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid'
import { ragService } from '../services/ragService'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function StudyPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Collections & Documents
  const [collections, setCollections] = useState<Array<{id: string, name: string, document_count: number}>>([])
  const [documents, setDocuments] = useState<Array<{id: string, title: string, collection_name: string, doc_type: string}>>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('default')

  // Upload modals
  const [showUpload, setShowUpload] = useState(false)
  const [showNewCollection, setShowNewCollection] = useState(false)

  const [uploadTab, setUploadTab] = useState<'text' | 'file'>('text')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadContent, setUploadContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [newColName, setNewColName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [openDocMenuId, setOpenDocMenuId] = useState<string | null>(null)
  const [openColMenuId, setOpenColMenuId] = useState<string | null>(null)
  const sentMessageIds = useRef<Set<string>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Close menus when clicking outside
  useEffect(() => {
    if (openDocMenuId || openColMenuId) {
      const handleClickOutside = () => {
        setOpenDocMenuId(null)
        setOpenColMenuId(null)
      }
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openDocMenuId, openColMenuId])

  // Fetch data on mount
  useEffect(() => {
    loadCollections()
    loadDocuments()
  }, [selectedCollection])

  const loadCollections = async () => {
    try {
      const data = await ragService.getCollections()
      setCollections(data.collections)
    } catch (e) {
      console.error('Failed to load collections', e)
    }
  }

  const loadDocuments = async () => {
    try {
      const data = await ragService.getDocuments(selectedCollection === 'default' ? 'default' : selectedCollection)
      setDocuments(data.documents)
    } catch (e) {
      console.error('Failed to load documents', e)
    }
  }

  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 5000) }
  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000) }

  const handleChat = async () => {
    if (!inputText.trim() || isLoading) return
    
    // Prevent duplicate messages
    const userMsgId = Date.now().toString()
    if (sentMessageIds.current.has(userMsgId)) return
    sentMessageIds.current.add(userMsgId)
    
    const userContent = inputText
    const userMsg: Message = { id: userMsgId, role: 'user', content: userContent }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)
    
    try {
      const res = await ragService.chat(userContent)
      const assistantId = (Date.now() + 1).toString()
      
      // Check if response is a duplicate
      if (!res.response || res.response.trim() === '') {
        throw new Error('Empty response')
      }
      
      const assistantMsg: Message = { id: assistantId, role: 'assistant', content: res.response }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      showError('Chat error: ' + (e as any).message)
      const errorMsg: Message = { 
        id: (Date.now() + 2).toString(), 
        role: 'assistant', 
        content: 'I am currently unable to answer your query. This may be due to some network issue or some problem with the uploaded file. Please try again later.' 
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickStudy = async () => {
    if (!inputText.trim() || isLoading) return
    
    const msgId = Date.now().toString()
    if (sentMessageIds.current.has(msgId)) return
    sentMessageIds.current.add(msgId)
    
    const userContent = inputText
    const userMsg: Message = { id: msgId, role: 'user', content: `Quick study: ${userContent}` }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)
    
    try {
      const res = await ragService.quickStudy(userContent)
      let content = `Quick Study Summary:\n\n${res.summary}\n\nKey Points:\n${res.key_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content }])
    } catch (e) {
      showError('Quick study error')
      const errorMsg: Message = { 
        id: (Date.now() + 2).toString(), 
        role: 'assistant', 
        content: 'I am currently unable to answer your query. This may be due to some network issue or some problem with the uploaded file. Please try again later.' 
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColName.trim()) return
    try {
      await ragService.createCollection({ name: newColName })
      showSuccess(`Collection "${newColName}" created`)
      setNewColName('')
      setShowNewCollection(false)
      loadCollections()
    } catch (e) {
      showError('Failed to create collection')
    }
  }

  const handleTextUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadTitle.trim() || !uploadContent.trim()) { showError('Title and content are required'); return }
    try {
      await ragService.uploadTextDocument({ title: uploadTitle, content: uploadContent, collection_id: selectedCollection })
      showSuccess(`"${uploadTitle}" uploaded`)
      setUploadTitle(''); setUploadContent(''); setShowUpload(false)
      loadDocuments()
      loadCollections()
    } catch (e: any) {
      showError('Upload failed: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) { showError('Please select a file'); return }
    try {
      await ragService.uploadFileDocument(selectedFile, selectedCollection)
      showSuccess(`"${selectedFile.name}" uploaded`)
      setSelectedFile(null); setShowUpload(false)
      loadDocuments()
      loadCollections()
    } catch (e: any) {
      showError('File upload failed: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handleDeleteDocument = async (id: string, title: string) => {
    if (!confirm(`Delete document "${title}"?`)) return
    try {
      await ragService.deleteDocument(id)
      showSuccess('Document deleted')
      loadDocuments()
      loadCollections()
    } catch (e) {
      showError('Delete failed')
    }
  }

  const handleDeleteCollection = async (id: string, name: string) => {
    if (!confirm(`Delete collection "${name}" and all its documents?`)) return
    try {
      await ragService.deleteCollection(id)
      showSuccess('Collection deleted')
      if (selectedCollection === id) {
        setSelectedCollection('default')
      }
      loadCollections()
      loadDocuments()
    } catch (e) {
      showError('Delete failed')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) { setSelectedFile(e.target.files[0]) }
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-80 bg-dark-surface border-r border-primary/30 flex flex-col">
        <div className="p-4 border-b border-primary/30">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderIcon className="h-5 w-5 icon-accent" /> Collections
          </h2>
          <button onClick={() => setShowNewCollection(true)} className="mt-2 w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-purple-400 px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1 transition-all duration-200 shadow-md hover:shadow-purple-500/20">
            <PlusIcon className="h-4 w-4" /> New Collection
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div onClick={() => setSelectedCollection('default')} className={`cursor-pointer p-2 rounded flex items-center justify-between ${selectedCollection === 'default' ? 'bg-primary/30 border border-primary/50' : 'hover:bg-dark-elevated'}`}>
            <span className="text-white font-medium">All Documents</span>
          </div>
          {collections.map(c => (
            <div key={c.id} className={`group relative flex items-center justify-between p-2 rounded cursor-pointer ${selectedCollection === c.id ? 'bg-primary/30 border border-primary/50' : 'hover:bg-dark-elevated'}`}>
              <div onClick={() => setSelectedCollection(c.id)} className="flex items-center justify-between flex-1">
                <span className="text-white">{c.name}</span>
                <span className="text-xs text-primary-light">{c.document_count}</span>
              </div>
              {/* 3-dot menu for collections */}
              <div className="relative ml-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenColMenuId(openColMenuId === c.id ? null : c.id); }}
                  className="p-1 rounded hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                </button>
                {openColMenuId === c.id && (
                  <div className="absolute right-0 top-8 w-40 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20 py-1">
                    <button 
                      onClick={() => { handleDeleteCollection(c.id, c.name); setOpenColMenuId(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <TrashIcon className="h-4 w-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-primary/30">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Documents ({documents.length})</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {documents.map(d => (
              <div key={d.id} className="group relative flex items-center justify-between p-2 bg-dark-elevated rounded text-sm border border-primary/20 hover:border-primary/50">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <DocumentIcon className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span className="text-gray-300 truncate">{d.title}</span>
                </div>
                {/* 3-dot menu button - shows on hover */}
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpenDocMenuId(openDocMenuId === d.id ? null : d.id); }}
                    className="p-1 rounded hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  {/* Dropdown menu */}
                  {openDocMenuId === d.id && (
                    <div className="absolute right-0 top-8 w-40 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 py-1">
                      <button 
                        onClick={() => { handleDeleteDocument(d.id, d.title); setOpenDocMenuId(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <TrashIcon className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main area */ }
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-primary/30 flex items-center justify-between bg-dark-surface">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 text-glow">
            <AcademicCapIcon className="h-8 w-8 icon-accent" /> Study AI Assistant
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setShowUpload(true)} className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-purple-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-purple-500/20">
              <PlusIcon className="h-5 w-5" /> Upload Material
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 opacity-60">
              <AcademicCapIcon className="h-16 w-16 text-dark-hover mx-auto mb-4" />
              <p className="text-gray-300 text-lg">Welcome to Study AI</p>
              <p className="text-gray-500 text-sm mt-2">Upload documents and ask questions about them</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-dark-elevated text-gray-100 border-2 border-primary shadow-outline-orange">
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              ) : (
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-dark-surface text-gray-200 border-2 border-primary shadow-glow">
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-primary/30 bg-dark-surface">
          {errorMsg && <div className="mb-2 text-sm text-red-400">{errorMsg}</div>}
          {successMsg && <div className="mb-2 text-sm text-primary-light">{successMsg}</div>}
          <div className="flex gap-2">
            <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()}placeholder="Ask about your study materials..." className="input-light flex-1" />
            <button onClick={handleQuickStudy} disabled={isLoading || !inputText.trim()} className="btn-primary disabled:opacity-50">
              <LightBulbIcon className="h-5 w-5" />
            </button>
            <button onClick={handleChat} disabled={isLoading || !inputText.trim()} className="btn-primary px-6 disabled:opacity-50">
              <ChatBubbleLeftIcon className="h-5 w-5" /> Ask
            </button>
          </div>
          {isLoading && <div className="mt-2 text-sm text-primary-light flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Thinking...</div>}
        </div>
      </div>

      {/* New Collection Modal */}
      {showNewCollection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card-elevated p-6 rounded-xl w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New Collection</h3>
              <button onClick={() => setShowNewCollection(false)} className="text-gray-400 hover:text-primary"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <input type="text" value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Collection name" className="input" required />
               <button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-purple-400 py-2 rounded-lg transition-all duration-200 shadow-md">Create</button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card-elevated p-6 rounded-xl w-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Material</h3>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-primary"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setUploadTab('text')} className={`flex-1 py-2 rounded-lg transition-all duration-200 ${uploadTab === 'text' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'}`}>Paste Text</button>
              <button onClick={() => setUploadTab('file')} className={`flex-1 py-2 rounded-lg transition-all duration-200 ${uploadTab === 'file' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'}`}>Upload File</button>
            </div>
            {uploadTab === 'text' ? (
              <form onSubmit={handleTextUpload} className="space-y-4">
                <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Document title" className="input" required />
                <textarea value={uploadContent} onChange={e => setUploadContent(e.target.value)} placeholder="Paste your study material here..." className="input h-32" required />
                <button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-purple-400 py-2 rounded-lg transition-all duration-200 shadow-md">Upload Text</button>
              </form>
            ) : (
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="border-2 border-dashed border-primary/40 rounded-lg p-6 text-center">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt,.pdf,.md" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary-light hover:text-primary font-medium">
                    {selectedFile ? selectedFile.name : 'Click to browse files (PDF, TXT, MD)'}
                  </button>
                </div>
                <button type="submit" disabled={!selectedFile} className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-purple-400 py-2 rounded-lg transition-all duration-200 shadow-md disabled:opacity-50">Upload File</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
