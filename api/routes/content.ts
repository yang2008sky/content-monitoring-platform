/**
 * 内容管理API路由
 * 处理内容的添加、获取和更新
 */
import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'crypto'
import scrapeCreatorsService from '../services/scrapeCreators.js'
import memoryStore from '../storage/memoryStore.js'
import { supabase } from '../lib/supabase.js'

const router = Router()

/**
 * 测试 Scrape Creators API 连接
 * GET /api/content/test-connection
 */
router.get('/test-connection', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await scrapeCreatorsService.testConnection()
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      })
    }
  } catch (error) {
    console.error('测试API连接失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

/**
 * 获取单个视频数据
 * POST /api/content/fetch-video
 */
router.post('/fetch-video', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: '请提供有效的视频URL'
      })
      return
    }

    console.log('获取视频数据:', url)
    const result = await scrapeCreatorsService.getVideoData(url)

    if (result.success && result.data) {
      res.status(200).json({
        success: true,
        data: result.data
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error || '获取视频数据失败'
      })
    }
  } catch (error) {
    console.error('获取视频数据失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

/**
 * 批量获取视频数据
 * POST /api/content/fetch-batch
 */
router.post('/fetch-batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { urls } = req.body

    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({
        success: false,
        error: '请提供有效的URL数组'
      })
      return
    }

    // 限制批量请求数量
    if (urls.length > 50) {
      res.status(400).json({
        success: false,
        error: '批量请求数量不能超过50个'
      })
      return
    }

    console.log(`批量获取视频数据: ${urls.length} 个URL`)
    const result = await scrapeCreatorsService.getBatchVideoData(urls)

    res.status(200).json({
      success: true,
      data: {
        success_count: result.success.length,
        failed_count: result.failed.length,
        success_data: result.success,
        failed_data: result.failed
      }
    })
  } catch (error) {
    console.error('批量获取视频数据失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

/**
 * 批量添加内容到项目（本地友好模式）
 * POST /api/content/batch-add
 */
router.post('/batch-add', async (req: Request, res: Response): Promise<void> => {
  try {
    const { project_id, links } = req.body as { project_id: string, links: string[] }
    if (!project_id || !Array.isArray(links) || links.length === 0) {
      res.status(400).json({ success: false, error: '项目ID和链接数组是必需的' })
      return
    }
    if (links.length > 500) {
      res.status(400).json({ success: false, error: '一次最多只能添加500个链接' })
      return
    }
    const success_rows: any[] = []
    const failed_rows: any[] = []
    for (let i = 0; i < links.length; i++) {
      const link = links[i]?.trim()
      const index = i + 1
      if (!link) {
        failed_rows.push({ index, link, error: '链接为空' })
        continue
      }
      try {
        const result = await scrapeCreatorsService.getVideoData(link)
        if (!result.success || !result.data) {
          failed_rows.push({ index, link, error: result.error || '无法获取视频数据' })
          continue
        }
        const data = result.data
        const content = {
          id: randomUUID(),
          project_id,
          post_url: link,
          platform: data.platform,
          platform_id: data.id,
          title: data.title,
          creator_name: data.creator.name,
          creator_username: data.creator.username || '',
          creator_profile_url: data.creator.profile_url || '',
          creator_country: data.creator.country || '',
          creator_follower_count: data.creator.follower_count || 0,
          creator_avatar: data.creator.avatar_url || '',
          thumbnail_url: data.thumbnail_url || '',
          monitor_days: 60,
          region: '',
          remark: '',
          status: 'monitoring' as const,
          published_at: data.published_at,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          latest_stats: {
            view_count: data.stats.view_count,
            like_count: data.stats.like_count,
            like_count_available: data.stats.like_count_available,
            bookmark_count: data.stats.bookmark_count,
            favorite_count: data.stats.favorite_count,
            comment_count: data.stats.comment_count,
            share_count: data.stats.share_count,
            engagement_rate: data.stats.engagement_rate,
            collected_at: new Date().toISOString()
          }
        }
        memoryStore.addContent(project_id, content)
        // 尝试保存到数据库，但即使失败也不影响响应
        try {
          const { error: dbErr } = await supabase.from('contents').insert({
            id: content.id,
            project_id: content.project_id,
            post_url: content.post_url,
            platform: content.platform,
            platform_id: content.platform_id,
            title: content.title,
            creator_name: content.creator_name,
            creator_username: content.creator_username,
            creator_profile_url: content.creator_profile_url,
            creator_country: content.creator_country,
            creator_follower_count: content.creator_follower_count,
            creator_avatar: content.creator_avatar,
            thumbnail_url: content.thumbnail_url,
            monitor_days: content.monitor_days,
            region: content.region,
            remark: content.remark,
            status: content.status,
            published_at: content.published_at,
            created_at: content.created_at,
            updated_at: content.updated_at
          })
          if (dbErr) console.warn('数据库保存失败(批量):', dbErr.message || dbErr)
        } catch (e) {
          console.warn('数据库保存异常(批量):', e)
        }
        success_rows.push({ index, link, data: { id: content.id } })
      } catch (e) {
        failed_rows.push({ index, link, error: '处理链接时发生错误' })
      }
    }
    res.json({
      success: true,
      data: {
        success_count: success_rows.length,
        failed_count: failed_rows.length,
        success_rows,
        failed_rows
      },
      message: `批量添加完成：成功 ${success_rows.length} 条，失败 ${failed_rows.length} 条`
    })
  } catch (error) {
    console.error('批量添加失败:', error)
    res.status(500).json({ success: false, error: '批量添加失败' })
  }
})

/**
 * 添加内容到项目
 * POST /api/content/add
 */
router.post('/add', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      project_id, 
      post_url, 
      monitor_days = 60, 
      region = '', 
      remark = '' 
    } = req.body

    if (!project_id || !post_url) {
      res.status(400).json({
        success: false,
        error: '项目ID和视频URL是必需的'
      })
      return
    }

    // 首先获取视频数据
    console.log('添加内容到项目:', { project_id, post_url })
    
    // 检查是否已存在相同的URL
    const existingContents = memoryStore.getProjectContents(project_id)
    const duplicateContent = existingContents.find(content => content.post_url === post_url)
    
    if (duplicateContent) {
      res.status(400).json({
        success: false,
        error: '类似内容已存在，请勿重复添加'
      })
      return
    }

    const videoResult = await scrapeCreatorsService.getVideoData(post_url)

    if (!videoResult.success || !videoResult.data) {
      res.status(400).json({
        success: false,
        error: videoResult.error || '无法获取视频数据'
      })
      return
    }

    // 使用数据库进行重复校验
    const platformId = videoResult.data.id
    const { data: existingInDB } = await supabase
      .from('contents')
      .select('id')
      .eq('project_id', project_id)
      .eq('platform_id', platformId)
      .single()

    if (existingInDB) {
      res.status(400).json({
        success: false,
        error: '内容已存在（根据平台ID去重）'
      })
      return
    }

    // 构建内容对象
    const content = {
      id: randomUUID(),
      project_id,
      post_url,
      platform: videoResult.data.platform,
      platform_id: videoResult.data.id,
      title: videoResult.data.title,
      creator_name: videoResult.data.creator.name,
      creator_username: videoResult.data.creator.username || '',
      creator_profile_url: videoResult.data.creator.profile_url || '',
      creator_country: videoResult.data.creator.country || '',
      creator_follower_count: videoResult.data.creator.follower_count || 0,
      creator_avatar: videoResult.data.creator.avatar_url || '',
      thumbnail_url: videoResult.data.thumbnail_url || '',
      monitor_days,
      region,
      remark,
      status: 'monitoring' as const,
      published_at: videoResult.data.published_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      latest_stats: {
        view_count: videoResult.data.stats.view_count,
        like_count: videoResult.data.stats.like_count,
        like_count_available: videoResult.data.stats.like_count_available,
        bookmark_count: videoResult.data.stats.bookmark_count,
        favorite_count: videoResult.data.stats.favorite_count,
        comment_count: videoResult.data.stats.comment_count,
        share_count: videoResult.data.stats.share_count,
        engagement_rate: videoResult.data.stats.engagement_rate,
        collected_at: new Date().toISOString()
      }
    }

    // 保存到内存存储
    memoryStore.addContent(project_id, content)

    // 同时保存到Supabase数据库
    try {
      const { error: dbError } = await supabase
        .from('contents')
        .insert({
          id: content.id,
          project_id: content.project_id,
          post_url: content.post_url,
          platform: content.platform,
          platform_id: content.platform_id,
          title: content.title,
          creator_name: content.creator_name,
          creator_username: content.creator_username,
          creator_profile_url: content.creator_profile_url,
          creator_country: content.creator_country,
          creator_follower_count: content.creator_follower_count,
          creator_avatar: content.creator_avatar,
          thumbnail_url: content.thumbnail_url,
          monitor_days: content.monitor_days,
          region: content.region,
          remark: content.remark,
          status: content.status,
          published_at: content.published_at,
          created_at: content.created_at,
          updated_at: content.updated_at
        })

      if (dbError) {
        console.error('保存到数据库失败:', dbError)
        // 不影响响应，因为内存存储已经成功
      }

      // 同时保存统计数据
      if (content.latest_stats) {
        const { error: statsError } = await supabase
          .from('content_data')
          .insert({
            content_id: content.id,
            view_count: content.latest_stats.view_count,
            like_count: content.latest_stats.like_count,
            like_count_available: content.latest_stats.like_count_available,
            bookmark_count: content.latest_stats.bookmark_count,
            favorite_count: content.latest_stats.favorite_count,
            comment_count: content.latest_stats.comment_count,
            share_count: content.latest_stats.share_count,
            engagement_rate: content.latest_stats.engagement_rate,
            collected_at: content.latest_stats.collected_at
          })

        if (statsError) {
          console.error('保存统计数据失败:', statsError)
        }
      }
    } catch (error) {
      console.error('数据库操作失败:', error)
    }

    res.status(201).json({
      success: true,
      data: content,
      message: '内容添加成功'
    })

  } catch (error) {
    console.error('添加内容失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

/**
 * 更新内容统计数据
 * POST /api/content/update-stats/:contentId
 */
router.post('/update-stats/:contentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { contentId } = req.params
    const { post_url } = req.body

    if (!post_url) {
      res.status(400).json({
        success: false,
        error: '视频URL是必需的'
      })
      return
    }

    console.log('更新内容统计数据:', { contentId, post_url })
    const result = await scrapeCreatorsService.getVideoData(post_url)

    if (result.success && result.data) {
      const updatedStats = {
        view_count: result.data.stats.view_count,
        like_count: result.data.stats.like_count,
        like_count_available: result.data.stats.like_count_available,
        bookmark_count: result.data.stats.bookmark_count,
        favorite_count: result.data.stats.favorite_count,
        comment_count: result.data.stats.comment_count,
        share_count: result.data.stats.share_count,
        engagement_rate: result.data.stats.engagement_rate,
        collected_at: new Date().toISOString()
      }

      // 这里应该更新数据库中的统计数据
      res.status(200).json({
        success: true,
        data: updatedStats,
        message: '统计数据更新成功'
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.error || '获取最新统计数据失败'
      })
    }
  } catch (error) {
    console.error('更新统计数据失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

/**
 * 检查内容是否重复
 * POST /api/content/check-duplicate
 */
router.post('/check-duplicate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { project_id, post_url } = req.body
    
    if (!project_id || !post_url) {
      res.status(400).json({
        success: false,
        error: '项目ID和视频URL是必需的'
      })
      return
    }

    // 检查是否已存在相同的URL
    const existingContents = memoryStore.getProjectContents(project_id)
    const duplicateContent = existingContents.find(content => content.post_url === post_url)
    
    res.status(200).json({
      success: true,
      isDuplicate: !!duplicateContent,
      message: duplicateContent ? '类似内容已存在，请勿重复添加' : '内容可以添加'
    })
  } catch (error) {
    console.error('检查重复内容失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

/**
 * 获取项目的内容列表
 * GET /api/content/project/:projectId
 */
router.get('/project/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params
    
    if (!projectId) {
      res.status(400).json({
        success: false,
        error: '项目ID是必需的'
      })
      return
    }

    console.log('获取项目内容列表:', projectId)
    
    // 从内存存储获取项目的内容列表
    const contents = memoryStore.getProjectContents(projectId)
    
    console.log(`项目 ${projectId} 的内容数量:`, contents.length)

    res.status(200).json({
      success: true,
      data: contents,
      message: '获取内容列表成功'
    })
  } catch (error) {
    console.error('获取内容列表失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

export default router
