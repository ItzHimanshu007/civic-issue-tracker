-- Migration: Gamification System
-- Description: Add points, badges, levels, achievements, and leaderboards

-- Add points column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for points for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);

-- Points history table to track all point transactions
CREATE TABLE IF NOT EXISTS points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    points_awarded INTEGER NOT NULL,
    multiplier DECIMAL(3,2) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    total_points_after INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_action ON points_history(action);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at);

-- Badges table to define available badges
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    points_required INTEGER DEFAULT 0,
    condition_type VARCHAR(100) NOT NULL,
    rarity VARCHAR(20) DEFAULT 'COMMON' CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User badges table to track earned badges
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at);

-- User levels table to track level progressions
CREATE TABLE IF NOT EXISTS user_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(level);

-- Achievements table to track all types of achievements
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('BADGE', 'LEVEL', 'MILESTONE')),
    reference_id VARCHAR(255) NOT NULL, -- badge_id, level, or milestone identifier
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_created_at ON achievements(created_at);

-- User streaks table to track consecutive activity
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_start_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Activity log for streak tracking
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_date ON user_activity_log(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_date ON user_activity_log(activity_date);

-- Leaderboard cache table for performance (optional, updated via cron)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeframe VARCHAR(20) NOT NULL, -- 'all', 'month', 'week'
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    reports_submitted INTEGER DEFAULT 0,
    upvotes_received INTEGER DEFAULT 0,
    comments_given INTEGER DEFAULT 0,
    verifications_given INTEGER DEFAULT 0,
    badge_count INTEGER DEFAULT 0,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(timeframe, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_timeframe_rank ON leaderboard_cache(timeframe, rank);

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_badges_updated_at ON badges;
CREATE TRIGGER update_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_streaks_updated_at ON user_streaks;
CREATE TRIGGER update_user_streaks_updated_at
    BEFORE UPDATE ON user_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update user activity and streaks
CREATE OR REPLACE FUNCTION update_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50)
)
RETURNS VOID AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    last_activity DATE;
    current_streak_count INTEGER;
BEGIN
    -- Insert activity log (ignore if already exists for today)
    INSERT INTO user_activity_log (user_id, activity_type, activity_date)
    VALUES (p_user_id, p_activity_type, today_date)
    ON CONFLICT (user_id, activity_date) DO NOTHING;

    -- Get current streak info
    SELECT last_activity_date, current_streak 
    INTO last_activity, current_streak_count
    FROM user_streaks 
    WHERE user_id = p_user_id;

    IF last_activity IS NULL THEN
        -- First time activity
        INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, streak_start_date)
        VALUES (p_user_id, 1, 1, today_date, today_date);
    ELSIF last_activity = today_date THEN
        -- Already active today, no change needed
        RETURN;
    ELSIF last_activity = today_date - INTERVAL '1 day' THEN
        -- Consecutive day, extend streak
        UPDATE user_streaks
        SET 
            current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = today_date
        WHERE user_id = p_user_id;
    ELSE
        -- Streak broken, reset
        UPDATE user_streaks
        SET 
            current_streak = 1,
            last_activity_date = today_date,
            streak_start_date = today_date
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get user level based on points
CREATE OR REPLACE FUNCTION get_user_level(p_points INTEGER)
RETURNS TABLE(level INTEGER, title VARCHAR, points_required INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p_points >= 2500 THEN 8
            WHEN p_points >= 1500 THEN 7
            WHEN p_points >= 1000 THEN 6
            WHEN p_points >= 600 THEN 5
            WHEN p_points >= 300 THEN 4
            WHEN p_points >= 150 THEN 3
            WHEN p_points >= 50 THEN 2
            ELSE 1
        END as level,
        CASE 
            WHEN p_points >= 2500 THEN 'Civic Legend'
            WHEN p_points >= 1500 THEN 'City Hero'
            WHEN p_points >= 1000 THEN 'Guardian Angel'
            WHEN p_points >= 600 THEN 'Civic Champion'
            WHEN p_points >= 300 THEN 'Community Helper'
            WHEN p_points >= 150 THEN 'Active Reporter'
            WHEN p_points >= 50 THEN 'Aware Citizen'
            ELSE 'Civic Newbie'
        END as title,
        CASE 
            WHEN p_points >= 2500 THEN 2500
            WHEN p_points >= 1500 THEN 1500
            WHEN p_points >= 1000 THEN 1000
            WHEN p_points >= 600 THEN 600
            WHEN p_points >= 300 THEN 300
            WHEN p_points >= 150 THEN 150
            WHEN p_points >= 50 THEN 50
            ELSE 0
        END as points_required;
END;
$$ LANGUAGE plpgsql;

-- Insert default badges
INSERT INTO badges (name, description, icon_url, points_required, condition_type, rarity) VALUES
('First Reporter', 'Submit your first civic issue report', '🎯', 0, 'FIRST_REPORT', 'COMMON'),
('Active Reporter', 'Submit 5 civic issue reports', '📝', 50, 'REPORTER_5', 'COMMON'),
('Super Reporter', 'Submit 25 civic issue reports', '⭐', 250, 'REPORTER_25', 'RARE'),
('Popular Reporter', 'Receive 10 upvotes on your reports', '👍', 100, 'POPULAR_10', 'COMMON'),
('Viral Reporter', 'Receive 50 upvotes on your reports', '🔥', 500, 'POPULAR_50', 'EPIC'),
('Supportive Citizen', 'Give 50 upvotes to other reports', '🤝', 100, 'SUPPORTIVE_50', 'COMMON'),
('Great Commentator', 'Post 25 helpful comments', '💬', 150, 'COMMENTATOR_25', 'RARE'),
('Truth Seeker', 'Verify 10 reports', '✅', 200, 'VERIFIER_10', 'RARE'),
('Point Collector', 'Earn 500 points', '💎', 500, 'POINTS_500', 'EPIC'),
('Point Master', 'Earn 1000 points', '👑', 1000, 'POINTS_1000', 'LEGENDARY'),
('Veteran', 'Active for 30 days', '🏆', 300, 'VETERAN_30_DAYS', 'RARE')
ON CONFLICT (name) DO NOTHING;

-- Add foreign key constraints with proper names
ALTER TABLE points_history 
    DROP CONSTRAINT IF EXISTS points_history_user_id_fkey;
ALTER TABLE points_history 
    ADD CONSTRAINT points_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_badges 
    DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey,
    DROP CONSTRAINT IF EXISTS user_badges_badge_id_fkey;
ALTER TABLE user_badges 
    ADD CONSTRAINT user_badges_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT user_badges_badge_id_fkey 
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;

ALTER TABLE user_levels 
    DROP CONSTRAINT IF EXISTS user_levels_user_id_fkey;
ALTER TABLE user_levels 
    ADD CONSTRAINT user_levels_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE achievements 
    DROP CONSTRAINT IF EXISTS achievements_user_id_fkey;
ALTER TABLE achievements 
    ADD CONSTRAINT achievements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_streaks 
    DROP CONSTRAINT IF EXISTS user_streaks_user_id_fkey;
ALTER TABLE user_streaks 
    ADD CONSTRAINT user_streaks_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_activity_log 
    DROP CONSTRAINT IF EXISTS user_activity_log_user_id_fkey;
ALTER TABLE user_activity_log 
    ADD CONSTRAINT user_activity_log_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE leaderboard_cache 
    DROP CONSTRAINT IF EXISTS leaderboard_cache_user_id_fkey;
ALTER TABLE leaderboard_cache 
    ADD CONSTRAINT leaderboard_cache_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
