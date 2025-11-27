/**
 * Scrape Creators API 服务
 * 用于获取社交媒体平台的内容数据
 */

interface ScrapeCreatorsConfig {
  apiKey: string
  baseUrl: string
}

interface VideoStats {
  view_count: number
  like_count: number
  bookmark_count?: number
  favorite_count?: number
  comment_count: number
  share_count: number
  retweet_count?: number
  engagement_rate: number
}

interface CreatorInfo {
  name: string
  username?: string  // 达人账号名
  profile_url?: string  // 达人账号链接
  country?: string  // 达人国家
  avatar_url?: string
  follower_count?: number
}

interface VideoData {
  id: string
  title: string
  description?: string
  thumbnail_url?: string
  published_at: string
  duration?: number
  creator: CreatorInfo
  stats: VideoStats
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter'
  url: string
}

interface ScrapeCreatorsResponse {
  success: boolean
  data?: VideoData
  error?: string
  message?: string
}

class ScrapeCreatorsService {
  private config: ScrapeCreatorsConfig

  constructor(config: ScrapeCreatorsConfig) {
    this.config = config
  }

  /**
   * 从URL中提取平台类型
   */
  private detectPlatform(url: string): 'youtube' | 'tiktok' | 'instagram' | 'twitter' | null {
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
    return null
  }

  /**
   * 从URL中提取视频ID
   */
  private extractVideoId(url: string, platform: string): string | null {
    try {
      switch (platform) {
        case 'youtube':
          // 支持普通视频和Shorts格式
          const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/)
          return youtubeMatch ? youtubeMatch[1] : null
        
        case 'tiktok':
          const tiktokMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
          return tiktokMatch ? tiktokMatch[1] : null
        
        case 'instagram':
          // 支持 /p/ (普通帖子) 和 /reel/ (Reels视频) 格式
          const instagramMatch = url.match(/instagram\.com\/(?:p|reel)\/([^/?]+)/)
          return instagramMatch ? instagramMatch[1] : null
        
        case 'twitter':
          const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/)
          return twitterMatch ? twitterMatch[1] : null
        
        default:
          return null
      }
    } catch (error) {
      console.error('提取视频ID失败:', error)
      return null
    }
  }

  /**
   * 获取视频数据
   */
  async getVideoData(url: string): Promise<ScrapeCreatorsResponse> {
    try {
      const platform = this.detectPlatform(url)
      if (!platform) {
        return {
          success: false,
          error: '不支持的平台URL'
        }
      }

      const videoId = this.extractVideoId(url, platform)
      if (!videoId) {
        return {
          success: false,
          error: '无法从URL中提取视频ID'
        }
      }

      // 构建API请求 - 根据平台使用不同的端点
      let apiUrl: string
      switch (platform) {
        case 'youtube':
          // YouTube 使用完整URL
          apiUrl = `${this.config.baseUrl}/v1/youtube/video?url=${encodeURIComponent(url)}`
          break
        case 'tiktok':
          // TikTok 使用完整URL
          apiUrl = `${this.config.baseUrl}/v1/tiktok/video?url=${encodeURIComponent(url)}`
          break
        case 'instagram':
          // Instagram 使用完整URL
          apiUrl = `${this.config.baseUrl}/v1/instagram/post?url=${encodeURIComponent(url)}`
          break
        case 'twitter':
          // Twitter 使用完整URL
          apiUrl = `${this.config.baseUrl}/v1/twitter/tweet?url=${encodeURIComponent(url)}`
          break
        default:
          throw new Error(`不支持的平台: ${platform}`)
      }
      
      console.log(`🔍 正在获取 ${platform} 视频数据:`, videoId)
      console.log(`📡 API请求URL:`, apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'ContentMonitor/1.0'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API请求失败 (${response.status}):`, errorText)
        
        return {
          success: false,
          error: `API请求失败: ${response.status} ${response.statusText}`,
          message: errorText
        }
      }

      const data = await response.json()
      console.log(`📊 ${platform} API响应状态:`, response.status)
      console.log(`📊 ${platform} 数据是否有graphql:`, !!data.graphql)
      
      // 转换API响应为标准格式
      let videoData: VideoData
      
      if (platform === 'tiktok') {
        // TikTok 特殊处理
        // 检查API是否返回错误
        if (data.statusCode && data.statusCode !== 0) {
          return {
            success: false,
            error: `TikTok API错误: ${data.statusMsg || '未知错误'} (代码: ${data.statusCode})`
          }
        }
        
        const itemInfo = data.itemInfo?.itemStruct || data.itemInfo || data
        const stats = itemInfo.stats || itemInfo.statsV2 || {}
        const author = itemInfo.author || {}
        const video = itemInfo.video || {}
        


        videoData = {
          id: videoId,
          title: itemInfo.desc || '未知标题',
          description: itemInfo.desc,
          thumbnail_url: video.cover || video.dynamicCover || video.originCover || '',
          published_at: itemInfo.createTime ? new Date(itemInfo.createTime * 1000).toISOString() : new Date().toISOString(),
          duration: video.duration || Math.round((video.durationMs || 0) / 1000),
          creator: {
            name: author.nickname || author.uniqueId || '未知创作者',
            username: author.uniqueId || author.nickname || '',
            profile_url: author.uniqueId ? `https://www.tiktok.com/@${author.uniqueId}` : '',
            country: author.region || 
                     author.country || 
                     author.location ||
                     author.address?.country ||
                     itemInfo.region ||
                     itemInfo.country ||
                     '',
            avatar_url: author.avatarLarger || author.avatarMedium || author.avatarThumb,
            follower_count: parseInt(String(
              author.followerCount || 
              author.fans || 
              author.followersCount || 
              author.follower_count ||
              author.fanCount ||
              author.stats?.followerCount ||
              author.stats?.fans ||
              itemInfo.authorStats?.followerCount ||
              itemInfo.authorStats?.fans ||
              '0'
            ).replace(/[^\d]/g, '') || '0')
          },
          stats: {
            view_count: parseInt(String(stats.playCount || '0')),
            like_count: parseInt(String(stats.diggCount || '0')),
            comment_count: parseInt(String(stats.commentCount || '0')),
            share_count: parseInt(String(stats.shareCount || '0')),
            engagement_rate: 0 // 稍后计算
          },
          platform,
          url
        }
      } else if (platform === 'instagram') {
        // Instagram 特殊处理 - 添加详细调试日志
        console.log('Instagram API 原始响应:', JSON.stringify(data, null, 2))
        
        // 尝试多种可能的数据结构
        let shortcodeMedia = null
        let owner = null
        let title = '未知标题'
        let description = ''
        let thumbnailUrl = ''
        let publishedAt = new Date().toISOString()
        let duration = 0
        let creatorName = '未知创作者'
        let creatorUsername = ''
        let creatorProfileUrl = ''
        let creatorCountry = ''
        let creatorAvatar = ''
        let followerCount = 0
        let viewCount = 0
        let likeCount = 0
        let commentCount = 0
        
        // 检查不同的数据结构路径
        console.log('检查数据结构:', {
          hasXdtShortcodeMedia: !!data.xdt_shortcode_media,
          hasGraphqlShortcodeMedia: !!data.graphql?.shortcode_media,
          hasItems: !!data.items,
          dataKeys: Object.keys(data)
        })
        
        // 修复：正确检查Instagram API响应结构
        if (data.data && data.data.xdt_shortcode_media) {
          console.log('使用 data.xdt_shortcode_media 结构')
          shortcodeMedia = data.data.xdt_shortcode_media
        } else if (data.xdt_shortcode_media && typeof data.xdt_shortcode_media === 'object') {
          console.log('使用 xdt_shortcode_media 结构')
          shortcodeMedia = data.xdt_shortcode_media
        } else if (data.graphql?.shortcode_media) {
          console.log('使用 graphql.shortcode_media 结构')
          shortcodeMedia = data.graphql.shortcode_media
        } else if (data.data && typeof data.data === 'object') {
          console.log('使用 data.data 结构')
          shortcodeMedia = data.data
        } else if (data.items && data.items[0]) {
          console.log('使用 items[0] 结构')
          shortcodeMedia = data.items[0]
        } else {
          console.log('使用根级数据结构')
          shortcodeMedia = data
        }
        
        console.log('解析的 shortcodeMedia 关键字段:', {
          id: shortcodeMedia?.id,
          typename: shortcodeMedia?.__typename,
          hasOwner: !!shortcodeMedia?.owner,
          ownerKeys: shortcodeMedia?.owner ? Object.keys(shortcodeMedia.owner) : [],
          hasCaption: !!shortcodeMedia?.edge_media_to_caption,
          captionCount: shortcodeMedia?.edge_media_to_caption?.edges?.length || 0
        })
        
        if (shortcodeMedia) {
          // 提取用户信息 - 基于实际API响应结构
          owner = shortcodeMedia.owner || shortcodeMedia.user || {}
          
          console.log('原始 owner 数据:', JSON.stringify(owner, null, 2))
          
          // 如果owner为空，尝试从其他地方获取
          if (!owner.username && !owner.full_name) {
            // 检查是否有其他用户信息路径
            if (shortcodeMedia.coauthor_producers && shortcodeMedia.coauthor_producers.length > 0) {
              owner = shortcodeMedia.coauthor_producers[0]
            }
          }
          
          console.log('解析的 owner:', {
            username: owner.username,
            full_name: owner.full_name,
            id: owner.id,
            hasProfilePic: !!owner.profile_pic_url
          })
          
          // 提取标题和描述
          const edgeMediaToCaption = shortcodeMedia.edge_media_to_caption || {}
          const captionEdges = edgeMediaToCaption.edges || []
          const caption = captionEdges[0]?.node?.text || shortcodeMedia.caption?.text || shortcodeMedia.caption || ''
          
          console.log('Caption信息:', {
            hasEdgeMediaToCaption: !!shortcodeMedia.edge_media_to_caption,
            captionEdgesLength: captionEdges.length,
            captionText: caption.substring(0, 100)
          })
          
          if (caption) {
            const firstLine = caption.split('\n')[0].trim()
            title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine
            description = caption
          } else if (shortcodeMedia.accessibility_caption) {
            title = shortcodeMedia.accessibility_caption.length > 50 
              ? shortcodeMedia.accessibility_caption.substring(0, 50) + '...' 
              : shortcodeMedia.accessibility_caption
          }
          
          // 提取媒体信息
          const originalThumbnailUrl = shortcodeMedia.display_url || shortcodeMedia.thumbnail_src || shortcodeMedia.image_versions2?.candidates?.[0]?.url || ''
          // 对于Instagram图片，使用代理URL解决CORS问题
          thumbnailUrl = originalThumbnailUrl ? `http://localhost:3002/api/proxy/image?url=${encodeURIComponent(originalThumbnailUrl)}` : ''
          publishedAt = shortcodeMedia.taken_at_timestamp ? new Date(shortcodeMedia.taken_at_timestamp * 1000).toISOString() : 
                       shortcodeMedia.taken_at ? new Date(shortcodeMedia.taken_at * 1000).toISOString() : new Date().toISOString()
          duration = shortcodeMedia.video_duration || shortcodeMedia.video_versions?.[0]?.duration || 0
          
          console.log('媒体信息:', {
            thumbnailUrl,
            hasDisplayUrl: !!shortcodeMedia.display_url,
            hasThumbnailSrc: !!shortcodeMedia.thumbnail_src,
            hasImageVersions: !!shortcodeMedia.image_versions2,
            duration
          })
          
          // 提取创作者信息
          creatorName = owner.full_name || owner.username || owner.name || '未知创作者'
          creatorUsername = owner.username || owner.name || ''
          creatorProfileUrl = creatorUsername ? `https://www.instagram.com/${creatorUsername}/` : ''
          creatorCountry = owner.country_block || 
                          owner.country || 
                          owner.location || 
                          owner.address?.country ||
                          owner.business_address?.country ||
                          owner.contact_phone_number?.country_code ||
                          ''
          creatorAvatar = owner.profile_pic_url || owner.profile_pic_url_hd || owner.profile_picture || ''
          followerCount = parseInt(String(owner.edge_followed_by?.count || owner.follower_count || '0'))
          
          // 提取统计信息
          console.log('观看量字段调试:', {
            video_view_count: shortcodeMedia.video_view_count,
            view_count: shortcodeMedia.view_count,
            play_count: shortcodeMedia.play_count,
            video_play_count: shortcodeMedia.video_play_count,
            clips_metadata_play_count: shortcodeMedia.clips_metadata?.play_count,
            clips_metadata_view_count: shortcodeMedia.clips_metadata?.view_count,
            hasVideoViewCount: !!shortcodeMedia.video_view_count,
            hasViewCount: !!shortcodeMedia.view_count,
            hasPlayCount: !!shortcodeMedia.play_count,
            hasClipsMetadata: !!shortcodeMedia.clips_metadata
          })
          
          // 优先使用 video_play_count，它通常更准确
          viewCount = parseInt(String(
            shortcodeMedia.video_play_count || 
            shortcodeMedia.video_view_count || 
            shortcodeMedia.view_count || 
            shortcodeMedia.play_count || 
            '0'
          ))
          likeCount = parseInt(String(shortcodeMedia.edge_media_preview_like?.count || shortcodeMedia.like_count || '0'))
          commentCount = parseInt(String(
            shortcodeMedia.edge_media_to_comment?.count || 
            shortcodeMedia.edge_media_preview_comment?.count ||
            shortcodeMedia.comment_count || 
            '0'
          ))
          
          console.log('提取的统计信息:', {
            viewCount,
            likeCount,
            commentCount,
            hasEdgeMediaPreviewLike: !!shortcodeMedia.edge_media_preview_like,
            likeCountFromEdge: shortcodeMedia.edge_media_preview_like?.count
          })
        }
        
        console.log('最终解析结果:', {
          title, creatorName, viewCount, likeCount, commentCount, thumbnailUrl
        })
        
        videoData = {
          id: videoId,
          title: title,
          description: description,
          thumbnail_url: thumbnailUrl,
          published_at: publishedAt,
          duration: duration,
          creator: {
            name: creatorName,
            username: creatorUsername,
            profile_url: creatorProfileUrl,
            country: creatorCountry,
            avatar_url: creatorAvatar,
            follower_count: followerCount
          },
          stats: {
            view_count: viewCount,
            like_count: likeCount,
            comment_count: commentCount,
            share_count: 0, // Instagram API 通常不提供分享数
            engagement_rate: 0 // 稍后计算
          },
          platform,
          url
        }
      } else if (platform === 'twitter') {
        // Twitter 特殊处理
        const legacy = data.legacy || {}
        const core = data.core || {}
        const userResults = core.user_results?.result || {}
        const userLegacy = userResults.legacy || {}
        const views = data.views || {}
        

        
        // 提取推文文本
        const fullText = legacy.full_text || legacy.text || '未知内容'
        
        // 提取媒体信息
        const extendedEntities = legacy.extended_entities || {}
        const media = extendedEntities.media?.[0] || {}
        const thumbnailUrl = media.media_url_https || media.media_url || ''
        
        // 计算视频时长（如果有视频）
        let duration = 0
        if (media.video_info?.duration_millis) {
          duration = Math.round(media.video_info.duration_millis / 1000)
        }
        
        videoData = {
          id: videoId,
          title: fullText.length > 100 ? fullText.substring(0, 100) + '...' : fullText,
          description: fullText,
          thumbnail_url: thumbnailUrl,
          published_at: legacy.created_at ? new Date(legacy.created_at).toISOString() : new Date().toISOString(),
          duration: duration,
          creator: {
            name: userResults.core?.name || 
                  userResults.legacy?.name || 
                  userLegacy.name || 
                  legacy.user?.name || 
                  data.user?.name || 
                  '未知用户',
            username: userResults.core?.screen_name || 
                     userResults.legacy?.screen_name || 
                     userLegacy.screen_name || 
                     legacy.user?.screen_name || 
                     data.user?.screen_name ||
                     legacy.screen_name ||
                     data.screen_name ||
                     core.user?.screen_name ||
                     '',
            profile_url: (() => {
              const screenName = userResults.core?.screen_name ||
                               userResults.legacy?.screen_name || 
                               userLegacy.screen_name || 
                               legacy.user?.screen_name || 
                               data.user?.screen_name ||
                               legacy.screen_name ||
                               data.screen_name ||
                               core.user?.screen_name;
              return screenName ? `https://twitter.com/${screenName}` : '';
            })(),
            country: userResults.legacy?.location || 
                     userLegacy.location || 
                     legacy.user?.location || 
                     data.user?.location ||
                     legacy.location ||
                     data.location ||
                     userResults.legacy?.country ||
                     userLegacy.country ||
                     '',
            avatar_url: userResults.legacy?.profile_image_url_https || userLegacy.profile_image_url_https || userResults.avatar?.image_url || legacy.user?.profile_image_url_https || data.user?.profile_image_url_https,
            follower_count: parseInt(String(userResults.legacy?.followers_count || userLegacy.followers_count || legacy.user?.followers_count || data.user?.followers_count || '0'))
          },
          stats: {
            view_count: parseInt(String(views.count || '0')),
            like_count: parseInt(String(legacy.favorite_count || '0')),
            bookmark_count: parseInt(String(legacy.bookmark_count || '0')),
            comment_count: parseInt(String(legacy.reply_count || '0')),
            share_count: parseInt(String(legacy.retweet_count || '0')),
            engagement_rate: 0 // 稍后计算
          },
          platform,
          url
        }
      } else {
        // YouTube 和其他平台的处理
        console.log('=== YouTube API 调试 ===')
        console.log('Platform:', platform)
        console.log('API URL被调用:', url)
        console.log('Data keys:', Object.keys(data))
        console.log('完整API响应:', JSON.stringify(data, null, 2))
        console.log('检查订阅者相关字段:', {
          'subscriberCountText': data.subscriberCountText,
          'subscriberCount': data.subscriberCount,
          'channel.subscriberCountText': data.channel?.subscriberCountText,
          'channel.subscriberCount': data.channel?.subscriberCount,
          'channel.subscribers': data.channel?.subscribers,
          'country': data.country,
          'channel.country': data.channel?.country,
          'uploader.country': data.uploader?.country,
          'author.country': data.author?.country
        })
        console.log('=== End YouTube Debug ===')
        
        videoData = {
          id: videoId,
          title: data.title || '未知标题',
          description: data.description,
          thumbnail_url: data.thumbnail || data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          published_at: data.publishedTime || data.publishDate || data.published_at || data.upload_date || data.date_posted || new Date().toISOString(),
          duration: data.durationMs ? Math.round(data.durationMs / 1000) : (data.lengthInSeconds || data.duration || data.video_length),
          creator: {
            name: data.channel?.title || data.youtuber || data.creator?.name || data.author?.name || data.channel?.name || '未知创作者',
            username: data.channel?.handle || data.channel?.username || data.creator?.username || data.author?.username || '',
            profile_url: data.channel?.handle ? `https://www.youtube.com/@${data.channel.handle}` : (data.channel?.url || data.creator?.profile_url || ''),
            country: data.channel?.country || 
                     data.channel?.location ||
                     data.creator?.country || 
                     data.creator?.location ||
                     data.author?.country ||
                     data.author?.location ||
                     data.uploader?.country ||
                     data.uploader?.location ||
                     data.country ||
                     data.location ||
                     '',
            avatar_url: data.channel?.avatar || data.avatar_img_channel || data.creator?.avatar || data.author?.avatar,
            follower_count: parseInt(String(
              data.subscriberCountText ||
              data.channel?.subscriberCountText ||
              data.channel?.subscribers || 
              data.channel?.subscriber_count || 
              data.channel?.subscriberCount || 
              data.subscribers || 
              data.subscriber_count || 
              data.subscriberCount ||
              data.creator?.followers || 
              data.creator?.subscriber_count ||
              data.author?.followers || 
              data.author?.subscriber_count ||
              data.uploader?.subscriber_count ||
              data.uploader?.subscribers ||
              '0'
            ).replace(/[^\d]/g, '') || '0')
          },
          stats: {
            view_count: data.viewCountInt || parseInt(String(data.views || data.view_count || data.viewCountText || '0').replace(/[^\d]/g, '')),
            like_count: data.likeCountInt || parseInt(String(data.likes || data.like_count || data.likeCountText || '0').replace(/[^\d]/g, '')),
            comment_count: data.commentCountInt || parseInt(String(data.num_comments || data.comment_count || data.comments || data.commentCountText || '0').replace(/[^\d]/g, '')),
            share_count: parseInt(String(data.shares || data.share_count || '0').replace(/[^\d]/g, '')),
            engagement_rate: 0 // 稍后计算
          },
          platform,
          url
        }
      }

      // 计算参与率
      videoData.stats.engagement_rate = this.calculateEngagementRate(
        videoData.stats.like_count,
        videoData.stats.comment_count,
        videoData.stats.share_count,
        videoData.stats.view_count
      )

      return {
        success: true,
        data: videoData
      }

    } catch (error) {
      console.error('获取视频数据失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 计算参与率
   */
  private calculateEngagementRate(likes: number, comments: number, shares: number, views: number): number {
    if (views === 0) return 0
    const totalEngagement = likes + comments + shares
    const rate = (totalEngagement / views) * 100
    // 限制参与率在0-9.9999之间，避免数据库溢出
    return Math.min(rate, 9.9999)
  }

  /**
   * 批量获取多个视频数据
   */
  async getBatchVideoData(urls: string[]): Promise<{ success: VideoData[], failed: { url: string, error: string }[] }> {
    const results = await Promise.allSettled(
      urls.map(url => this.getVideoData(url))
    )

    const success: VideoData[] = []
    const failed: { url: string, error: string }[] = []

    results.forEach((result, index) => {
      const url = urls[index]
      
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        success.push(result.value.data)
      } else {
        const error = result.status === 'rejected' 
          ? result.reason?.message || '请求失败'
          : result.value.error || '未知错误'
        
        failed.push({ url, error })
      }
    })

    return { success, failed }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<{ success: boolean, message: string }> {
    try {
      // 使用一个已知的YouTube视频进行测试
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      const result = await this.getVideoData(testUrl)
      
      if (result.success) {
        return {
          success: true,
          message: 'API连接成功'
        }
      } else {
        return {
          success: false,
          message: result.error || 'API连接失败'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API连接测试失败'
      }
    }
  }
}

// 创建服务实例
const scrapeCreatorsService = new ScrapeCreatorsService({
  apiKey: process.env.SCRAPE_CREATORS_API_KEY || '',
  baseUrl: process.env.SCRAPE_CREATORS_BASE_URL || 'https://api.scrapecreators.com'
})

export default scrapeCreatorsService
export type { VideoData, ScrapeCreatorsResponse, CreatorInfo, VideoStats }