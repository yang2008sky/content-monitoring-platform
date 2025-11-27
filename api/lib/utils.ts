// URL平台自动检测
export function detectPlatformFromUrl(url: string): 'youtube' | 'tiktok' | 'instagram' | 'twitter' | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube'
    }
    
    if (hostname.includes('tiktok.com')) {
      return 'tiktok'
    }
    
    if (hostname.includes('instagram.com')) {
      return 'instagram'
    }
    
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter'
    }
    
    return null
  } catch (error) {
    return null
  }
}

// 从URL提取平台ID
export function extractPlatformId(url: string, platform: string): string {
  try {
    const urlObj = new URL(url)
    
    switch (platform) {
      case 'youtube':
        // YouTube视频ID提取
        if (urlObj.hostname.includes('youtu.be')) {
          return urlObj.pathname.slice(1)
        }
        const videoId = urlObj.searchParams.get('v')
        return videoId || url
        
      case 'tiktok':
        // TikTok视频ID提取
        const tiktokMatch = urlObj.pathname.match(/\/video\/(\d+)/)
        return tiktokMatch ? tiktokMatch[1] : url
        
      case 'instagram':
        // Instagram帖子ID提取
        const instagramMatch = urlObj.pathname.match(/\/p\/([^\/]+)/)
        return instagramMatch ? instagramMatch[1] : url
        
      case 'twitter':
        // Twitter推文ID提取
        const twitterMatch = urlObj.pathname.match(/\/status\/(\d+)/)
        return twitterMatch ? twitterMatch[1] : url
        
      default:
        return url
    }
  } catch (error) {
    return url
  }
}

// 验证URL格式
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 计算参与率
export function calculateEngagementRate(
  viewCount: number,
  likeCount: number,
  commentCount: number,
  shareCount: number
): number {
  if (viewCount === 0) return 0
  
  const totalEngagement = likeCount + commentCount + shareCount
  return Number(((totalEngagement / viewCount) * 100).toFixed(4))
}

// 响应格式化
export function formatResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message
  }
}

export function formatError(message: string, code?: string) {
  return {
    success: false,
    error: message,
    code
  }
}