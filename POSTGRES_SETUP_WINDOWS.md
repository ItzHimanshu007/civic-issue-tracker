# PostgreSQL Installation Guide for Windows

## Method 1: Download from Official Site (Recommended)

1. **Download PostgreSQL:**
   - Go to https://www.postgresql.org/download/windows/
   - Download PostgreSQL 15.x or 16.x installer
   - Choose the Windows x86-64 version

2. **Run the Installer:**
   - Run the downloaded `.exe` file as Administrator
   - Follow the installation wizard:
     - Installation Directory: `C:\Program Files\PostgreSQL\15` (default)
     - Data Directory: `C:\Program Files\PostgreSQL\15\data` (default)
     - **Password**: Set a password for the postgres user (remember this!)
     - Port: `5432` (default)
     - Locale: Default locale

3. **Complete Installation:**
   - Install Stack Builder (optional)
   - Add PostgreSQL to PATH (usually done automatically)

## Method 2: Using Chocolatey (if you have it)

```powershell
# Install Chocolatey first if you don't have it
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install PostgreSQL
choco install postgresql15 -y
```

## Method 3: Using Scoop (if you have it)

```powershell
# Install Scoop first if you don't have it
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install PostgreSQL
scoop install postgresql
```

## After Installation - Setup Database

Open Command Prompt or PowerShell **as Administrator** and run:

```cmd
# Connect to PostgreSQL as superuser
psql -U postgres -h localhost

# In the PostgreSQL prompt, create database and user:
CREATE DATABASE civic_tracker;
CREATE USER civic_user WITH PASSWORD 'civic_password';
GRANT ALL PRIVILEGES ON DATABASE civic_tracker TO civic_user;
GRANT ALL ON SCHEMA public TO civic_user;

# Exit PostgreSQL
\q
```

## Test Connection

```cmd
# Test connection with the new user
psql -U civic_user -h localhost -d civic_tracker
```

## Windows Services

After installation, PostgreSQL should start automatically. To manage it:

1. **Windows Services:**
   - Press `Win + R`, type `services.msc`
   - Find "postgresql-x64-15" or similar
   - Right-click to Start/Stop/Restart

2. **Command Line:**
   ```cmd
   # Start PostgreSQL
   net start postgresql-x64-15
   
   # Stop PostgreSQL  
   net stop postgresql-x64-15
   ```

## Common Issues & Solutions

### Issue: `psql` command not found
**Solution:** Add PostgreSQL to PATH manually:
1. Open System Properties → Environment Variables
2. Add `C:\Program Files\PostgreSQL\15\bin` to PATH
3. Restart Command Prompt

### Issue: Connection refused
**Solution:** 
1. Check if PostgreSQL service is running
2. Verify port 5432 is not blocked by firewall
3. Check `pg_hba.conf` for authentication settings

### Issue: Password authentication failed
**Solution:** Reset postgres password:
```cmd
# As Windows Administrator
psql -U postgres
ALTER USER postgres PASSWORD 'newpassword';
```

## Next Steps

After PostgreSQL is installed and running:
1. Update `.env` file with your actual password
2. Run the migration script
3. Test the backend connection
