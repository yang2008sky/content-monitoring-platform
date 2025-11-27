import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  latest_stats?: {
    view_count: number
    like_count: number
    bookmark_count?: number
    favorite_count?: number
    comment_count: number
    share_count: number
    retweet_count?: number
    engagement_rate: number
    collected_at?: string
  }
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