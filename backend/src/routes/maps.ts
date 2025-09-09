import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../middleware/auth';
import { geoService } from '../services/geoService';

const router = Router();

const boundsSchema = Joi.object({
  north: Joi.number().required(),
  south: Joi.number().required(),
  east: Joi.number().required(),
  west: Joi.number().required(),
  categories: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  statuses: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  priorities: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  dateFrom: Joi.string().isoDate().optional(),
  dateTo: Joi.string().isoDate().optional(),
  clustered: Joi.boolean().default(false),
  clusterRadius: Joi.number().min(0.001).max(1).default(0.01),
});

// GET /api/maps/reports - reports within bounds (optionally clustered)
router.get('/reports', authenticateToken, async (req: Request, res: Response) => {
  const query = req.query;
  const { error, value } = boundsSchema.validate(query);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const normalize = (v: any) => (typeof v === 'string' ? v.split(',') : v);
  const data = await geoService.getReportsInBounds(
    { north: +value.north, south: +value.south, east: +value.east, west: +value.west },
    {
      categories: normalize(value.categories),
      statuses: normalize(value.statuses),
      priorities: normalize(value.priorities),
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
      clustered: value.clustered,
      clusterRadius: value.clusterRadius,
    }
  );

  return res.json({ success: true, data });
});

// GET /api/maps/heatmap - heatmap data
router.get('/heatmap', authenticateToken, async (req: Request, res: Response) => {
  const { error, value } = boundsSchema.validate(req.query);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const data = await geoService.getHeatmapData(
    { north: +value.north, south: +value.south, east: +value.east, west: +value.west },
    {
      categories: typeof value.categories === 'string' ? value.categories.split(',') : value.categories,
      dateFrom: value.dateFrom,
      dateTo: value.dateTo,
      gridSize: value.clusterRadius || 0.005,
    }
  );
  return res.json({ success: true, data });
});

const nearbySchema = Joi.object({
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  radiusKm: Joi.number().min(0.1).max(50).default(2),
  categories: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  excludeReportId: Joi.string().uuid().optional(),
  limit: Joi.number().min(1).max(200).default(50),
});

// GET /api/maps/nearby - nearby reports to a point
router.get('/nearby', authenticateToken, async (req: Request, res: Response) => {
  const { error, value } = nearbySchema.validate(req.query);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const data = await geoService.findNearbyReports(
    { latitude: +value.lat, longitude: +value.lng },
    +value.radiusKm,
    {
      categories: typeof value.categories === 'string' ? value.categories.split(',') : value.categories,
      excludeReportId: value.excludeReportId,
      limit: +value.limit,
    }
  );
  return res.json({ success: true, data });
});

const hotspotsSchema = Joi.object({
  category: Joi.string().optional(),
  minReports: Joi.number().min(2).max(100).default(5),
  radiusKm: Joi.number().min(0.1).max(10).default(1),
  dateFrom: Joi.string().isoDate().optional(),
  dateTo: Joi.string().isoDate().optional(),
});

// GET /api/maps/hotspots - detect hotspots
router.get('/hotspots', authenticateToken, async (req: Request, res: Response) => {
  const { error, value } = hotspotsSchema.validate(req.query);
  if (error) return res.status(400).json({ success: false, message: error.message });

  const data = await geoService.detectHotspots({
    category: value.category,
    minReports: +value.minReports,
    radiusKm: +value.radiusKm,
    dateFrom: value.dateFrom,
    dateTo: value.dateTo,
  });
  return res.json({ success: true, data });
});

// POST /api/maps/zones/analytics - analytics for provided zones
router.post('/zones/analytics', authenticateToken, async (req: Request, res: Response) => {
  const zones = req.body?.zones;
  if (!Array.isArray(zones) || zones.length === 0) {
    return res.status(400).json({ success: false, message: 'zones array is required' });
  }

  const data = await geoService.getZoneAnalytics(zones);
  return res.json({ success: true, data });
});

// POST /api/maps/route/optimize - route optimization for staff
router.post('/route/optimize', authenticateToken, async (req: Request, res: Response) => {
  const { start, reportIds } = req.body || {};
  if (!start || typeof start.lat !== 'number' || typeof start.lng !== 'number' || !Array.isArray(reportIds)) {
    return res.status(400).json({ success: false, message: 'start {lat,lng} and reportIds[] are required' });
  }

  const data = await geoService.optimizeRoute({ latitude: start.lat, longitude: start.lng }, reportIds);
  return res.json({ success: true, data });
});

export default router;

