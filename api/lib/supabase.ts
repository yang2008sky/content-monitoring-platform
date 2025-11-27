import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// 服务端使用 service role key，拥有完整权限
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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
  platform: 'youtube' | 'tiktok' | 'instagram'
  platform_id: string
  title?: string
  creator_name?: string
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
  bookmark_count?: number
  favorite_count?: number
  comment_count: number
  share_count: number
  retweet_count?: number
  engagement_rate: number
  collected_at: string
}