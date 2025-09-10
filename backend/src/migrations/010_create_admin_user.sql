-- Create Admin User for Development/Testing
-- This migration creates an admin user that can be used to test the authentication flow

-- Insert admin user if not exists
INSERT INTO users (
    name, 
    phone_number, 
    email, 
    role, 
    is_verified, 
    is_active,
    created_at,
    updated_at
) VALUES (
    'System Admin',
    '+1234567890',
    'admin@civictracker.com',
    'ADMIN',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (phone_number) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = 'ADMIN',
    is_verified = true,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

-- Insert staff user for testing as well
INSERT INTO users (
    name, 
    phone_number, 
    email, 
    role, 
    is_verified, 
    is_active,
    created_at,
    updated_at
) VALUES (
    'Staff User',
    '+1234567891',
    'staff@civictracker.com',
    'STAFF',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (phone_number) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = 'STAFF',
    is_verified = true,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

-- Also create some test departments (only if they don't exist)
INSERT INTO departments (
    name,
    description,
    contact_email,
    contact_phone,
    is_active,
    created_at,
    updated_at
) 
SELECT name, description, contact_email, contact_phone, is_active, created_at, updated_at
FROM (
    VALUES 
        ('Public Works', 'Roads, water, waste management', 'publicworks@city.gov', '555-0001', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Parks & Recreation', 'Parks, playgrounds, recreational facilities', 'parks@city.gov', '555-0002', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Transportation', 'Traffic signals, street lights, public transit', 'transport@city.gov', '555-0003', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
) AS new_departments(name, description, contact_email, contact_phone, is_active, created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM departments 
    WHERE departments.name = new_departments.name
);
