-- 添加Twitter/X平台支持
-- 更新内容表的平台约束，添加twitter和x
ALTER TABLE contents DROP CONSTRAINT contents_platform_check;
ALTER TABLE contents ADD CONSTRAINT contents_platform_check 
    CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter', 'x'));