import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { 
  ArrowLeft, Plus, Search, Download, Upload, 
  Eye, Heart, MessageCircle, Share, BarChart3, 
  Youtube, Instagram, ExternalLink,
  Edit, Trash2, Grid3X3, List, Twitter, RefreshCw, ChevronDown, Check
} from 'lucide-react'
import { Content } from '../lib/supabase'

// TikTok图标组件
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.16 20.5a6.33 6.33 0 0 0 10.86-4.43V7.83a8.24 8.24 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.2-.26z"/>
  </svg>
)

// 多选平台选择器组件
const MultiPlatformSelector = ({ 
  selectedPlatforms, 
  onChange 
}: { 
  selectedPlatforms: string[], 
  onChange: (platforms: string[]) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.platform-selector')) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  const platforms = [
    { value: 'all', label: '全部平台', icon: null },
    { value: 'youtube', label: 'YouTube', icon: <Youtube className="h-4 w-4 text-red-500" /> },
    { value: 'youtube-shorts', label: 'YouTube Shorts', icon: <Youtube className="h-4 w-4 text-red-500" /> },
    { value: 'tiktok', label: 'TikTok', icon: <TikTokIcon className="h-4 w-4 text-black" /> },
    { value: 'instagram', label: 'Instagram', icon: <Instagram className="h-4 w-4 text-pink-500" /> },
    { value: 'twitter', label: 'Twitter', icon: <Twitter className="h-4 w-4 text-blue-500" /> }
  ]

  const handleTogglePlatform = (platformValue: string) => {
    if (platformValue === 'all') {
      // 如果点击"全部平台"
      if (selectedPlatforms.includes('all')) {
        // 如果已选中"全部平台"，则取消选择
        onChange([])
      } else {
        // 如果未选中"全部平台"，则只选择"全部平台"
        onChange(['all'])
      }
    } else {
      // 如果点击具体平台
      let newSelection = [...selectedPlatforms]
      
      // 移除"全部平台"选项（如果存在）
      newSelection = newSelection.filter(p => p !== 'all')
      
      if (newSelection.includes(platformValue)) {
        // 如果已选中，则取消选择
        newSelection = newSelection.filter(p => p !== platformValue)
      } else {
        // 如果未选中，则添加选择
        newSelection.push(platformValue)
      }
      
      // 如果没有选择任何平台，则默认选择"全部平台"
      if (newSelection.length === 0) {
        newSelection = ['all']
      }
      
      onChange(newSelection)
    }
  }

  const getDisplayText = () => {
    if (selectedPlatforms.includes('all')) {
      return '全部平台'
    }
    if (selectedPlatforms.length === 0) {
      return '选择平台'
    }
    if (selectedPlatforms.length === 1) {
      const platform = platforms.find(p => p.value === selectedPlatforms[0])
      return platform?.label || '选择平台'
    }
    return `已选择 ${selectedPlatforms.length} 个平台`
  }

  return (
    <div className="relative platform-selector">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 bg-white text-left min-w-[140px] flex items-center justify-between"
      >
        <span className="text-sm">{getDisplayText()}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            {platforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.value)
              const isAllSelected = selectedPlatforms.includes('all')
              const shouldShowCheck = platform.value === 'all' ? isAllSelected : isSelected && !isAllSelected
              
              return (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => handleTogglePlatform(platform.value)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center space-x-2">
                    {platform.icon}
                    <span>{platform.label}</span>
                  </div>
                  {shouldShowCheck && (
                    <Check className="h-4 w-4 text-orange-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// 判断视频类型（长视频 vs 短视频）
const getVideoType = (platform: string, url: string): 'long' | 'short' => {
  switch (platform) {
    case 'youtube':
      // YouTube Shorts 通常包含 /shorts/ 路径
      return url.includes('/shorts/') ? 'short' : 'long'
    case 'tiktok':
      // TikTok 全部都是短视频
      return 'short'
    case 'instagram':
      // Instagram Reels 包含 /reel/ 路径，普通帖子包含 /p/
      return url.includes('/reel/') ? 'short' : 'long'
    case 'twitter':
    case 'x':
      // Twitter 视频通常是短视频
      return 'short'
    default:
      return 'long'
  }
}

// 封面图组件 - 根据视频类型显示不同比例
const VideoThumbnail = ({ 
  content, 
  className = "", 
  size = "medium" 
}: { 
  content: Content, 
  className?: string,
  size?: "small" | "medium" | "large" | "table"
}) => {
  const videoType = getVideoType(content.platform, content.post_url)
  
  // 根据视频类型和尺寸确定样式
  const getAspectRatio = () => {
    // 在表格视图中，统一使用正方形比例以保持对齐
    if (size === 'table') {
      return 'aspect-square'
    }
    
    if (videoType === 'short') {
      // 短视频使用竖屏比例 (9:16)
      return 'aspect-[9/16]'
    } else {
      // 长视频使用横屏比例 (16:9)
      return 'aspect-video'
    }
  }
  
  const getSizeClasses = () => {
    if (size === 'table') {
      // 表格视图中统一使用固定尺寸，确保对齐
      return 'w-16 h-16'
    } else if (size === 'small') {
      return videoType === 'short' ? 'w-12 h-20' : 'w-20 h-12'
    } else if (size === 'large') {
      return videoType === 'short' ? 'w-48 h-80' : 'w-80 h-48'
    } else {
      return videoType === 'short' ? 'w-32 h-56' : 'w-56 h-32'
    }
  }

  return (
    <div className={`${getSizeClasses()} ${getAspectRatio()} bg-gray-200 rounded overflow-hidden flex-shrink-0 relative ${className}`}>
      {content.thumbnail_url ? (
        <>
          <img
            className="h-full w-full object-cover"
            src={content.thumbnail_url}
            alt={content.title}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.fallback-cover') as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }}
          />
          <div className="fallback-cover absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-500 text-xs" style={{display: 'none'}}>
            封面
          </div>
        </>
      ) : (
        <div className="h-full w-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs">
          封面
        </div>
      )}
      

    </div>
  )
}

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

// 状态徽章组件
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: '待处理', className: 'bg-yellow-100 text-yellow-800' }
      case 'monitoring':
        return { text: '监控中', className: 'bg-blue-100 text-blue-800' }
      case 'completed':
        return { text: '已完成', className: 'bg-green-100 text-green-800' }
      case 'error':
        return { text: '错误', className: 'bg-red-100 text-red-800' }
      default:
        return { text: '未知', className: 'bg-gray-100 text-gray-800' }
    }
  }

  const config = getStatusConfig(status)
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.text}
    </span>
  )
}

// 添加内容模态框
const AddContentModal = ({ isOpen, onClose, projectId, onContentAdded }: { 
  isOpen: boolean
  onClose: () => void
  projectId: string
  onContentAdded?: () => void
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'batch'>('manual')
  const [formData, setFormData] = useState({
    post_url: '',
    monitor_days: 60,
    region: '',
    nox_link: ''
  })
  const [batchLinks, setBatchLinks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (activeTab === 'manual') {
      if (!formData.post_url.trim()) {
        setError('请输入发布链接')
        setSubmitting(false)
        return
      }

      try {
        // 首先检查是否重复
        const duplicateCheckResponse = await fetch('/api/content/check-duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c'
          },
          body: JSON.stringify({
            project_id: projectId,
            post_url: formData.post_url
          })
        })

        const duplicateResult = await duplicateCheckResponse.json()

        if (duplicateResult.success && duplicateResult.isDuplicate) {
          setError(duplicateResult.message || '类似内容已存在，请勿重复添加')
          setSubmitting(false)
          return
        }

        // 调用后端API添加内容
        const response = await fetch('/api/content/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c'
          },
          body: JSON.stringify({
            project_id: projectId,
            post_url: formData.post_url,
            monitor_days: formData.monitor_days,
            region: formData.region,
            remark: formData.nox_link
          })
        })

        const result = await response.json()

        if (result.success) {
          // console.log('内容添加成功:', result.data)
          // 触发内容列表刷新
          if (onContentAdded) {
            onContentAdded()
          }
          onClose()
          // 重置表单
          setFormData({
            post_url: '',
            monitor_days: 60,
            region: '',
            nox_link: ''
          })
        } else {
          setError(result.error || '添加内容失败')
        }
      } catch (error) {
        console.error('添加内容失败:', error)
        setError('网络错误，请重试')
      } finally {
        setSubmitting(false)
      }
    } else {
      if (!batchLinks.trim()) {
        setError('请输入链接')
        setSubmitting(false)
        return
      }

      try {
        // 解析输入的链接，每行一个
        const links = batchLinks.trim().split('\n').filter(link => link.trim())
        
        if (links.length === 0) {
          setError('请输入有效的链接')
          setSubmitting(false)
          return
        }

        if (links.length > 500) {
          setError('一次最多只能添加500个链接')
          setSubmitting(false)
          return
        }

        // 调用批量添加API
        console.log('批量添加 - 使用的项目ID:', projectId)
        console.log('批量添加 - 链接数量:', links.length)

        const response = await fetch(`/api/contents/${projectId}/batch-links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c',
          },
          body: JSON.stringify({ links })
        })

        if (!response.ok) {
          const errorText = await response.text()
          setError(`请求失败: ${response.status} ${response.statusText}`)
          setSubmitting(false)
          return
        }

        const result = await response.json()

        if (result.success) {
          if (onContentAdded) {
            onContentAdded()
          }
          onClose()
          setBatchLinks('')
        } else {
          setError(result.error || '批量添加失败')
        }
      } catch (error) {
        console.error('批量添加失败:', error)
        setError('网络错误，请重试')
      } finally {
        setSubmitting(false)
      }
    }
  }



  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">添加内容</h3>
          
          {/* 标签页 */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'manual'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              手动添加
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === 'batch'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              批量添加
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'manual' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> 发布链接
                  </label>
                  <input
                    type="url"
                    value={formData.post_url}
                    onChange={(e) => setFormData({ ...formData, post_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    placeholder="请在此添加合作网红视频或贴文链接"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> 监控时长
                  </label>
                  <select
                    value={formData.monitor_days}
                    onChange={(e) => setFormData({ ...formData, monitor_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value={30}>30天(预计消耗1)</option>
                    <option value={60}>60天(预计消耗1)</option>
                    <option value={90}>90天(预计消耗1)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    地区
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">请选择</option>
                    <option value="CN">中国</option>
                    <option value="US">美国</option>
                    <option value="JP">日本</option>
                    <option value="KR">韩国</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nox短链
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                      🔗
                    </span>
                    <input
                      type="text"
                      value={formData.nox_link}
                      onChange={(e) => setFormData({ ...formData, nox_link: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      placeholder="请输入Nox短链"
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-sm text-orange-500 hover:text-orange-600 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    增加链接
                  </button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  请输入链接，每行一个链接
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      批量链接输入
                    </label>
                    <textarea
                      value={batchLinks}
                      onChange={(e) => setBatchLinks(e.target.value)}
                      placeholder="请输入链接，每行一个链接，例如：&#10;https://www.youtube.com/watch?v=example1&#10;https://www.tiktok.com/@user/video/example2&#10;https://www.instagram.com/p/example3"
                      className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 resize-none"
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      一次最多输入500条链接，当前已输入 {batchLinks.trim() ? batchLinks.trim().split('\n').filter(link => link.trim()).length : 0} 条
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-md hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '确认'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500 text-center">
            数据更新间隔为：YouTube 10分钟、TikTok 60分钟、Instagram 120分钟、Twitter 30分钟
          </div>
        </div>
      </div>
    </div>
  )
}

// 编辑项目模态框组件
const EditProjectModal = ({ isOpen, onClose, project }: { 
  isOpen: boolean
  onClose: () => void
  project: any
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

// 删除内容确认对话框组件
const DeleteContentModal = ({ isOpen, onClose, content, onConfirm }: { 
  isOpen: boolean
  onClose: () => void
  content: Content | null
  onConfirm: () => void
}) => {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  if (!isOpen || !content) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">删除内容</h3>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            您确定要删除这个内容吗？
          </p>
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-900 truncate">
              {content.title || '无标题'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              创作者：{content.creator_name || '未知'}
            </p>
          </div>
          <p className="text-sm text-red-600 mt-2">
            此操作将永久删除该内容及其所有统计数据，且无法恢复。
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

// 删除项目确认对话框组件
const DeleteProjectModal = ({ isOpen, onClose, project, onConfirm }: { 
  isOpen: boolean
  onClose: () => void
  project: any
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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects, currentProject, setCurrentProject, contents, stats, updateProject, deleteProject } = useProjectStore()
  
  // 调试信息
  console.log('ProjectDetail - URL参数ID:', id)
  console.log('ProjectDetail - 当前项目:', currentProject)
  console.log('ProjectDetail - 所有项目:', projects)
  

  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteContentModal, setShowDeleteContentModal] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)
  const [realContents, setRealContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    platform: ['all'] as string[],
    search: ''
  })

  // 示例内容数据
  const mockContents: Content[] = [
    {
      id: '1',
      project_id: id || '',
      post_url: 'https://www.youtube.com/watch?v=example1',
      platform: 'youtube',
      platform_id: 'example1',
      title: '美妆教程：夏日清透妆容分享',
      creator_name: '美妆达人小红',
      creator_avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20asian%20woman%20makeup%20artist%20avatar&image_size=square',
      thumbnail_url: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=makeup%20tutorial%20thumbnail%20summer%20look&image_size=landscape_16_9',
      monitor_days: 60,
      region: 'CN',
      remark: '夏季推广',
      status: 'monitoring',
      published_at: '2024-01-20T10:00:00Z',
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-01-20T10:00:00Z',
      latest_stats: {
        view_count: 125000,
        like_count: 8500,
        bookmark_count: 1200,
        share_count: 150,
        comment_count: 320,
        engagement_rate: 7.2,
        collected_at: '2024-01-21T10:00:00Z'
      }
    },
    {
      id: '2',
      project_id: id || '',
      post_url: 'https://www.tiktok.com/@user/video/example2',
      platform: 'tiktok',
      platform_id: 'example2',
      title: '口红试色｜10支热门色号对比',
      creator_name: 'TikTok美妆师',
      creator_avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=young%20woman%20beauty%20influencer%20avatar&image_size=square',
      thumbnail_url: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=lipstick%20swatches%20comparison%20tiktok&image_size=portrait_16_9',
      monitor_days: 30,
      region: 'CN',
      remark: '口红推广',
      status: 'completed',
      published_at: '2024-01-18T15:30:00Z',
      created_at: '2024-01-18T15:30:00Z',
      updated_at: '2024-01-18T15:30:00Z',
      latest_stats: {
        view_count: 89000,
        like_count: 12000,
        bookmark_count: 2100,
        share_count: 280,
        comment_count: 450,
        engagement_rate: 14.3,
        collected_at: '2024-01-21T10:00:00Z'
      }
    },
    {
      id: '3',
      project_id: id || '',
      post_url: 'https://www.instagram.com/p/example3',
      platform: 'instagram',
      platform_id: 'example3',
      title: '护肤分享｜我的晚间护肤步骤',
      creator_name: 'Instagram美妆博主',
      creator_avatar: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=instagram%20beauty%20blogger%20woman%20avatar&image_size=square',
      thumbnail_url: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=skincare%20routine%20instagram%20post&image_size=square',
      monitor_days: 90,
      region: 'CN',
      remark: '护肤产品推广',
      status: 'pending',
      published_at: '2024-01-22T20:00:00Z',
      created_at: '2024-01-22T20:00:00Z',
      updated_at: '2024-01-22T20:00:00Z',
      latest_stats: {
        view_count: 45000,
        like_count: 3200,
        bookmark_count: 580,
        share_count: 95,
        comment_count: 180,
        engagement_rate: 7.7,
        collected_at: '2024-01-23T10:00:00Z'
      }
    }
  ]

  // 获取项目内容数据
  const fetchProjectContents = useCallback(async (projectId: string, forceRefresh = false) => {
    setLoading(true)
    try {
      // console.log('🔄 正在获取项目内容:', projectId)
      const url = `/api/contents/${projectId}${forceRefresh ? `?t=${Date.now()}` : ''}`
      const response = await fetch(url, {
        headers: {
          'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c', // 临时使用固定用户ID
          ...(forceRefresh && { 'Cache-Control': 'no-cache' })
        },
      })
      const result = await response.json()
      
      console.log('API响应结果:', result)
      if (result.success) {
        // 新API返回的数据结构：result.data.contents
        const contents = result.data.contents || []
        console.log('解析出的内容数组:', contents)
        console.log('内容数组长度:', contents.length)
        setRealContents(contents)
      } else {
        console.error('❌ 获取内容失败:', result.error)
        setRealContents([])
      }
    } catch (error) {
      console.error('❌ 网络错误:', error)
      setRealContents([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 手动更新所有内容数据
  const handleUpdateAllData = async () => {
    if (!id || updating) return
    
    setUpdating(true)
    try {
      // 获取所有内容的最新数据
      const response = await fetch(`/api/contents/update-all/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c', // 临时使用固定用户ID
        },
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 更新成功后重新获取数据
        await fetchProjectContents(id)
        console.log('✅ 数据更新成功')
      } else {
        console.error('❌ 数据更新失败:', result.error)
      }
    } catch (error) {
      console.error('❌ 更新数据时发生错误:', error)
    } finally {
      setUpdating(false)
    }
  }

  // 导出Excel数据
  const handleExportData = async () => {
    if (!id || !currentProject) return
    
    try {
      // 构建URL，包含项目名称参数
      const exportUrl = new URL(`/api/contents/export/${id}`, window.location.origin)
      exportUrl.searchParams.append('projectName', currentProject.name)
      
      const response = await fetch(exportUrl.toString(), {
        method: 'GET',
        headers: {
          'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c', // 临时使用固定用户ID
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('导出失败:', errorData.error)
        
        // 如果后端导出失败，使用前端模拟数据进行测试
        if (realContents.length === 0) {
          console.log('使用模拟数据进行导出测试')
          handleMockExport()
        }
        return
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition')
      let fileName = `${currentProject.name}_达人数据_${new Date().toISOString().split('T')[0]}.xlsx`
      
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
    } catch (error) {
      console.error('❌ 导出数据时发生错误:', error)
      
      // 如果网络错误，使用模拟数据进行测试
      console.log('使用模拟数据进行导出测试')
      handleMockExport()
    }
  }

  // 模拟导出功能（用于测试）
  const handleMockExport = () => {
    // 创建模拟数据
    const mockData = mockContents.map((content, index) => ({
      '项目名称': currentProject.name,
      '序号': index + 1,
      '出版时间': content.published_at ? new Date(content.published_at).toLocaleDateString('zh-CN') : '',
      '视频标题': content.title || '',
      '达人昵称': content.creator_name || '',
      '平台': content.platform === 'youtube' ? 'YouTube' : 
             content.platform === 'tiktok' ? 'TikTok' : 
             content.platform === 'instagram' ? 'Instagram' : 
             content.platform === 'twitter' ? 'Twitter' : content.platform,
      '语言': content.region === 'CN' ? '中文' : 
             content.region === 'US' ? 'English' : 
             content.region === 'JP' ? '日本語' : 
             content.region === 'KR' ? '한국어' : content.region || '',
      '链接': content.post_url,
      '观看量': content.latest_stats?.view_count || 0,
      '点赞数': content.latest_stats?.like_count || 0,
      '收藏数': content.latest_stats?.bookmark_count || content.latest_stats?.favorite_count || 0,
      '转发数': content.latest_stats?.share_count || content.latest_stats?.retweet_count || 0,
      '评论数': content.latest_stats?.comment_count || 0,
      '互动率': content.latest_stats?.engagement_rate ? `${content.latest_stats.engagement_rate.toFixed(2)}%` : '0.00%',
      '监控状态': content.status === 'pending' ? '待处理' :
                 content.status === 'monitoring' ? '监控中' :
                 content.status === 'completed' ? '已完成' :
                 content.status === 'error' ? '错误' : content.status,
      '备注': content.remark || '',
      '数据更新时间': content.latest_stats?.collected_at ? new Date(content.latest_stats.collected_at).toLocaleString('zh-CN') : ''
    }))

    // 转换为CSV格式（简单实现）
    const headers = Object.keys(mockData[0])
    const csvContent = [
      headers.join(','),
      ...mockData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n')

    // 创建下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentProject.name}_达人数据_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    console.log('✅ 模拟数据导出成功（CSV格式）')
  }

  // 处理编辑项目
  const handleEditProject = () => {
    setShowEditModal(true)
  }

  // 处理删除项目
  const handleDeleteProject = () => {
    setShowDeleteModal(true)
  }

  // 确认删除项目
  const confirmDeleteProject = async () => {
    if (currentProject) {
      const result = await deleteProject(currentProject.id)
      if (!result.error) {
        navigate('/')
      }
    }
  }

  // 处理删除内容
  const handleDeleteContent = (content: Content) => {
    setSelectedContent(content)
    setShowDeleteContentModal(true)
  }

  // 确认删除内容
  const confirmDeleteContent = async () => {
    if (!selectedContent) return

    try {
      const response = await fetch(`/api/contents/${selectedContent.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': '635595c4-4567-4d44-a21d-81d7a46d785c'
        }
      })

      const result = await response.json()

      if (result.success) {
        // 删除成功后重新获取数据
        if (id) {
          await fetchProjectContents(id)
        }
        console.log('✅ 内容删除成功')
      } else {
        console.error('❌ 删除内容失败:', result.error)
      }
    } catch (error) {
      console.error('❌ 删除内容时发生错误:', error)
    } finally {
      setShowDeleteContentModal(false)
      setSelectedContent(null)
    }
  }

  useEffect(() => {
    if (id) {
      const project = projects.find(p => p.id === id)
      if (project) {
        setCurrentProject(project)
        // 只使用 fetchProjectContents，不使用 store 中的 fetchContents
        fetchProjectContents(id)
      } else if (projects.length > 0) {
        // 如果找不到项目但有其他项目，重定向到第一个项目
        console.log('项目ID不存在，重定向到第一个可用项目')
        navigate(`/projects/${projects[0].id}`, { replace: true })
      }
    }
  }, [id, projects, setCurrentProject, fetchProjectContents, navigate])

  // 使用 useMemo 优化筛选逻辑
  const filteredContents = useMemo(() => {
    let result = [...realContents] // 使用真实内容数据

    // 状态筛选
    if (filters.status !== 'all') {
      result = result.filter(content => content.status === filters.status)
    }

    // 平台筛选 - 使用URL检测真实平台
    if (!filters.platform.includes('all')) {
      result = result.filter(content => {
        // 使用URL检测真实平台类型
        const realPlatform = detectRealPlatformFromUrl(content.post_url)
        
        // 特殊处理YouTube内容
        if (realPlatform === 'youtube') {
          const isShorts = content.post_url.includes('/shorts/')
          
          // 如果是Shorts视频
          if (isShorts) {
            return filters.platform.includes('youtube-shorts')
          }
          // 如果是普通YouTube视频
          else {
            return filters.platform.includes('youtube')
          }
        }
        
        // 其他平台根据真实平台类型匹配
        return filters.platform.includes(realPlatform)
      })
    }

    // 搜索筛选
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase()
      result = result.filter(content => 
        content.title?.toLowerCase().includes(searchTerm) ||
        content.creator_name?.toLowerCase().includes(searchTerm) ||
        content.post_url.toLowerCase().includes(searchTerm)
      )
    }

    // 调试信息 - 在开发环境中显示筛选结果
    if (process.env.NODE_ENV === 'development') {
      console.log('筛选条件:', filters)
      console.log('平台筛选数组:', filters.platform)
      console.log('是否包含all:', filters.platform.includes('all'))
      console.log('原始内容数量:', realContents.length)
      console.log('筛选后内容数量:', result.length)
      if (realContents.length > 0) {
        console.log('第一个内容的数据库平台:', realContents[0].platform)
        console.log('第一个内容的真实平台:', detectRealPlatformFromUrl(realContents[0].post_url))
        console.log('所有内容的数据库平台:', realContents.map(c => c.platform))
        console.log('所有内容的真实平台:', realContents.map(c => detectRealPlatformFromUrl(c.post_url)))
      }
    }

    return result
  }, [realContents, filters])

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                返回
              </Link>
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{currentProject.name}</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  {currentProject.platforms.map((platform) => (
                    <PlatformIcon key={platform} platform={platform} />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleEditProject}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                title="编辑项目"
              >
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </button>
              <button
                onClick={handleDeleteProject}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50"
                title="删除项目"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加内容
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        {(() => {
          // 计算统计数据（基于所有内容，不受筛选影响）
          const totalViews = realContents.reduce((sum, content) => sum + (content.latest_stats?.view_count || 0), 0)
          const totalLikes = realContents.reduce((sum, content) => sum + (content.latest_stats?.like_count || 0), 0)
          const totalComments = realContents.reduce((sum, content) => sum + (content.latest_stats?.comment_count || 0), 0)
          const totalShares = realContents.reduce((sum, content) => sum + (content.latest_stats?.share_count || 0), 0)
          const avgEngagementRate = realContents.length > 0 
            ? realContents.reduce((sum, content) => sum + (content.latest_stats?.engagement_rate || 0), 0) / realContents.length
            : 0

          // 调试信息
          console.log('📊 统计数据计算:')
          console.log('- realContents 数量:', realContents.length)
          console.log('- 总观看量:', totalViews)
          console.log('- 内容详情:', realContents.map(c => ({
            title: c.title,
            view_count: c.latest_stats?.view_count,
            latest_stats: c.latest_stats
          })))

          return (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">总观看量</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(totalViews)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Heart className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">总点赞数</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(totalLikes)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <MessageCircle className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">总评论数</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(totalComments)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Share className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">总分享数</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(totalShares)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">互动率</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {avgEngagementRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* 筛选和视图切换 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="搜索视频标题、创作者、URL"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="monitoring">监控中</option>
                <option value="completed">已完成</option>
                <option value="error">错误</option>
              </select>
              
              <MultiPlatformSelector
                selectedPlatforms={filters.platform}
                onChange={(platforms) => setFilters({ ...filters, platform: platforms })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportData}
                disabled={loading || realContents.length === 0}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                  loading || realContents.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="导出Excel数据"
              >
                <Download className="h-4 w-4 mr-2" />
                导出数据
              </button>
              <button
                onClick={handleUpdateAllData}
                disabled={updating || loading}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                  updating || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="手动更新所有内容数据"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
                {updating ? '更新中...' : '更新数据'}
              </button>
              <div className="border-l border-gray-300 h-6 mx-2"></div>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md ${
                  viewMode === 'table' 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md ${
                  viewMode === 'card' 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 内容列表 */}
        {filteredContents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {realContents.length === 0 ? '暂无内容' : '没有符合条件的内容'}
              </h3>
              <p className="text-gray-500 mb-6">
                {realContents.length === 0 ? '开始添加您的第一个监控内容' : '请尝试调整筛选条件'}
              </p>
              {realContents.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加内容
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-96 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      内容
                    </th>
                    <th className="w-28 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      发布时间
                    </th>
                    <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      观看量
                    </th>
                    <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      点赞数
                    </th>
                    <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      评论数
                    </th>
                    <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      收藏数
                    </th>
                    <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      转发数
                    </th>
                    <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      互动率
                    </th>
                    <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContents.map((content) => (
                  <tr key={content.id} className="hover:bg-gray-50 h-20">
                    <td className="px-6 py-4">
                      <div className="flex items-center min-h-[64px]">
                        <VideoThumbnail content={content} size="table" />
                        <div className="ml-4 flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center mb-1">
                            <PlatformIcon platform={content.platform} url={content.post_url} />
                            <div className="ml-2 text-sm font-medium text-gray-900 truncate max-w-xs" title={content.title}>
                              {content.title}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs" title={content.creator_name}>
                            {content.creator_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(content.published_at || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(content.latest_stats?.view_count || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(content.latest_stats?.like_count || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(content.latest_stats?.comment_count || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(content.latest_stats?.bookmark_count || content.latest_stats?.favorite_count || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(content.latest_stats?.share_count || content.latest_stats?.retweet_count || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {content.latest_stats?.engagement_rate?.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={content.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <a
                          href={content.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="查看原链接"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button 
                          onClick={() => handleDeleteContent(content)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="删除内容"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContents.map((content) => (
              <div key={content.id} className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
                <div className="flex justify-center p-4 bg-gray-50 h-48 items-center">
                  <VideoThumbnail content={content} size="medium" />
                </div>
                <div className="p-4 flex-1">
                  <div className="flex items-center mb-2">
                    <PlatformIcon platform={content.platform} url={content.post_url} />
                    <StatusBadge status={content.status} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                    {content.title}
                  </h3>
                  <div className="flex items-center mb-3">
                    <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                      {content.creator_avatar ? (
                        <img
                          className="h-6 w-6 rounded-full object-cover"
                          src={content.creator_avatar}
                          alt={content.creator_name}
                        />
                      ) : (
                        <span className="text-gray-600 text-xs font-medium">
                          {content.creator_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{content.creator_name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">观看量</span>
                      <div className="font-medium">{formatNumber(content.latest_stats?.view_count || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">点赞数</span>
                      <div className="font-medium">{formatNumber(content.latest_stats?.like_count || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">收藏数</span>
                      <div className="font-medium">{formatNumber(content.latest_stats?.bookmark_count || content.latest_stats?.favorite_count || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">转发数</span>
                      <div className="font-medium">{formatNumber(content.latest_stats?.share_count || content.latest_stats?.retweet_count || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">评论数</span>
                      <div className="font-medium">{formatNumber(content.latest_stats?.comment_count || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">互动率</span>
                      <div className="font-medium">{content.latest_stats?.engagement_rate?.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatDate(content.published_at || '')}
                    </span>
                    <div className="flex items-center space-x-2">
                      <a
                        href={content.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                        title="查看原链接"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button 
                        onClick={() => handleDeleteContent(content)}
                        className="text-gray-400 hover:text-red-600"
                        title="删除内容"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )
        }

        {/* 底部说明 */}
        <div className="mt-12 text-center text-xs text-gray-500">
          <p>数据默认不自动更新，如需最新数据请手动点击更新按钮</p>
        </div>
      </main>

      {/* 添加内容模态框 */}
      <AddContentModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        projectId={id || ''} 
        onContentAdded={() => fetchProjectContents(id || '', true)}
      />

      {/* 编辑项目模态框 */}
      <EditProjectModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        project={currentProject}
      />

      {/* 删除项目确认对话框 */}
      <DeleteProjectModal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        project={currentProject}
        onConfirm={confirmDeleteProject}
      />

      {/* 删除内容确认对话框 */}
      <DeleteContentModal 
        isOpen={showDeleteContentModal} 
        onClose={() => {
          setShowDeleteContentModal(false)
          setSelectedContent(null)
        }}
        content={selectedContent}
        onConfirm={confirmDeleteContent}
      />
    </div>
  )
}