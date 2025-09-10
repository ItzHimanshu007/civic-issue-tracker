-- Insert sample departments
INSERT INTO departments (id, name, description, contact_email, contact_phone) VALUES
  (uuid_generate_v4(), 'Roads & Transportation', 'Responsible for road maintenance, potholes, and traffic signals', 'roads@ranchi.gov.in', '+91-651-2234567'),
  (uuid_generate_v4(), 'Public Works', 'Handles streetlights, parks, and general infrastructure', 'publicworks@ranchi.gov.in', '+91-651-2234568'),
  (uuid_generate_v4(), 'Waste Management', 'Manages garbage collection and disposal', 'waste@ranchi.gov.in', '+91-651-2234569'),
  (uuid_generate_v4(), 'Water & Sewage', 'Handles water leaks and sewage issues', 'water@ranchi.gov.in', '+91-651-2234570'),
  (uuid_generate_v4(), 'Environmental Health', 'Manages noise complaints and environmental issues', 'environment@ranchi.gov.in', '+91-651-2234571');

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
  (uuid_generate_v4(), '+91-9876543210', 'rajesh.kumar@gmail.com', 'Rajesh Kumar', 'CITIZEN', true, 150),
  (uuid_generate_v4(), '+91-9876543211', 'priya.sharma@gmail.com', 'Priya Sharma', 'CITIZEN', true, 230),
  (uuid_generate_v4(), '+91-9876543212', 'amit.singh@gmail.com', 'Amit Singh', 'CITIZEN', true, 75),
  (uuid_generate_v4(), '+91-9876543213', 'sunita.devi@gmail.com', 'Sunita Devi', 'CITIZEN', true, 320),
  (uuid_generate_v4(), '+91-9876543214', 'vikash.mahato@gmail.com', 'Vikash Mahato', 'CITIZEN', true, 180);

-- Insert sample admin/staff users
INSERT INTO users (id, phone_number, email, name, role, is_verified, points) VALUES
  (uuid_generate_v4(), '+91-651-2221001', 'admin@ranchi.gov.in', 'Ranjan Kumar Sinha', 'ADMIN', true, 0),
  (uuid_generate_v4(), '+91-651-2221002', 'roads.supervisor@ranchi.gov.in', 'Deepak Kumar Pandey', 'STAFF', true, 0),
  (uuid_generate_v4(), '+91-651-2221003', 'public.works@ranchi.gov.in', 'Kavita Kumari', 'STAFF', true, 0),
  (uuid_generate_v4(), '+91-651-2221004', 'waste.manager@ranchi.gov.in', 'Santosh Kumar Prasad', 'STAFF', true, 0);

-- Link staff to departments
WITH dept_roads AS (SELECT id FROM departments WHERE name = 'Roads & Transportation' LIMIT 1),
     dept_public AS (SELECT id FROM departments WHERE name = 'Public Works' LIMIT 1),
     dept_waste AS (SELECT id FROM departments WHERE name = 'Waste Management' LIMIT 1),
     user_roads AS (SELECT id FROM users WHERE email = 'roads.supervisor@ranchi.gov.in' LIMIT 1),
     user_public AS (SELECT id FROM users WHERE email = 'public.works@ranchi.gov.in' LIMIT 1),
     user_waste AS (SELECT id FROM users WHERE email = 'waste.manager@ranchi.gov.in' LIMIT 1)
INSERT INTO staff (user_id, department_id, employee_id, position) VALUES
  ((SELECT id FROM user_roads), (SELECT id FROM dept_roads), 'EMP001', 'Assistant Engineer (Roads)'),
  ((SELECT id FROM user_public), (SELECT id FROM dept_public), 'EMP002', 'Executive Engineer (Public Works)'),
  ((SELECT id FROM user_waste), (SELECT id FROM dept_waste), 'EMP003', 'Sanitation Inspector');

-- Insert sample reports
WITH user1 AS (SELECT id FROM users WHERE email = 'rajesh.kumar@gmail.com' LIMIT 1),
     user2 AS (SELECT id FROM users WHERE email = 'priya.sharma@gmail.com' LIMIT 1),
     user3 AS (SELECT id FROM users WHERE email = 'amit.singh@gmail.com' LIMIT 1),
     user4 AS (SELECT id FROM users WHERE email = 'sunita.devi@gmail.com' LIMIT 1),
     dept_roads AS (SELECT id FROM departments WHERE name = 'Roads & Transportation' LIMIT 1),
     dept_public AS (SELECT id FROM departments WHERE name = 'Public Works' LIMIT 1),
     dept_waste AS (SELECT id FROM departments WHERE name = 'Waste Management' LIMIT 1)
INSERT INTO reports (id, user_id, department_id, title, description, category, priority, status, latitude, longitude, address, upvotes, created_at) VALUES
  (uuid_generate_v4(), (SELECT id FROM user1), (SELECT id FROM dept_roads), 'Bada Gaddha Main Road Par', 'Main Road par Kutchery Chowk ke paas ek bahut bada gaddha hai jisse gadiyon ko nuksan ho raha hai.', 'POTHOLE', 'URGENT', 'ACKNOWLEDGED', 23.3441, 85.3096, 'Main Road, Kutchery Chowk, Ranchi, Jharkhand 834001', 12, NOW() - INTERVAL '2 hours'),
  (uuid_generate_v4(), (SELECT id FROM user2), (SELECT id FROM dept_public), 'Oxygen Park Mein Tooti Street Light', 'Oxygen Park ke children play area ke paas ki street light pichle hafte se band hai.', 'STREETLIGHT', 'NORMAL', 'IN_PROGRESS', 23.3569, 85.3094, 'Oxygen Park, Morabadi, Ranchi, Jharkhand 834008', 8, NOW() - INTERVAL '4 hours'),
  (uuid_generate_v4(), (SELECT id FROM user3), (SELECT id FROM dept_waste), 'Bus Stand Par Koode Ka Dher', 'Upper Bazaar Bus Stand par dustbin bhar gaya hai aur bahut gandagi fail rahi hai.', 'GARBAGE', 'NORMAL', 'RESOLVED', 23.3615, 85.3203, 'Upper Bazaar Bus Stand, Ranchi, Jharkhand 834001', 15, NOW() - INTERVAL '1 day'),
  (uuid_generate_v4(), (SELECT id FROM user4), (SELECT id FROM dept_roads), 'Traffic Signal Ki Kharabi', 'Albert Ekka Chowk par traffic light sahi se kaam nahi kar raha hai. Bahut jam ho raha hai.', 'TRAFFIC_SIGNAL', 'CRITICAL', 'SUBMITTED', 23.3441, 85.3096, 'Albert Ekka Chowk, Main Road, Ranchi, Jharkhand 834001', 25, NOW() - INTERVAL '30 minutes'),
  (uuid_generate_v4(), (SELECT id FROM user1), (SELECT id FROM dept_public), 'Rock Garden Mein Tooti Bench', 'Rock Garden ke pond ke paas wali bench toot gayi hai aur repair ki jarurat hai.', 'PARK_MAINTENANCE', 'NORMAL', 'ACKNOWLEDGED', 23.4241, 85.4419, 'Rock Garden, Gonda Hill, Ranchi, Jharkhand 834003', 5, NOW() - INTERVAL '6 hours');

-- Insert some sample comments
WITH report1 AS (SELECT id FROM reports WHERE title = 'Bada Gaddha Main Road Par' LIMIT 1),
     report2 AS (SELECT id FROM reports WHERE title = 'Oxygen Park Mein Tooti Street Light' LIMIT 1),
     user1 AS (SELECT id FROM users WHERE email = 'rajesh.kumar@gmail.com' LIMIT 1),
     user2 AS (SELECT id FROM users WHERE email = 'priya.sharma@gmail.com' LIMIT 1),
     staff1 AS (SELECT id FROM users WHERE email = 'roads.supervisor@ranchi.gov.in' LIMIT 1)
INSERT INTO comments (report_id, user_id, content, is_internal, created_at) VALUES
  ((SELECT id FROM report1), (SELECT id FROM user2), 'Haan bilkul sahi keh rahe hain! Mere scooter ka tyre bhi kharab ho gaya tha yahan se nikalte time.', false, NOW() - INTERVAL '1 hour'),
  ((SELECT id FROM report1), (SELECT id FROM staff1), 'Report received. Repair team ko kal subah bhej diya jayega. Work within 2 days complete ho jayega.', true, NOW() - INTERVAL '30 minutes'),
  ((SELECT id FROM report2), (SELECT id FROM user1), 'Yeh bahut safety issue hai. Raat ko yahan se jaane mein dar lagta hai.', false, NOW() - INTERVAL '3 hours');

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
