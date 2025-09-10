# 🚀 Civic Issue Tracker - Deployment Guide

This guide will help you deploy all components of your Civic Issue Tracker to the cloud.

## 📋 Overview

We'll deploy:
1. **Backend (Node.js + PostgreSQL)** → Railway (Free tier with PostgreSQL)
2. **Admin Portal (Next.js)** → Vercel (Perfect for Next.js)
3. **Mobile App (Expo Web)** → Netlify (Static site hosting)

## 🗂️ Deployment Order

**IMPORTANT:** Deploy in this exact order as each depends on the previous one!

---

## 1️⃣ Deploy Backend to Railway

### Step 1: Setup Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub (recommended)
3. Click "New Project" → "Deploy from GitHub repo"

### Step 2: Deploy Backend
1. Select your `civic-issue-tracker` repository
2. Choose the `backend` folder as root directory
3. Railway will auto-detect it's a Node.js app

### Step 3: Add PostgreSQL Database
1. In your Railway project, click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically create a database and provide connection URL

### Step 4: Set Environment Variables
In Railway dashboard, go to your backend service → Variables tab and add:

```bash
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-here-change-this
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
MOCK_DATA=false
SKIP_EMAIL_VERIFICATION=true
DISABLE_RATE_LIMITING=false
ESCALATION_CHECK_INTERVAL=3600000
NOTIFICATION_PROCESS_INTERVAL=300000
```

Railway will automatically set these database variables:
- `DATABASE_URL`
- `PGHOST`
- `PGPORT` 
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`

### Step 5: Deploy
Railway will automatically deploy. Your backend will be available at:
`https://your-app-name.up.railway.app`

**Save this URL - you'll need it for the frontend!**

---

## 2️⃣ Deploy Admin Portal to Vercel

### Step 1: Setup Vercel Account
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"

### Step 2: Deploy Admin Portal
1. Import your `civic-issue-tracker` repository
2. Set the **Root Directory** to `admin-portal`
3. Framework Preset: Next.js (auto-detected)

### Step 3: Set Environment Variables
In Vercel project settings → Environment Variables, add:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
NODE_ENV=production
```

Replace `your-backend-url` with the Railway URL from Step 1!

### Step 4: Deploy
Click "Deploy". Your admin portal will be available at:
`https://your-project-name.vercel.app`

**Login:** username: `admin`, password: `admin123`

---

## 3️⃣ Deploy Mobile App to Netlify

### Step 1: Build Mobile App for Web
On your local machine, go to mobile-app directory:

```bash
cd mobile-app
npm run export:web
```

This creates a `dist` folder with the web build.

### Step 2: Update API URL
Edit `mobile-app/src/services/reportsService.ts`:

```typescript
// Change this line:
const API_BASE_URL = 'http://localhost:3000/api';

// To your deployed admin portal:
const API_BASE_URL = 'https://your-admin-portal.vercel.app/api';
```

Rebuild:
```bash
npm run export:web
```

### Step 3: Deploy to Netlify
1. Go to [Netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Drag and drop the `mobile-app/dist` folder to Netlify

Or use Netlify CLI:
```bash
npm install -g netlify-cli
cd mobile-app
netlify deploy --prod --dir dist
```

Your mobile app will be available at:
`https://your-app-name.netlify.app`

---

## 4️⃣ Update CORS Settings

### Backend CORS Update
Edit `backend/src/server.ts` and update CORS origins:

```typescript
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://your-admin-portal.vercel.app',
      'https://your-mobile-app.netlify.app'
    ]
  : ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:19006'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
```

Redeploy to Railway (push changes to GitHub).

---

## 🎯 Final URLs

After deployment, you'll have:

1. **Backend API**: `https://your-backend.up.railway.app`
2. **Admin Portal**: `https://your-admin-portal.vercel.app`
3. **Mobile App**: `https://your-mobile-app.netlify.app`

## 🧪 Testing Deployment

### Test Backend
Visit: `https://your-backend.up.railway.app/health`
Should return: `{"status":"OK","timestamp":"...","uptime":...}`

### Test Admin Portal
1. Visit your Vercel URL
2. Login with `admin` / `admin123`
3. Check Reports page - should show Indian data with Jharkhand locations

### Test Mobile App
1. Visit your Netlify URL
2. Should show mobile interface
3. Test creating a new report

---

## 🔐 Security Notes

1. **Change JWT_SECRET** in production to a random 32+ character string
2. **Setup real SMTP** email service (Gmail, SendGrid, etc.)
3. **Setup AWS S3** for file uploads (optional but recommended)
4. **Enable SSL** (automatically handled by all platforms)

---

## 💡 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check that Railway PostgreSQL is running
   - Verify DATABASE_URL environment variable

2. **CORS Error**
   - Update CORS origins in backend to include your frontend URLs

3. **Mobile App API Calls Fail**
   - Ensure API_BASE_URL points to correct admin portal URL

4. **Build Failures**
   - Check that all dependencies are in the right place
   - Verify TypeScript compiles locally first

---

## 🚀 You're Live!

Your Civic Issue Tracker is now deployed to the cloud with:
- ✅ Indian names and Jharkhand locations
- ✅ Full authentication system
- ✅ Real database persistence
- ✅ Mobile and web interfaces
- ✅ Production-ready infrastructure

Share your URLs and start collecting civic issues! 🏛️
