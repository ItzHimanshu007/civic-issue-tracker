# Civic Issue Tracker

A comprehensive crowdsourced civic issue reporting and resolution system with a mobile app for citizens and web dashboard for municipal staff.

## Architecture

- **mobile-app/**: React Native app for citizens to report issues
- **backend/**: Node.js/Express API server with PostgreSQL database
- **admin-portal/**: Next.js web dashboard for municipal staff
- **shared/**: Common utilities, types, and configurations
- **docs/**: Documentation and API specs

## Features

### Citizen Mobile App
- OTP & OAuth authentication
- Photo/video/voice issue reporting with GPS
- Real-time tracking and notifications
- Community engagement (upvoting, comments, verification)
- Gamification with badges and leaderboard
- Interactive map with issue filters
- Offline-first capabilities

### Admin Web Portal
- Centralized issue dashboard
- Staff and department management
- Intelligent duplicate detection
- Analytics and reporting
- Public transparency portal
- Real-time notifications

### Backend System
- RESTful APIs with JWT authentication
- Real-time sync with WebSockets
- ML-assisted issue classification
- Cloud storage for media files
- Comprehensive analytics engine

## Quick Start

```bash
# Install dependencies for all modules
npm run install:all

# Start development environment
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Tech Stack

- **Mobile**: React Native, Redux Toolkit, React Navigation
- **Backend**: Node.js, Express, PostgreSQL, Redis, Socket.io
- **Frontend**: Next.js, React, TailwindCSS, Chart.js
- **Cloud**: AWS S3, Twilio, Google Maps API
- **AI/ML**: TensorFlow.js, OpenAI API

## Contributing

Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.
