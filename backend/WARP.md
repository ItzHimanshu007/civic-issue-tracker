# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the backend API server for the Civic Issue Tracker - a comprehensive crowdsourced civic issue reporting and resolution system. It's built with Node.js/Express and PostgreSQL, featuring real-time capabilities, gamification, advanced notifications, and machine learning integration.

## Development Commands

### Essential Commands
```bash
# Development
npm run dev                 # Start development server with hot reload
npm run build               # Compile TypeScript to JavaScript
npm start                  # Run production server from dist/

# Database
npm run db:migrate         # Run database migrations
npm run db:seed            # Seed database with initial data

# Code Quality  
npm run lint               # Lint TypeScript files
npm test                   # Run Jest tests (framework ready)
```

### Single Test Execution
When tests are implemented, use Jest patterns:
```bash
# Run specific test file
npm test -- services/gamificationService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="award points"
```

## Architecture & Code Organization

### Service-Oriented Architecture
The codebase follows a service-oriented pattern with clear separation of concerns:

- **Routes Layer** (`src/routes/`): HTTP endpoints and request handling
- **Services Layer** (`src/services/`): Core business logic and external integrations
- **Middleware Layer** (`src/middleware/`): Cross-cutting concerns (auth, error handling)
- **Utils Layer** (`src/utils/`): Database, logging, Redis, JWT utilities

### Key Services

#### GamificationService (`src/services/gamificationService.ts`)
- **Points System**: Awards points for user actions (reports, upvotes, comments)
- **Achievement System**: Badges, levels, and milestone tracking
- **Leaderboards**: Real-time rankings with multiple timeframes
- **Integration**: Automatically triggered by user actions across the system

#### NotificationService (`src/services/notificationService.ts`)
- **Multi-Channel**: Email, push, SMS (framework), and in-app notifications
- **Smart Scheduling**: Quiet hours, timezone awareness, priority handling
- **Template Engine**: Dynamic content with variable substitution
- **User Preferences**: Granular control over notification types and channels

#### WorkflowService (`src/services/workflowService.ts`)
- **Report Lifecycle**: Status transitions and automated workflows
- **Staff Assignment**: Department routing and escalation logic
- **Timeline Tracking**: Status history and audit trails

#### ML Classification Service (`src/services/mlClassificationService.ts`)
- **Automated Categorization**: Machine learning-powered issue classification
- **Duplicate Detection**: Intelligent duplicate report identification
- **Priority Assessment**: Automatic priority scoring

### Database Architecture

#### Core Schema (`migrations/001_create_schema.sql`)
- **UUID Primary Keys**: All tables use UUID for distributed system compatibility
- **Enum Types**: Strongly typed enums for categories, statuses, priorities
- **Audit Fields**: Created/updated timestamps with automatic triggers
- **Comprehensive Indexing**: Optimized for common query patterns

#### Key Tables
- `users` - User accounts with gamification points
- `reports` - Core civic issues with location data
- `departments` - Municipal departments and staff
- `media_files` - S3-stored images/videos/audio
- `comments` - Community engagement
- `notifications` - Multi-channel notification queue

### Real-time Features
- **Socket.io Integration**: Real-time updates for reports, notifications, achievements  
- **Room Management**: User-specific and report-specific real-time channels
- **Event Broadcasting**: System-wide announcements and updates

## Environment Configuration

### Required Environment Variables
```env
# Core Services
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/civic_tracker
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret

# External Services
TWILIO_ACCOUNT_SID=your-twilio-sid
AWS_S3_BUCKET=civic-tracker-media
GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### Service Dependencies
- **PostgreSQL**: Primary database with spatial extensions
- **Redis**: Caching and session management
- **AWS S3**: Media file storage
- **Twilio**: SMS/OTP functionality
- **Firebase**: Push notifications (configured in services)

## TypeScript Configuration

### Path Aliases
The project uses TypeScript path aliases for clean imports:
```typescript
// Use these aliases instead of relative paths
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
import { gamificationService } from '@/services/gamificationService';
```

### Type Safety
- **Strict Mode**: Full TypeScript strict mode enabled
- **Database Types**: Enum types match database schema exactly
- **Interface Definitions**: Comprehensive interfaces for all data structures

## Database Migrations

### Migration System
- **Sequential Numbering**: `001_`, `002_`, etc.
- **SQL Files**: Pure SQL migrations in `migrations/` and `src/migrations/`
- **Automatic Tracking**: Migration table tracks applied migrations
- **Idempotent**: Safe to run multiple times

### Migration Workflow
```bash
# Create new migration file
touch src/migrations/010_your_feature.sql

# Apply all pending migrations
npm run db:migrate
```

## Job Scheduling & Background Tasks

The system uses a built-in job scheduler (`src/services/jobScheduler.ts`) for:
- **Notification Processing**: Scheduled and delayed notifications
- **Gamification Updates**: Daily streak calculations and badge checks
- **ML Model Updates**: Periodic retraining of classification models
- **Database Maintenance**: Cleanup and optimization tasks

## Integration Patterns

### Service Communication
Services communicate through direct method calls and event emission:
```typescript
// Award points for user action
await gamificationService.awardPoints(userId, 'REPORT_SUBMITTED', 1, { reportId });

// Send notification with template
await notificationService.sendTemplatedNotification(userId, 'report_status_update', variables);
```

### Error Handling
- **Centralized Error Handler**: `src/middleware/errorHandler.ts`
- **Structured Logging**: Winston logger with contextual information
- **Graceful Degradation**: Non-critical features fail silently

### Authentication Flow
- **JWT-based**: Stateless authentication with Redis blacklisting
- **OAuth Support**: Google OAuth integration ready
- **OTP Verification**: Phone number verification via Twilio

## Key Business Logic

### Report Lifecycle
1. **Submission**: User submits report with media files
2. **ML Classification**: Automatic categorization and duplicate detection
3. **Department Routing**: Assignment based on category and location
4. **Community Engagement**: Upvoting, commenting, verification
5. **Staff Processing**: Status updates and resolution
6. **Gamification**: Points awarded throughout lifecycle

### Gamification Integration
- **Automatic Triggers**: Points awarded on report actions
- **Real-time Updates**: Socket.io notifications for achievements
- **Multi-level System**: 8 user levels with progressive benefits
- **Community Features**: Leaderboards and badge showcases

### Notification Orchestration
- **Event-Driven**: Triggered by report status changes, community actions
- **Multi-Channel**: Email, push, and in-app notifications
- **User Preferences**: Granular control with quiet hours
- **Template System**: Dynamic content generation

## Performance Considerations

### Database Optimization
- **Connection Pooling**: Configured for high concurrency
- **Transaction Management**: `withTransaction` helper for atomic operations
- **Query Optimization**: Indexes on frequently queried columns

### Caching Strategy
- **Redis Integration**: Session data and frequent queries cached
- **Service-Level Caching**: Leaderboards and user stats cached
- **Real-time Sync**: Cache invalidation on data changes

### Scalability Patterns
- **Stateless Design**: Horizontal scaling ready
- **Background Processing**: Resource-intensive tasks queued
- **Media Offloading**: S3 for file storage

## Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Role-based Access**: CITIZEN, STAFF, ADMIN roles
- **Rate Limiting**: Express rate limiting on API endpoints

### Data Protection
- **Input Validation**: Joi schemas for request validation
- **SQL Injection Prevention**: Parameterized queries throughout
- **File Upload Security**: Multer with type and size restrictions
- **CORS Configuration**: Environment-specific origin controls

## Testing Strategy

The codebase is structured for comprehensive testing:
- **Unit Tests**: Service layer testing with Jest
- **Integration Tests**: Database and external service mocking
- **API Tests**: Endpoint testing with supertest
- **Performance Tests**: Load testing for critical paths

## Deployment Considerations

### Production Setup
- **Environment Variables**: All sensitive config externalized  
- **Database Migrations**: Automated migration on deployment
- **Process Management**: PM2 or container orchestration ready
- **Logging**: Structured JSON logs for production monitoring

### Health Monitoring
- **Health Endpoint**: `/health` with uptime and service status
- **Error Tracking**: Winston logging with error aggregation ready
- **Performance Metrics**: Service-level timing and success rates

This backend provides a robust foundation for civic engagement with comprehensive gamification, intelligent notifications, and real-time collaboration features. The service-oriented architecture makes it highly maintainable and extensible for future civic platform needs.
