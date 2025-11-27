-- 修复 Twitter 平台约束
-- 删除现有约束
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_platform_check;

-- 添加包含 Twitter 的新约束
ALTER TABLE contents ADD CONSTRAINT contents_platform_check 
    CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter', 'x'));

-- 验证约束
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'contents_platform_check';