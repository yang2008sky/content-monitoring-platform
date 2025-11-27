-- 临时禁用外键约束
ALTER TABLE projects DISABLE TRIGGER ALL;

-- 插入测试项目
INSERT INTO projects (id, user_id, name, platforms, status, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'ed4dea68-f80b-450d-8ab4-6b0ddaec7018', '测试项目', '["youtube", "tiktok"]', 'active', NOW(), NOW());

-- 重新启用外键约束
ALTER TABLE projects ENABLE TRIGGER ALL;

-- 插入测试内容
INSERT INTO contents (id, project_id, post_url, platform, platform_id, title, creator_name, monitor_days, region, remark, status, published_at, created_at, updated_at) VALUES 
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'https://www.youtube.com/watch?v=test1', 'youtube', 'test1', '美妆教程：夏日清透妆容分享', '美妆达人小红', 60, 'CN', '夏季推广', 'monitoring', '2024-01-20T10:00:00Z', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'https://www.tiktok.com/@user/video/test2', 'tiktok', 'test2', '口红试色｜10支热门色号对比', 'TikTok美妆师', 30, 'CN', '口红推广', 'completed', '2024-01-18T15:30:00Z', NOW(), NOW());

-- 插入测试统计数据
INSERT INTO content_data (content_id, view_count, like_count, comment_count, share_count, engagement_rate, collected_at) VALUES 
('660e8400-e29b-41d4-a716-446655440001', 125000, 8500, 320, 150, 7.2, NOW()),
('660e8400-e29b-41d4-a716-446655440002', 89000, 12000, 450, 280, 14.3, NOW());