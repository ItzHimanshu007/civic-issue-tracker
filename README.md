# 🏛️ Civic Issue Tracker

<div align="center">

![Civic Issue Tracker](https://img.shields.io/badge/Civic-Issue%20Tracker-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

**A comprehensive crowdsourced civic issue reporting and resolution system designed for Indian municipalities**

*Empowering citizens to report civic issues and helping municipal authorities manage them efficiently*

[🚀 Live Demo](#-live-demo) • [📖 Documentation](#-documentation) • [🔧 Installation](#-installation) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 Overview

The Civic Issue Tracker is a full-stack application designed to bridge the gap between citizens and municipal authorities in India. Citizens can report civic issues like potholes, streetlight failures, waste management problems, and more through an intuitive mobile app. Municipal staff can manage, track, and resolve these issues through a comprehensive web dashboard.

### 🎯 Key Highlights

- **📱 Mobile-First**: Easy-to-use mobile app for citizens
- **🌐 Web Dashboard**: Comprehensive admin portal for municipal staff
- **🇮🇳 India-Ready**: Pre-configured with Indian locations (Jharkhand focus)
- **🔐 Secure Authentication**: JWT-based authentication with username/password
- **📊 Analytics**: Real-time reporting and analytics
- **🚀 Cloud-Ready**: Configured for Railway, Vercel, and Netlify deployment

---

## 🏗️ Architecture

```
📦 civic-issue-tracker/
├── 📱 mobile-app/          # React Native/Expo mobile application
├── 🖥️  backend/             # Node.js/Express API server with PostgreSQL
├── 🌐 admin-portal/        # Next.js web dashboard for municipal staff
├── 📋 DEPLOYMENT_GUIDE.md   # Step-by-step deployment instructions
└── 📄 DEPLOY_SUMMARY.md     # Deployment configuration summary
```

---

## ✨ Features

### 📱 Citizen Mobile App
- **🔐 Authentication**: Secure login with username/password
- **📷 Rich Reporting**: Photo capture with GPS location
- **🗺️ Interactive Maps**: View reported issues on map
- **📝 Issue Management**: Create, view, and track issue status
- **📍 Location Services**: Automatic location detection
- **💬 User-Friendly**: Intuitive interface designed for all age groups

### 🌐 Admin Web Portal
- **📊 Dashboard**: Centralized view of all reported issues
- **👥 User Management**: Manage citizens and staff accounts
- **📈 Analytics**: Real-time statistics and reporting
- **🔍 Issue Management**: Review, assign, and update issue status
- **🗺️ Map Integration**: Geospatial view of issues
- **⚙️ System Configuration**: Manage categories, priorities, and settings

### 🔧 Backend System
- **🔐 JWT Authentication**: Secure API access
- **🗄️ PostgreSQL Database**: Robust data storage with migrations
- **📡 RESTful APIs**: Well-structured API endpoints
- **🛡️ Security**: Rate limiting, CORS, and input validation
- **🔄 Real-time Updates**: Live data synchronization
- **☁️ Cloud Storage**: Ready for file upload integration

---

## 🛠️ Tech Stack

<div align="center">

| Component | Technologies |
|-----------|-------------|
| **📱 Mobile** | React Native, Expo, Redux Toolkit, React Navigation |
| **🔧 Backend** | Node.js, Express.js, PostgreSQL, JWT, bcrypt |
| **🌐 Frontend** | Next.js, React, TypeScript, Tailwind CSS, Zustand |
| **☁️ Deployment** | Railway (Backend), Vercel (Frontend), Netlify (Mobile) |
| **🗄️ Database** | PostgreSQL with migration scripts |
| **🔐 Authentication** | JSON Web Tokens (JWT) |

</div>

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **PostgreSQL** 12+ (local or cloud)
- **Git** for version control

### 📥 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ItzHimanshu007/civic-issue-tracker.git
   cd civic-issue-tracker
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database configuration
   npm run db:migrate  # Run database migrations
   npm run dev         # Start development server
   ```

3. **Setup Admin Portal**
   ```bash
   cd ../admin-portal
   npm install
   cp .env.example .env.local
   # Edit .env.local with backend URL
   npm run dev         # Start development server
   ```

4. **Setup Mobile App**
   ```bash
   cd ../mobile-app
   npm install
   npm start           # Start Expo development server
   ```

### 🎮 Default Login Credentials

- **Admin Portal**: `admin` / `admin123`
- **Mobile App**: `user` / `user123`

---

## 🌍 Sample Data

The application comes pre-configured with Indian sample data:

- **📍 Locations**: Jharkhand state focus (Ranchi, Jamshedpur, Dhanbad)
- **👥 Users**: Indian names and phone numbers
- **🏢 Departments**: Municipal departments (Roads, Water, Electricity)
- **📝 Issues**: Common civic problems with Hindi/English descriptions

---

## 🚀 Deployment

The project is configured for easy cloud deployment:

### 📋 Deployment Guide

Follow the comprehensive [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step instructions:

1. **🚂 Railway**: Backend + PostgreSQL
2. **▲ Vercel**: Admin Portal (Next.js)
3. **🌐 Netlify**: Mobile App (Web Build)

### ⚡ Quick Deploy

```bash
# Push to GitHub
git push origin main

# Follow deployment guides for each platform
# 1. Deploy backend to Railway
# 2. Deploy admin portal to Vercel  
# 3. Deploy mobile app to Netlify
```

---

## 📖 API Documentation

### 🔐 Authentication Endpoints

```bash
POST /api/auth/login     # User login
POST /api/auth/register  # User registration
POST /api/auth/refresh   # Token refresh
```

### 📝 Issues Endpoints

```bash
GET    /api/reports           # Get all reports
POST   /api/reports           # Create new report
GET    /api/reports/:id       # Get specific report
PUT    /api/reports/:id       # Update report
DELETE /api/reports/:id       # Delete report
```

### 👥 Users Endpoints

```bash
GET    /api/users             # Get all users
GET    /api/users/:id         # Get specific user
PUT    /api/users/:id         # Update user
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd admin-portal
npm test

# Mobile app tests
cd mobile-app
npm test
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **💫 Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **📤 Push** to the branch (`git push origin feature/AmazingFeature`)
5. **🔄 Open** a Pull Request

### 📝 Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **🇮🇳 Indian Government** Digital India initiatives
- **🏛️ Municipal Corporations** for requirements and feedback
- **👥 Open Source Community** for amazing tools and libraries

---

<div align="center">

**Made with ❤️ for Indian Smart Cities**

[⬆ Back to Top](#-civic-issue-tracker)

</div>
