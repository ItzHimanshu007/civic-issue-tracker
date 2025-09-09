# 📧 Civic Issue Tracker - Enhanced Notifications System

## Overview

The Enhanced Notifications System provides comprehensive multi-channel communication capabilities including email, push notifications, SMS, and real-time in-app notifications. The system features intelligent delivery, user preferences, template management, delivery tracking, and webhook integration.

## Features

### 📬 Multi-Channel Notifications

#### Email Notifications
- **Multiple Provider Support**: SMTP, SendGrid, AWS SES, Gmail
- **HTML & Text Templates**: Rich formatting with fallback text
- **Delivery Tracking**: Open rates, click rates, bounce handling
- **Webhook Integration**: Real-time delivery status updates
- **Template Processing**: Variable substitution and conditional blocks

#### Push Notifications  
- **Firebase Cloud Messaging**: iOS, Android, and Web support
- **Device Management**: Token registration and cleanup
- **Topic Subscriptions**: Channel-based notifications
- **Rich Notifications**: Images, actions, and custom data
- **Platform-Specific Features**: Badges, sounds, priorities

#### Real-time Notifications
- **Socket.io Integration**: Instant in-app notifications  
- **User Room Management**: Private notification channels
- **Event Broadcasting**: System-wide announcements

#### SMS Support (Framework Ready)
- **Extensible Architecture**: Ready for Twilio/AWS SNS integration
- **Critical Alerts**: High-priority notifications only

### ⚙️ User Preferences & Controls

#### Granular Settings
```typescript
interface NotificationPreferences {
  // Email preferences
  emailEnabled: boolean;
  emailReportUpdates: boolean;
  emailEngagement: boolean;
  emailGamification: boolean;
  emailSystemAlerts: boolean;
  emailWeeklyDigest: boolean;
  
  // Push notification preferences  
  pushEnabled: boolean;
  pushReportUpdates: boolean;
  pushEngagement: boolean;
  pushGamification: boolean;
  pushSystemAlerts: boolean;
  
  // Quiet hours and timezone
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "08:00"
  timezone: string;        // "America/New_York"
}
```

#### Smart Scheduling
- **Quiet Hours Respect**: Non-urgent notifications delayed
- **Timezone Awareness**: User-local scheduling
- **Priority Override**: Urgent notifications bypass quiet hours

### 🎯 Template System

#### Dynamic Templates
```sql
-- Email template example
INSERT INTO notification_templates (name, type, subject, content, html_content) VALUES
('report_status_update', 'EMAIL', 
 'Update on Your Report: {{reportTitle}}',
 'Your report "{{reportTitle}}" status has been updated to {{newStatus}}. {{#comment}}Comment: {{comment}}{{/comment}}',
 '<h2>Report Status Update</h2><p>Your report <strong>{{reportTitle}}</strong> status has been updated to <strong>{{newStatus}}</strong>.</p>{{#comment}}<p><strong>Comment:</strong> {{comment}}</p>{{/comment}}'
);
```

#### Template Features
- **Variable Substitution**: `{{variable}}` syntax
- **Conditional Blocks**: `{{#condition}}content{{/condition}}`
- **Multi-format Support**: Text, HTML, and push message variants
- **Template Inheritance**: Shared layouts and components

### 📊 Delivery & Analytics

#### Comprehensive Tracking
- **Delivery Status**: Sent, delivered, failed, opened, clicked
- **Provider Performance**: Success rates by email provider
- **User Engagement**: Open rates and interaction metrics
- **Error Handling**: Bounce management and retry logic

#### Real-time Webhooks
- **SendGrid Integration**: Event tracking and analytics
- **AWS SES Support**: Delivery and bounce notifications  
- **Custom Webhooks**: Extensible for other providers

## Architecture

### Service Layer

#### EmailService
- **Multi-Provider Fallback**: Automatic failover between providers
- **Template Processing**: Variable replacement and formatting
- **Delivery Logging**: Comprehensive tracking and analytics
- **Bulk Operations**: Batch processing for newsletters

#### PushNotificationService  
- **Firebase Admin SDK**: Server-to-device messaging
- **Device Management**: Token lifecycle and validation
- **Topic Management**: Subscription-based messaging
- **Platform Optimization**: iOS, Android, Web customization

#### NotificationService
- **Orchestration Layer**: Multi-channel coordination
- **Preference Enforcement**: User settings compliance
- **Scheduling Engine**: Delayed and recurring notifications
- **Event Tracking**: Comprehensive audit trail

### Database Schema

#### Core Tables
```sql
-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    type VARCHAR(20), -- EMAIL, PUSH, SMS, IN_APP
    subject VARCHAR(255),
    content TEXT,
    html_content TEXT,
    is_active BOOLEAN DEFAULT true
);

-- User preferences
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone VARCHAR(50) DEFAULT 'UTC'
    -- ... other preference columns
);

-- Notification queue and history
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(20),
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'NORMAL',
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    metadata JSONB
);
```

#### Delivery Tracking
```sql
-- Email delivery details
CREATE TABLE email_deliveries (
    notification_id UUID REFERENCES notifications(id),
    email_provider VARCHAR(50),
    provider_message_id VARCHAR(255),
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_reason TEXT
);

-- Push notification deliveries
CREATE TABLE push_deliveries (
    notification_id UUID REFERENCES notifications(id),
    device_token VARCHAR(500),
    fcm_message_id VARCHAR(255),
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT
);
```

## API Endpoints

### User Preferences Management
```http
# Get user notification preferences
GET /api/notifications/preferences

# Update user preferences  
PUT /api/notifications/preferences
Content-Type: application/json
{
  "emailEnabled": true,
  "pushReportUpdates": false,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "timezone": "America/New_York"
}
```

### Device Management
```http
# Register device for push notifications
POST /api/notifications/devices/register
{
  "deviceToken": "fcm_token_here",
  "deviceType": "IOS",
  "deviceName": "iPhone 14",
  "appVersion": "1.0.0"
}

# Test push notifications
POST /api/notifications/devices/test

# Subscribe to topic
POST /api/notifications/topics/subscribe
{
  "topic": "department_updates"
}
```

### Notification History
```http
# Get user notification history
GET /api/notifications/history?limit=50&offset=0

# Mark notification as read
POST /api/notifications/{notificationId}/read
```

### Administrative Functions
```http
# Send notification (admin only)
POST /api/notifications/send
{
  "userIds": ["uuid1", "uuid2"],
  "type": "EMAIL",
  "templateName": "system_maintenance",
  "data": {
    "maintenanceDate": "2024-01-15",
    "startTime": "02:00",
    "endTime": "04:00"
  },
  "scheduledAt": "2024-01-14T20:00:00Z"
}

# Get statistics (admin only)
GET /api/notifications/stats?days=7

# Test email configuration (admin only)
POST /api/notifications/email/test
{
  "email": "admin@example.com"
}
```

### Webhooks
```http
# SendGrid webhook endpoint
POST /api/notifications/webhooks/sendgrid

# AWS SES webhook endpoint  
POST /api/notifications/webhooks/aws-ses
```

## Integration Examples

### Report Status Updates
```typescript
// In workflow service
await notificationService.sendTemplatedNotification(
  report.user_id,
  'report_status_update',
  {
    reportId: reportId,
    reportTitle: report.title,
    oldStatus: currentStatus,
    newStatus: newStatus,
    comment: comment || ''
  },
  {
    type: 'EMAIL',
    eventType: 'status_changed',
    eventSource: 'workflow',
    referenceId: reportId,
    triggeredByUserId: userId
  }
);
```

### Achievement Notifications
```typescript
// In gamification service
await notificationService.sendNotification({
  userId,
  type: 'PUSH',
  templateName: 'achievement_unlocked',
  content: `Congratulations! You unlocked the "${badge.name}" badge!`,
  eventType: 'achievement_unlocked',
  eventSource: 'gamification',
  data: {
    badgeName: badge.name,
    pointsAwarded: achievement.pointsAwarded
  }
});
```

### Engagement Notifications
```typescript
// In engagement service
await notificationService.sendNotification({
  userId: reportOwnerId,
  type: 'PUSH',
  templateName: 'comment_received',
  content: `${commenterName} commented on your report "${reportTitle}"`,
  eventType: 'comment_received',
  eventSource: 'engagement',
  referenceId: reportId,
  triggeredByUserId: userId
});
```

## Configuration

### Environment Variables

#### Email Configuration
```env
# SMTP Provider
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# AWS SES
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Default sender
DEFAULT_FROM_EMAIL=noreply@civictracker.com
DEFAULT_FROM_NAME=Civic Issue Tracker
```

#### Push Notifications
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Or use service account file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### Notification Settings
```env
# Processing configuration
NOTIFICATION_BATCH_SIZE=100
EMAIL_BATCH_SIZE=50

# Job scheduler intervals (in milliseconds)
ESCALATION_CHECK_INTERVAL=3600000    # 1 hour
NOTIFICATION_PROCESS_INTERVAL=300000 # 5 minutes
```

## Job Scheduling

### Background Processing
The system includes background jobs for:
- **Scheduled Notifications**: Process queued notifications
- **Email Service Initialization**: Provider verification
- **Push Service Setup**: Firebase SDK initialization
- **Delivery Tracking**: Webhook processing

### Job Scheduler Integration
```typescript
// Automatic startup
await jobScheduler.start();

// Manual triggers (for testing)
await jobScheduler.triggerNotificationProcessing();
await jobScheduler.triggerEscalationCheck();
```

## Performance & Scalability

### Optimization Strategies
- **Batch Processing**: Group notifications for efficiency
- **Provider Fallback**: Automatic failover for reliability  
- **Rate Limiting**: Respect provider limits
- **Queue Management**: Priority-based processing
- **Template Caching**: In-memory template storage

### Monitoring & Alerting
- **Delivery Statistics**: Success/failure rates by provider
- **Performance Metrics**: Processing times and throughput
- **Error Tracking**: Failed deliveries and retry attempts
- **Webhook Processing**: Real-time status updates

## Security Considerations

### Data Protection
- **User Privacy**: Preference-based opt-out mechanisms
- **Template Security**: SQL injection prevention
- **Webhook Validation**: Provider signature verification
- **Token Management**: Secure FCM token handling

### Access Control
- **Admin Functions**: Role-based access control
- **User Isolation**: Private notification channels
- **API Authentication**: JWT-based endpoint security
- **Webhook Security**: IP whitelisting and signatures

## Testing

### Development Setup
```typescript
// Email testing with Ethereal
const testAccount = await nodemailer.createTestAccount();
console.log('Preview URL:', nodemailer.getTestMessageUrl(info));

// Push notification testing
await pushNotificationService.testConfiguration(userId);

// Template testing
const result = await notificationService.sendTemplatedNotification(
  testUserId, 
  'test_template', 
  { name: 'Test User' }
);
```

### Production Monitoring
- **Health Checks**: Service availability monitoring
- **Delivery Rates**: Provider performance tracking
- **Error Alerts**: Failed notification detection
- **User Engagement**: Open and click rate analysis

## Future Enhancements

### Planned Features
- **SMS Integration**: Twilio/AWS SNS implementation
- **Advanced Scheduling**: Recurring notifications
- **A/B Testing**: Template performance comparison
- **Rich Templates**: Dynamic content generation
- **Analytics Dashboard**: Real-time metrics visualization

### Scalability Improvements
- **Message Queues**: Redis/RabbitMQ integration
- **Microservices**: Service decomposition
- **CDN Integration**: Template and asset delivery
- **Multi-region**: Global delivery optimization

---

## Getting Started

1. **Configure Providers**: Set up email and push notification credentials
2. **Run Migration**: Apply notification system database schema
3. **Initialize Services**: Start email and push services
4. **Configure Preferences**: Set default user notification settings
5. **Test Integration**: Verify end-to-end notification delivery

The Enhanced Notifications System provides a robust foundation for user communication, supporting the civic engagement platform with reliable, personalized, and intelligent notification delivery across multiple channels.
