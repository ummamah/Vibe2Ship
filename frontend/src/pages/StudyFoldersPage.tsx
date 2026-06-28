import { useState, useEffect } from 'react'
import { FolderIcon, PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/solid'
import { useNavigate } from 'react-router-dom'
import { ragService } from '../services/ragService'

interface Collection {
  id: string
  name: string
  document_count: number
}

export default function StudyFoldersPage() {
  const navigate = useNavigate()
  const [collections, setCollections] = useState<Collection[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    setIsLoading(true)
    try {
      const data = await ragService.getCollections()
      setCollections(data.collections || [])
    } catch (e: any) {
      console.error('Failed to load collections:', e)
      showError('Failed to load folders: ' + (e.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
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

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!newColName.trim()) {
      showError('Please enter a folder name')
      return
    }
    
    setIsCreating(true)
    try {
      const result = await ragService.createCollection({ name: newColName })
      console.log('Folder created:', result)
      showSuccess(`Folder "${newColName}" created`)
      setNewColName('')
      setShowCreateModal(false)
      await loadCollections()
    } catch (e: any) {
      console.error('Create folder error:', e)
      showError(`Failed to create folder: ${e.response?.data?.detail || e.message || 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`Delete folder "${name}" and all its documents?`)) return
    try {
      await ragService.deleteCollection(id)
      showSuccess('Folder deleted')
      loadCollections()
    } catch (e) {
      showError('Delete failed')
    }
    setOpenMenuId(null)
  }

  const handleFolderClick = (id: string) => {
    navigate(`/study/${id}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <FolderIcon className="h-8 w-8 text-yellow-400" />
          Document Query Workspace (RAG)
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <PlusIcon className="h-5 w-5" />
          New Folder
        </button>
      </div>

      {/* Description */}
      <p className="text-gray-400 mb-8 max-w-3xl">
        Store learning materials, lecture notes, or textbooks in categorized folders, 
        then search and question them with AI.
      </p>

      {/* Folders Grid - Max 2 columns, 3 rows (6 folders) */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent mx-auto" />
          <p className="text-gray-400 mt-4">Loading folders...</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-20 bg-dark-elevated rounded-xl border-2 border-dashed border-gray-700">
          <FolderIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No folders yet</p>
          <p className="text-gray-500 text-sm mt-2">Create your first folder to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {collections.slice(0, 6).map((collection) => (
            <div
              key={collection.id}
              className="group relative bg-dark-elevated rounded-xl p-4 border border-gray-700 hover:border-yellow-400/50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-yellow-400/10"
              onClick={() => handleFolderClick(collection.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-yellow-400/20 rounded-lg flex items-center justify-center border border-yellow-400/30">
                    <FolderIcon className="h-7 w-7 text-yellow-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{collection.name}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {collection.document_count} {collection.document_count === 1 ? 'document' : 'documents'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* 3-dot menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === collection.id ? null : collection.id)
                      }}
                      className="p-2 rounded-lg hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon className="h-4 w-4 text-gray-400 hover:text-red-400" />
                    </button>
                    {openMenuId === collection.id && (
                      <div className="absolute right-0 top-8 w-40 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20 py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFolder(collection.id, collection.name)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                        >
                          <TrashIcon className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error/Success Messages */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-surface rounded-xl p-6 w-96 border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create New Folder</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-2 bg-dark-elevated border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2 rounded-lg transition-all duration-200"
              >
                {isCreating ? 'Creating...' : 'Create Folder'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}