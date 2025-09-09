import { Router, Request, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { query } from '../utils/database';
import { geoService } from '../services/geoService';

const router = Router();

// GET /api/analytics - general analytics
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [generalStats, geoStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total_reports,
          COUNT(CASE WHEN status = 'RESOLVED' OR status = 'CLOSED' THEN 1 END) as resolved_reports,
          COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END) as pending_reports,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_reports,
          COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) as critical_reports,
          COUNT(CASE WHEN created_at > CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as reports_last_week,
          COUNT(CASE WHEN created_at > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as reports_last_month,
          AVG(
            CASE 
              WHEN resolved_at IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
              ELSE NULL 
            END
          ) as avg_resolution_hours
        FROM reports
      `),
      geoService.getGeoStatistics()
    ]);
    
    const stats = generalStats.rows[0];
    
    res.json({ 
      success: true, 
      data: {
        totalReports: parseInt(stats.total_reports) || 0,
        resolvedReports: parseInt(stats.resolved_reports) || 0,
        pendingReports: parseInt(stats.pending_reports) || 0,
        inProgressReports: parseInt(stats.in_progress_reports) || 0,
        criticalReports: parseInt(stats.critical_reports) || 0,
        reportsLastWeek: parseInt(stats.reports_last_week) || 0,
        reportsLastMonth: parseInt(stats.reports_last_month) || 0,
        avgResolutionTime: stats.avg_resolution_hours ? 
          `${Math.round(stats.avg_resolution_hours)} hours` : 'N/A',
        resolutionRate: stats.total_reports ? 
          Math.round((stats.resolved_reports / stats.total_reports) * 100) : 0,
        geographic: geoStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/categories - category breakdown
router.get('/categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'RESOLVED' OR status = 'CLOSED' THEN 1 END) as resolved,
        AVG(
          CASE 
            WHEN resolved_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
            ELSE NULL 
          END
        ) as avg_resolution_hours
      FROM reports 
      GROUP BY category 
      ORDER BY total DESC
    `);
    
    const data = result.rows.map(row => ({
      category: row.category,
      total: parseInt(row.total),
      resolved: parseInt(row.resolved),
      avgResolutionTime: row.avg_resolution_hours ? 
        `${Math.round(row.avg_resolution_hours)} hours` : 'N/A',
      resolutionRate: Math.round((row.resolved / row.total) * 100)
    }));
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category analytics' });
  }
});

// GET /api/analytics/trends - time-based trends
router.get('/trends', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { period = 'week' } = req.query;
    const intervalClause = period === 'month' ? "'1 month'" : "'7 days'";
    const dateFormat = period === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    
    const result = await query(`
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') as period,
        COUNT(*) as reports_created,
        COUNT(CASE WHEN status = 'RESOLVED' OR status = 'CLOSED' THEN 1 END) as reports_resolved
      FROM reports 
      WHERE created_at > CURRENT_DATE - INTERVAL ${intervalClause} * 12
      GROUP BY TO_CHAR(created_at, '${dateFormat}')
      ORDER BY period DESC
      LIMIT 12
    `);
    
    res.json({ success: true, data: result.rows.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch trend analytics' });
  }
});

// GET /api/analytics/departments - department performance
router.get('/departments', authenticateToken, authorizeRoles('STAFF', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        d.name as department_name,
        COUNT(r.id) as total_reports,
        COUNT(CASE WHEN r.status = 'RESOLVED' OR r.status = 'CLOSED' THEN 1 END) as resolved_reports,
        COUNT(s.id) as staff_count,
        AVG(
          CASE 
            WHEN r.resolved_at IS NOT NULL THEN 
              EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600
            ELSE NULL 
          END
        ) as avg_resolution_hours
      FROM departments d
      LEFT JOIN reports r ON d.id = r.department_id
      LEFT JOIN staff s ON d.id = s.department_id AND s.is_active = true
      WHERE d.is_active = true
      GROUP BY d.id, d.name
      ORDER BY total_reports DESC
    `);
    
    const data = result.rows.map(row => ({
      departmentName: row.department_name,
      totalReports: parseInt(row.total_reports) || 0,
      resolvedReports: parseInt(row.resolved_reports) || 0,
      staffCount: parseInt(row.staff_count) || 0,
      avgResolutionTime: row.avg_resolution_hours ? 
        `${Math.round(row.avg_resolution_hours)} hours` : 'N/A',
      resolutionRate: row.total_reports ? 
        Math.round((row.resolved_reports / row.total_reports) * 100) : 0,
      workloadPerStaff: row.staff_count ? 
        Math.round(row.total_reports / row.staff_count) : 0
    }));
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch department analytics' });
  }
});

export default router;
