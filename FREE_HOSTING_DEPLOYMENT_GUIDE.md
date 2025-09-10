# 🚀 FREE HOSTING DEPLOYMENT GUIDE
## Complete Civic Issue Tracker Platform

Deploy your entire civic issue tracker (Backend + Database + Admin Portal + Mobile App) completely **FREE** using modern cloud services.

---

## 🎯 **Deployment Architecture**

```
🌐 PRODUCTION ARCHITECTURE
├── 🗄️ Database: Supabase PostgreSQL (Free)
├── 🔧 Backend API: Railway.app (Free)  
├── 🖥️ Admin Portal: Vercel (Free)
├── 📱 Mobile App: Expo + Netlify (Free)
└── 🔗 Domain: Custom domain (Optional)
```

---

## 📋 **Free Services We'll Use**

| Component | Service | Free Tier | Why This Service |
|-----------|---------|-----------|------------------|
| **Database** | Supabase | 500MB + 2 concurrent connections | PostgreSQL + real-time features |
| **Backend** | Railway.app | $5 monthly credit | Easy deployment + database integration |
| **Admin Portal** | Vercel | Unlimited static sites | Perfect for Next.js |
| **Mobile App** | Expo + Netlify | Unlimited builds | Web app + mobile distribution |
| **Domain** | Free subdomain | Included | Professional URLs |

---

## 🗄️ **STEP 1: Setup Database (Supabase)**

### **Create Supabase Account:**
1. Go to [supabase.com](https://supabase.com)
2. **Sign up** with GitHub account
3. **Create new project:**
   - Name: `civic-issue-tracker`
   - Region: Choose closest to your users
   - Database Password: Generate strong password

### **Database Setup:**
4. **Go to SQL Editor** in Supabase dashboard
5. **Create our tables:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE,
  phone_number VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'STAFF')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENT', 'CRITICAL')),
  status VARCHAR(20) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  department_id UUID,
  upvotes INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User upvotes table
CREATE TABLE user_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  report_id UUID REFERENCES reports(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, report_id)
);

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **Insert Sample Data:**
```sql
-- Insert admin user
INSERT INTO users (name, username, email, role, is_verified) VALUES 
('System Administrator', 'admin', 'admin@civictracker.com', 'ADMIN', true);

-- Insert sample users with Hindi names
INSERT INTO users (name, username, phone_number, role, is_verified) VALUES 
('सुनीता देवी', 'sunita_devi', '+91-9876543210', 'USER', true),
('अनिल प्रसाद', 'anil_prasad', '+91-9876543211', 'USER', true),
('राज कुमार', 'raj_kumar', '+91-9876543212', 'USER', true),
('प्रीति मिश्रा', 'preeti_mishra', '+91-9876543213', 'USER', true);

-- Insert departments
INSERT INTO departments (name, description) VALUES 
('Road Maintenance Department', 'Responsible for road repairs and maintenance'),
('Electrical Department', 'Manages street lights and electrical infrastructure'),
('Sanitation Department', 'Handles garbage collection and cleanliness'),
('Water Supply Department', 'Manages water supply and sewage systems'),
('Traffic Police Department', 'Manages traffic signals and traffic flow'),
('Parks and Recreation Department', 'Maintains parks and public spaces');

-- Insert sample reports with Hindi content
INSERT INTO reports (title, description, category, latitude, longitude, address, user_id, upvotes) 
SELECT 
  'रांची में बड़ा गड्ढा',
  'Main Road Ranchi में बहुत बड़ा गड्ढा है जो दुर्घटना का कारण बन रहा है।',
  'POTHOLE',
  23.3441,
  85.3096,
  'Main Road, Ranchi, Jharkhand 834001',
  u.id,
  142
FROM users u WHERE u.username = 'raj_kumar';

INSERT INTO reports (title, description, category, latitude, longitude, address, user_id, upvotes, status) 
SELECT 
  'Street Light Issue in Morabadi',
  'मोराबादी क्षेत्र में लगभग 10 स्ट्रीट लाइट्स खराब हैं। रात में अंधेरा होजाता है।',
  'STREETLIGHT',
  23.3441,
  85.3096,
  'Morabadi, Ranchi, Jharkhand 834001',
  u.id,
  89,
  'ACKNOWLEDGED'
FROM users u WHERE u.username = 'sunita_devi';
```

### **Get Database Credentials:**
6. Go to **Settings → Database**
7. **Copy connection details:**
   - Host, Database name, Port, User, Password
   - **Connection string** for easy setup

---

## 🔧 **STEP 2: Deploy Backend API (Railway)**

### **Setup Railway Account:**
1. Go to [railway.app](https://railway.app)
2. **Sign up** with GitHub account  
3. **Connect your GitHub repository**

### **Deploy Backend:**
4. **Create new project** on Railway
5. **Select "Deploy from GitHub repo"**
6. **Choose your `civic-issue-tracker` repository**
7. **Select backend folder** as root directory

### **Environment Variables:**
8. **Add environment variables** in Railway dashboard:

```env
# Database Configuration
DATABASE_URL=your_supabase_connection_string
DB_HOST=your_supabase_host
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password
DB_SSL=true

# JWT Configuration  
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key

# CORS Configuration
FRONTEND_URL=https://your-admin-portal.vercel.app
MOBILE_URL=https://your-mobile-app.netlify.app

# Server Configuration
NODE_ENV=production
PORT=3001
```

### **Railway Configuration:**
9. **Create `railway.json`** in your backend folder:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### **Backend Modifications:**
10. **Update your backend `package.json`:**

```json
{
  "scripts": {
    "start": "node server.js",
    "build": "npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 🖥️ **STEP 3: Deploy Admin Portal (Vercel)**

### **Setup Vercel Account:**
1. Go to [vercel.com](https://vercel.com)
2. **Sign up** with GitHub account
3. **Import your repository**

### **Deploy Admin Portal:**
4. **Create new project** from GitHub
5. **Select admin-portal folder** as root directory  
6. **Configure build settings:**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### **Environment Variables:**
7. **Add environment variables** in Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NODE_ENV=production
```

### **Vercel Configuration:**
8. **Create `vercel.json`** in admin-portal folder:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
      ]
    }
  ]
}
```

---

## 📱 **STEP 4: Deploy Mobile App (Expo + Netlify)**

### **Publish to Expo:**
1. **Install Expo CLI globally:**
   ```bash
   npm install -g @expo/cli
   ```

2. **Login to Expo:**
   ```bash
   expo login
   ```

3. **Configure app.json:**
   ```json
   {
     "expo": {
       "name": "Civic Tracker",
       "slug": "civic-tracker-mobile",
       "version": "1.0.0",
       "platforms": ["ios", "android", "web"],
       "web": {
         "bundler": "webpack"
       },
       "extra": {
         "apiUrl": "https://your-backend.railway.app"
       }
     }
   }
   ```

4. **Build and publish:**
   ```bash
   cd mobile-app
   expo publish
   ```

### **Deploy Web Version to Netlify:**
5. **Build web version:**
   ```bash
   expo build:web
   ```

6. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - **Drag and drop** the `web-build` folder
   - Or connect GitHub for automatic deployments

---

## 🔗 **STEP 5: Connect Everything Together**

### **Update API URLs:**

1. **Admin Portal** (Update `.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

2. **Mobile App** (Update API configuration):
   ```javascript
   // In your API service file
   const API_BASE_URL = 'https://your-backend.railway.app';
   ```

3. **Backend CORS** (Update backend):
   ```javascript
   // In your backend server.js
   app.use(cors({
     origin: [
       'https://your-admin-portal.vercel.app',
       'https://your-mobile-app.netlify.app',
       'https://your-mobile-app.expo.dev'
     ],
     credentials: true
   }));
   ```

---

## 🎯 **STEP 6: Custom Domains (Optional)**

### **Professional URLs:**
- **Admin Portal:** `admin.civictracker.your-domain.com`
- **Mobile App:** `app.civictracker.your-domain.com`  
- **API:** `api.civictracker.your-domain.com`

### **Setup Custom Domains:**
1. **Buy domain** from Namecheap/GoDaddy (~$10/year)
2. **Add custom domain** in each service dashboard
3. **Configure DNS** records to point to hosting services

---

## 💰 **Cost Breakdown**

| Service | Cost | Usage Limits |
|---------|------|--------------|
| **Supabase** | FREE | 500MB DB, 2 concurrent connections |
| **Railway** | FREE | $5/month credit (usually enough) |
| **Vercel** | FREE | 100GB bandwidth, unlimited deployments |
| **Netlify** | FREE | 100GB bandwidth, 300 build minutes |
| **Expo** | FREE | Unlimited publishes and builds |
| **Domain (Optional)** | $10-15/year | Your own .com domain |
| **TOTAL** | **$0-15/year** | Professional platform |

---

## 🚀 **STEP 7: Deployment Commands**

### **Quick Deployment Script:**

Create `deploy.sh` in your root directory:

```bash
#!/bin/bash

echo "🚀 Deploying Civic Issue Tracker Platform"

# Deploy Backend (Railway auto-deploys on git push)
echo "📤 Pushing to GitHub (triggers Railway deployment)"
git add .
git commit -m "Production deployment"
git push origin main

# Deploy Admin Portal (Vercel auto-deploys)
echo "🖥️ Admin Portal will auto-deploy via Vercel GitHub integration"

# Deploy Mobile App
echo "📱 Publishing mobile app to Expo"
cd mobile-app
expo publish

# Build web version
echo "🌐 Building web version"
expo build:web

echo "✅ All deployments initiated!"
echo "🔗 Check your deployment URLs:"
echo "   Backend: https://your-app.railway.app"
echo "   Admin: https://your-admin.vercel.app"  
echo "   Mobile: https://expo.dev/@your-username/civic-tracker-mobile"
```

---

## 🧪 **STEP 8: Testing Production**

### **Test Checklist:**
- [ ] **Database:** Can create/read users and reports
- [ ] **Backend API:** All endpoints responding correctly
- [ ] **Admin Portal:** Login, view reports, upvoting works
- [ ] **Mobile App:** Can access via web and mobile
- [ ] **Integration:** Data flows between all components
- [ ] **Authentication:** Login/logout functioning
- [ ] **Real-time Features:** Upvotes sync across platforms

### **Test URLs:**
```
🗄️ Database: https://app.supabase.com/project/your-project
🔧 Backend API: https://your-backend.railway.app/api/health
🖥️ Admin Portal: https://your-admin.vercel.app
📱 Mobile Web: https://your-mobile.netlify.app
📱 Mobile App: https://expo.dev/@username/civic-tracker-mobile
```

---

## 🎉 **Success! Your Platform is Live**

### **What You Now Have:**
- ✅ **Professional civic engagement platform**
- ✅ **Completely free hosting** (except optional domain)
- ✅ **Scalable architecture** ready for growth
- ✅ **Real-time synchronization** between all components
- ✅ **Mobile and web access** for citizens and administrators
- ✅ **Production-ready** with monitoring and analytics

### **Share Your Platform:**
```
🌐 Admin Portal: https://your-admin.vercel.app
📱 Mobile App: https://your-mobile.netlify.app
📋 API Docs: https://your-backend.railway.app/api/docs
🏛️ For Municipal Governments: Ready for real deployment!
```

### **Next Steps:**
1. **Share with stakeholders** for feedback
2. **Add more features** as needed
3. **Scale up** hosting tiers when you get users
4. **Custom domain** for professional branding
5. **Municipal partnerships** for real-world deployment

---

**🎯 Congratulations! You now have a complete, production-ready civic engagement platform deployed for free and accessible to anyone on the internet!** 🚀🌐✨

Your civic issue tracker is ready to serve real communities with professional hosting, authentic Indian content, and modern technology - all completely free! 🇮🇳
