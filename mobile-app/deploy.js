#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ADMIN_PORTAL_URL = process.env.ADMIN_PORTAL_URL || 'https://your-admin-portal.vercel.app';
const API_FILE_PATH = path.join(__dirname, 'src/services/reportsService.ts');

console.log('🚀 Building Mobile App for Web Deployment');
console.log('=====================================');

// Step 1: Update API URL
console.log('📝 Step 1: Updating API URL...');

if (!fs.existsSync(API_FILE_PATH)) {
  console.error(`❌ File not found: ${API_FILE_PATH}`);
  process.exit(1);
}

let apiFileContent = fs.readFileSync(API_FILE_PATH, 'utf8');

// Replace localhost URL with production URL
const oldUrl = "const API_BASE_URL = 'http://localhost:3000/api';";
const newUrl = `const API_BASE_URL = '${ADMIN_PORTAL_URL}/api';`;

if (apiFileContent.includes(oldUrl)) {
  apiFileContent = apiFileContent.replace(oldUrl, newUrl);
  fs.writeFileSync(API_FILE_PATH, apiFileContent);
  console.log(`✅ Updated API URL to: ${ADMIN_PORTAL_URL}/api`);
} else {
  console.log('⚠️  API URL already updated or not found. Continuing...');
}

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

// Restore original API URL for local development
setTimeout(() => {
  console.log('\n🔄 Restoring localhost API URL for local development...');
  const originalUrl = "const API_BASE_URL = 'http://localhost:3000/api';";
  apiFileContent = apiFileContent.replace(newUrl, originalUrl);
  fs.writeFileSync(API_FILE_PATH, apiFileContent);
  console.log('✅ Restored localhost API URL');
}, 1000);
