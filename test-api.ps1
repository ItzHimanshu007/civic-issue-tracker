$body = @{
  title = "Mobile Test Report"
  description = "This is a test report from mobile app"
  category = "STREETLIGHT"
  priority = "NORMAL"
  latitude = 23.3441
  longitude = 85.3096
  address = "Test Location, Ranchi, Jharkhand"
} | ConvertTo-Json

Write-Host "Testing mobile report creation..."
Write-Host "Body: $body"

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/mobile" -Method POST -Body $body -ContentType "application/json"
  Write-Host "Success: $($response | ConvertTo-Json)"
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  Write-Host "Response: $($_.Exception.Response)"
}
