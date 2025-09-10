@echo off
echo ========================================
echo PostgreSQL Setup for Civic Issue Tracker
echo ========================================
echo.

echo Step 1: Testing PostgreSQL installation...
psql --version
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL not found in PATH
    echo Please make sure PostgreSQL is installed and added to PATH
    echo You may need to restart your command prompt
    pause
    exit /b 1
)

echo.
echo Step 2: Creating database and user...
echo Please enter the password you set for the 'postgres' user during installation:

psql -U postgres -h localhost -c "CREATE DATABASE civic_tracker;"
if %errorlevel% neq 0 (
    echo Database may already exist, continuing...
)

psql -U postgres -h localhost -c "CREATE USER civic_user WITH PASSWORD 'civic_password';"
if %errorlevel% neq 0 (
    echo User may already exist, continuing...
)

psql -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE civic_tracker TO civic_user;"
psql -U postgres -h localhost -c "GRANT ALL ON SCHEMA public TO civic_user;"

echo.
echo Step 3: Testing connection with new user...
psql -U civic_user -h localhost -d civic_tracker -c "SELECT version();"

if %errorlevel% eq 0 (
    echo.
    echo ✅ SUCCESS: Database setup completed!
    echo Database: civic_tracker
    echo User: civic_user
    echo Password: civic_password
    echo Host: localhost
    echo Port: 5432
) else (
    echo ❌ ERROR: Failed to connect with civic_user
)

echo.
echo Press any key to continue...
pause
