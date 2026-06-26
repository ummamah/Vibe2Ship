import { useState } from 'react'
import { FolderIcon, DocumentIcon, PaperAirplaneIcon, PlusIcon, BookOpenIcon } from '@heroicons/react/24/solid'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Folder {
  id: string
  name: string
  fileCount: number
}

export default function StudyPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I am your study assistant. Ask me anything about your uploaded materials!' }
  ])

  const folders: Folder[] = [
    { id: '1', name: 'Mathematics', fileCount: 12 },
    { id: '2', name: 'Physics', fileCount: 8 },
    { id: '3', name: 'Programming', fileCount: 15 },
    { id: '4', name: 'Chemistry', fileCount: 6 },
  ]

  const handleSendMessage = () => {
    if (!message.trim()) return

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: message }
    ]
    setChatMessages(newMessages)
    setMessage('')

    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I have analyzed your study materials. Based on the uploaded documents, here is what I found...'
      }])
    }, 1000)
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Folders Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpenIcon className="h-5 w-5 text-blue-500" />
                Study Folders
              </h2>
              <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg">
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                    selectedFolder === folder.id
                      ? 'bg-blue-600 shadow-lg'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderIcon className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">{folder.name}</p>
                      <p className={`text-sm ${
                        selectedFolder === folder.id ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        {folder.fileCount} files
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="font-semibold text-white mb-3">Upload Files</h3>
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <DocumentIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Drag and drop or click to upload</p>
              <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, MD</p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl border border-gray-700 h-[calc(100vh-12rem)] flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-gray-700">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-xl">AI</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Study AI Assistant</h2>
                <p className="text-sm text-gray-400">
                  {selectedFolder ? 'Ready to help with your materials' : 'Select a folder to start'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm">AI</span>
                    </div>
                  )}
                  <div
                    className={`max-w-md p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm">U</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about your study materials..."
                  className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
                <button 
                  onClick={handleSendMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}