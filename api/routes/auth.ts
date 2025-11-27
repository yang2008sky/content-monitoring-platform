/**
 * 用户认证API路由
 * 处理用户注册、登录、令牌管理等
 * 使用 Supabase Auth 进行身份验证
 */
import { Router, type Request, type Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { formatResponse, formatError } from '../lib/utils.js'

const router = Router()

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      res.status(400).json(formatError('邮箱和密码是必需的'))
      return
    }

    // 使用 Supabase Auth 注册用户
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || ''
        }
      }
    })

    if (error) {
      console.error('注册失败:', error)
      res.status(400).json(formatError(error.message))
      return
    }

    // 如果注册成功，创建用户扩展信息
    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          name: name || '',
          plan: 'free',
          usage_count: 0
        })

      if (profileError) {
        console.error('创建用户资料失败:', profileError)
        // 不阻止注册流程，只记录错误
      }
    }

    res.status(201).json(formatResponse({
      user: data.user,
      session: data.session
    }, '注册成功'))
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json(formatError('邮箱和密码是必需的'))
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('登录失败:', error)
      res.status(401).json(formatError('邮箱或密码错误'))
      return
    }

    res.json(formatResponse({
      user: data.user,
      session: data.session
    }, '登录成功'))
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('登出失败:', error)
      res.status(500).json(formatError('登出失败'))
      return
    }

    res.json(formatResponse(null, '登出成功'))
  } catch (error) {
    console.error('登出错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

/**
 * 获取当前用户信息
 * GET /api/auth/user
 */
router.get('/user', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(formatError('未提供认证令牌'))
      return
    }

    const token = authHeader.substring(7)
    
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      res.status(401).json(formatError('无效的认证令牌'))
      return
    }

    // 获取用户扩展信息
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    res.json(formatResponse({
      user,
      profile
    }))
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

/**
 * 刷新令牌
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body

    if (!refresh_token) {
      res.status(400).json(formatError('刷新令牌是必需的'))
      return
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    })

    if (error) {
      console.error('刷新令牌失败:', error)
      res.status(401).json(formatError('无效的刷新令牌'))
      return
    }

    res.json(formatResponse({
      session: data.session
    }, '令牌刷新成功'))
  } catch (error) {
    console.error('刷新令牌错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

export default router
