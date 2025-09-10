# Fix Node.js/npm PATH issues
Write-Host "Fixing Node.js/npm installation issues..." -ForegroundColor Yellow

# Get current PATH
$currentPath = $env:PATH

# Remove problematic npm bin path from PATH
$newPath = ($currentPath -split ';' | Where-Object { $_ -notmatch 'nodejs\\node_modules\\npm\\bin' }) -join ';'

# Update PATH for current session
$env:PATH = $newPath
Write-Host "Cleaned PATH for current session" -ForegroundColor Green

# Update system PATH permanently (requires admin)
try {
    [Environment]::SetEnvironmentVariable("PATH", $newPath, [EnvironmentVariableTarget]::User)
    Write-Host "Updated user PATH permanently" -ForegroundColor Green
} catch {
    Write-Warning "Could not update user PATH permanently. You may need admin privileges."
}

# Test npm
Write-Host "Testing npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "npm is working! Version: $npmVersion" -ForegroundColor Green
        return $true
    } else {
        Write-Host "npm still not working: $npmVersion" -ForegroundColor Red
        return $false
    }
} catch {
    Write-Host "npm test failed: $_" -ForegroundColor Red
    return $false
}
