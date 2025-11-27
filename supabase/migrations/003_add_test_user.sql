-- 为测试环境添加测试用户
-- 注意：这只是为了开发测试，生产环境不应该使用

-- 插入测试用户到auth.users表（如果不存在）
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    'ed4dea68-f80b-450d-8ab4-6b0ddaec7018',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@example.com',
    '$2a$10$test.hash.for.development.only',
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 插入对应的用户配置文件
INSERT INTO public.user_profiles (
    id,
    name,
    plan,
    usage_count,
    created_at,
    updated_at
) VALUES (
    'ed4dea68-f80b-450d-8ab4-6b0ddaec7018',
    '测试用户',
    'free',
    0,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;