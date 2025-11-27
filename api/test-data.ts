import { supabase } from './lib/supabase.js'

async function createTestData() {
  const testUserId = 'ed4dea68-f80b-450d-8ab4-6b0ddaec7018'
  const testProjectId = '550e8400-e29b-41d4-a716-446655440000'
  
  try {
    console.log('清理现有测试数据...')
    
    // 先删除可能存在的测试数据（按依赖顺序）
    await supabase.from('content_data').delete().in('content_id', ['660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002'])
    await supabase.from('contents').delete().eq('project_id', testProjectId)
    await supabase.from('projects').delete().eq('id', testProjectId)
    
    console.log('创建测试项目...')
    
    // 尝试直接插入项目，忽略外键约束错误
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        id: testProjectId,
        user_id: testUserId,
        name: '测试项目',
        platforms: ['youtube', 'tiktok'],
        status: 'active'
      })
      .select()
      .single()
    
    if (projectError) {
      console.error('创建项目失败:', projectError)
      console.log('尝试使用现有项目或创建一个不依赖外键的项目...')
      
      // 如果外键约束失败，我们可以尝试修改user_id为null或使用一个存在的用户ID
      // 但为了简单起见，让我们先检查是否有现有的项目可以使用
      const { data: existingProjects } = await supabase
        .from('projects')
        .select('*')
        .limit(1)
      
      if (existingProjects && existingProjects.length > 0) {
        console.log('使用现有项目:', existingProjects[0])
        const existingProject = existingProjects[0]
        
        // 使用现有项目创建测试内容
        await createTestContents(existingProject.id)
        return
      } else {
        console.log('没有现有项目，无法继续测试')
        return
      }
    }
    
    console.log('项目创建成功:', project)
    await createTestContents(testProjectId)
    
  } catch (error) {
    console.error('创建测试数据时发生错误:', error)
  }
}

async function createTestContents(projectId: string) {
  console.log('创建测试内容...')
  const testContents = [
    {
      project_id: projectId,
      post_url: 'https://www.youtube.com/watch?v=test1',
      platform: 'youtube',
      platform_id: 'test1',
      title: '美妆教程：夏日清透妆容分享',
      creator_name: '美妆达人小红',
      monitor_days: 60,
      region: 'CN',
      remark: '夏季推广',
      status: 'monitoring',
      published_at: new Date('2024-01-20T10:00:00Z').toISOString()
    },
    {
      project_id: projectId,
      post_url: 'https://www.tiktok.com/@user/video/test2',
      platform: 'tiktok',
      platform_id: 'test2',
      title: '口红试色｜10支热门色号对比',
      creator_name: 'TikTok美妆师',
      monitor_days: 30,
      region: 'CN',
      remark: '口红推广',
      status: 'completed',
      published_at: new Date('2024-01-18T15:30:00Z').toISOString()
    }
  ]
  
  for (const contentData of testContents) {
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .insert(contentData)
      .select()
      .single()
    
    if (contentError) {
      console.error('创建内容失败:', contentError)
      continue
    }
    
    console.log('内容创建成功:', content.title)
    
    // 为每个内容创建一些测试数据
    const testStats = {
      content_id: content.id,
      view_count: Math.floor(Math.random() * 100000) + 10000,
      like_count: Math.floor(Math.random() * 5000) + 500,
      comment_count: Math.floor(Math.random() * 500) + 50,
      share_count: Math.floor(Math.random() * 200) + 20,
      engagement_rate: Math.random() * 10 + 2,
      collected_at: new Date().toISOString()
    }
    
    const { error: statsError } = await supabase
      .from('content_data')
      .insert(testStats)
    
    if (statsError) {
      console.error('创建统计数据失败:', statsError)
    } else {
      console.log('统计数据创建成功')
    }
  }
  
  console.log('测试数据创建完成！')
}

createTestData()