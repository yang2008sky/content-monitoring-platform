import { Router } from 'express'

const router = Router()

// 图片代理路由，解决CORS问题
router.get('/image', async (req, res) => {
  try {
    const { url } = req.query
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: '缺少图片URL参数' })
    }

    // 验证URL是否来自允许的域名
    const allowedDomains = [
      'instagram.com',
      'fbcdn.net',
      'cdninstagram.com'
    ]
    
    const urlObj = new URL(url)
    const isAllowed = allowedDomains.some(domain => 
      urlObj.hostname.includes(domain)
    )
    
    if (!isAllowed) {
      return res.status(403).json({ error: '不允许的图片域名' })
    }

    // 获取图片
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: '图片获取失败' })
    }

    // 设置响应头
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400') // 缓存1天
    res.setHeader('Access-Control-Allow-Origin', '*')

    // 流式传输图片数据
    const buffer = await response.arrayBuffer()
    res.send(Buffer.from(buffer))

  } catch (error) {
    console.error('图片代理错误:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router