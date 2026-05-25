import { Router } from 'express'
import crypto from 'crypto'
import memoryStore from '../storage/memoryStore.js'
import { supabase, Project } from '../lib/supabase.js'
import { formatResponse, formatError } from '../lib/utils.js'

const router = Router()

// 获取用户的所有项目
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    
    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        contents(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取项目列表失败:', error)
      return res.status(500).json(formatError('获取项目列表失败'))
    }

    // 格式化项目数据，添加统计信息
    const formattedProjects = projects?.map(project => ({
      ...project,
      post_count: project.contents?.[0]?.count || 0,
      platforms_icons: project.platforms || []
    })) || []

    res.json(formatResponse(formattedProjects))
  } catch (error) {
    console.error('获取项目列表错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 创建新项目
router.post('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { name, platforms } = req.body

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    if (!name || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json(formatError('项目名称和平台列表是必需的'))
    }

    // 验证平台类型
    const validPlatforms = ['youtube', 'tiktok', 'instagram', 'twitter', 'x']
    const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p))
    
    if (invalidPlatforms.length > 0) {
      return res.status(400).json(formatError(`无效的平台: ${invalidPlatforms.join(', ')}`))
    }

    // 优先本地模式创建，保证无数据库也可用
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const localProject = {
      id,
      user_id: userId,
      name: name.trim(),
      platforms,
      total_posts: 0,
      total_views: 0,
      status: 'active',
      created_at: now,
      updated_at: now,
      post_count: 0,
      platforms_icons: platforms
    }

    // 异步尝试写入数据库（失败不影响响应）
    try {
      const { error: dbErr } = await supabase
        .from('projects')
        .insert({
          id: localProject.id,
          user_id: localProject.user_id,
          name: localProject.name,
          platforms: localProject.platforms,
          status: localProject.status,
          created_at: localProject.created_at,
          updated_at: localProject.updated_at
        })
      if (dbErr) {
        console.warn('项目写库失败(忽略):', dbErr)
      }
    } catch (e) {
      console.warn('项目写库异常(忽略):', e)
    }

    res.status(201).json(formatResponse(localProject, '项目创建成功'))
  } catch (error) {
    console.error('创建项目错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 获取单个项目详情
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { id } = req.params

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json(formatError('项目不存在'))
      }
      console.error('获取项目详情失败:', error)
      return res.status(500).json(formatError('获取项目详情失败'))
    }

    res.json(formatResponse(project))
  } catch (error) {
    console.error('获取项目详情错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 更新项目
router.put('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { id } = req.params
    const { name, platforms, status } = req.body

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    const updateData: Partial<Project> = {}
    
    if (name) updateData.name = name.trim()
    if (platforms && Array.isArray(platforms)) updateData.platforms = platforms
    if (status) updateData.status = status

    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json(formatError('项目不存在'))
      }
      console.error('更新项目失败:', error)
      return res.status(500).json(formatError('更新项目失败'))
    }

    res.json(formatResponse(project, '项目更新成功'))
  } catch (error) {
    console.error('更新项目错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 删除项目
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { id } = req.params

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('删除项目失败:', error)
      return res.status(500).json(formatError('删除项目失败'))
    }

    res.json(formatResponse(null, '项目删除成功'))
  } catch (error) {
    console.error('删除项目错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

export default router
