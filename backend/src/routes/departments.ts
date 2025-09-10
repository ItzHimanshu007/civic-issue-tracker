import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { query, withTransaction } from '../utils/database';

const router = Router();

// Validation schemas
const createDepartmentSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).optional(),
  contactEmail: Joi.string().email().optional(),
  contactPhone: Joi.string().max(20).optional(),
});

const createStaffSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  departmentId: Joi.string().uuid().required(),
  employeeId: Joi.string().max(50).optional(),
  position: Joi.string().max(100).optional(),
});

// GET /api/departments - list all departments
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT d.*, 
              COUNT(s.id) as staff_count,
              COUNT(r.id) as active_reports
       FROM departments d
       LEFT JOIN staff s ON d.id = s.department_id AND s.is_active = true
       LEFT JOIN reports r ON d.id = r.department_id AND r.status IN ('SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS')
       WHERE d.is_active = true
       GROUP BY d.id
       ORDER BY d.name`
    );
    
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// POST /api/departments - create new department
router.post('/', authenticateToken, authorizeRoles('ADMIN'), async (req: Request, res: Response) => {
  const { error, value } = createDepartmentSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  try {
    const result = await query(
      `INSERT INTO departments (name, description, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [value.name, value.description || null, value.contactEmail || null, value.contactPhone || null]
    );
    
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Department name already exists' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to create department' });
    }
  }
});

// GET /api/departments/:id - get department details
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const deptResult = await query(
      'SELECT * FROM departments WHERE id = $1 AND is_active = true',
      [id]
    );
    
    if (deptResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    
    // Get staff members
    const staffResult = await query(
      `SELECT s.*, u.name, u.email, u.phone_number
       FROM staff s
       JOIN users u ON s.user_id = u.id
       WHERE s.department_id = $1 AND s.is_active = true
       ORDER BY u.name`,
      [id]
    );
    
    const department = {
      ...deptResult.rows[0],
      staff: staffResult.rows,
    };
    
    return res.json({ success: true, data: department });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch department' });
  }
});

// PUT /api/departments/:id - update department
router.put('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error, value } = createDepartmentSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });

  try {
    const result = await query(
      `UPDATE departments 
       SET name = $1, description = $2, contact_email = $3, contact_phone = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND is_active = true
       RETURNING *`,
      [value.name, value.description || null, value.contactEmail || null, value.contactPhone || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update department' });
  }
});

// DELETE /api/departments/:id - deactivate department
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      'UPDATE departments SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    
    // Also deactivate all staff in the department
    await query(
      'UPDATE staff SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE department_id = $1',
      [id]
    );
    
    return res.json({ success: true, message: 'Department deactivated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to deactivate department' });
  }
});

// POST /api/departments/:id/staff - add staff to department
router.post('/:id/staff', authenticateToken, authorizeRoles('ADMIN'), async (req: Request, res: Response) => {
  const { id: departmentId } = req.params;
  const { error, value } = createStaffSchema.validate({ ...req.body, departmentId });
  if (error) return res.status(400).json({ success: false, message: error.message });

  try {
    const result = await withTransaction(async (client) => {
      // Check if user exists and is not already staff
      const userCheck = await client.query(
        `SELECT u.id, u.name, s.id as staff_id
         FROM users u
         LEFT JOIN staff s ON u.id = s.user_id AND s.is_active = true
         WHERE u.id = $1 AND u.is_active = true`,
        [value.userId]
      );
      
      if (userCheck.rows.length === 0) {
        throw new Error('User not found');
      }
      
      if (userCheck.rows[0].staff_id) {
        throw new Error('User is already a staff member');
      }
      
      // Update user role to STAFF
      await client.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['STAFF', value.userId]
      );
      
      // Create staff record
      const staffResult = await client.query(
        `INSERT INTO staff (user_id, department_id, employee_id, position)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [value.userId, departmentId, value.employeeId || null, value.position || null]
      );
      
      return staffResult.rows[0];
    });
    
    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to add staff' });
  }
});

// DELETE /api/departments/:id/staff/:staffId - remove staff from department
router.delete('/:id/staff/:staffId', authenticateToken, authorizeRoles('ADMIN'), async (req: Request, res: Response) => {
  const { id: departmentId, staffId } = req.params;
  
  try {
    const result = await withTransaction(async (client) => {
      // Get staff user ID
      const staffResult = await client.query(
        'SELECT user_id FROM staff WHERE id = $1 AND department_id = $2',
        [staffId, departmentId]
      );
      
      if (staffResult.rows.length === 0) {
        throw new Error('Staff member not found');
      }
      
      const userId = staffResult.rows[0].user_id;
      
      // Deactivate staff record
      await client.query(
        'UPDATE staff SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [staffId]
      );
      
      // Update user role back to CITIZEN
      await client.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['CITIZEN', userId]
      );
      
      return true;
    });
    
    res.json({ success: true, message: 'Staff member removed' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to remove staff' });
  }
});

export default router;
