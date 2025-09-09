# Civic Issue Tracker - Local Development Setup Script

Write-Host "🚀 Civic Issue Tracker Setup" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check Node.js installation
Write-Host "`n1. Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "`n2. Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not working. Please reinstall Node.js" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`n3. Installing dependencies..." -ForegroundColor Yellow

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location "backend"
npm install
Set-Location ".."

Write-Host "Installing admin portal dependencies..." -ForegroundColor Cyan
Set-Location "admin-portal"
npm install
Set-Location ".."

Write-Host "Installing mobile app dependencies..." -ForegroundColor Cyan
Set-Location "mobile-app"
npm install
Set-Location ".."

# Setup environment files
Write-Host "`n4. Setting up environment files..." -ForegroundColor Yellow

if (!(Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ Created backend/.env from template" -ForegroundColor Green
    Write-Host "⚠️  Please edit backend/.env with your database credentials" -ForegroundColor Yellow
} else {
    Write-Host "✅ backend/.env already exists" -ForegroundColor Green
}

# Display next steps
Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Set up PostgreSQL database (install from https://www.postgresql.org/)" -ForegroundColor White
Write-Host "2. Edit backend/.env with your database credentials" -ForegroundColor White
Write-Host "3. Run: cd backend && npm run db:migrate" -ForegroundColor White
Write-Host "4. Start backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "5. Start admin portal: cd admin-portal && npm run dev" -ForegroundColor White
Write-Host "`nUrls:" -ForegroundColor Yellow
Write-Host "- Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "- Admin Portal: http://localhost:3000" -ForegroundColor Cyan
Write-Host "- API Health: http://localhost:3001/health" -ForegroundColor Cyan

Write-Host "`n📝 Quick Start Commands:" -ForegroundColor Green
Write-Host "npm run install:all    # Install all dependencies" -ForegroundColor Gray
Write-Host "npm run dev           # Start all services" -ForegroundColor Gray
Write-Host "npm run dev:backend   # Start only backend" -ForegroundColor Gray
Write-Host "npm run dev:admin     # Start only admin portal" -ForegroundColor Gray
