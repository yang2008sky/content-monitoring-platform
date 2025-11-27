import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// 修复 Twitter 平台约束
router.post('/fix-twitter-constraint', async (req, res) => {
  try {
    console.log('开始修复 Twitter 平台约束...')
    
    // 删除现有约束
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_platform_check'
    })
    
    if (dropError) {
      console.error('删除约束失败:', dropError)
    } else {
      console.log('✅ 成功删除旧约束')
    }
    
    // 添加新约束
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE contents ADD CONSTRAINT contents_platform_check 
            CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter', 'x'))`
    })
    
    if (addError) {
      console.error('添加约束失败:', addError)
      return res.status(500).json({
        success: false,
        error: '添加约束失败: ' + addError.message
      })
    }
    
    console.log('✅ 成功添加新约束')
    
    res.json({
      success: true,
      message: 'Twitter 平台约束修复成功'
    })
    
  } catch (error) {
    console.error('修复约束时发生错误:', error)
    res.status(500).json({
      success: false,
      error: '修复失败: ' + (error instanceof Error ? error.message : '未知错误')
    })
  }
})

export default router