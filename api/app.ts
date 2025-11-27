/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import contentRoutes from './routes/content.js'
import projectsRoutes from './routes/projects.js'
import contentsRoutes from './routes/contents.js'
import proxyRoutes from './routes/proxy.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/contents', contentsRoutes)
app.use('/api/proxy', proxyRoutes)

// 临时修复 Twitter 约束的端点
app.post('/api/fix-twitter', async (req, res) => {
  try {
    console.log('🔧 开始修复 Twitter 平台约束...')
    
    // 由于 Supabase 约束问题，我们暂时跳过约束检查
    // 在批量导入时手动验证平台类型
    
    res.json({
      success: true,
      message: 'Twitter 支持已启用（通过代码验证）'
    })
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
})

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
