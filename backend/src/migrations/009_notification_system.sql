-- Migration: Enhanced Notification System
-- Description: Add email notifications, push notifications, and notification management

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL', 'PUSH', 'SMS', 'IN_APP')),
    subject VARCHAR(255), -- For email notifications
    content TEXT NOT NULL, -- Template content with placeholders
    html_content TEXT, -- HTML version for emails
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Email preferences
    email_enabled BOOLEAN DEFAULT true,
    email_report_updates BOOLEAN DEFAULT true,
    email_engagement BOOLEAN DEFAULT true,
    email_gamification BOOLEAN DEFAULT true,
    email_system_alerts BOOLEAN DEFAULT true,
    email_weekly_digest BOOLEAN DEFAULT true,
    
    -- Push notification preferences
    push_enabled BOOLEAN DEFAULT true,
    push_report_updates BOOLEAN DEFAULT true,
    push_engagement BOOLEAN DEFAULT true,
    push_gamification BOOLEAN DEFAULT true,
    push_system_alerts BOOLEAN DEFAULT true,
    
    -- SMS preferences
    sms_enabled BOOLEAN DEFAULT false,
    sms_critical_updates BOOLEAN DEFAULT false,
    
    -- In-app preferences
    in_app_enabled BOOLEAN DEFAULT true,
    in_app_all BOOLEAN DEFAULT true,
    
    -- General preferences
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Device tokens for push notifications
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(500) UNIQUE NOT NULL, -- FCM token
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('IOS', 'ANDROID', 'WEB')),
    device_name VARCHAR(255),
    app_version VARCHAR(50),
    os_version VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(is_active);

-- First rename the existing simple notifications table to avoid conflicts
ALTER TABLE notifications RENAME TO notifications_simple;

-- Notifications queue and history
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(100) REFERENCES notification_templates(name),
    type VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL', 'PUSH', 'SMS', 'IN_APP')),
    
    -- Content (can override template)
    subject VARCHAR(255),
    content TEXT NOT NULL,
    html_content TEXT,
    
    -- Delivery details
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    device_tokens TEXT[], -- Array of device tokens for push
    
    -- Status and timing
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED')),
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Tracking
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Notification events (for tracking what triggered notifications)
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- e.g., 'report_created', 'status_changed', 'upvote_received'
    event_source VARCHAR(50) NOT NULL, -- e.g., 'reports', 'engagement', 'gamification'
    reference_id UUID, -- ID of the related entity (report, comment, etc.)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event data
    event_data JSONB DEFAULT '{}',
    
    -- Notification generation
    notifications_generated INTEGER DEFAULT 0,
    notifications_sent INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_events_type ON notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_events_user_id ON notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at);

-- Email delivery tracking
CREATE TABLE IF NOT EXISTS email_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    email_provider VARCHAR(50), -- 'sendgrid', 'ses', 'smtp'
    provider_message_id VARCHAR(255),
    
    -- Delivery events
    accepted_at TIMESTAMP,
    delivered_at TIMESTAMP,
    bounced_at TIMESTAMP,
    complained_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    
    -- Provider response
    provider_response JSONB,
    bounce_reason TEXT,
    complaint_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_notification_id ON email_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_provider_message_id ON email_deliveries(provider_message_id);

-- Push notification deliveries
CREATE TABLE IF NOT EXISTS push_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    device_token VARCHAR(500) NOT NULL,
    
    -- FCM response
    fcm_message_id VARCHAR(255),
    fcm_response JSONB,
    
    -- Delivery status
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_deliveries_notification_id ON push_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_device_token ON push_deliveries(device_token);

-- Notification subscriptions (for topics/channels)
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(100) NOT NULL, -- e.g., 'reports_in_area', 'department_updates'
    subscription_data JSONB DEFAULT '{}', -- Additional subscription parameters
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_topic ON notification_subscriptions(user_id, topic);

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS update_email_deliveries_updated_at ON email_deliveries;
CREATE TRIGGER update_email_deliveries_updated_at
    BEFORE UPDATE ON email_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();

-- Create default user notification preferences for existing users
INSERT INTO user_notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM user_notification_preferences);

-- Insert default notification templates
INSERT INTO notification_templates (name, type, subject, content, html_content) VALUES
-- Report notifications
('report_submitted', 'EMAIL', 'Your Report Has Been Submitted', 
 'Thank you for submitting your report "{{reportTitle}}". We''ve received your submission and will review it shortly. Report ID: {{reportId}}',
 '<h2>Report Submitted Successfully</h2><p>Thank you for submitting your report <strong>{{reportTitle}}</strong>.</p><p>Report ID: <code>{{reportId}}</code></p><p>We''ve received your submission and will review it shortly.</p>'),

('report_status_update', 'EMAIL', 'Update on Your Report: {{reportTitle}}',
 'Your report "{{reportTitle}}" status has been updated to {{newStatus}}. {{#comment}}Comment: {{comment}}{{/comment}}',
 '<h2>Report Status Update</h2><p>Your report <strong>{{reportTitle}}</strong> status has been updated to <strong>{{newStatus}}</strong>.</p>{{#comment}}<p><strong>Comment:</strong> {{comment}}</p>{{/comment}}'),

('report_resolved', 'EMAIL', 'Your Report Has Been Resolved: {{reportTitle}}',
 'Great news! Your report "{{reportTitle}}" has been marked as resolved. Thank you for helping improve our community!',
 '<h2>Report Resolved! 🎉</h2><p>Great news! Your report <strong>{{reportTitle}}</strong> has been marked as resolved.</p><p>Thank you for helping improve our community!</p>'),

-- Engagement notifications
('report_upvoted', 'PUSH', 'Your Report Received an Upvote',
 'Someone upvoted your report "{{reportTitle}}"! +{{points}} points earned.',
 NULL),

('comment_received', 'PUSH', 'New Comment on Your Report',
 '{{commenterName}} commented on your report "{{reportTitle}}"',
 NULL),

('report_verified', 'EMAIL', 'Your Report Was Verified',
 'Your report "{{reportTitle}}" has been verified by the community! You earned {{points}} points.',
 '<h2>Report Verified ✅</h2><p>Your report <strong>{{reportTitle}}</strong> has been verified by the community!</p><p>You earned <strong>{{points}} points</strong>.</p>'),

-- Gamification notifications
('achievement_unlocked', 'PUSH', 'Achievement Unlocked!',
 'Congratulations! You unlocked the "{{badgeName}}" badge! {{#pointsAwarded}}+{{pointsAwarded}} bonus points!{{/pointsAwarded}}',
 NULL),

('level_up', 'PUSH', 'Level Up!',
 'Congratulations! You reached level {{level}}: {{levelTitle}}!',
 NULL),

-- System notifications
('weekly_digest', 'EMAIL', 'Your Weekly Civic Activity Summary',
 'Here''s your weekly summary: {{reportsSubmitted}} reports, {{pointsEarned}} points earned, {{newBadges}} new badges.',
 '<h2>Your Weekly Summary</h2><p>Reports submitted: <strong>{{reportsSubmitted}}</strong></p><p>Points earned: <strong>{{pointsEarned}}</strong></p><p>New badges: <strong>{{newBadges}}</strong></p>'),

('system_maintenance', 'EMAIL', 'Scheduled System Maintenance',
 'The Civic Issue Tracker will be undergoing maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}}.',
 '<h2>Scheduled Maintenance</h2><p>The Civic Issue Tracker will be undergoing maintenance:</p><p><strong>Date:</strong> {{maintenanceDate}}</p><p><strong>Time:</strong> {{startTime}} to {{endTime}}</p>')

ON CONFLICT (name) DO NOTHING;

-- Insert push notification templates
INSERT INTO notification_templates (name, type, subject, content) VALUES
('report_submitted_push', 'PUSH', 'Report Submitted',
 'Your report has been submitted successfully. Report ID: {{reportId}}'),

('report_status_update_push', 'PUSH', 'Report Update',
 'Your report status changed to {{newStatus}}'),

('engagement_push', 'PUSH', 'New Activity',
 '{{message}}'),

('gamification_push', 'PUSH', 'Achievement',
 '{{message}}')

ON CONFLICT (name) DO NOTHING;

-- Add notification-related columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_notification_read_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_push_enabled ON users(push_notifications_enabled);
