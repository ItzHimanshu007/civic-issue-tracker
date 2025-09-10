# 🏛️ Civic Issue Tracker - System Architecture

## Overview

The Civic Issue Tracker is a comprehensive crowdsourced civic issue reporting and resolution system with three main components: a React Native mobile app for citizens, a Next.js admin web portal for municipal staff, and a Node.js/Express backend API with PostgreSQL database.

## 🏗️ System Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Admin Portal   │    │    Backend      │
│  (React Native) │    │   (Next.js)     │    │ (Node.js/Express)│
│                 │    │                 │    │                 │
│ • Report Issues │◄───┤ • Dashboard     │◄───┤ • REST APIs     │
│ • View Status   │    │ • Analytics     │    │ • WebSocket     │
│ • Community     │    │ • Staff Mgmt    │    │ • Auth/Security │
│ • Gamification  │    │ • Workflows     │    │ • ML Services   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                ┌─────────────────┴─────────────────┐
                │                                   │
         ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
         │ PostgreSQL  │   │   Redis     │   │  AWS S3     │
         │  Database   │   │   Cache     │   │  Storage    │
         └─────────────┘   └─────────────┘   └─────────────┘
```

## 📱 Mobile App (React Native + Expo)

### Technology Stack
- **Framework**: React Native with Expo SDK 51
- **Navigation**: React Navigation 6 (Stack + Bottom Tabs)
- **State Management**: Redux Toolkit + React Redux
- **Storage**: AsyncStorage + SecureStore
- **UI Components**: React Native Paper + Custom Components
- **Maps**: React Native Maps
- **Camera**: Expo Camera + Image Picker
- **Notifications**: Expo Notifications
- **Location**: Expo Location

### Key Features
1. **Authentication & Onboarding**
   - OTP-based phone number verification
   - Google OAuth integration
   - Profile setup and verification

2. **Issue Reporting**
   - Camera integration for photos/videos
   - GPS location capture
   - Voice notes recording
   - Category selection (10 types)
   - Priority levels (Normal, Urgent, Critical)

3. **Community Engagement**
   - Upvote/downvote reports
   - Comment on issues
   - Report verification system
   - Follow report status

4. **Gamification System**
   - Points and badges
   - Leaderboards (weekly, monthly, all-time)
   - Achievement tracking
   - Activity streaks

5. **Interactive Features**
   - Map view with report clustering
   - Filter by category/status/priority
   - Real-time notifications
   - Offline capabilities

### Current API Integration
- **Base URL**: `http://localhost:3000/api` (Admin portal's Next.js API)
- **Services**: 
  - `authService.ts` - Authentication (stubbed)
  - `reportsService.ts` - Report CRUD operations (implemented)
- **Data Flow**: Mobile → Admin Portal API → In-memory store → Admin Dashboard

### File Structure
```
mobile-app/
├── src/
│   ├── components/        # Reusable UI components
│   ├── navigation/        # Navigation configuration
│   ├── screens/          # Screen components
│   │   ├── CreateReportScreen.tsx
│   │   └── ReportsListScreen.tsx
│   ├── services/         # API services
│   ├── store/           # Redux store configuration
│   ├── types/           # TypeScript type definitions
│   └── theme.ts         # UI theme configuration
├── App.tsx              # Root component
└── package.json
```

## 🖥️ Admin Portal (Next.js)

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **UI Library**: TailwindCSS + Headless UI + Heroicons
- **Authentication**: NextAuth.js
- **Charts**: Chart.js + React Chart.js 2
- **Maps**: React Leaflet + Leaflet.heat
- **State Management**: Zustand
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client

### Key Features
1. **Dashboard & Analytics**
   - Real-time statistics overview
   - Category breakdown charts
   - Resolution time analytics
   - Geographic heat maps

2. **Report Management**
   - Centralized issue dashboard
   - Status workflow management
   - Bulk operations
   - Advanced filtering

3. **Staff Management**
   - Department organization
   - Role-based access control
   - Assignment workflows
   - Performance tracking

4. **System Administration**
   - User management
   - Configuration settings
   - System health monitoring
   - Audit logs

### Current Implementation
- **API Integration**: Uses local Next.js API routes (`/app/api/reports/route.ts`)
- **Data Storage**: In-memory array for development/demo
- **Features**: 
  - GET `/api/reports` - Fetch reports with filtering
  - POST `/api/reports` - Create new reports from mobile app
  - Mock dataset of 1000+ reports for testing
  - Real-time updates when mobile app submits reports

### File Structure
```
admin-portal/
├── src/
│   ├── app/
│   │   ├── api/          # Next.js API routes
│   │   │   └── reports/
│   │   │       └── route.ts
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── reports/      # Report management
│   │   └── layout.tsx    # Root layout
│   ├── components/       # Reusable components
│   ├── lib/             # Utilities and API client
│   └── styles/          # Global styles
├── public/              # Static assets
└── package.json
```

## 🔧 Backend API (Node.js + Express)

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for sessions and caching
- **Authentication**: JWT tokens
- **File Upload**: Multer + AWS S3
- **Validation**: Joi schemas
- **Security**: Helmet, CORS, Rate limiting
- **Real-time**: Socket.io
- **Logging**: Winston
- **Testing**: Jest

### Database Schema

#### Core Tables
```sql
-- Users and Authentication
users (id, phone_number, email, name, role, points, is_verified)
oauth_providers (user_id, provider, provider_id)

-- Departments and Staff
departments (id, name, contact_email, contact_phone)
staff (user_id, department_id, employee_id, position)

-- Reports and Media
reports (id, user_id, title, description, category, priority, status, location, address)
media_files (report_id, file_url, thumbnail_url, mime_type, media_type)

-- Community Engagement
comments (report_id, user_id, content, is_internal)
upvotes (report_id, user_id)
report_verifications (report_id, user_id, verified, reason)

-- Gamification System
badges (name, description, points_required, rarity)
user_badges (user_id, badge_id, earned_at)
points_history (user_id, action, points_awarded, metadata)
achievements (user_id, type, reference_id, points_awarded)
user_streaks (user_id, current_streak, longest_streak)

-- Notifications
notifications (user_id, type, subject, content, status)
notification_templates (name, type, subject, content, html_content)
user_notification_preferences (user_id, email_enabled, push_enabled, quiet_hours)
```

#### Key Enums
- **Categories**: POTHOLE, STREETLIGHT, GARBAGE, WATER_LEAK, SEWAGE, ROAD_MAINTENANCE, TRAFFIC_SIGNAL, PARK_MAINTENANCE, NOISE_POLLUTION, OTHER
- **Priorities**: NORMAL, URGENT, CRITICAL
- **Statuses**: SUBMITTED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED
- **User Roles**: CITIZEN, STAFF, ADMIN

### API Endpoints

#### Authentication
```http
POST /api/auth/send-otp          # Send OTP to phone
POST /api/auth/verify-otp        # Verify OTP and login
POST /api/auth/google            # Google OAuth login
POST /api/auth/refresh           # Refresh JWT token
```

#### Reports Management
```http
GET    /api/reports              # List reports with filters
POST   /api/reports              # Create new report with media
GET    /api/reports/:id          # Get report details
PATCH  /api/reports/:id/status   # Update report status (staff only)
POST   /api/reports/:id/upvote   # Upvote report
POST   /api/reports/:id/comments # Add comment
```

#### Gamification
```http
GET /api/gamification/profile       # User's gamification stats
GET /api/gamification/leaderboard   # Leaderboards
GET /api/gamification/achievements  # User achievements
POST /api/gamification/award-points # Award points (admin)
```

#### Notifications
```http
GET /api/notifications/preferences     # Get user notification settings
PUT /api/notifications/preferences     # Update notification settings
POST /api/notifications/devices/register # Register device for push
GET /api/notifications/history         # Notification history
```

### Services Architecture

#### Core Services
1. **Authentication Service** - JWT management, OTP verification
2. **Reports Service** - CRUD operations, status workflows
3. **Media Service** - File upload to S3, image processing
4. **Gamification Service** - Points, badges, achievements
5. **Notification Service** - Multi-channel notifications
6. **Workflow Service** - Status transitions, assignments
7. **Analytics Service** - Statistics and reporting

#### Current Status
- ⚠️ **Build Issues**: TypeScript compilation errors in several service files
- 🔄 **Development Mode**: Mock data support via `MOCK_DATA=true` environment variable
- 📊 **Database**: Full PostgreSQL schema with 15+ tables and relationships
- 🔧 **Migration System**: Automated database migrations with version tracking

## 🔄 Data Flow Architecture

### Report Submission Flow
```
1. Mobile App → CreateReport Screen
2. Capture location, photos, form data
3. POST to /api/reports (Admin Portal or Backend)
4. Store in database/memory
5. Real-time notification to admin dashboard
6. Status updates flow back to mobile app
```

### Current Development Setup
```
Mobile App (Expo) → Admin Portal Next.js API → In-Memory Store
                                           ↓
                                 Admin Dashboard Updates
```

### Production Setup (When Backend is Ready)
```
Mobile App → Backend API → PostgreSQL Database
                     ↓
Admin Portal ← Backend API ← Database
```

## 🎮 Gamification System

### Points System
| Action | Points | Description |
|--------|--------|-------------|
| First Report | 25 | Submit your first issue |
| Report Submitted | 10 | Submit a civic issue |
| Report Upvoted | 2 | Receive upvote on report |
| Give Upvote | 1 | Upvote another's report |
| Comment Posted | 3 | Post helpful comment |
| Report Verified | 5 | Verify accuracy of report |
| Report Resolved | 20 | Your report gets resolved |
| 7-Day Streak | 50 | Stay active 7 days |
| 30-Day Streak | 200 | Stay active 30 days |

### Level System
1. **Civic Newbie** (0 pts) - Basic reporting
2. **Aware Citizen** (50 pts) - Comment, upvote
3. **Active Reporter** (150 pts) - Verify reports
4. **Community Helper** (300 pts) - Advanced features
5. **Civic Champion** (600 pts) - Featured reports
6. **Guardian Angel** (1000 pts) - Moderator privileges
7. **City Hero** (1500 pts) - Direct staff contact
8. **Civic Legend** (2500 pts) - Policy influence

### Badge Categories
- **Common**: First Reporter, Active Citizen, Popular Reporter
- **Rare**: Super Reporter, Truth Seeker, Veteran
- **Epic**: Viral Reporter, Point Collector
- **Legendary**: Point Master

## 📧 Notification System

### Multi-Channel Support
1. **Email Notifications**
   - Provider support: SMTP, SendGrid, AWS SES
   - HTML templates with variable substitution
   - Delivery tracking and analytics

2. **Push Notifications**
   - Firebase Cloud Messaging
   - Platform-specific customization
   - Topic subscriptions

3. **Real-time Notifications**
   - Socket.io integration
   - User-specific rooms
   - Event broadcasting

4. **SMS Support** (Framework ready)
   - Twilio/AWS SNS integration
   - Critical alerts only

### Notification Types
- **Report Updates**: Status changes, comments, resolutions
- **Engagement**: Upvotes, comments, verifications
- **Gamification**: Badge unlocks, level ups, achievements
- **System**: Maintenance, announcements, digests

## 🔐 Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Secure API access
- **Role-based Access**: CITIZEN, STAFF, ADMIN roles
- **OAuth Integration**: Google, Facebook, Apple
- **Phone Verification**: OTP-based security

### Data Protection
- **Input Validation**: Joi schema validation
- **SQL Injection Prevention**: Parameterized queries
- **File Upload Security**: Type validation, virus scanning
- **Rate Limiting**: Prevent abuse and spam

### Infrastructure Security
- **HTTPS Everywhere**: SSL/TLS encryption
- **CORS Configuration**: Proper origin handling
- **Helmet.js**: Security headers
- **Environment Variables**: Sensitive data protection

## 🚀 Deployment Architecture

### Development Environment
```
Local Development:
├── Mobile App (Expo DevTools) :19000
├── Admin Portal (Next.js) :3000
└── Backend API (Node.js) :3001
    ├── PostgreSQL :5432
    └── Redis :6379
```

### Production Environment (Planned)
```
Production:
├── Mobile App (App Stores)
├── Admin Portal (Vercel/AWS)
└── Backend API (AWS ECS/EC2)
    ├── RDS PostgreSQL
    ├── ElastiCache Redis
    └── S3 Media Storage
```

## 📊 Current Implementation Status

### ✅ Completed Features
- Mobile app UI and navigation
- Admin portal dashboard and reports page
- Real-time data flow (mobile → admin portal)
- In-memory report storage and retrieval
- Report creation and listing functionality
- Mock data generation (1000+ reports)

### 🔄 In Development
- Backend API TypeScript compilation fixes
- Database connection and migrations
- Authentication system implementation
- File upload and media handling

### 📋 Planned Features
- Push notification integration
- Advanced analytics dashboard
- ML-powered issue classification
- Workflow automation
- Mobile app authentication
- Real-time WebSocket updates

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Expo CLI
- Git

### Quick Start
```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Run database migrations
cd backend && npm run db:migrate

# Seed sample data
cd backend && npm run db:seed
```

### Testing the Connection
```bash
# Test mobile app → admin portal API
cd mobile-app && node test-api.js

# Start admin portal
cd admin-portal && npm run dev

# Start mobile app
cd mobile-app && npx expo start
```

## 🔮 Future Architecture Considerations

### Scalability Improvements
- **Microservices**: Break backend into focused services
- **Message Queues**: Async processing with Redis/RabbitMQ
- **CDN**: Static asset delivery optimization
- **Load Balancing**: High availability and performance

### Advanced Features
- **Machine Learning**: Image classification, duplicate detection
- **IoT Integration**: Smart city sensor data
- **Blockchain**: Transparent voting and verification
- **AI Chatbot**: Automated citizen support

### Monitoring & Analytics
- **Application Monitoring**: Error tracking, performance metrics
- **Business Intelligence**: Advanced reporting dashboards
- **Predictive Analytics**: Issue trend forecasting
- **Real-time Alerting**: System health monitoring

---

## Summary

The Civic Issue Tracker is a sophisticated three-tier application with comprehensive features for civic engagement. The current implementation focuses on core functionality with a working data flow between mobile app and admin portal. The backend provides a robust foundation with advanced features like gamification and notifications, though it requires compilation fixes before full deployment.

The system is designed for scalability and extensibility, with clear separation of concerns and modern architectural patterns throughout all components.
