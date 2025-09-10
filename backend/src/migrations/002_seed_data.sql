-- Insert sample departments
INSERT INTO departments (id, name, description, contact_email, contact_phone) VALUES
  (uuid_generate_v4(), 'Roads & Transportation', 'Responsible for road maintenance, potholes, and traffic signals', 'roads@city.gov', '+1-555-0101'),
  (uuid_generate_v4(), 'Public Works', 'Handles streetlights, parks, and general infrastructure', 'publicworks@city.gov', '+1-555-0102'),
  (uuid_generate_v4(), 'Waste Management', 'Manages garbage collection and disposal', 'waste@city.gov', '+1-555-0103'),
  (uuid_generate_v4(), 'Water & Sewage', 'Handles water leaks and sewage issues', 'water@city.gov', '+1-555-0104'),
  (uuid_generate_v4(), 'Environmental Health', 'Manages noise complaints and environmental issues', 'environment@city.gov', '+1-555-0105');

-- Insert sample badges
INSERT INTO badges (id, name, description, points_required, icon_url) VALUES
  (uuid_generate_v4(), 'First Reporter', 'Submitted your first civic issue report', 0, '/badges/first-reporter.svg'),
  (uuid_generate_v4(), 'Active Citizen', 'Submitted 10 issue reports', 100, '/badges/active-citizen.svg'),
  (uuid_generate_v4(), 'Community Guardian', 'Submitted 50 issue reports', 500, '/badges/community-guardian.svg'),
  (uuid_generate_v4(), 'Civic Hero', 'Submitted 100 issue reports', 1000, '/badges/civic-hero.svg'),
  (uuid_generate_v4(), 'Helpful Neighbor', 'Upvoted 25 community reports', 50, '/badges/helpful-neighbor.svg'),
  (uuid_generate_v4(), 'Verifier', 'Verified 10 community reports', 75, '/badges/verifier.svg'),
  (uuid_generate_v4(), 'Commenter', 'Left 20 helpful comments on reports', 40, '/badges/commenter.svg');

-- Insert sample users (citizens)
INSERT INTO users (id, phone_number, email, name, role, is_verified, points) VALUES
  (uuid_generate_v4(), '+1-555-1001', 'john.doe@email.com', 'John Doe', 'CITIZEN', true, 150),
  (uuid_generate_v4(), '+1-555-1002', 'jane.smith@email.com', 'Jane Smith', 'CITIZEN', true, 230),
  (uuid_generate_v4(), '+1-555-1003', 'mike.johnson@email.com', 'Mike Johnson', 'CITIZEN', true, 75),
  (uuid_generate_v4(), '+1-555-1004', 'sarah.wilson@email.com', 'Sarah Wilson', 'CITIZEN', true, 320),
  (uuid_generate_v4(), '+1-555-1005', 'david.brown@email.com', 'David Brown', 'CITIZEN', true, 180);

-- Insert sample admin/staff users
INSERT INTO users (id, phone_number, email, name, role, is_verified, points) VALUES
  (uuid_generate_v4(), '+1-555-2001', 'admin@city.gov', 'City Administrator', 'ADMIN', true, 0),
  (uuid_generate_v4(), '+1-555-2002', 'roads.supervisor@city.gov', 'Roads Supervisor', 'STAFF', true, 0),
  (uuid_generate_v4(), '+1-555-2003', 'public.works@city.gov', 'Public Works Manager', 'STAFF', true, 0),
  (uuid_generate_v4(), '+1-555-2004', 'waste.manager@city.gov', 'Waste Management Coordinator', 'STAFF', true, 0);

-- Link staff to departments
WITH dept_roads AS (SELECT id FROM departments WHERE name = 'Roads & Transportation' LIMIT 1),
     dept_public AS (SELECT id FROM departments WHERE name = 'Public Works' LIMIT 1),
     dept_waste AS (SELECT id FROM departments WHERE name = 'Waste Management' LIMIT 1),
     user_roads AS (SELECT id FROM users WHERE email = 'roads.supervisor@city.gov' LIMIT 1),
     user_public AS (SELECT id FROM users WHERE email = 'public.works@city.gov' LIMIT 1),
     user_waste AS (SELECT id FROM users WHERE email = 'waste.manager@city.gov' LIMIT 1)
INSERT INTO staff (user_id, department_id, employee_id, position) VALUES
  ((SELECT id FROM user_roads), (SELECT id FROM dept_roads), 'EMP001', 'Roads Supervisor'),
  ((SELECT id FROM user_public), (SELECT id FROM dept_public), 'EMP002', 'Public Works Manager'),
  ((SELECT id FROM user_waste), (SELECT id FROM dept_waste), 'EMP003', 'Waste Management Coordinator');

-- Insert sample reports
WITH user1 AS (SELECT id FROM users WHERE email = 'john.doe@email.com' LIMIT 1),
     user2 AS (SELECT id FROM users WHERE email = 'jane.smith@email.com' LIMIT 1),
     user3 AS (SELECT id FROM users WHERE email = 'mike.johnson@email.com' LIMIT 1),
     user4 AS (SELECT id FROM users WHERE email = 'sarah.wilson@email.com' LIMIT 1),
     dept_roads AS (SELECT id FROM departments WHERE name = 'Roads & Transportation' LIMIT 1),
     dept_public AS (SELECT id FROM departments WHERE name = 'Public Works' LIMIT 1),
     dept_waste AS (SELECT id FROM departments WHERE name = 'Waste Management' LIMIT 1)
INSERT INTO reports (id, user_id, department_id, title, description, category, priority, status, latitude, longitude, address, upvotes, created_at) VALUES
  (uuid_generate_v4(), (SELECT id FROM user1), (SELECT id FROM dept_roads), 'Large pothole on Main Street', 'There is a large pothole near the intersection of Main St and 5th Ave that is causing damage to vehicles.', 'POTHOLE', 'URGENT', 'ACKNOWLEDGED', 40.7589, -73.9851, '123 Main St, New York, NY 10001', 12, NOW() - INTERVAL '2 hours'),
  (uuid_generate_v4(), (SELECT id FROM user2), (SELECT id FROM dept_public), 'Broken streetlight in park', 'The streetlight near the playground in Central Park has been out for over a week.', 'STREETLIGHT', 'NORMAL', 'IN_PROGRESS', 40.7829, -73.9654, 'Central Park, New York, NY 10024', 8, NOW() - INTERVAL '4 hours'),
  (uuid_generate_v4(), (SELECT id FROM user3), (SELECT id FROM dept_waste), 'Garbage overflow at bus stop', 'The garbage bin at the bus stop on Broadway is overflowing and creating a mess.', 'GARBAGE', 'NORMAL', 'RESOLVED', 40.7505, -73.9934, '456 Broadway, New York, NY 10013', 15, NOW() - INTERVAL '1 day'),
  (uuid_generate_v4(), (SELECT id FROM user4), (SELECT id FROM dept_roads), 'Traffic signal malfunction', 'The traffic light at the intersection of Park Ave and 42nd St is not working properly.', 'TRAFFIC_SIGNAL', 'CRITICAL', 'SUBMITTED', 40.7527, -73.9772, 'Park Ave & 42nd St, New York, NY 10017', 25, NOW() - INTERVAL '30 minutes'),
  (uuid_generate_v4(), (SELECT id FROM user1), (SELECT id FROM dept_public), 'Damaged park bench', 'The bench near the pond in Riverside Park is broken and needs repair.', 'PARK_MAINTENANCE', 'NORMAL', 'ACKNOWLEDGED', 40.7829, -73.9441, 'Riverside Park, New York, NY 10024', 5, NOW() - INTERVAL '6 hours');

-- Insert some sample comments
WITH report1 AS (SELECT id FROM reports WHERE title = 'Large pothole on Main Street' LIMIT 1),
     report2 AS (SELECT id FROM reports WHERE title = 'Broken streetlight in park' LIMIT 1),
     user1 AS (SELECT id FROM users WHERE email = 'john.doe@email.com' LIMIT 1),
     user2 AS (SELECT id FROM users WHERE email = 'jane.smith@email.com' LIMIT 1),
     staff1 AS (SELECT id FROM users WHERE email = 'roads.supervisor@city.gov' LIMIT 1)
INSERT INTO comments (report_id, user_id, content, is_internal, created_at) VALUES
  ((SELECT id FROM report1), (SELECT id FROM user2), 'I can confirm this pothole is really bad. Almost damaged my tire!', false, NOW() - INTERVAL '1 hour'),
  ((SELECT id FROM report1), (SELECT id FROM staff1), 'We have scheduled a repair crew for tomorrow morning.', true, NOW() - INTERVAL '30 minutes'),
  ((SELECT id FROM report2), (SELECT id FROM user1), 'This has been a safety concern for evening joggers.', false, NOW() - INTERVAL '3 hours');

-- Insert some sample upvotes
WITH reports_data AS (
  SELECT id, row_number() OVER (ORDER BY created_at) as rn
  FROM reports 
  LIMIT 3
),
users_data AS (
  SELECT id, row_number() OVER (ORDER BY created_at) as rn
  FROM users 
  WHERE role = 'CITIZEN'
  LIMIT 4
)
INSERT INTO upvotes (report_id, user_id)
SELECT r.id, u.id
FROM reports_data r
CROSS JOIN users_data u
WHERE u.rn <= (r.rn + 1);

-- Update upvotes count in reports table
UPDATE reports 
SET upvotes = (
  SELECT COUNT(*) 
  FROM upvotes 
  WHERE upvotes.report_id = reports.id
);

-- Insert some status history
WITH reports_data AS (
  SELECT id, user_id 
  FROM reports 
  WHERE status != 'SUBMITTED'
),
staff_user AS (SELECT id FROM users WHERE role = 'STAFF' LIMIT 1)
INSERT INTO status_history (report_id, changed_by_user_id, old_status, new_status, comment, created_at)
SELECT 
  r.id,
  (SELECT id FROM staff_user),
  'SUBMITTED',
  'ACKNOWLEDGED',
  'Report received and assigned to department',
  NOW() - INTERVAL '1 hour'
FROM reports_data r;
