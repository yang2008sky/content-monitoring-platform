-- 内容监控平台数据库初始化脚本
-- 创建用户扩展信息表
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建项目表
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    platforms JSONB DEFAULT '[]',
    total_posts INTEGER DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建内容表
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    post_url TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
    platform_id VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    creator_name VARCHAR(200),
    creator_avatar TEXT,
    thumbnail_url TEXT,
    monitor_days INTEGER DEFAULT 30 CHECK (monitor_days IN (30, 60, 90)),
    region VARCHAR(50),
    remark TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'monitoring', 'completed', 'error')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, platform_id)
);

-- 创建内容数据表
CREATE TABLE content_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    view_count BIGINT DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_user_profiles_plan ON user_profiles(plan);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_contents_project_id ON contents(project_id);
CREATE INDEX idx_contents_platform ON contents(platform);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_published_at ON contents(published_at DESC);
CREATE INDEX idx_content_data_content_id ON content_data(content_id);
CREATE INDEX idx_content_data_collected_at ON content_data(collected_at DESC);

-- 启用行级安全策略 (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_data ENABLE ROW LEVEL SECURITY;

-- 用户扩展信息表的RLS策略
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 项目表的RLS策略
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- 内容表的RLS策略
CREATE POLICY "Users can manage contents in own projects" ON contents FOR ALL 
USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 内容数据表的RLS策略
CREATE POLICY "Users can view data for own contents" ON content_data FOR SELECT 
USING (content_id IN (
    SELECT c.id FROM contents c 
    JOIN projects p ON c.project_id = p.id 
    WHERE p.user_id = auth.uid()
));

CREATE POLICY "Users can insert data for own contents" ON content_data FOR INSERT 
WITH CHECK (content_id IN (
    SELECT c.id FROM contents c 
    JOIN projects p ON c.project_id = p.id 
    WHERE p.user_id = auth.uid()
));

-- 权限设置
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON projects TO anon;
GRANT SELECT ON contents TO anon;
GRANT SELECT ON content_data TO anon;

GRANT ALL PRIVILEGES ON user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON projects TO authenticated;
GRANT ALL PRIVILEGES ON contents TO authenticated;
GRANT ALL PRIVILEGES ON content_data TO authenticated;

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();