import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { Plus, FolderOpen, Calendar, BarChart3, Users, Youtube, Instagram, Twitter, Edit2, Trash2, MoreVertical, Download, KeyRound, Link2 } from 'lucide-react'
import { Project } from '../lib/supabase'

const apiRecords = [
  {
    name: 'Scrape Creators',
    address: 'https://api.scrapecreators.com',
    apiKey: '************e4Ug'
  }
]

// TikTok图标组件
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.16 20.5a6.33 6.33 0 0 0 10.86-4.43V7.83a8.24 8.24 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.2-.26z"/>
  </svg>
)

const ApiRecordBar = () => (
  <div className="hidden md:flex w-[500px] border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
    {apiRecords.map((record) => (
      <div key={record.name} className="min-w-0">
        <div className="font-medium leading-4 text-gray-900">{record.name}</div>
        <span className="mt-1 flex min-w-0 items-center gap-3 leading-4">
          <span className="flex min-w-0 items-center gap-1">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            <span className="shrink-0 text-gray-500">地址</span>
            <span className="truncate font-mono text-gray-700" title={record.address}>{record.address}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <KeyRound className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-gray-500">API Key</span>
            <span className="font-mono tracking-wider text-gray-700">{record.apiKey}</span>
          </span>
        </span>
      </div>
    ))}
  </div>
)

// 从URL检测真实平台类型
const detectRealPlatformFromUrl = (url: string): string => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube'
  }
  if (url.includes('tiktok.com')) {
    return 'tiktok'
  }
  if (url.includes('instagram.com')) {
    return 'instagram'
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter'
  }
  return 'unknown'
}

// 平台图标映射 - 支持根据URL智能检测
const PlatformIcon = ({ platform, url }: { platform: string, url?: string }) => {
  // 如果提供了URL，优先根据URL检测真实平台
  const realPlatform = url ? detectRealPlatformFromUrl(url) : platform
  
  switch (realPlatform) {
    case 'youtube':
      return <Youtube className="h-4 w-4 text-red-500" />
    case 'tiktok':
      return <TikTokIcon className="h-4 w-4 text-black" />
    case 'instagram':
      return <Instagram className="h-4 w-4 text-pink-500" />
    case 'twitter':
    case 'x':
      return <Twitter className="h-4 w-4 text-blue-500" />
    default:
      return null
  }
}

// 创建项目模态框
const CreateProjectModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { createProject } = useProjectStore()
  const [formData, setFormData] = useState({
    name: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('请输入项目名称')
      return
    }

    setSubmitting(true)
    setError('')

    // 默认支持所有平台
    const result = await createProject(formData.name, ['youtube', 'tiktok', 'instagram', 'twitter'])
    
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      setFormData({ name: '' })
      setSubmitting(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">创建新项目</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入项目名称"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? '创建中...' : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 编辑项目模态框组件
const EditProjectModal = ({ isOpen, onClose, project }: { 
  isOpen: boolean
  onClose: () => void
  project: Project | null
}) => {
  const { updateProject } = useProjectStore()
  const [formData, setFormData] = useState({
    name: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (project) {
      setFormData({ name: project.name })
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('请输入项目名称')
      return
    }

    if (!project) return

    setSubmitting(true)
    setError('')

    const result = await updateProject(project.id, { name: formData.name })
    
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      setSubmitting(false)
      onClose()
    }
  }

  if (!isOpen || !project) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">编辑项目</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              项目名称
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入项目名称"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 删除项目确认对话框组件
const DeleteProjectModal = ({ isOpen, onClose, project, onConfirm }: { 
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onConfirm: () => void
}) => {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  if (!isOpen || !project) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">删除项目</h3>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            您确定要删除项目 <span className="font-medium text-gray-900">"{project.name}"</span> 吗？
          </p>
          <p className="text-sm text-red-600 mt-2">
            此操作将永久删除项目及其所有相关内容，且无法恢复。
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={deleting}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            disabled={deleting}
          >
            {deleting ? '删除中...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectList() {
  const { projects, loading, fetchProjects, updateProject, deleteProject } = useProjectStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectContentCounts, setProjectContentCounts] = useState<Record<string, number>>({})
  const [projectViews, setProjectViews] = useState<Record<string, number>>({})

  // 获取项目内容数量和统计数据
  const fetchProjectContentCounts = useCallback(async () => {
    const counts: Record<string, number> = {}
    const views: Record<string, number> = {}
    
    for (const project of projects) {
      try {
        // 使用正确的 API 端点获取项目内容
        const params = new URLSearchParams()
        params.set('page', '1')
        params.set('limit', '500')
        const response = await fetch(`/api/contents/${project.id}?${params.toString()}`, {
          headers: {
            'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c'
          }
        })
        const result = await response.json()
        
        if (result.success && result.data.contents) {
          const contents = result.data.contents
          counts[project.id] = contents.length
          
          // 计算总观看量
          const totalViews = contents.reduce((sum: number, content: any) => 
            sum + (content.latest_stats?.view_count || 0), 0)
          views[project.id] = totalViews
          
          console.log(`项目 ${project.id}: ${contents.length} 个内容, 总观看量: ${totalViews}`)
        } else {
          counts[project.id] = 0
          views[project.id] = 0
        }
      } catch (error) {
        console.error(`获取项目 ${project.id} 数据失败:`, error)
        counts[project.id] = 0
        views[project.id] = 0
      }
    }
    
    setProjectContentCounts(counts)
    setProjectViews(views)
  }, [projects])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    console.log('ProjectList - 项目数据更新:', projects)
    if (projects.length > 0) {
      fetchProjectContentCounts()
    }
  }, [projects, fetchProjectContentCounts])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setShowEditModal(true)
  }

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project)
    setShowDeleteModal(true)
  }

  const confirmDeleteProject = async () => {
    if (selectedProject) {
      await deleteProject(selectedProject.id)
      setShowDeleteModal(false)
      setSelectedProject(null)
    }
  }

  // 导出项目数据
  const handleExportProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/contents/export/${project.id}`, {
        method: 'GET',
        headers: {
          'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c', // 临时使用固定用户ID
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('导出失败:', errorData.error)
        return
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition')
      let fileName = `${project.name}_达人数据_${new Date().toISOString().split('T')[0]}.xlsx`
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (fileNameMatch) {
          fileName = decodeURIComponent(fileNameMatch[1])
        }
      }
      
      // 创建下载链接
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('✅ 数据导出成功')
      
      // 导出后刷新内容数量（可能有新的统计数据）
      fetchProjectContentCounts()
    } catch (error) {
      console.error('❌ 导出数据时发生错误:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-4 py-3">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">内容监控平台</h1>
            </div>
            
            <div className="flex min-w-0 items-center gap-4">
              <ApiRecordBar />
              <div className="shrink-0 whitespace-nowrap text-sm text-gray-600">
                内容监控管理系统
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和创建按钮 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">我的项目</h2>
            <p className="mt-1 text-sm text-gray-600">
              管理您的内容监控项目
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建项目
          </button>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无项目</h3>
            <p className="mt-1 text-sm text-gray-500">开始创建您的第一个内容监控项目</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建项目
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: Project & { post_count?: number }) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 relative group"
              >
                {/* 操作按钮 */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => handleExportProject(project, e)}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-blue-50 border border-gray-200"
                      title="导出数据"
                    >
                      <Download className="h-4 w-4 text-blue-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditProject(project)
                      }}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 border border-gray-200"
                      title="编辑项目"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProject(project)
                      }}
                      className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 border border-gray-200"
                      title="删除项目"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* 项目内容区域 - 点击可跳转 */}
                <Link to={`/projects/${project.id}`} className="block p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-16">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {project.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(project.created_at)}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {projectContentCounts[project.id] ?? 0} 个内容
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                      project.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : project.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status === 'active' ? '活跃' : project.status === 'paused' ? '暂停' : '完成'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">平台：</span>
                      <div className="flex space-x-1">
                        {project.platforms.map((platform) => (
                          <PlatformIcon key={platform} platform={platform} />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600">
                        {formatNumber(projectViews[project.id] ?? 0)}
                      </div>
                      <div className="text-xs text-gray-500">总观看量</div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* 底部说明 */}
        <div className="mt-12 text-center text-xs text-gray-500">
          <p>数据默认不自动更新，如需最新数据请手动点击更新按钮</p>
        </div>
      </main>

      {/* 创建项目模态框 */}
      <CreateProjectModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />

      {/* 编辑项目模态框 */}
      <EditProjectModal 
        isOpen={showEditModal} 
        onClose={() => {
          setShowEditModal(false)
          setSelectedProject(null)
        }}
        project={selectedProject}
      />

      {/* 删除确认对话框 */}
      <DeleteProjectModal 
        isOpen={showDeleteModal} 
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedProject(null)
        }}
        project={selectedProject}
        onConfirm={confirmDeleteProject}
      />
    </div>
  )
}
