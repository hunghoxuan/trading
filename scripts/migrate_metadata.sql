
-- Target: mt5_bridge

-- 1. Create user_templates table
CREATE TABLE IF NOT EXISTS user_templates (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data JSONB NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rename accounts table
-- Check if user_accounts already exists to avoid errors
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'accounts') THEN
        ALTER TABLE accounts RENAME TO user_accounts;
    END IF;
END $$;

-- 3. Migrate ai_templates from user_settings
-- Only if they exist
INSERT INTO user_templates (user_id, name, data, created_at, updated_at)
SELECT user_id, name, data, created_at, updated_at 
FROM user_settings 
WHERE type = 'ai_template';

-- 4. Delete migrated templates from user_settings
DELETE FROM user_settings WHERE type = 'ai_template';

-- 5. Ensure metadata structure in users
UPDATE users SET metadata = jsonb_build_object('settings', jsonb_build_object('language', 'English', 'display_timezone', 'UTC', 'analysis_cron', true, 'data_cron', true), 'watchlist', jsonb_build_array())
WHERE metadata IS NULL OR metadata = '{}'::jsonb;

-- 6. Migrate language and timezone from user_settings to metadata
-- Check for common setting rows
WITH settings_extracted AS (
    SELECT 
        user_id,
        MAX(CASE WHEN name = 'language' THEN data->>'value' END) as lang,
        MAX(CASE WHEN name = 'display_timezone' THEN data->>'value' END) as tz
    FROM user_settings
    WHERE type IN ('ui_preference', 'general')
    GROUP BY user_id
)
UPDATE users u
SET metadata = jsonb_set(
    jsonb_set(u.metadata, '{settings,language}', to_jsonb(COALESCE(se.lang, u.metadata->'settings'->>'language')), true),
    '{settings,display_timezone}', to_jsonb(COALESCE(se.tz, u.metadata->'settings'->>'display_timezone')), true
)
FROM settings_extracted se
WHERE u.user_id = se.user_id;

-- 7. Clean up
DELETE FROM user_settings WHERE type IN ('ui_preference', 'general') AND name IN ('language', 'display_timezone');
