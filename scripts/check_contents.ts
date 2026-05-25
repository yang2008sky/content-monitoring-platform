
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkProjectContents() {
  const projectId = 'f546de36-e016-447a-8946-825947dcbe44'
  
  console.log(`正在查询项目: ${projectId}`)
  
  const { data: contents, error, count } = await supabase
    .from('contents')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('查询失败:', error)
    return
  }

  console.log(`\n=== 查询结果 ===`)
  console.log(`数据库中实际记录数: ${count}`)
  console.log(`返回的数据条数: ${contents?.length}`)
  
  console.log(`\n=== 详细列表 (前 20 条) ===`)
  contents?.forEach((c, index) => {
    console.log(`${index + 1}. [${c.platform}] ${c.title?.substring(0, 30)}...`)
    console.log(`   URL: ${c.post_url}`)
    console.log(`   ID: ${c.id}`)
    console.log(`   Created: ${c.created_at}`)
    console.log('---')
  })
}

checkProjectContents()
