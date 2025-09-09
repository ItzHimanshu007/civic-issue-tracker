# Civic Issue Tracker API Documentation

## Base URL
- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

## Authentication

### Send OTP
```http
POST /auth/send-otp
Content-Type: application/json

{
  "phoneNumber": "+1234567890"
}
```

### Verify OTP
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "otp": "123456"
}
```

### Google OAuth Login
```http
POST /auth/google
Content-Type: application/json

{
  "googleToken": "google_oauth_token"
}
```

## Reports

### Get All Reports
```http
GET /reports?category=POTHOLE&status=SUBMITTED&priority=URGENT
Authorization: Bearer <token>
```

### Create Report
```http
POST /reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Pothole on Main Street",
  "description": "Large pothole causing vehicle damage",
  "category": "POTHOLE",
  "priority": "URGENT",
  "location": {
    "latitude": 40.7589,
    "longitude": -73.9851
  },
  "address": "123 Main St, New York, NY",
  "images": ["base64_image_1", "base64_image_2"]
}
```

### Get Report Details
```http
GET /reports/:id
Authorization: Bearer <token>
```

### Update Report Status (Staff only)
```http
PATCH /reports/:id/status
Authorization: Bearer <staff_token>
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "comment": "Assigned to repair crew"
}
```

### Upvote Report
```http
POST /reports/:id/upvote
Authorization: Bearer <token>
```

### Add Comment
```http
POST /reports/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "I can confirm this issue exists"
}
```

## Users

### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

### Update Profile
```http
PATCH /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Get User's Reports
```http
GET /users/reports
Authorization: Bearer <token>
```

## Departments

### Get All Departments
```http
GET /departments
Authorization: Bearer <staff_token>
```

### Get Department Stats
```http
GET /departments/:id/stats
Authorization: Bearer <staff_token>
```

## Analytics

### Get Overall Stats
```http
GET /analytics
Authorization: Bearer <staff_token>
```

### Get Category Breakdown
```http
GET /analytics/categories
Authorization: Bearer <staff_token>
```

### Get Resolution Times
```http
GET /analytics/resolution-times
Authorization: Bearer <staff_token>
```

## WebSocket Events

### Connection
```javascript
const socket = io('ws://localhost:3001');

// Join room for real-time updates
socket.emit('join-room', 'user-' + userId);
socket.emit('join-room', 'department-' + departmentId);
```

### Events
- `report-updated`: When a report status changes
- `new-comment`: When a comment is added to a report
- `report-assigned`: When a report is assigned to staff
- `notification`: General notifications

## Error Responses

All API endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "details": "Additional error details (development only)"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting
- 100 requests per 15 minutes per IP address
- Higher limits available for authenticated users

## File Upload
- Images: Max 5MB each, formats: JPEG, PNG, WebP
- Videos: Max 25MB each, formats: MP4, MOV
- Audio: Max 10MB each, formats: MP3, M4A, WAV
