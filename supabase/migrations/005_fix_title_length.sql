-- 修改 title 字段长度，从 500 增加到 1000
ALTER TABLE contents ALTER COLUMN title TYPE VARCHAR(1000);

-- 如果有其他可能过长的字段，也一并增加长度
ALTER TABLE contents ALTER COLUMN post_url TYPE TEXT; -- 确保 URL 使用 TEXT 类型，不限制长度
