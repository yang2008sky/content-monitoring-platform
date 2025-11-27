/**
 * 简单的内存存储
 * 用于临时存储项目内容数据
 */

interface ContentItem {
  id: string
  project_id: string
  post_url: string
  platform: string
  platform_id: string
  title: string
  creator_name: string
  creator_username?: string  // 达人账号名
  creator_profile_url?: string  // 达人账号链接
  creator_country?: string  // 达人国家
  creator_follower_count?: number  // 达人粉丝数量
  creator_avatar: string
  thumbnail_url: string
  monitor_days: number
  region: string
  remark: string
  status: string
  published_at: string
  created_at: string
  updated_at: string
  latest_stats: {
    view_count: number
    like_count: number
    comment_count: number
    share_count: number
    engagement_rate: number
    collected_at: string
  }
}

class MemoryStore {
  private contents: Map<string, ContentItem[]> = new Map()

  // 添加内容到项目
  addContent(projectId: string, content: ContentItem): void {
    if (!this.contents.has(projectId)) {
      this.contents.set(projectId, [])
    }
    
    const projectContents = this.contents.get(projectId)!
    projectContents.push(content)
    
    console.log(`内容已添加到项目 ${projectId}:`, content.title)
    console.log(`项目 ${projectId} 现有内容数量:`, projectContents.length)
  }

  // 获取项目的所有内容
  getProjectContents(projectId: string): ContentItem[] {
    return this.contents.get(projectId) || []
  }

  // 更新内容
  updateContent(projectId: string, contentId: string, updates: Partial<ContentItem>): boolean {
    const projectContents = this.contents.get(projectId)
    if (!projectContents) return false

    const contentIndex = projectContents.findIndex(c => c.id === contentId)
    if (contentIndex === -1) return false

    projectContents[contentIndex] = { ...projectContents[contentIndex], ...updates }
    return true
  }

  // 删除内容
  deleteContent(projectId: string, contentId: string): boolean {
    const projectContents = this.contents.get(projectId)
    if (!projectContents) return false

    const contentIndex = projectContents.findIndex(c => c.id === contentId)
    if (contentIndex === -1) return false

    projectContents.splice(contentIndex, 1)
    return true
  }

  // 获取所有项目的内容统计
  getAllContents(): ContentItem[] {
    const allContents: ContentItem[] = []
    for (const projectContents of this.contents.values()) {
      allContents.push(...projectContents)
    }
    return allContents
  }

  // 清空所有数据
  clear(): void {
    this.contents.clear()
  }

  // 获取所有项目
  getAllProjects(): Record<string, ContentItem[]> {
    const projects: Record<string, ContentItem[]> = {}
    for (const [projectId, contents] of this.contents.entries()) {
      projects[projectId] = contents
    }
    return projects
  }

  // 设置项目内容
  setProjectContents(projectId: string, contents: ContentItem[]): void {
    this.contents.set(projectId, contents)
  }

  // 获取存储状态
  getStats(): { totalProjects: number, totalContents: number } {
    let totalContents = 0
    for (const projectContents of this.contents.values()) {
      totalContents += projectContents.length
    }
    
    return {
      totalProjects: this.contents.size,
      totalContents
    }
  }
}

// 创建单例实例
const memoryStore = new MemoryStore()

export default memoryStore
export type { ContentItem }