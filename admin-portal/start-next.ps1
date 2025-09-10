# Remove npm from PATH temporarily to avoid internal npm calls
$env:PATH = $env:PATH -replace "[^;]*npm[^;]*;?", ""
$env:PATH = $env:PATH -replace "[^;]*nodejs[^;]*;?", ""

# Add only node.exe to PATH
$env:PATH = "C:\Program Files\nodejs;$env:PATH"

# Start Next.js server directly
Write-Host "Starting Next.js dev server..."
node .\node_modules\next\dist\bin\next dev --port 3003
