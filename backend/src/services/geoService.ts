import { logger } from '../utils/logger';
import { query } from '../utils/database';

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface ClusterPoint {
  latitude: number;
  longitude: number;
  count: number;
  issues: string[]; // Array of issue IDs
  categories: string[];
  avgPriority: number;
}

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

interface ZoneAnalytics {
  zoneId: string;
  zoneName: string;
  totalReports: number;
  resolvedReports: number;
  avgResolutionTime: string;
  topCategories: Array<{ category: string; count: number }>;
  priorityDistribution: { normal: number; urgent: number; critical: number };
}

export class GeoService {
  /**
   * Get reports within a bounding box with clustering
   */
  async getReportsInBounds(
    bounds: BoundingBox,
    options: {
      categories?: string[];
      statuses?: string[];
      priorities?: string[];
      dateFrom?: string;
      dateTo?: string;
      clustered?: boolean;
      clusterRadius?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const {
        categories,
        statuses,
        priorities,
        dateFrom,
        dateTo,
        clustered = false,
        clusterRadius = 0.01 // ~1km at equator
      } = options;

      // Build WHERE clauses
      let whereConditions = [
        `latitude BETWEEN $1 AND $2`,
        `longitude BETWEEN $3 AND $4`
      ];
      const params: any[] = [bounds.south, bounds.north, bounds.west, bounds.east];

      if (categories && categories.length > 0) {
        params.push(categories);
        whereConditions.push(`category = ANY($${params.length})`);
      }

      if (statuses && statuses.length > 0) {
        params.push(statuses);
        whereConditions.push(`status = ANY($${params.length})`);
      }

      if (priorities && priorities.length > 0) {
        params.push(priorities);
        whereConditions.push(`priority = ANY($${params.length})`);
      }

      if (dateFrom) {
        params.push(dateFrom);
        whereConditions.push(`created_at >= $${params.length}`);
      }

      if (dateTo) {
        params.push(dateTo);
        whereConditions.push(`created_at <= $${params.length}`);
      }

      const whereClause = whereConditions.join(' AND ');

      if (clustered) {
        // Return clustered data for better performance on zoomed-out views
        const result = await query(`
          SELECT 
            ROUND(latitude / $${params.length + 1}) * $${params.length + 1} AS cluster_lat,
            ROUND(longitude / $${params.length + 1}) * $${params.length + 1} AS cluster_lng,
            COUNT(*) as count,
            array_agg(id) as issue_ids,
            array_agg(DISTINCT category) as categories,
            AVG(CASE 
              WHEN priority = 'NORMAL' THEN 1 
              WHEN priority = 'URGENT' THEN 2 
              WHEN priority = 'CRITICAL' THEN 3 
              ELSE 1 END
            ) as avg_priority,
            array_agg(DISTINCT status) as statuses
          FROM reports 
          WHERE ${whereClause}
          GROUP BY cluster_lat, cluster_lng
          HAVING COUNT(*) > 0
          ORDER BY count DESC
        `, [...params, clusterRadius]);

        return result.rows.map((row: any) => ({
          latitude: parseFloat(row.cluster_lat),
          longitude: parseFloat(row.cluster_lng),
          count: parseInt(row.count),
          issues: row.issue_ids,
          categories: row.categories,
          avgPriority: parseFloat(row.avg_priority),
          statuses: row.statuses,
          type: 'cluster'
        }));
      } else {
        // Return individual reports for detailed view
        const result = await query(`
          SELECT 
            id, title, description, category, priority, status,
            latitude, longitude, address, upvotes, created_at,
            (SELECT COUNT(*) FROM media_files WHERE report_id = reports.id) as media_count
          FROM reports 
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT 1000
        `, params);

        return result.rows.map((row: any) => ({
          ...row,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          type: 'report'
        }));
      }
    } catch (error) {
      logger.error('Error getting reports in bounds:', error);
      return [];
    }
  }

  /**
   * Generate heatmap data for issue density visualization
   */
  async getHeatmapData(
    bounds: BoundingBox,
    options: {
      categories?: string[];
      dateFrom?: string;
      dateTo?: string;
      gridSize?: number;
    } = {}
  ): Promise<HeatmapPoint[]> {
    try {
      const { categories, dateFrom, dateTo, gridSize = 0.005 } = options; // ~500m grid

      let whereConditions: string[] = [
        `latitude BETWEEN $1 AND $2`,
        `longitude BETWEEN $3 AND $4`
      ];
      const params: any[] = [bounds.south, bounds.north, bounds.west, bounds.east];

      if (categories && categories.length > 0) {
        params.push(categories);
        whereConditions.push(`category = ANY($${params.length})`);
      }

      if (dateFrom) {
        params.push(dateFrom);
        whereConditions.push(`created_at >= $${params.length}`);
      }

      if (dateTo) {
        params.push(dateTo);
        whereConditions.push(`created_at <= $${params.length}`);
      }

      const result = await query(`
        SELECT 
          ROUND(latitude / $${params.length + 1}) * $${params.length + 1} AS grid_lat,
          ROUND(longitude / $${params.length + 1}) * $${params.length + 1} AS grid_lng,
          COUNT(*) * 
          AVG(CASE 
            WHEN priority = 'NORMAL' THEN 1 
            WHEN priority = 'URGENT' THEN 2 
            WHEN priority = 'CRITICAL' THEN 3 
            ELSE 1 END
          ) as intensity
        FROM reports 
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY grid_lat, grid_lng
        HAVING COUNT(*) > 0
      `, [...params, gridSize]);

      return result.rows.map((row: any) => ({
        latitude: parseFloat(row.grid_lat),
        longitude: parseFloat(row.grid_lng),
        intensity: parseFloat(row.intensity)
      }));
    } catch (error) {
      logger.error('Error generating heatmap data:', error);
      return [];
    }
  }

  /**
   * Find nearby reports within a radius
   */
  async findNearbyReports(
    center: GeoPoint,
    radiusKm: number,
    options: {
      categories?: string[];
      excludeReportId?: string;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const { categories, excludeReportId, limit = 50 } = options;

      let whereConditions: string[] = [];
      const params: any[] = [center.latitude, center.longitude, radiusKm];

      if (categories && categories.length > 0) {
        params.push(categories);
        whereConditions.push(`category = ANY($${params.length})`);
      }

      if (excludeReportId) {
        params.push(excludeReportId);
        whereConditions.push(`id != $${params.length}`);
      }

      params.push(limit);
      const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';

      // Using Haversine formula for distance calculation
      const result = await query(`
        SELECT 
          id, title, description, category, priority, status,
          latitude, longitude, address, created_at,
          (
            6371 * acos(
              cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(latitude))
            )
          ) AS distance_km
        FROM reports 
        WHERE (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          )
        ) <= $3
        ${whereClause}
        ORDER BY distance_km ASC
        LIMIT $${params.length}
      `, params);

      return result.rows.map((row: any) => ({
        ...row,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        distance_km: parseFloat(row.distance_km)
      }));
    } catch (error) {
      logger.error('Error finding nearby reports:', error);
      return [];
    }
  }

  /**
   * Get analytics for geographic zones
   */
  async getZoneAnalytics(
    zones: Array<{ id: string; name: string; bounds: BoundingBox }>
  ): Promise<ZoneAnalytics[]> {
    try {
      const analytics: ZoneAnalytics[] = [];

      for (const zone of zones) {
        const { id, name, bounds } = zone;

        // Get zone statistics
        const statsResult = await query(`
          SELECT 
            COUNT(*) as total_reports,
            COUNT(CASE WHEN status = 'RESOLVED' OR status = 'CLOSED' THEN 1 END) as resolved_reports,
            AVG(
              CASE 
                WHEN resolved_at IS NOT NULL THEN 
                  EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
                ELSE NULL 
              END
            ) as avg_resolution_hours,
            COUNT(CASE WHEN priority = 'NORMAL' THEN 1 END) as normal_priority,
            COUNT(CASE WHEN priority = 'URGENT' THEN 1 END) as urgent_priority,
            COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) as critical_priority
          FROM reports 
          WHERE latitude BETWEEN $1 AND $2 
          AND longitude BETWEEN $3 AND $4
        `, [bounds.south, bounds.north, bounds.west, bounds.east]);

        // Get top categories in zone
        const categoriesResult = await query(`
          SELECT category, COUNT(*) as count
          FROM reports 
          WHERE latitude BETWEEN $1 AND $2 
          AND longitude BETWEEN $3 AND $4
          GROUP BY category
          ORDER BY count DESC
          LIMIT 5
        `, [bounds.south, bounds.north, bounds.west, bounds.east]);

        const stats = statsResult.rows[0];
        
        analytics.push({
          zoneId: id,
          zoneName: name,
          totalReports: parseInt(stats.total_reports) || 0,
          resolvedReports: parseInt(stats.resolved_reports) || 0,
          avgResolutionTime: stats.avg_resolution_hours ? 
            `${Math.round(stats.avg_resolution_hours)} hours` : 'N/A',
          topCategories: categoriesResult.rows.map((row: any) => ({
            category: row.category,
            count: parseInt(row.count)
          })),
          priorityDistribution: {
            normal: parseInt(stats.normal_priority) || 0,
            urgent: parseInt(stats.urgent_priority) || 0,
            critical: parseInt(stats.critical_priority) || 0
          }
        });
      }

      return analytics;
    } catch (error) {
      logger.error('Error getting zone analytics:', error);
      return [];
    }
  }

  /**
   * Detect potential issue clusters/hotspots
   */
  async detectHotspots(
    options: {
      category?: string;
      minReports?: number;
      radiusKm?: number;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<Array<{
    center: GeoPoint;
    radius: number;
    reportCount: number;
    category: string;
    density: number;
  }>> {
    try {
      const {
        category,
        minReports = 5,
        radiusKm = 1,
        dateFrom,
        dateTo
      } = options;

      let whereConditions: string[] = [];
      const params: any[] = [];

      if (category) {
        params.push(category);
        whereConditions.push(`category = $${params.length}`);
      }

      if (dateFrom) {
        params.push(dateFrom);
        whereConditions.push(`created_at >= $${params.length}`);
      }

      if (dateTo) {
        params.push(dateTo);
        whereConditions.push(`created_at <= $${params.length}`);
      }

      params.push(radiusKm, minReports);
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Use clustering algorithm to find hotspots
      const result = await query(`
        WITH clustered_reports AS (
          SELECT 
            latitude, longitude, category,
            COUNT(*) OVER (
              PARTITION BY 
                ROUND(latitude / 0.01) * 0.01,
                ROUND(longitude / 0.01) * 0.01,
                category
            ) as cluster_count
          FROM reports 
          ${whereClause}
        )
        SELECT 
          AVG(latitude) as center_lat,
          AVG(longitude) as center_lng,
          category,
          COUNT(*) as report_count,
          MAX(cluster_count) as max_density
        FROM clustered_reports
        WHERE cluster_count >= $${params.length}
        GROUP BY 
          ROUND(latitude / 0.01) * 0.01,
          ROUND(longitude / 0.01) * 0.01,
          category
        HAVING COUNT(*) >= $${params.length}
        ORDER BY report_count DESC
      `, params);

      return result.rows.map((row: any) => ({
        center: {
          latitude: parseFloat(row.center_lat),
          longitude: parseFloat(row.center_lng)
        },
        radius: radiusKm,
        reportCount: parseInt(row.report_count),
        category: row.category,
        density: parseInt(row.max_density)
      }));
    } catch (error) {
      logger.error('Error detecting hotspots:', error);
      return [];
    }
  }

  /**
   * Get route optimization for staff field work
   */
  async optimizeRoute(
    startPoint: GeoPoint,
    reportIds: string[]
  ): Promise<{
    optimizedOrder: string[];
    totalDistance: number;
    estimatedTime: number;
  }> {
    try {
      // Get report locations
      const result = await query(`
        SELECT id, latitude, longitude, address, priority
        FROM reports 
        WHERE id = ANY($1)
      `, [reportIds]);

      const reports = result.rows.map((row: any) => ({
        id: row.id,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        address: row.address,
        priority: row.priority
      }));

      // Simple nearest neighbor algorithm for route optimization
      // In production, you'd use a more sophisticated algorithm or external service
      const optimizedOrder: string[] = [];
      const unvisited = [...reports];
      let currentPoint = startPoint;
      let totalDistance = 0;

      while (unvisited.length > 0) {
        let nearestIndex = 0;
        let minDistance = this.calculateDistance(currentPoint, unvisited[0]);

        // Find nearest unvisited point, with priority weighting
        for (let i = 1; i < unvisited.length; i++) {
          const distance = this.calculateDistance(currentPoint, unvisited[i]);
          const priorityWeight = unvisited[i].priority === 'CRITICAL' ? 0.5 : 
                               unvisited[i].priority === 'URGENT' ? 0.7 : 1.0;
          const weightedDistance = distance * priorityWeight;

          if (weightedDistance < minDistance) {
            nearestIndex = i;
            minDistance = distance;
          }
        }

        const nearest = unvisited[nearestIndex];
        optimizedOrder.push(nearest.id);
        totalDistance += minDistance;
        currentPoint = { latitude: nearest.latitude, longitude: nearest.longitude };
        unvisited.splice(nearestIndex, 1);
      }

      // Estimate time based on average travel speed (30 km/h in urban areas)
      const estimatedTime = Math.round((totalDistance / 30) * 60); // minutes

      return {
        optimizedOrder,
        totalDistance: Math.round(totalDistance * 100) / 100,
        estimatedTime
      };
    } catch (error) {
      logger.error('Error optimizing route:', error);
      return {
        optimizedOrder: reportIds,
        totalDistance: 0,
        estimatedTime: 0
      };
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get geographic statistics summary
   */
  async getGeoStatistics(): Promise<{
    totalReports: number;
    avgLatitude: number;
    avgLongitude: number;
    boundingBox: BoundingBox;
    topAreas: Array<{ area: string; count: number }>;
  }> {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_reports,
          AVG(latitude) as avg_lat,
          AVG(longitude) as avg_lng,
          MIN(latitude) as min_lat,
          MAX(latitude) as max_lat,
          MIN(longitude) as min_lng,
          MAX(longitude) as max_lng
        FROM reports
      `);

      // Get top areas (simplified by rounding coordinates)
      const areasResult = await query(`
        SELECT 
          ROUND(latitude, 2) || ',' || ROUND(longitude, 2) as area,
          COUNT(*) as count
        FROM reports 
        GROUP BY ROUND(latitude, 2), ROUND(longitude, 2)
        ORDER BY count DESC
        LIMIT 10
      `);

      const stats = result.rows[0];

      return {
        totalReports: parseInt(stats.total_reports) || 0,
        avgLatitude: parseFloat(stats.avg_lat) || 0,
        avgLongitude: parseFloat(stats.avg_lng) || 0,
        boundingBox: {
          north: parseFloat(stats.max_lat) || 0,
          south: parseFloat(stats.min_lat) || 0,
          east: parseFloat(stats.max_lng) || 0,
          west: parseFloat(stats.min_lng) || 0
        },
        topAreas: areasResult.rows.map((row: any) => ({
          area: row.area,
          count: parseInt(row.count)
        }))
      };
    } catch (error) {
      logger.error('Error getting geo statistics:', error);
      return {
        totalReports: 0,
        avgLatitude: 0,
        avgLongitude: 0,
        boundingBox: { north: 0, south: 0, east: 0, west: 0 },
        topAreas: []
      };
    }
  }
}

export const geoService = new GeoService();
