import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// 兼容 Vercel/本地的环境变量命名
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// 当缺少环境变量时，不抛异常，改为导出一个“本地/降级客户端”，避免函数启动失败
function createMockClient() {
  const err = { message: 'Supabase env missing, using local mode' }
  const op = async () => ({ data: null, error: err })
  const builder = () => ({
    select: op,
    insert: op,
    update: op,
    delete: op,
    single: op,
    eq: () => builder(),
    order: () => builder()
  })
  return {
    from: (_table: string) => builder()
  } as any
}

export const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : createMockClient()

// 数据库类型定义
export interface UserProfile {
  id: string
  name?: string
  plan: 'free' | 'premium'
  usage_count: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  platforms: string[]
  total_posts: number
  total_views: number
  status: 'active' | 'paused' | 'completed'
  created_at: string
  updated_at: string
}

export interface Content {
  id: string
  project_id: string
  post_url: string
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'x'
  platform_id: string
  title?: string
  creator_name?: string
  creator_username?: string
  creator_profile_url?: string
  creator_country?: string
  creator_follower_count?: number
  creator_avatar?: string
  thumbnail_url?: string
  monitor_days: 30 | 60 | 90
  region?: string
  remark?: string
  status: 'pending' | 'monitoring' | 'completed' | 'error'
  published_at?: string
  created_at: string
  updated_at: string
}

export interface ContentData {
  id: string
  content_id: string
  view_count: number
  like_count: number
  like_count_available?: boolean
  bookmark_count?: number
  favorite_count?: number
  comment_count: number
  share_count: number
  retweet_count?: number
  engagement_rate: number
  collected_at: string
}
