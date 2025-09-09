'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix for default markers not showing in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  created_at: string;
  media_count?: number;
  type?: 'report' | 'cluster';
}

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

interface MapFilters {
  categories: string[];
  statuses: string[];
  priorities: string[];
  dateFrom?: string;
  dateTo?: string;
  showHeatmap: boolean;
  clustered: boolean;
}

interface MapViewProps {
  reports: Report[];
  heatmapData: HeatmapPoint[];
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  onReportClick?: (report: Report) => void;
}

// Custom icons for different priorities
const createCustomIcon = (priority: string, count?: number) => {
  const colors = {
    NORMAL: '#10B981',  // green
    URGENT: '#F59E0B',  // yellow
    CRITICAL: '#EF4444' // red
  };
  
  const color = colors[priority as keyof typeof colors] || colors.NORMAL;
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${count ? Math.min(40 + count * 2, 60) : 25}px;
        height: ${count ? Math.min(40 + count * 2, 60) : 25}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${count ? '14px' : '12px'};
      ">
        ${count || ''}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [count ? Math.min(40 + count * 2, 60) : 25, count ? Math.min(40 + count * 2, 60) : 25],
    iconAnchor: [count ? Math.min(20 + count, 30) : 12.5, count ? Math.min(20 + count, 30) : 12.5],
  });
};

// Heatmap layer component
function HeatmapLayer({ data }: { data: HeatmapPoint[] }) {
  const map = useMap();
  const heatmapRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (data && data.length > 0) {
      // Remove existing heatmap
      if (heatmapRef.current) {
        map.removeLayer(heatmapRef.current);
      }

      // Create heatmap points
      const heatPoints: [number, number, number][] = data.map(point => [
        point.latitude,
        point.longitude,
        point.intensity
      ]);

      // Create heatmap layer
      heatmapRef.current = (L as any).heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.4: 'blue',
          0.6: 'cyan',
          0.7: 'lime',
          0.8: 'yellow',
          1.0: 'red'
        }
      }).addTo(map);
    }

    return () => {
      if (heatmapRef.current) {
        map.removeLayer(heatmapRef.current);
      }
    };
  }, [data, map]);

  return null;
}

// Map bounds updater
function MapBoundsUpdater({ reports }: { reports: Report[] }) {
  const map = useMap();

  useEffect(() => {
    if (reports && reports.length > 0) {
      const bounds = L.latLngBounds(
        reports.map(report => [report.latitude, report.longitude])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [reports, map]);

  return null;
}

const MapView: React.FC<MapViewProps> = ({
  reports,
  heatmapData,
  filters,
  onFiltersChange,
  onReportClick
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // NYC default
  const [mapZoom, setMapZoom] = useState(10);

  // Calculate map center from reports
  useEffect(() => {
    if (reports && reports.length > 0) {
      const avgLat = reports.reduce((sum, report) => sum + report.latitude, 0) / reports.length;
      const avgLng = reports.reduce((sum, report) => sum + report.longitude, 0) / reports.length;
      setMapCenter([avgLat, avgLng]);
    }
  }, [reports]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'ACKNOWLEDGED': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const markers = useMemo(() => {
    if (!reports) return [];

    if (filters.clustered) {
      // For clustered view, use MarkerClusterGroup
      return reports.map(report => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={createCustomIcon(report.priority)}
        >
          <Popup className="custom-popup">
            <div className="max-w-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{report.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{report.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {report.category}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  report.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  report.priority === 'URGENT' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {report.priority}
                </span>
              </div>

              <div className="text-xs text-gray-500 mb-2">
                <p><strong>Address:</strong> {report.address}</p>
                <p><strong>Created:</strong> {formatDate(report.created_at)}</p>
                {report.media_count && report.media_count > 0 && (
                  <p><strong>Attachments:</strong> {report.media_count} file(s)</p>
                )}
              </div>

              <button
                onClick={() => onReportClick?.(report)}
                className="w-full bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ));
    } else {
      // Individual markers without clustering
      return reports.map(report => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={createCustomIcon(report.priority)}
        >
          <Popup className="custom-popup">
            <div className="max-w-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{report.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{report.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {report.category}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
              </div>

              <div className="text-xs text-gray-500 mb-2">
                <p><strong>Address:</strong> {report.address}</p>
                <p><strong>Created:</strong> {formatDate(report.created_at)}</p>
              </div>

              <button
                onClick={() => onReportClick?.(report)}
                className="w-full bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ));
    }
  }, [reports, filters.clustered, onReportClick]);

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsUpdater reports={reports} />
        
        {filters.showHeatmap && heatmapData && heatmapData.length > 0 && (
          <HeatmapLayer data={heatmapData} />
        )}
        
        {filters.clustered ? (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              const markers = cluster.getAllChildMarkers();
              // Determine cluster priority based on highest priority in cluster
              const priorities = (markers as any[]).map(m => m.options.report?.priority || 'NORMAL');
              const highestPriority = priorities.includes('CRITICAL') ? 'CRITICAL' : 
                                   priorities.includes('URGENT') ? 'URGENT' : 'NORMAL';
              
              return createCustomIcon(highestPriority, count);
            }}
          >
            {markers}
          </MarkerClusterGroup>
        ) : (
          markers
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
