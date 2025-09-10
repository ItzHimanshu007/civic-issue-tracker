#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ADMIN_PORTAL_URL = process.env.ADMIN_PORTAL_URL || 'https://your-admin-portal.vercel.app';
const API_FILE_PATH = path.join(__dirname, 'src/services/reportsService.ts');

console.log('🚀 Building Mobile App for Web Deployment');
console.log('=====================================');

// Step 1: Create production environment file
console.log('📝 Step 1: Setting up production environment...');

const envFilePath = path.join(__dirname, '.env.production');
const envContent = `NODE_ENV=production
EXPO_PUBLIC_API_URL=${ADMIN_PORTAL_URL}/api
`;

fs.writeFileSync(envFilePath, envContent);
console.log(`✅ Created .env.production with API URL: ${ADMIN_PORTAL_URL}/api`);

// Step 2: Build for web
console.log('🔨 Step 2: Building for web...');
try {
  execSync('npm run export:web', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Web build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 3: Instructions
console.log('\n🎉 Build Complete!');
console.log('=================');
console.log('📁 Your web build is ready in the `dist` folder');
console.log('\n🚀 Next Steps:');
console.log('1. Go to https://netlify.com');
console.log('2. Drag and drop the `dist` folder to deploy');
console.log('3. Or use: `netlify deploy --prod --dir dist`');
console.log('\n📱 Your mobile app will be available as a web app!');

console.log('\n💡 For local development, the app will use localhost automatically');
console.log('💡 The .env.production file is only used during web builds');
