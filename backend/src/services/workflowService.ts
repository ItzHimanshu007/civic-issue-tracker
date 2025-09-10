import { logger } from '../utils/logger';
import { query, withTransaction } from '../utils/database';
import { gamificationService } from './gamificationService';
import { notificationService } from './notificationService';
import { io } from '../server';

type ReportStatus = 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type Priority = 'NORMAL' | 'URGENT' | 'CRITICAL';

interface StatusTransition {
  from: ReportStatus[];
  to: ReportStatus;
  allowedRoles: ('STAFF' | 'ADMIN')[];
  requiresComment?: boolean;
  autoNotify?: boolean;
}

interface AssignmentRule {
  category: string;
  departmentName: string;
  priority: Priority;
  estimatedHours: number;
}

export class WorkflowService {
  // Define valid status transitions
  private statusTransitions: Record<ReportStatus, StatusTransition> = {
    SUBMITTED: {
      from: [],
      to: 'SUBMITTED',
      allowedRoles: ['STAFF', 'ADMIN'],
      autoNotify: false,
    },
    ACKNOWLEDGED: {
      from: ['SUBMITTED'],
      to: 'ACKNOWLEDGED',
      allowedRoles: ['STAFF', 'ADMIN'],
      requiresComment: false,
      autoNotify: true,
    },
    IN_PROGRESS: {
      from: ['ACKNOWLEDGED', 'SUBMITTED'],
      to: 'IN_PROGRESS',
      allowedRoles: ['STAFF', 'ADMIN'],
      requiresComment: false,
      autoNotify: true,
    },
    RESOLVED: {
      from: ['IN_PROGRESS', 'ACKNOWLEDGED'],
      to: 'RESOLVED',
      allowedRoles: ['STAFF', 'ADMIN'],
      requiresComment: true,
      autoNotify: true,
    },
    CLOSED: {
      from: ['RESOLVED'],
      to: 'CLOSED',
      allowedRoles: ['STAFF', 'ADMIN'],
      requiresComment: false,
      autoNotify: true,
    },
  };

  // Department assignment rules based on category
  private assignmentRules: AssignmentRule[] = [
    { category: 'POTHOLE', departmentName: 'Public Works', priority: 'URGENT', estimatedHours: 8 },
    { category: 'STREETLIGHT', departmentName: 'Utilities', priority: 'NORMAL', estimatedHours: 4 },
    { category: 'GARBAGE', departmentName: 'Sanitation', priority: 'NORMAL', estimatedHours: 2 },
    { category: 'WATER_LEAK', departmentName: 'Water Department', priority: 'CRITICAL', estimatedHours: 6 },
    { category: 'SEWAGE', departmentName: 'Water Department', priority: 'CRITICAL', estimatedHours: 12 },
    { category: 'ROAD_MAINTENANCE', departmentName: 'Public Works', priority: 'NORMAL', estimatedHours: 16 },
    { category: 'TRAFFIC_SIGNAL', departmentName: 'Traffic Management', priority: 'URGENT', estimatedHours: 4 },
    { category: 'PARK_MAINTENANCE', departmentName: 'Parks & Recreation', priority: 'NORMAL', estimatedHours: 8 },
    { category: 'NOISE_POLLUTION', departmentName: 'Code Enforcement', priority: 'NORMAL', estimatedHours: 2 },
    { category: 'OTHER', departmentName: 'General Services', priority: 'NORMAL', estimatedHours: 4 },
  ];

  /**
   * Process a new report submission - auto-assign to department
   */
  async processNewReport(reportId: string): Promise<void> {
    try {
      // Get report details
      const reportResult = await query(
        'SELECT id, category, priority, title FROM reports WHERE id = $1',
        [reportId]
      );

      if (reportResult.rows.length === 0) {
        throw new Error('Report not found');
      }

      const report = reportResult.rows[0];
      
      // Find assignment rule
      const rule = this.assignmentRules.find(r => r.category === report.category);
      if (!rule) {
        logger.warn(`No assignment rule found for category: ${report.category}`);
        return;
      }

      // Find or create department
      let departmentResult = await query(
        'SELECT id FROM departments WHERE name = $1',
        [rule.departmentName]
      );

      let departmentId;
      if (departmentResult.rows.length === 0) {
        // Create department if it doesn't exist
        const createResult = await query(
          'INSERT INTO departments (name, description, is_active) VALUES ($1, $2, true) RETURNING id',
          [rule.departmentName, `Auto-created for ${rule.departmentName} issues`]
        );
        departmentId = createResult.rows[0].id;
      } else {
        departmentId = departmentResult.rows[0].id;
      }

      // Update report with department and priority
      await query(
        `UPDATE reports 
         SET department_id = $1, 
             priority = CASE WHEN priority = 'NORMAL' THEN $2 ELSE priority END,
             estimated_resolution_time = INTERVAL '1 hour' * $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [departmentId, rule.priority, rule.estimatedHours, reportId]
      );

      // Create status history entry
      await this.createStatusHistory(reportId, null, 'SUBMITTED', 'SUBMITTED', 'Report submitted and auto-assigned to department');

      // Try to auto-assign to available staff
      await this.autoAssignToStaff(reportId, departmentId);

      logger.info(`Report ${reportId} processed and assigned to ${rule.departmentName}`);
    } catch (error) {
      logger.error('Error processing new report:', error);
      throw error;
    }
  }

  /**
   * Auto-assign report to available staff in the department
   */
  private async autoAssignToStaff(reportId: string, departmentId: string): Promise<void> {
    try {
      // Find available staff in the department (staff with least active assignments)
      const staffResult = await query(
        `SELECT s.id, u.name, 
                COUNT(r.id) as active_assignments
         FROM staff s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN reports r ON s.id = r.assigned_staff_id AND r.status IN ('ACKNOWLEDGED', 'IN_PROGRESS')
         WHERE s.department_id = $1 AND s.is_active = true AND u.is_active = true
         GROUP BY s.id, u.name
         ORDER BY active_assignments ASC, RANDOM()
         LIMIT 1`,
        [departmentId]
      );

      if (staffResult.rows.length > 0) {
        const staff = staffResult.rows[0];
        
        await query(
          'UPDATE reports SET assigned_staff_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [staff.id, reportId]
        );

        await this.createStatusHistory(
          reportId, 
          null, 
          'SUBMITTED', 
          'SUBMITTED', 
          `Auto-assigned to ${staff.name}`
        );

        // Notify assigned staff
        await this.notifyStaffAssignment(reportId, staff.id);

        logger.info(`Report ${reportId} auto-assigned to staff ${staff.name}`);
      }
    } catch (error) {
      logger.error('Error in auto-assignment:', error);
      // Don't throw - assignment failure shouldn't block report creation
    }
  }

  /**
   * Transition report status
   */
  async transitionStatus(
    reportId: string,
    newStatus: ReportStatus,
    userId: string,
    comment?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await withTransaction(async (client) => {
        // Get current report status and user role
        const reportResult = await client.query(
          `SELECT r.status, r.user_id, r.assigned_staff_id, r.title, u.role, u.name
           FROM reports r
           JOIN users u ON u.id = $2
           WHERE r.id = $1`,
          [reportId, userId]
        );

        if (reportResult.rows.length === 0) {
          return { success: false, message: 'Report not found' };
        }

        const report = reportResult.rows[0];
        const currentStatus = report.status as ReportStatus;
        const userRole = report.role;

        // Check if transition is valid
        const transition = this.statusTransitions[newStatus];
        if (!transition) {
          return { success: false, message: 'Invalid status' };
        }

        // Check if user has permission
        if (!transition.allowedRoles.includes(userRole)) {
          return { success: false, message: 'Insufficient permissions for status change' };
        }

        // Check if transition is allowed from current status
        if (transition.from.length > 0 && !transition.from.includes(currentStatus)) {
          return { success: false, message: `Cannot transition from ${currentStatus} to ${newStatus}` };
        }

        // Check if comment is required
        if (transition.requiresComment && !comment) {
          return { success: false, message: 'Comment is required for this status change' };
        }

        // Update report status
        const updateQuery = newStatus === 'RESOLVED' 
          ? `UPDATE reports SET status = $1, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
          : `UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        
        await client.query(updateQuery, [newStatus, reportId]);

        // Create status history entry
        await client.query(
          `INSERT INTO status_history (report_id, changed_by_user_id, old_status, new_status, comment)
           VALUES ($1, $2, $3, $4, $5)`,
          [reportId, userId, currentStatus, newStatus, comment || '']
        );

        // Auto-notify if configured
        if (transition.autoNotify) {
          await this.notifyStatusChange(reportId, currentStatus, newStatus, report.user_id, report.title);
        }
        
        // Award gamification points for report resolution
        if (newStatus === 'RESOLVED') {
          try {
            await gamificationService.awardPoints(report.user_id, 'REPORT_RESOLVED', 1, {
              reportId,
              reportTitle: report.title,
              resolvedBy: userId
            });
          } catch (gamificationError) {
            logger.error('Error awarding gamification points for resolution:', gamificationError);
          }
        }
        
        // Send status change notification to report owner
        try {
          const templateName = newStatus === 'RESOLVED' ? 'report_resolved' : 'report_status_update';
          
          await notificationService.sendTemplatedNotification(
            report.user_id,
            templateName,
            {
              reportId,
              reportTitle: report.title,
              oldStatus: currentStatus,
              newStatus,
              comment: comment || '',
              points: newStatus === 'RESOLVED' ? 20 : 0
            },
            {
              type: 'EMAIL',
              eventType: 'status_changed',
              eventSource: 'workflow',
              referenceId: reportId,
              triggeredByUserId: userId
            }
          );
        } catch (notificationError) {
          logger.error('Error sending status change notification:', notificationError);
        }

        // Handle priority escalation for overdue reports
        if (newStatus === 'IN_PROGRESS') {
          await this.scheduleEscalationCheck(reportId);
        }

        logger.info(`Report ${reportId} status changed from ${currentStatus} to ${newStatus} by ${report.name}`);
        
        return { success: true, message: `Status updated to ${newStatus}` };
      });
    } catch (error) {
      logger.error('Error transitioning status:', error);
      return { success: false, message: 'Failed to update status' };
    }
  }

  /**
   * Manually assign report to staff
   */
  async assignToStaff(
    reportId: string,
    staffId: string,
    assignerId: string,
    comment?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await withTransaction(async (client) => {
        // Verify staff exists and is active
        const staffResult = await client.query(
          `SELECT s.id, u.name, d.name as department_name
           FROM staff s
           JOIN users u ON s.user_id = u.id
           JOIN departments d ON s.department_id = d.id
           WHERE s.id = $1 AND s.is_active = true AND u.is_active = true`,
          [staffId]
        );

        if (staffResult.rows.length === 0) {
          return { success: false, message: 'Staff member not found or inactive' };
        }

        const staff = staffResult.rows[0];

        // Update report assignment
        await client.query(
          `UPDATE reports 
           SET assigned_staff_id = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [staffId, reportId]
        );

        // Create status history entry
        await client.query(
          `INSERT INTO status_history (report_id, changed_by_user_id, old_status, new_status, comment)
           VALUES ($1, $2, (SELECT status FROM reports WHERE id = $1), (SELECT status FROM reports WHERE id = $1), $3)`,
          [reportId, assignerId, comment || `Assigned to ${staff.name} (${staff.department_name})`]
        );

        // Notify assigned staff
        await this.notifyStaffAssignment(reportId, staffId);

        logger.info(`Report ${reportId} assigned to ${staff.name}`);
        
        return { success: true, message: `Assigned to ${staff.name}` };
      });
    } catch (error) {
      logger.error('Error assigning to staff:', error);
      return { success: false, message: 'Failed to assign to staff' };
    }
  }

  /**
   * Get available staff for assignment
   */
  async getAvailableStaff(departmentId?: string): Promise<any[]> {
    try {
      let whereClause = 'WHERE s.is_active = true AND u.is_active = true';
      const params: any[] = [];
      
      if (departmentId) {
        params.push(departmentId);
        whereClause += ` AND s.department_id = $${params.length}`;
      }

      const result = await query(
        `SELECT s.id, u.name, u.email, d.name as department_name,
                COUNT(r.id) as active_assignments
         FROM staff s
         JOIN users u ON s.user_id = u.id
         JOIN departments d ON s.department_id = d.id
         LEFT JOIN reports r ON s.id = r.assigned_staff_id AND r.status IN ('ACKNOWLEDGED', 'IN_PROGRESS')
         ${whereClause}
         GROUP BY s.id, u.name, u.email, d.name
         ORDER BY active_assignments ASC, u.name`,
        params
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting available staff:', error);
      return [];
    }
  }

  /**
   * Check for overdue reports and escalate priority
   */
  async checkOverdueReports(): Promise<void> {
    try {
      // Find reports that are overdue based on estimated resolution time
      const overdueResult = await query(
        `SELECT id, title, priority, created_at, estimated_resolution_time
         FROM reports 
         WHERE status IN ('ACKNOWLEDGED', 'IN_PROGRESS') 
         AND created_at + estimated_resolution_time < CURRENT_TIMESTAMP
         AND priority != 'CRITICAL'`
      );

      for (const report of overdueResult.rows) {
        const newPriority = report.priority === 'URGENT' ? 'CRITICAL' : 'URGENT';
        
        await query(
          'UPDATE reports SET priority = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newPriority, report.id]
        );

        await this.createStatusHistory(
          report.id,
          null,
          report.status,
          report.status,
          `Priority escalated to ${newPriority} due to overdue status`
        );

        // Notify about escalation
        await this.notifyPriorityEscalation(report.id, report.title, newPriority);

        logger.info(`Report ${report.id} priority escalated to ${newPriority}`);
      }
    } catch (error) {
      logger.error('Error checking overdue reports:', error);
    }
  }

  /**
   * Create status history entry
   */
  private async createStatusHistory(
    reportId: string,
    userId: string | null,
    oldStatus: ReportStatus,
    newStatus: ReportStatus,
    comment: string
  ): Promise<void> {
    await query(
      `INSERT INTO status_history (report_id, changed_by_user_id, old_status, new_status, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [reportId, userId, oldStatus, newStatus, comment]
    );
  }

  /**
   * Schedule escalation check for a report
   */
  private async scheduleEscalationCheck(reportId: string): Promise<void> {
    // In a production environment, you would use a job queue like Bull or Agenda
    // For now, we'll just log that it should be scheduled
    logger.info(`Escalation check scheduled for report ${reportId}`);
  }

  /**
   * Notify about status change
   */
  private async notifyStatusChange(
    reportId: string,
    oldStatus: ReportStatus,
    newStatus: ReportStatus,
    userId: string,
    title: string
  ): Promise<void> {
    try {
      // Create notification in database
      await query(
        `INSERT INTO notifications (user_id, title, content, type, related_id)
         VALUES ($1, $2, $3, 'status_change', $4)`,
        [
          userId,
          'Report Status Updated',
          `Your report "${title}" status changed from ${oldStatus} to ${newStatus}`,
          reportId
        ]
      );

      // Send real-time notification via Socket.io
      io.to(`user_${userId}`).emit('report_status_changed', {
        reportId,
        oldStatus,
        newStatus,
        title,
        timestamp: new Date().toISOString()
      });

      logger.info(`Status change notification sent for report ${reportId}`);
    } catch (error) {
      logger.error('Error sending status change notification:', error);
    }
  }

  /**
   * Notify staff about assignment
   */
  private async notifyStaffAssignment(reportId: string, staffId: string): Promise<void> {
    try {
      // Get staff user ID
      const staffResult = await query(
        'SELECT user_id FROM staff WHERE id = $1',
        [staffId]
      );

      if (staffResult.rows.length === 0) return;

      const userId = staffResult.rows[0].user_id;

      // Get report details
      const reportResult = await query(
        'SELECT title, address FROM reports WHERE id = $1',
        [reportId]
      );

      if (reportResult.rows.length === 0) return;

      const report = reportResult.rows[0];

      // Create notification
      await query(
        `INSERT INTO notifications (user_id, title, content, type, related_id)
         VALUES ($1, $2, $3, 'assignment', $4)`,
        [
          userId,
          'New Report Assigned',
          `You have been assigned to handle "${report.title}" at ${report.address}`,
          reportId
        ]
      );

      // Send real-time notification
      io.to(`user_${userId}`).emit('report_assigned', {
        reportId,
        title: report.title,
        address: report.address,
        timestamp: new Date().toISOString()
      });

      logger.info(`Assignment notification sent to staff ${staffId} for report ${reportId}`);
    } catch (error) {
      logger.error('Error sending assignment notification:', error);
    }
  }

  /**
   * Notify about priority escalation
   */
  private async notifyPriorityEscalation(reportId: string, title: string, newPriority: string): Promise<void> {
    try {
      // Get assigned staff and report user
      const result = await query(
        `SELECT r.user_id as reporter_id, s.user_id as staff_id
         FROM reports r
         LEFT JOIN staff s ON r.assigned_staff_id = s.id
         WHERE r.id = $1`,
        [reportId]
      );

      if (result.rows.length === 0) return;

      const { reporter_id, staff_id } = result.rows[0];

      // Notify both reporter and assigned staff
      const userIds = [reporter_id, staff_id].filter(Boolean);

      for (const userId of userIds) {
        await query(
          `INSERT INTO notifications (user_id, title, content, type, related_id)
           VALUES ($1, $2, $3, 'priority_escalation', $4)`,
          [
            userId,
            'Report Priority Escalated',
            `Report "${title}" has been escalated to ${newPriority} priority due to delay`,
            reportId
          ]
        );

        io.to(`user_${userId}`).emit('priority_escalated', {
          reportId,
          title,
          newPriority,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Priority escalation notification sent for report ${reportId}`);
    } catch (error) {
      logger.error('Error sending priority escalation notification:', error);
    }
  }
}

export const workflowService = new WorkflowService();
