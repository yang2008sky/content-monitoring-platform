-- 为 contents 表新增达人相关字段
-- 达人账号名、账号链接、国家、粉丝数

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS creator_username VARCHAR(200),
  ADD COLUMN IF NOT EXISTS creator_profile_url TEXT,
  ADD COLUMN IF NOT EXISTS creator_country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS creator_follower_count BIGINT DEFAULT 0;

-- 可选索引以便筛选/导出
CREATE INDEX IF NOT EXISTS idx_contents_creator_username ON contents(creator_username);
CREATE INDEX IF NOT EXISTS idx_contents_creator_country ON contents(creator_country);