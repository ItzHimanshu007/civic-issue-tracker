# Development Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)

## Quick Start with Docker

1. **Clone and navigate to the project**
   ```bash
   git clone <repository-url>
   cd civic-issue-tracker
   ```

2. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the applications**
   - Backend API: http://localhost:3001
   - Admin Portal: http://localhost:3000
   - Mobile App: http://localhost:19000 (Expo DevTools)

## Manual Setup

### 1. Database Setup

**PostgreSQL:**
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb civic_tracker

# Create user
sudo -u postgres psql
CREATE USER civic_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE civic_tracker TO civic_user;
```

**Redis:**
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
DATABASE_URL=postgresql://civic_user:your_password@localhost:5432/civic_tracker
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key

# Run database migrations
npm run db:migrate

# Seed with sample data
npm run db:seed

# Start development server
npm run dev
```

### 3. Admin Portal Setup

```bash
cd admin-portal

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Mobile App Setup

```bash
cd mobile-app

# Install dependencies
npm install

# Install Expo CLI globally
npm install -g @expo/cli

# Start Expo development server
npm start
```

## Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://civic_user:password@localhost:5432/civic_tracker
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=civic-tracker-media
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Admin Portal (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## Development Workflow

### Database Operations

**Run migrations:**
```bash
cd backend
npm run db:migrate
```

**Seed development data:**
```bash
cd backend
npm run db:seed
```

**Reset database (careful!):**
```bash
# Drop and recreate database
sudo -u postgres dropdb civic_tracker
sudo -u postgres createdb civic_tracker
npm run db:migrate
npm run db:seed
```

### Testing

**Run all tests:**
```bash
npm test
```

**Run specific module tests:**
```bash
cd backend && npm test
cd admin-portal && npm test
cd mobile-app && npm test
```

### Linting and Formatting

**Lint all projects:**
```bash
npm run lint
```

**Lint specific module:**
```bash
cd backend && npm run lint
```

## Mobile App Development

### Running on Physical Device

1. Install Expo Go app on your phone
2. Start the development server: `npm start`
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

### Building for Production

**Android:**
```bash
cd mobile-app
eas build --platform android
```

**iOS:**
```bash
cd mobile-app
eas build --platform ios
```

## Deployment

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Admin Portal:**
```bash
cd admin-portal
npm run build
npm start
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## Common Issues

### Port Already in Use
```bash
# Kill processes on specific ports
sudo lsof -ti:3000 | xargs kill -9  # Admin portal
sudo lsof -ti:3001 | xargs kill -9  # Backend
sudo lsof -ti:19000 | xargs kill -9 # Expo
```

### Database Connection Issues
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `.env` file
- Check if database exists: `sudo -u postgres psql -l`

### Redis Connection Issues
- Check if Redis is running: `sudo systemctl status redis`
- Test connection: `redis-cli ping`

### Mobile App Not Loading
- Ensure you're on the same network as your development machine
- Check if firewall is blocking ports 19000-19002
- Try clearing Expo cache: `npx expo start -c`

## Useful Commands

```bash
# Install all dependencies for all modules
npm run install:all

# Start all development servers
npm run dev

# Build all projects
npm run build

# Run all tests
npm test

# Lint all code
npm run lint
```

## API Testing

You can test the API using curl or any API testing tool:

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test auth endpoint
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

For detailed API documentation, see [API.md](./API.md).
