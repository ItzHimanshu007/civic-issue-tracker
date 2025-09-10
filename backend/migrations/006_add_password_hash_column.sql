-- Add password_hash column to users table for authentication
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Create index for better performance on password queries
CREATE INDEX idx_users_password_hash ON users(password_hash);
