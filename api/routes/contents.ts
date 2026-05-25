import { Router } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { supabase, Content } from '../lib/supabase.js'
import { formatResponse, formatError, detectPlatformFromUrl, extractPlatformId, isValidUrl, calculateEngagementRate } from '../lib/utils.js'
import memoryStore from '../storage/memoryStore.js'
import scrapeCreatorsService from '../services/scrapeCreators.js'

const router = Router()

// 配置multer用于文件上传
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  }
})

// 获取项目的所有内容
router.get('/:projectId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { projectId } = req.params
    const { status, platform, search, page = '1', limit = '20' } = req.query

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    // 验证项目所有权
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (!project) {
      const memoryContents = memoryStore.getProjectContents(projectId)
      const stats = {
        total_views: memoryContents.reduce((s, c) => s + (c.latest_stats?.view_count || 0), 0),
        total_likes: memoryContents.reduce((s, c) => s + (c.latest_stats?.like_count || 0), 0),
        total_comments: memoryContents.reduce((s, c) => s + (c.latest_stats?.comment_count || 0), 0),
        total_shares: memoryContents.reduce((s, c) => s + (c.latest_stats?.share_count || 0), 0),
        engagement_rate: memoryContents.length > 0
          ? memoryContents.reduce((sum, c) => sum + (c.latest_stats?.engagement_rate || 0), 0) / memoryContents.length
          : 0
      }
      return res.json(formatResponse({
        contents: memoryContents,
        stats,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: memoryContents.length
        }
      }))
    }

    let query = supabase
      .from('contents')
      .select(`
        *,
        content_data(
          view_count,
          like_count,
          like_count_available,
          bookmark_count,
          favorite_count,
          comment_count,
          share_count,
          engagement_rate,
          collected_at
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    // 应用筛选条件
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,creator_name.ilike.%${search}%,post_url.ilike.%${search}%`)
    }

    // 分页
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    query = query.range(offset, offset + limitNum - 1)

    const { data: contents, error } = await query

    if (error) {
      console.error('获取内容列表失败:', error)
      return res.status(500).json(formatError('获取内容列表失败'))
    }

    // 格式化内容数据，添加最新的统计数据
    const formattedContents = contents?.map(content => {
      const latestData = content.content_data?.[0] || {}
      return {
        ...content,
        latest_stats: {
          view_count: latestData.view_count || 0,
          like_count: latestData.like_count || 0,
          like_count_available: latestData.like_count_available,
          bookmark_count: latestData.bookmark_count || 0,
          favorite_count: latestData.favorite_count || 0,
          comment_count: latestData.comment_count || 0,
          share_count: latestData.share_count || 0,
          engagement_rate: latestData.engagement_rate || 0,
          collected_at: latestData.collected_at
        }
      }
    }) || []

    // 计算统计汇总
    const stats = {
      total_views: formattedContents.reduce((sum, content) => sum + (content.latest_stats.view_count || 0), 0),
      total_likes: formattedContents.reduce((sum, content) => sum + (content.latest_stats.like_count || 0), 0),
      total_comments: formattedContents.reduce((sum, content) => sum + (content.latest_stats.comment_count || 0), 0),
      total_shares: formattedContents.reduce((sum, content) => sum + (content.latest_stats.share_count || 0), 0),
      engagement_rate: formattedContents.length > 0 
        ? formattedContents.reduce((sum, content) => sum + (content.latest_stats.engagement_rate || 0), 0) / formattedContents.length
        : 0
    }

    res.json(formatResponse({
      contents: formattedContents,
      stats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: formattedContents.length
      }
    }))
  } catch (error) {
    console.error('获取内容列表错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 添加单个内容
router.post('/:projectId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { projectId } = req.params
    const { post_url, monitor_days = 30, region, remark, platform: forcePlatform } = req.body

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    if (!post_url) {
      return res.status(400).json(formatError('内容链接是必需的'))
    }

    if (!isValidUrl(post_url)) {
      return res.status(400).json(formatError('无效的URL格式'))
    }

    // 验证项目所有权
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (!project) {
      console.log('项目在数据库中未找到，启用本地导入模式')
      // 进入后续流程，导入数据将直接写入内存存储
    }

    // 自动检测平台或使用强制指定的平台
    const detectedPlatform = forcePlatform || detectPlatformFromUrl(post_url)
    
    if (!detectedPlatform) {
      return res.status(400).json(formatError('无法识别内容平台，请手动选择'))
    }

    // 提取平台ID
    const platformId = extractPlatformId(post_url, detectedPlatform)

    // 检查是否已存在相同内容
    const { data: existingContent } = await supabase
      .from('contents')
      .select('id')
      .eq('project_id', projectId)
      .eq('platform_id', platformId)
      .single()

    if (existingContent) {
      return res.status(409).json(formatError('该内容已存在于项目中'))
    }

    const { data: content, error } = await supabase
      .from('contents')
      .insert({
        project_id: projectId,
        post_url: post_url.trim(),
        platform: detectedPlatform,
        platform_id: platformId,
        monitor_days,
        region: region?.trim(),
        remark: remark?.trim(),
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('添加内容失败:', error)
      return res.status(500).json(formatError('添加内容失败'))
    }

    res.status(201).json(formatResponse(content, '内容添加成功'))
  } catch (error) {
    console.error('添加内容错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 批量导入内容
router.post('/:projectId/batch', upload.single('file'), async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { projectId } = req.params

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    if (!req.file) {
      return res.status(400).json(formatError('请上传Excel文件'))
    }

    // 验证项目所有权
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (!project) {
      console.log('项目不存在或无权限访问，开启本地批量导入模式')
    }

    // 解析Excel文件
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    if (!jsonData.length) {
      return res.status(400).json(formatError('Excel文件为空'))
    }

    const successRows: any[] = []
    const failedRows: any[] = []

    // 处理每一行数据
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any
      const rowIndex = i + 2 // Excel行号从2开始（第1行是标题）

      try {
        const postUrl = row['链接'] || row['link'] || row['url'] || row['post_url']
        const remark = row['备注'] || row['remark'] || row['标签'] || row['tag']
        const region = row['地区'] || row['region']
        const monitorDays = row['监控天数'] || row['monitor_days'] || 30

        if (!postUrl) {
          failedRows.push({
            row: rowIndex,
            data: row,
            error: '缺少链接字段'
          })
          continue
        }

        if (!isValidUrl(postUrl)) {
          failedRows.push({
            row: rowIndex,
            data: row,
            error: '无效的URL格式'
          })
          continue
        }

        const detectedPlatform = detectPlatformFromUrl(postUrl)
        if (!detectedPlatform) {
          failedRows.push({
            row: rowIndex,
            data: row,
            error: '无法识别内容平台'
          })
          continue
        }

        const platformId = extractPlatformId(postUrl, detectedPlatform)

        // 检查是否已存在
        const { data: existingContent } = await supabase
          .from('contents')
          .select('id')
          .eq('project_id', projectId)
          .eq('platform_id', platformId)
          .single()

        if (existingContent) {
          failedRows.push({
            row: rowIndex,
            data: row,
            error: '内容已存在'
          })
          continue
        }

        const { data: content, error } = await supabase
          .from('contents')
          .insert({
            project_id: projectId,
            post_url: postUrl.trim(),
            platform: detectedPlatform,
            platform_id: platformId,
            monitor_days: [30, 60, 90].includes(monitorDays) ? monitorDays : 30,
            region: region?.trim(),
            remark: remark?.trim(),
            status: 'pending'
          })
          .select()
          .single()

        if (error) {
          failedRows.push({
            row: rowIndex,
            data: row,
            error: '数据库插入失败'
          })
          continue
        }

        successRows.push({
          row: rowIndex,
          data: content
        })

      } catch (error) {
        failedRows.push({
          row: rowIndex,
          data: row,
          error: '处理行数据时发生错误'
        })
      }
    }

    res.json(formatResponse({
      success_count: successRows.length,
      failed_count: failedRows.length,
      success_rows: successRows,
      failed_rows: failedRows
    }, `批量导入完成：成功 ${successRows.length} 条，失败 ${failedRows.length} 条`))

  } catch (error) {
    console.error('批量导入错误:', error)
    res.status(500).json(formatError('批量导入失败'))
  }
})

// 批量添加链接
router.post('/:projectId/batch-links', async (req, res) => {
  try {
    console.log('🧪 batch-links route invoked')
    const userId = req.headers['x-user-id'] as string
    const { projectId } = req.params
    const { links } = req.body

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    if (!links || !Array.isArray(links) || links.length === 0) {
      return res.status(400).json(formatError('请提供有效的链接数组'))
    }

    if (links.length > 500) {
      return res.status(400).json(formatError('一次最多只能添加500个链接'))
    }

    // 验证项目所有权
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (!project) {
      console.log('项目不存在或无权限访问，启用本地批量导入模式')
    }

    const successRows: any[] = []
    const failedRows: any[] = []

    // 处理每个链接
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const linkIndex = i + 1

      try {
        const postUrl = link.trim()

        if (!postUrl) {
          failedRows.push({
            index: linkIndex,
            link: link,
            error: '链接为空'
          })
          continue
        }

        if (!isValidUrl(postUrl)) {
          failedRows.push({
            index: linkIndex,
            link: link,
            error: '无效的URL格式'
          })
          continue
        }

        let detectedPlatform = detectPlatformFromUrl(postUrl)
        if (!detectedPlatform) {
          failedRows.push({
            index: linkIndex,
            link: link,
            error: '无法识别内容平台'
          })
          continue
        }
        
        // 临时修复：如果是 twitter 平台，确保数据库兼容性
        // 由于数据库约束可能还没有更新，我们保持 twitter 值
        console.log(`检测到平台: ${detectedPlatform} (URL: ${postUrl})`)

        const platformId = extractPlatformId(postUrl, detectedPlatform)

        // 检查是否已存在
        const { data: existingContent } = await supabase
          .from('contents')
          .select('id')
          .eq('project_id', projectId)
          .eq('platform_id', platformId)
          .single()

        if (existingContent) {
          failedRows.push({
            index: linkIndex,
            link: link,
            error: '内容已存在'
          })
          continue
        }

        // 尝试获取视频数据
        let videoData = null
        let contentStatus = 'pending'
        let title = null
        let creatorName = null
        let creatorUsername = null
        let creatorProfileUrl = null
        let creatorCountry = null
        let creatorFollowerCount: number | null = null
        let creatorAvatar = null
        let thumbnailUrl = null
        let publishedAt = null

        try {
          console.log(`🔍 正在获取视频数据: ${postUrl}`)
          const videoResult = await scrapeCreatorsService.getVideoData(postUrl)
          
          if (videoResult.success && videoResult.data) {
            videoData = videoResult.data
            contentStatus = 'monitoring'
            title = videoData.title
            creatorName = videoData.creator.name
            creatorUsername = videoData.creator.username || null
            creatorProfileUrl = videoData.creator.profile_url || null
            creatorCountry = videoData.creator.country || null
            creatorFollowerCount = typeof videoData.creator.follower_count === 'number' ? videoData.creator.follower_count : null
            creatorAvatar = videoData.creator.avatar_url
            thumbnailUrl = videoData.thumbnail_url
            publishedAt = videoData.published_at
            console.log(`✅ 成功获取视频数据: ${title}`)
          } else {
            console.log(`⚠️ 无法获取视频数据: ${videoResult.error}`)
            // 即使抓取失败，也允许添加链接，状态设为 pending 或 error
            // 这样用户可以稍后重试，或者手动补充信息
            contentStatus = 'pending'
            title = `未命名视频 (${platformId})` // 给一个默认标题
            
            // 如果是因为视频不存在或隐私设置，我们仍然允许添加，但标记状态
            // failedRows.push({ ... }) // 不再直接失败
            // continue // 不再跳过
          }
        } catch (error) {
          console.log(`❌ 获取视频数据时发生错误: ${error}`)
          // 发生异常时也允许继续，作为待处理项
          contentStatus = 'pending'
          title = `未命名视频 (${platformId})`
        }

        // 临时解决方案：如果是 Twitter，尝试插入，如果失败则使用兼容的平台值
        let insertData = {
          project_id: projectId,
          post_url: postUrl,
          platform: detectedPlatform,
          platform_id: platformId,
          title: title ? (title.length > 500 ? title.substring(0, 497) + '...' : title) : title,
          creator_name: creatorName,
          creator_username: creatorUsername,
          creator_profile_url: creatorProfileUrl,
          creator_country: creatorCountry,
          creator_follower_count: creatorFollowerCount,
          creator_avatar: creatorAvatar,
          thumbnail_url: thumbnailUrl,
          monitor_days: 30, // 默认监控30天
          status: contentStatus,
          published_at: publishedAt
        }

        let { data: content, error } = await supabase
          .from('contents')
          .insert(insertData)
          .select()
          .single()

        // 如果数据库缺少新字段（creator_country等），尝试不带这些字段插入
        if (error && (error.message?.includes('creator_country') || error.message?.includes('schema cache'))) {
          console.log('⚠️ 数据库缺少新字段，尝试兼容模式插入...')
          const { 
            creator_country, 
            creator_username, 
            creator_profile_url, 
            creator_follower_count, 
            ...compatibleData 
          } = insertData as any
          
          const { data: retryContent, error: retryError } = await supabase
            .from('contents')
            .insert(compatibleData)
            .select()
            .single()
          
          content = retryContent
          error = retryError
          
          if (!retryError) {
            console.log('✅ 内容已成功保存（兼容模式）')
          }
        }

        // 如果是 Twitter 约束错误，尝试使用 'instagram' 作为临时平台类型
        if (error && error.message?.includes('contents_platform_check') && detectedPlatform === 'twitter') {
          console.log('⚠️ Twitter 约束错误，尝试使用临时解决方案...')
          insertData.platform = 'instagram' // 临时使用 instagram 作为平台类型
          
          const { data: retryContent, error: retryError } = await supabase
            .from('contents')
            .insert(insertData)
            .select()
            .single()
          
          content = retryContent
          error = retryError
          
          if (!retryError) {
            console.log('✅ Twitter 内容已成功保存（使用临时平台类型）')
          }
        }

        if (error) {
          const now = new Date().toISOString()
          const localId = crypto.randomUUID()
          memoryStore.addContent(projectId, {
            id: localId,
            project_id: projectId,
            post_url: postUrl,
            platform: detectedPlatform,
            platform_id: platformId,
            title: title || `未命名视频 (${platformId})`,
            creator_name: creatorName || '',
            creator_username: creatorUsername || '',
            creator_profile_url: creatorProfileUrl || '',
            creator_country: creatorCountry || '',
            creator_follower_count: creatorFollowerCount || 0,
            creator_avatar: creatorAvatar || '',
            thumbnail_url: thumbnailUrl || '',
            monitor_days: 30,
            region: '',
            remark: '',
            status: contentStatus,
            published_at: publishedAt || now,
            created_at: now,
            updated_at: now,
            latest_stats: {
              view_count: videoData?.stats?.view_count || 0,
              like_count: videoData?.stats?.like_count || 0,
              like_count_available: videoData?.stats?.like_count_available,
              bookmark_count: videoData?.stats?.bookmark_count || 0,
              favorite_count: videoData?.stats?.favorite_count || 0,
              comment_count: videoData?.stats?.comment_count || 0,
              share_count: videoData?.stats?.share_count || 0,
              engagement_rate: videoData?.stats?.engagement_rate || 0,
              collected_at: now
            }
          })
          successRows.push({
            index: linkIndex,
            link: link,
            data: { id: localId }
          })
          continue
        }

        // 如果成功获取了视频数据，同时保存统计数据
        if (videoData && videoData.stats) {
          const { error: statsError } = await supabase
            .from('content_data')
            .insert({
              content_id: content.id,
              view_count: videoData.stats.view_count,
              like_count: videoData.stats.like_count,
              like_count_available: videoData.stats.like_count_available,
              bookmark_count: videoData.stats.bookmark_count,
              favorite_count: videoData.stats.favorite_count,
              comment_count: videoData.stats.comment_count,
              share_count: videoData.stats.share_count,
              engagement_rate: videoData.stats.engagement_rate,
              collected_at: new Date().toISOString()
            })

          if (statsError) {
            console.error(`保存统计数据失败 (${content.id}):`, statsError)
          } else {
            console.log(`✅ 成功保存统计数据: ${content.id}`)
          }
        }

        successRows.push({
          index: linkIndex,
          link: link,
          data: content
        })

      } catch (error) {
        failedRows.push({
          index: linkIndex,
          link: link,
          error: '处理链接时发生错误'
        })
      }
    }

    console.log('批量添加准备返回', { success_count: successRows.length, failed_count: failedRows.length })
    res.json(formatResponse({
      success_count: successRows.length,
      failed_count: failedRows.length,
      success_rows: successRows,
      failed_rows: failedRows
    }, `批量添加完成：成功 ${successRows.length} 条，失败 ${failedRows.length} 条`))

  } catch (error) {
    console.error('批量添加链接错误:', error)
    res.status(500).json(formatError('批量添加失败'))
  }
})

// 更新内容
router.put('/:contentId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { contentId } = req.params
    const { monitor_days, region, remark, status } = req.body

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    // 验证内容所有权 - 简化版本，直接查询内容和项目
    const { data: content } = await supabase
      .from('contents')
      .select('*, projects(user_id)')
      .eq('id', contentId)
      .single()

    if (!content) {
      return res.status(404).json(formatError('内容不存在'))
    }

    // 验证项目所有权
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', content.project_id)
      .single()



    if (!project || project.user_id !== userId) {
      return res.status(404).json(formatError('无权限访问此内容'))
    }

    const updateData: Partial<Content> = {}
    
    if (monitor_days && [30, 60, 90].includes(monitor_days)) {
      updateData.monitor_days = monitor_days
    }
    if (region !== undefined) updateData.region = region?.trim()
    if (remark !== undefined) updateData.remark = remark?.trim()
    if (status && ['pending', 'monitoring', 'completed', 'error'].includes(status)) {
      updateData.status = status
    }

    const { data: updatedContent, error } = await supabase
      .from('contents')
      .update(updateData)
      .eq('id', contentId)
      .select()
      .single()

    if (error) {
      console.error('更新内容失败:', error)
      return res.status(500).json(formatError('更新内容失败'))
    }

    res.json(formatResponse(updatedContent, '内容更新成功'))
  } catch (error) {
    console.error('更新内容错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 删除内容
router.delete('/:contentId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { contentId } = req.params

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    // 首先尝试从数据库删除
    let deletedFromDB = false
    const { data: content } = await supabase
      .from('contents')
      .select('*')
      .eq('id', contentId)
      .single()

    if (content) {
      // 验证项目所有权
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', content.project_id)
        .single()

      if (project && project.user_id === userId) {
        const { error } = await supabase
          .from('contents')
          .delete()
          .eq('id', contentId)

        if (!error) {
          deletedFromDB = true
          console.log('✅ 从数据库删除内容成功:', contentId)
        }
      }
    }

    // 同时尝试从内存存储删除
    let deletedFromMemory = false
    
    // 遍历所有项目，找到包含此内容的项目
    const allProjects = memoryStore.getAllProjects()
    for (const projectId of Object.keys(allProjects)) {
      const projectContents = memoryStore.getProjectContents(projectId)
      const contentIndex = projectContents.findIndex(c => c.id === contentId)
      
      if (contentIndex !== -1) {
        // 找到了内容，删除它
        projectContents.splice(contentIndex, 1)
        memoryStore.setProjectContents(projectId, projectContents)
        deletedFromMemory = true
        console.log('✅ 从内存存储删除内容成功:', contentId, '项目:', projectId)
        break
      }
    }

    if (deletedFromDB || deletedFromMemory) {
      res.json(formatResponse(null, '内容删除成功'))
    } else {
      res.status(404).json(formatError('内容不存在或无权限访问'))
    }
  } catch (error) {
    console.error('删除内容错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 批量更新项目所有内容的数据
router.post('/update-all/:projectId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { projectId } = req.params

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    // 验证项目所有权
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (!project) {
      console.log('项目不存在或无权限访问，启用本地批量导入模式')
    }

    // 获取项目下所有内容
    const { data: contents, error: fetchError } = await supabase
      .from('contents')
      .select('*')
      .eq('project_id', projectId)

    if (fetchError) {
      console.error('获取内容列表失败:', fetchError)
      return res.status(500).json(formatError('获取内容列表失败'))
    }

    if (!contents || contents.length === 0) {
      return res.json(formatResponse({ updated_count: 0 }, '没有需要更新的内容'))
    }

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    // 批量更新每个内容的数据
    for (const content of contents) {
      try {
        console.log(`正在更新内容: ${content.title} (${content.post_url})`)
        
        // 调用实际的数据抓取服务
        const videoResult = await scrapeCreatorsService.getVideoData(content.post_url)
        
        if (videoResult.success && videoResult.data && videoResult.data.stats) {
          const stats = videoResult.data.stats
          
          // 插入新的统计数据
          const { error: insertError } = await supabase
            .from('content_data')
            .insert({
              content_id: content.id,
              view_count: stats.view_count,
              like_count: stats.like_count,
              bookmark_count: stats.bookmark_count,
              favorite_count: stats.favorite_count,
              comment_count: stats.comment_count,
              share_count: stats.share_count,
              engagement_rate: stats.engagement_rate,
              collected_at: new Date().toISOString()
            })

          if (insertError) {
            console.error(`更新内容 ${content.id} 数据失败:`, insertError)
            failedCount++
            errors.push(`内容 "${content.title}" 更新失败: 数据库写入错误`)
          } else {
            successCount++
            console.log(`✅ 内容更新成功: ${content.title}`)
          }
        } else {
          console.error(`获取视频数据失败 (${content.post_url}):`, videoResult.error)
          failedCount++
          errors.push(`内容 "${content.title}" 获取数据失败: ${videoResult.error || '未知错误'}`)
        }
        
        // 添加短暂延时，避免触发反爬虫限制
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`处理内容 ${content.id} 时发生错误:`, error)
        failedCount++
        errors.push(`内容 "${content.title}" 处理失败`)
      }
    }

    const result = {
      total_count: contents.length,
      success_count: successCount,
      failed_count: failedCount,
      errors: errors
    }

    if (failedCount > 0) {
      return res.status(207).json(formatResponse(result, `批量更新完成，成功 ${successCount} 个，失败 ${failedCount} 个`))
    } else {
      return res.json(formatResponse(result, `批量更新成功，共更新 ${successCount} 个内容的数据`))
    }

  } catch (error) {
    console.error('批量更新内容数据错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

// 导出项目内容数据为Excel
router.get('/export/:projectId', async (req, res) => {
  try {
    console.log('导出API被调用:', req.params, req.query)
    const userId = req.headers['x-user-id'] as string
    const { projectId } = req.params
    const { projectName: queryProjectName } = req.query

    console.log('导出参数:', { userId, projectId, queryProjectName })

    if (!userId) {
      console.log('用户未认证')
      return res.status(401).json(formatError('用户未认证'))
    }

    let projectName = (queryProjectName as string) || '未知项目'

    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (!project) {
      console.log('项目不存在，改为返回本地更新结果：0')
      return res.json(formatResponse({ 
        total_count: 0,
        success_count: 0,
        failed_count: 0,
        errors: []
      }, '没有需要更新的内容'))
    }
    projectName = project.name

    const { data: contents, error } = await supabase
      .from('contents')
      .select(`
        *,
        content_data(
          view_count,
          like_count,
          like_count_available,
          bookmark_count,
          favorite_count,
          comment_count,
          share_count,
          engagement_rate,
          collected_at
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json(formatError('获取内容列表失败'))
    }

    if (!contents || contents.length === 0) {
      return res.status(404).json(formatError('项目中没有内容数据'))
    }

    // 格式化数据用于Excel导出
    const exportData = contents.map((content, index) => {
      // 处理不同的数据结构（内存存储 vs 数据库）
      const latestData = content.content_data?.[0] || content.latest_stats || {}
      
      return {
        '项目名称': projectName,
        '序号': index + 1,
        '达人账号名': content.creator_username || '',
        '达人昵称': content.creator_name || '',
        '达人账号链接': content.creator_profile_url || '',
        '达人国家': content.creator_country || '',
        '达人粉丝数': content.creator_follower_count || 0,
        '平台': content.platform === 'youtube' ? 'YouTube' : 
               content.platform === 'tiktok' ? 'TikTok' : 
               content.platform === 'instagram' ? 'Instagram' : 
               content.platform === 'twitter' ? 'Twitter' : content.platform,
        '视频发布时间': content.published_at ? new Date(content.published_at).toLocaleDateString('zh-CN') : '',
        '视频链接': content.post_url,
        '视频标题': content.title || '',
        '观看量': latestData.view_count || 0,
        '点赞数': latestData.like_count || 0,
        '收藏数': latestData.bookmark_count || latestData.favorite_count || 0,
        '分享数': latestData.share_count || latestData.retweet_count || 0,
        '评论数': latestData.comment_count || 0,
        '互动率': latestData.engagement_rate ? `${latestData.engagement_rate.toFixed(2)}%` : '0.00%',
        '监控状态': content.status === 'pending' ? '待处理' :
                   content.status === 'monitoring' ? '监控中' :
                   content.status === 'completed' ? '已完成' :
                   content.status === 'error' ? '错误' : content.status,
        '备注': content.remark || '',
        '数据更新时间': latestData.collected_at ? new Date(latestData.collected_at).toLocaleString('zh-CN') : ''
      }
    })

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // 设置列宽
    const colWidths = [
      { wch: 15 }, // 项目名称
      { wch: 8 },  // 序号
      { wch: 15 }, // 达人账号名
      { wch: 15 }, // 达人昵称
      { wch: 40 }, // 达人账号链接
      { wch: 12 }, // 达人国家
      { wch: 12 }, // 达人粉丝数
      { wch: 10 }, // 平台
      { wch: 12 }, // 视频发布时间
      { wch: 50 }, // 视频链接
      { wch: 30 }, // 视频标题
      { wch: 12 }, // 观看量
      { wch: 10 }, // 点赞数
      { wch: 10 }, // 收藏数
      { wch: 10 }, // 分享数
      { wch: 10 }, // 评论数
      { wch: 10 }, // 互动率
      { wch: 12 }, // 监控状态
      { wch: 20 }, // 备注
      { wch: 18 }  // 数据更新时间
    ]
    worksheet['!cols'] = colWidths

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '达人数据')

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 设置响应头
    const fileName = `${projectName}_达人数据_${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`)
    res.setHeader('Content-Length', excelBuffer.length)

    // 发送文件
    res.send(excelBuffer)

  } catch (error) {
    console.error('导出Excel错误:', error)
    res.status(500).json(formatError('导出失败'))
  }
})

// 回填缺失的达人字段
router.post('/fix-creator-fields/:projectId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string
    const { projectId } = req.params

    if (!userId) {
      return res.status(401).json(formatError('用户未认证'))
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (!project) {
      return res.status(404).json(formatError('项目不存在或无权限访问'))
    }

    const { data: contents, error } = await supabase
      .from('contents')
      .select('*')
      .eq('project_id', projectId)

    if (error) {
      return res.status(500).json(formatError('获取内容列表失败'))
    }

    if (!contents || contents.length === 0) {
      return res.json(formatResponse({ updated_count: 0 }, '没有需要回填的内容'))
    }

    let updated = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    // 逐条处理，避免第三方限流
    for (const content of contents) {
      const needFix = !content.creator_profile_url || !content.creator_username || (!content.creator_follower_count || content.creator_follower_count === 0)
      if (!needFix) {
        skipped++
        continue
      }

      try {
        const result = await scrapeCreatorsService.getVideoData(content.post_url)
        if (result.success && result.data) {
          const c = result.data.creator
          const { error: updError } = await supabase
            .from('contents')
            .update({
              title: result.data.title || content.title,
              creator_name: c.name || content.creator_name,
              creator_username: c.username || content.creator_username,
              creator_profile_url: c.profile_url || content.creator_profile_url,
              creator_country: c.country || content.creator_country,
              creator_follower_count: typeof c.follower_count === 'number' ? c.follower_count : content.creator_follower_count,
              creator_avatar: c.avatar_url || content.creator_avatar,
              thumbnail_url: result.data.thumbnail_url || content.thumbnail_url,
              published_at: result.data.published_at || content.published_at,
              status: 'monitoring'
            })
            .eq('id', content.id)

          if (updError) {
            failed++
            errors.push(`更新失败: ${content.id}`)
          } else {
            updated++
          }
        } else {
          failed++
          errors.push(`抓取失败: ${content.id}`)
        }
      } catch (e) {
        failed++
        errors.push(`异常: ${content.id}`)
      }
    }

    return res.json(formatResponse({ updated, skipped, failed, total: contents.length, errors }, '达人字段回填完成'))
  } catch (error) {
    console.error('回填达人字段错误:', error)
    res.status(500).json(formatError('服务器内部错误'))
  }
})

export default router
