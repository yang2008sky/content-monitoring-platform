-- 修复 Twitter 平台约束
-- 这个迁移确保 Twitter 和 X 平台被正确支持

-- 首先删除现有的约束
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_platform_check;

-- 添加新的约束，包含所有支持的平台
ALTER TABLE contents ADD CONSTRAINT contents_platform_check 
    CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter', 'x'));

-- 验证约束是否正确创建
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'contents_platform_check'
    ) THEN
        RAISE NOTICE 'Twitter 平台约束已成功创建';
    ELSE
        RAISE EXCEPTION 'Twitter 平台约束创建失败';
    END IF;
END $$;