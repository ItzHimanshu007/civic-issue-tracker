-- Add username column to users table for username/password authentication
ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE;

-- Create index for better performance
CREATE INDEX idx_users_username ON users(username);

-- Insert default admin user for development
INSERT INTO users (username, phone_number, email, name, role, is_verified, is_active)
VALUES (
  'admin',
  '+1234567890',
  'admin@example.com',
  'Admin User',
  'ADMIN',
  true,
  true
)
ON CONFLICT (phone_number) DO UPDATE SET
  username = EXCLUDED.username,
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified;
