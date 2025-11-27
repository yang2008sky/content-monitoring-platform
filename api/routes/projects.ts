import { Router } from 'express'
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

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: name.trim(),
        platforms: platforms,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('创建项目失败:', error)
      return res.status(500).json(formatError('创建项目失败'))
    }

    res.status(201).json(formatResponse(project, '项目创建成功'))
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