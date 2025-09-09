# 🎮 Civic Issue Tracker - Gamification System

## Overview

The gamification system incentivizes user engagement in the civic issue reporting platform through points, badges, levels, achievements, and leaderboards. It encourages quality participation, community verification, and positive civic behavior.

## Features

### 🎯 Points System

Users earn points for various activities:

| Action | Points | Description |
|--------|--------|-------------|
| `FIRST_REPORT` | 25 | Submit your first civic issue report |
| `REPORT_SUBMITTED` | 10 | Submit a civic issue report |
| `REPORT_UPVOTED` | 2 | Receive an upvote on your report |
| `GIVE_UPVOTE` | 1 | Upvote another user's report |
| `COMMENT_POSTED` | 3 | Post a helpful comment |
| `COMMENT_RECEIVED` | 1 | Receive a comment on your report |
| `REPORT_VERIFIED` | 5 | Verify accuracy of a report |
| `VERIFICATION_RECEIVED` | 5 | Have your report verified by community |
| `REPORT_RESOLVED` | 20 | Your report gets resolved by authorities |
| `STREAK_7_DAYS` | 50 | Stay active for 7 consecutive days |
| `STREAK_30_DAYS` | 200 | Stay active for 30 consecutive days |

### 🏆 Badge System

Users can earn badges based on achievements:

#### Common Badges
- **First Reporter** 🎯 - Submit your first civic issue report
- **Active Reporter** 📝 - Submit 5 civic issue reports  
- **Popular Reporter** 👍 - Receive 10 upvotes on your reports
- **Supportive Citizen** 🤝 - Give 50 upvotes to other reports

#### Rare Badges
- **Super Reporter** ⭐ - Submit 25 civic issue reports
- **Great Commentator** 💬 - Post 25 helpful comments
- **Truth Seeker** ✅ - Verify 10 reports
- **Veteran** 🏆 - Active for 30 days

#### Epic Badges
- **Viral Reporter** 🔥 - Receive 50 upvotes on your reports
- **Point Collector** 💎 - Earn 500 points

#### Legendary Badges
- **Point Master** 👑 - Earn 1000 points

### 📊 Level System

Users progress through 8 levels with increasing benefits:

1. **Civic Newbie** (0 pts) - Basic reporting
2. **Aware Citizen** (50 pts) - Comment on reports, Upvote issues
3. **Active Reporter** (150 pts) - Verify reports, Priority support
4. **Community Helper** (300 pts) - Advanced filtering, Report analytics
5. **Civic Champion** (600 pts) - Featured reports, Early access features
6. **Guardian Angel** (1000 pts) - Moderator privileges, Special badge
7. **City Hero** (1500 pts) - Direct staff contact, Custom profile
8. **Civic Legend** (2500 pts) - Influence policy, Hall of fame

### 🥇 Leaderboard

Three timeframe leaderboards:
- **All Time** - Total points accumulated
- **Monthly** - Points earned in the last 30 days
- **Weekly** - Points earned in the last 7 days

Leaderboard shows:
- User rank and total points
- Level and title
- Key statistics (reports, upvotes, comments, etc.)
- Badge count

### 🎖️ Achievement Types

1. **Badge Achievements** - Earning specific badges
2. **Level Achievements** - Reaching new levels
3. **Milestone Achievements** - Hitting activity milestones

### ⚡ Activity Streaks

Track consecutive daily activity to encourage regular engagement:
- Current streak counter
- Longest streak achieved
- Bonus points for milestone streaks (7 days, 30 days)

## Database Schema

### Core Tables

#### `points_history`
Tracks all point transactions for transparency and analytics.

```sql
CREATE TABLE points_history (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50),
    points_awarded INTEGER,
    multiplier DECIMAL(3,2),
    metadata JSONB,
    total_points_after INTEGER,
    created_at TIMESTAMP
);
```

#### `badges`
Defines available badges in the system.

```sql
CREATE TABLE badges (
    id UUID PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    description TEXT,
    icon_url TEXT,
    points_required INTEGER,
    condition_type VARCHAR(100),
    rarity VARCHAR(20),
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `user_badges`
Tracks badges earned by users.

```sql
CREATE TABLE user_badges (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    badge_id UUID REFERENCES badges(id),
    earned_at TIMESTAMP,
    UNIQUE(user_id, badge_id)
);
```

#### `achievements`
Records all types of achievements.

```sql
CREATE TABLE achievements (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(20) CHECK (type IN ('BADGE', 'LEVEL', 'MILESTONE')),
    reference_id VARCHAR(255),
    points_awarded INTEGER,
    created_at TIMESTAMP
);
```

#### `user_streaks`
Tracks user activity streaks.

```sql
CREATE TABLE user_streaks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    current_streak INTEGER,
    longest_streak INTEGER,
    last_activity_date DATE,
    streak_start_date DATE,
    updated_at TIMESTAMP
);
```

## API Endpoints

### User Profile & Stats
- `GET /api/gamification/profile` - Get user's complete gamification profile
- `GET /api/gamification/points-history` - Get user's points history
- `GET /api/gamification/achievements` - Get user's achievements
- `GET /api/gamification/streaks` - Get user's activity streaks

### Leaderboard & Competition
- `GET /api/gamification/leaderboard` - Get leaderboard (all/month/week)
- `GET /api/gamification/badges` - Get all available badges

### Administration
- `POST /api/gamification/award-points` - Manually award points (admin only)
- `GET /api/gamification/stats` - System-wide gamification statistics

## Integration Points

The gamification system is integrated throughout the application:

### Report Submission
- Awards points for first report (25 pts) or regular report (10 pts)
- Updates user activity for streak tracking
- Triggers badge condition checks

### Community Engagement
- **Upvoting**: Points for giving (1 pt) and receiving (2 pts) upvotes
- **Commenting**: Points for posting (3 pts) and receiving (1 pt) comments
- **Verification**: Points for verifying reports (5 pts) and being verified (5 pts)

### Report Resolution
- Awards significant points (20 pts) when user's report is resolved
- Recognizes successful civic participation

### Real-time Notifications
- Socket.io notifications for:
  - Point awards
  - New achievements
  - Badge unlocks
  - Level progressions

## Usage Examples

### Award Points Programmatically

```typescript
import { gamificationService } from '../services/gamificationService';

// Award points for report submission
const result = await gamificationService.awardPoints(
  userId, 
  'REPORT_SUBMITTED', 
  1, 
  { reportId, reportTitle }
);

// Check result for achievements
if (result.achievements?.length > 0) {
  console.log('New achievements unlocked!', result.achievements);
}
```

### Get User Stats

```typescript
const stats = await gamificationService.getUserStats(userId);
console.log(`User level: ${stats.level} (${stats.levelTitle})`);
console.log(`Total points: ${stats.totalPoints}`);
console.log(`Badges earned: ${stats.badges.length}`);
```

### Get Leaderboard

```typescript
const leaderboard = await gamificationService.getLeaderboard('month', 20);
leaderboard.forEach((entry, index) => {
  console.log(`${index + 1}. ${entry.userName} - ${entry.totalPoints} pts`);
});
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Real-time notifications
SOCKET_IO_ENABLED=true

# Badge icons (optional - defaults to emoji)
BADGE_ICON_BASE_URL=https://your-cdn.com/badges/
```

### Customization

The gamification system is highly configurable:

1. **Point Values**: Modify point awards in `GamificationService.pointsSystem`
2. **Level System**: Adjust levels and requirements in `GamificationService.levelSystem`
3. **Badge Conditions**: Add new badges and conditions in the database migration
4. **Achievement Rules**: Extend milestone achievements in `checkMilestoneAchievements`

## Performance Considerations

### Caching
- User stats are calculated on-demand but can be cached in Redis
- Leaderboards can be pre-computed and cached for better performance
- Badge conditions are evaluated efficiently with indexed queries

### Database Optimization
- Indexes on frequently queried columns (user_id, created_at, points)
- Aggregated queries for leaderboard generation
- Partitioning for large points_history tables

### Background Jobs
- Streak calculation runs daily via job scheduler
- Badge condition checks are asynchronous
- Leaderboard cache updates run periodically

## Security & Fairness

### Point Fraud Prevention
- All point transactions are logged with metadata
- Multipliers have reasonable limits (0.1 to 10x)
- Admin-only manual point awards are tracked

### Rate Limiting
- Prevent rapid-fire actions for point farming
- Cooldown periods for certain actions
- Detection of unusual point accumulation patterns

### Data Integrity
- Foreign key constraints ensure data consistency
- Unique constraints prevent duplicate badge awards
- Transaction-based point awards ensure atomicity

## Analytics & Insights

The gamification system provides rich analytics:

### User Engagement Metrics
- Active users by gamification level
- Average points per user per time period
- Most popular badges and achievement paths
- Activity streak distributions

### System Health
- Point inflation monitoring
- Badge rarity analysis
- User progression patterns
- Drop-off points in the level system

## Future Enhancements

### Planned Features
- **Team Competitions** - Department or district-based challenges
- **Seasonal Events** - Limited-time badge opportunities
- **Social Sharing** - Share achievements on social media
- **Rewards Integration** - Redeem points for real-world benefits
- **Advanced Analytics** - Machine learning for engagement prediction

### Scalability Improvements
- **Horizontal Scaling** - Distribute gamification across services
- **Event Sourcing** - Track all gamification events for better auditing
- **Real-time Leaderboards** - WebSocket-powered live rankings
- **Mobile Push Notifications** - Achievement alerts on mobile devices

---

## Getting Started

1. **Run Migration**: Apply the gamification database schema
   ```bash
   npm run db:migrate
   ```

2. **Initialize Badges**: Default badges are automatically created during migration

3. **Configure Environment**: Add gamification settings to `.env`

4. **Start Server**: The gamification system is automatically initialized

5. **Test Integration**: Submit reports, upvote, comment to earn points and unlock achievements!

The gamification system transforms civic engagement into an enjoyable, rewarding experience that encourages active community participation and quality issue reporting.
