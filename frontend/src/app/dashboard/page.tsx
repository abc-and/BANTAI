"use client";

import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MapContainer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr'
import {
  Car, Calendar, Clock, Gauge, Weight, CheckCircle, XCircle,
  AlertTriangle, MapPin, Navigation, Search, Filter, X,
  Layers, Map as MapIcon, Satellite, Mountain, Globe, RefreshCw, ZoomIn, Camera
} from "lucide-react";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type ViolationType = "overcapacity" | "overspeeding";
type ViolationStatus = "unverified" | "verified" | "dismissed";
type MapLayerType = "streets" | "satellite" | "terrain" | "dark";

interface Violation {
  id: string;
  type: ViolationType;
  status: ViolationStatus;
  plateNumber: string;
  vehicleId: string;
  routeName?: string;
  location: string;
  coordinates: [number, number];
  timestamp: Date;
  speed?: number;
  speedLimit?: number;
  speedExcess?: number;
  passengerCount?: number;
  totalCapacity?: number;
  excessCount?: number;
  imageUrl?: string;
  operator?: string;
}

// ─────────────────────────────────────────
// STATUS MAPPING
// ─────────────────────────────────────────
function mapStatus(status: string): ViolationStatus {
  if (status === "CONFIRMED") return "verified";
  if (status === "DISMISSED") return "dismissed";
  return "unverified";
}

function mapStatusToDb(status: ViolationStatus): string {
  if (status === "verified") return "CONFIRMED";
  if (status === "dismissed") return "DISMISSED";
  return "PENDING";
}

function parseMeta(raw: any): any {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

// ─────────────────────────────────────────
// DATA FETCHING
// ─────────────────────────────────────────
async function fetchAllViolations(): Promise<Violation[]> {
  try {
    const response = await fetch("/api/violations");
    if (!response.ok) throw new Error("Failed to fetch violations");
    const { overspeeding, overcapacity } = await response.json();

    // Process overcapacity violations
    const capacityViolations: Violation[] = (overcapacity || []).map((row: any, index: number) => {
      try {
        let recordedSitting = row.recorded_sitting || 0;
        let recordedStanding = row.recorded_standing || 0;

        if (row.metadata) {
          try {
            const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
            recordedSitting = recordedSitting || meta.recorded_sitting || 0;
            recordedStanding = recordedStanding || meta.recorded_standing || 0;
          } catch (e) {
            console.error('Failed to parse metadata:', e);
          }
        }

        const totalPassengers = recordedSitting + recordedStanding;
        const legalCapacity = 20;
        const excessCount = Math.max(0, totalPassengers - legalCapacity);

        const uniqueId = row.overcapacity_id || `cap_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;

        return {
          id: uniqueId,
          type: "overcapacity" as ViolationType,
          status: mapStatus(row.status || "PENDING"),
          vehicleId: row.vehicle_code || row.vehicle_id || 'Unknown',
          plateNumber: row.plate_number || 'No Plate',
          routeName: row.route_name || "Unknown Route",
          location: row.location || "Mandaue City",
          coordinates: [10.3235, 123.9222] as [number, number],
          timestamp: row.detected_at ? new Date(row.detected_at) : new Date(),
          passengerCount: totalPassengers,
          totalCapacity: legalCapacity,
          excessCount: excessCount,
          imageUrl: row.imageUrl || row.image_url || null,
          operator: row.operator_name || null,
        };
      } catch (err) {
        console.error('Error processing overcapacity violation:', err, row);
        return null;
      }
    }).filter((v: any) => v !== null) as Violation[];

    // Process overspeeding violations
    const speedViolations: Violation[] = (overspeeding || []).map((row: any, index: number) => {
      try {
        const violationId = row.id || row.overspeeding_id || row.violation_id || `speed_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;

        let location = "Mandaue City";
        if (row.location && typeof row.location === 'string') {
          location = row.location;
        } else if (row.metadata) {
          try {
            const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
            if (meta.location && typeof meta.location === 'string') {
              location = meta.location;
            } else if (meta.location?.locationName) {
              location = meta.location.locationName;
            }
          } catch (e) {
            console.error('Failed to parse metadata for location:', e);
          }
        }

        let lat = 10.3235;
        let lng = 123.9222;

        if (row.latitude && row.longitude) {
          lat = row.latitude;
          lng = row.longitude;
        } else if (row.coordinates) {
          if (Array.isArray(row.coordinates)) {
            lat = row.coordinates[0] || 10.3235;
            lng = row.coordinates[1] || 123.9222;
          }
        }

        const speed = row.speed || 0;
        const speedLimit = row.speedLimit || row.speed_limit || 60;
        const speedExcess = Math.max(0, speed - speedLimit);

        return {
          id: violationId,
          type: "overspeeding" as ViolationType,
          status: mapStatus(row.status || "PENDING"),
          vehicleId: row.vehicle_code || row.vehicle_id || 'Unknown',
          plateNumber: row.plate_number || 'No Plate',
          routeName: row.route_name || "Unknown Route",
          location: location,
          coordinates: [lat, lng] as [number, number],
          timestamp: row.detected_at ? new Date(row.detected_at) : new Date(),
          speed: speed,
          speedLimit: speedLimit,
          speedExcess: speedExcess,
          imageUrl: row.imageUrl || row.image_url || null,
          operator: row.operator_name || null,
        };
      } catch (err) {
        console.error('Error processing overspeeding violation:', err, row);
        return null;
      }
    }).filter((v: any) => v !== null) as Violation[];

    const allViolations = [...capacityViolations, ...speedViolations];
    console.log(`Loaded ${capacityViolations.length} overcapacity and ${speedViolations.length} overspeeding violations`);

    return allViolations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('Error in fetchAllViolations:', error);
    return [];
  }
}

async function updateViolationStatus(id: string, type: ViolationType, newStatus: ViolationStatus) {
  const dbStatus = mapStatusToDb(newStatus);
  await fetch(`/api/violations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: dbStatus, type }),
  });
}

// ─────────────────────────────────────────
// MAP TILE LAYERS
// ─────────────────────────────────────────
const ESRI_TRANSPORT_OVERLAY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";

const ESRI_LABELS_OVERLAY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const mapLayers: Record<
  MapLayerType,
  {
    url: string;
    attribution: string;
    iconComponent: any;
    overlayUrl?: string;
    labelsUrl?: string;
  }
> = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    iconComponent: MapIcon,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics",
    iconComponent: Satellite,
    overlayUrl: ESRI_TRANSPORT_OVERLAY,
    labelsUrl: ESRI_LABELS_OVERLAY,
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap contributors",
    iconComponent: Mountain,
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© CartoDB",
    iconComponent: Globe,
  },
};

// ─────────────────────────────────────────
// LEAFLET ICON FIX
// ─────────────────────────────────────────
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

const createCustomIcon = (color: string, isVerified = false) =>
  isVerified
    ? L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" style="position:absolute;top:7px;left:7px;">
            <path d="M20 6L9 17L4 12" stroke="white" stroke-linecap="round"/>
          </svg>
        </div>`,
      iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28],
    })
    : L.divIcon({
      className: "",
      html: `<div style="width:24px;height:24px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.25);">
          <div style="width:10px;height:10px;background:white;border-radius:50%;position:absolute;top:7px;left:7px;transform:rotate(45deg);"></div>
        </div>`,
      iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24],
    });

const overspeedingIcon = createCustomIcon("#ef4444");
const overcapacityIcon = createCustomIcon("#3b82f6");
const verifiedIcon = createCustomIcon("#22c55e", true);

const t = (isDark: boolean, dark: string, light: string) => isDark ? dark : light;

// ─────────────────────────────────────────
// MAP CONTROLLER COMPONENTS
// ─────────────────────────────────────────
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}

function MapLayerController({ layerType }: { layerType: MapLayerType }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    const cfg = mapLayers[layerType];

    L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: 19,
    }).addTo(map);

    if (cfg.overlayUrl) {
      L.tileLayer(cfg.overlayUrl, { maxZoom: 19, opacity: 1 }).addTo(map);
    }

    if (cfg.labelsUrl) {
      L.tileLayer(cfg.labelsUrl, { maxZoom: 19, opacity: 1 }).addTo(map);
    }
  }, [map, layerType]);

  return null;
}

// ─────────────────────────────────────────
// VIOLATION MARKER WITH SAFETY CHECKS
// ─────────────────────────────────────────
function ViolationMarker({ violation, onClick }: { violation: Violation; onClick: () => void }) {
  if (!violation || !violation.coordinates || !violation.id) {
    console.warn('Invalid violation data:', violation);
    return null;
  }

  const lat = violation.coordinates[0];
  const lng = violation.coordinates[1];

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    console.warn('Invalid coordinates for violation:', violation.id, violation.coordinates);
    return null;
  }

  const icon =
    violation.status === "verified"
      ? verifiedIcon
      : violation.type === "overspeeding"
        ? overspeedingIcon
        : overcapacityIcon;

  const displayLocation = typeof violation.location === 'string' ? violation.location : 'Unknown Location';

  return (
    <Marker position={violation.coordinates} icon={icon} eventHandlers={{ click: onClick }}>
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <div className={"h-1 " + (violation.status === "verified" ? "bg-emerald-500" : violation.type === "overspeeding" ? "bg-red-500" : "bg-blue-500")} />
        <div className="px-3 py-2">
          <div className="font-semibold mb-1">{violation.plateNumber}</div>
          <div className="flex items-center gap-1 text-[10px] mb-0.5">
            {violation.type === "overspeeding"
              ? <><Gauge size={10} className="text-red-500" /><span className="text-red-600">Overspeeding</span></>
              : <><Weight size={10} className="text-blue-500" /><span className="text-blue-600">Overcapacity</span></>}
          </div>
          <div className="text-[10px] text-slate-500">
            {violation.type === "overspeeding"
              ? `${violation.speed || 0} km/h (+${violation.speedExcess || 0})`
              : `${violation.passengerCount || 0}/${violation.totalCapacity || 20} pax (+${violation.excessCount || 0})`}
          </div>
        </div>
      </Tooltip>
      <Popup>
        <div className="min-w-[180px] p-1">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-slate-800 text-sm">{violation.plateNumber}</p>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{violation.vehicleId}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
            <MapPin size={10} />
            <span>{violation.routeName || displayLocation}</span>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1">
              {violation.type === "overspeeding"
                ? <><Gauge size={12} className="text-red-500" /><span className="text-xs font-semibold text-red-600">{violation.speed || 0} km/h</span></>
                : <><Weight size={12} className="text-blue-500" /><span className="text-xs font-semibold text-blue-600">{violation.passengerCount || 0} pax</span></>}
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-[9px]">
              <Clock size={8} /><span>{format(violation.timestamp, "hh:mm a")}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────
function StatusBadge({ status }: { status: ViolationStatus }) {
  const config = {
    unverified: { label: "Unverified", icon: AlertTriangle, className: "bg-amber-50 text-amber-700" },
    verified: { label: "Verified", icon: CheckCircle, className: "bg-emerald-50 text-emerald-700" },
    dismissed: { label: "Dismissed", icon: XCircle, className: "bg-slate-100 text-slate-500" },
  };
  const { label, icon: Icon, className } = config[status];
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${className}`}>
      <Icon size={8} />{label}
    </span>
  );
}

// ─────────────────────────────────────────
// PORTAL FOR LAYER MENU
// ─────────────────────────────────────────
function LayerMenuPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

// ─────────────────────────────────────────
// FULLSCREEN IMAGE
// ─────────────────────────────────────────
function FullscreenImage({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={imageUrl} alt="Evidence" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
        <button onClick={onClose} className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
          <X size={24} />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-xs font-medium flex items-center gap-2">
          <ZoomIn size={14} />Click anywhere to close
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// QUICK VIEW MODAL
// ─────────────────────────────────────────
function QuickViewModal({
  violation, isDark, onClose, onVerify, onDismiss,
}: {
  violation: Violation;
  isDark: boolean;
  onClose: () => void;
  onVerify: (id: string, type: ViolationType) => void;
  onDismiss: (id: string, type: ViolationType) => void;
}) {
  const isOvercapacity = violation.type === "overcapacity";
  const hasImage = violation.imageUrl && violation.type === "overcapacity";
  const [isFullscreen, setIsFullscreen] = useState(false);

  const excessPercent = isOvercapacity
    ? ((violation.excessCount || 0) / (violation.totalCapacity || 1)) * 100
    : ((violation.speedExcess || 0) / (violation.speedLimit || 1)) * 100;

  const displayLocation = typeof violation.location === 'string' ? violation.location : 'Unknown Location';

  return (
    <>
      <div className="fixed top-16 right-0 bottom-0 z-[2000] flex animate-in slide-in-from-right duration-300">
        <div className={`w-full max-w-[520px] h-full overflow-y-auto shadow-2xl border-l relative ${t(isDark, "bg-slate-900 border-slate-700", "bg-white border-slate-200")}`}>
          <div className={`sticky top-0 z-20 shadow-sm border-b ${t(isDark, "bg-slate-900 border-slate-800", "bg-white border-slate-100")}`}>
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                <div className={`relative p-4 rounded-2xl shrink-0 ${isOvercapacity ? t(isDark, "bg-gradient-to-br from-blue-500/20 to-blue-600/10", "bg-gradient-to-br from-blue-50 to-blue-100") : t(isDark, "bg-gradient-to-br from-rose-500/20 to-rose-600/10", "bg-gradient-to-br from-red-50 to-red-100")}`}>
                  <div className={`absolute inset-0 rounded-2xl animate-ping opacity-20 ${isOvercapacity ? "bg-blue-500" : "bg-red-500"}`} />
                  {isOvercapacity ? <Weight size={32} className={t(isDark, "text-blue-400", "text-blue-600")} strokeWidth={2.5} /> : <Gauge size={32} className={t(isDark, "text-rose-400", "text-red-500")} strokeWidth={2.5} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className={`text-2xl font-black tracking-tighter uppercase truncate ${t(isDark, "text-white", "text-slate-800")}`}>
                      {violation.type === "overcapacity" ? "OVERCAPACITY" : "OVERSPEEDING"}
                    </h2>
                    <div className="shrink-0"><StatusBadge status={violation.status} /></div>
                  </div>
                  <p className={`text-xs font-mono truncate ${t(isDark, "text-slate-400", "text-slate-500")}`} title={`${violation.vehicleId} • ${violation.plateNumber}`}>
                    {violation.vehicleId} • {violation.plateNumber}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0"><Calendar size={12} /><span>{format(violation.timestamp, "MMM dd, yyyy")}</span></div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0"><Clock size={12} /><span>{format(violation.timestamp, "hh:mm a")}</span></div>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 ${t(isDark, "bg-slate-800 hover:bg-slate-700 text-slate-400", "bg-slate-100 hover:bg-slate-200 text-slate-600")}`}>
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6 pb-20">
            <div className={`flex items-center justify-between p-3 rounded-xl ${violation.status === "unverified" ? t(isDark, "bg-amber-500/10 border border-amber-500/20", "bg-amber-50 border border-amber-200") : violation.status === "verified" ? t(isDark, "bg-emerald-500/10 border border-emerald-500/20", "bg-emerald-50 border border-emerald-200") : t(isDark, "bg-slate-800/50 border border-slate-700", "bg-slate-100 border border-slate-200")}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${violation.status === "unverified" ? "bg-amber-500 animate-pulse" : violation.status === "verified" ? "bg-emerald-500" : "bg-slate-400"}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${violation.status === "unverified" ? "text-amber-600 dark:text-amber-400" : violation.status === "verified" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>{violation.status}</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">ID: {violation.id.slice(0, 8)}...</p>
            </div>

            <div className={`p-5 rounded-2xl ${t(isDark, "bg-slate-800/40", "bg-gradient-to-br from-slate-50 to-slate-100/50")}`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">{isOvercapacity ? "PASSENGER COUNT" : "DETECTED SPEED"}</p>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${excessPercent > 20 ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500"}`}>EXCESS: {isOvercapacity ? `+${violation.excessCount}` : `+${violation.speedExcess} km/h`}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-5xl font-black ${t(isDark, "text-white", "text-slate-800")}`}>{isOvercapacity ? violation.passengerCount : violation.speed}</span>
                  <span className={`text-xl font-bold ${t(isDark, "text-slate-400", "text-slate-400")}`}>/ {isOvercapacity ? violation.totalCapacity : `${violation.speedLimit} km/h`}</span>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${isOvercapacity ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-gradient-to-r from-red-500 to-red-600"}`} style={{ width: `${Math.min(excessPercent + 100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400"><span>Limit</span><span className="font-bold">Excess Detected</span></div>
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border-2 ${t(isDark, "border-slate-700/50 bg-slate-800/20", "border-slate-200/50 bg-gradient-to-br from-slate-50 to-white")}`}>
              <div className="flex items-center gap-3 mb-3"><div className={`p-2 rounded-xl ${t(isDark, "bg-blue-500/20", "bg-blue-100")}`}><MapPin size={16} className="text-blue-500" /></div><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Route & Location</p></div>
              <p className={`text-base font-bold mb-1 ${t(isDark, "text-slate-200", "text-slate-700")}`}>{violation.routeName || "Unknown Route"}</p>
              <p className={`text-xs mb-2 ${t(isDark, "text-slate-400", "text-slate-500")}`}>{displayLocation}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400"><Navigation size={10} /><span>Coordinates: {violation.coordinates[0].toFixed(4)}, {violation.coordinates[1].toFixed(4)}</span></div>
            </div>

            {hasImage && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Camera size={14} className="text-slate-400" /><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Evidence Image</p></div><span className="text-[8px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-500 font-bold">CAPTURED AT SCENE</span></div>
                <div onClick={() => setIsFullscreen(true)} className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-lg">
                  <img src={violation.imageUrl} alt="Violation evidence" className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="transform scale-90 group-hover:scale-100 transition-all duration-300"><div className="bg-white/20 backdrop-blur-md rounded-full p-4"><ZoomIn size={32} className="text-white" /></div></div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300"><p className="text-white text-xs font-medium">Click to expand in fullscreen</p></div>
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-[10px] text-white flex items-center gap-1.5"><Camera size={10} /> Evidence Photo</div>
                </div>
              </div>
            )}

            {violation.status === "unverified" && (
              <div className="space-y-3 pt-4 sticky bottom-0 bg-inherit pb-6">
                <button onClick={() => { onVerify(violation.id, violation.type); onClose(); }} className="group relative w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black rounded-2xl transition-all duration-200 active:scale-95 text-sm overflow-hidden">
                  <span className="relative z-10 flex items-center justify-center gap-2"><CheckCircle size={16} />Verify Violation</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
                <button onClick={() => { onDismiss(violation.id, violation.type); onClose(); }} className={`group relative w-full h-14 font-black rounded-2xl transition-all duration-200 active:scale-95 text-sm overflow-hidden ${t(isDark, "bg-slate-800 text-white hover:bg-slate-700", "bg-slate-200 text-slate-700 hover:bg-slate-300")}`}>
                  <span className="relative z-10 flex items-center justify-center gap-2"><XCircle size={16} />Dismiss</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {isFullscreen && <FullscreenImage imageUrl={violation.imageUrl!} onClose={() => setIsFullscreen(false)} />}
    </>
  );
}

// ─────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────
export default function AdminDashboard() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const isDark = theme === "dark";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [mapCenter] = useState<[number, number]>([10.3235, 123.9222]);
  const [mapZoom] = useState(14);
  const [mapLayer, setMapLayer] = useState<MapLayerType>("streets");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [layerMenuCoords, setLayerMenuCoords] = useState({ top: 0, left: 0 });
  const layerButtonRef = useRef<HTMLButtonElement | null>(null);

  const [violations, setViolations] = useState<Violation[]>([]);
  const [fleetCount, setFleetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ViolationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ViolationType | "all">("all");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadViolations = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch violations
      const vData = await fetchAllViolations();
      const uniqueViolations = vData.filter((v, index, self) => index === self.findIndex((t) => t.id === v.id));
      const validViolations = uniqueViolations.filter(v =>
        v.id && v.coordinates && v.coordinates.length === 2 &&
        typeof v.coordinates[0] === 'number' && typeof v.coordinates[1] === 'number' &&
        !isNaN(v.coordinates[0]) && !isNaN(v.coordinates[1])
      );

      // Filter by operator if not super admin
      const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "SUPERADMIN";
      let finalViolations = validViolations;
      
      if (user && !isSuperAdmin && user.operatorName) {
        finalViolations = validViolations.filter(v => v.operator === user.operatorName);
      }

      setViolations(finalViolations);

      // Fetch fleet count
      const vehicleResponse = await fetch("/api/vehicles");
      if (vehicleResponse.ok) {
        let vehicles = await vehicleResponse.json();
        
        if (user && !isSuperAdmin && user.operatorName) {
          vehicles = vehicles.filter((v: any) => v.operator?.operator_name === user.operatorName);
        }
        
        setFleetCount(vehicles.length);
      }

      setLastRefresh(new Date());
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, fetchAllViolations]);

  useEffect(() => {
    loadViolations();
    const interval = setInterval(loadViolations, 15000);
    return () => clearInterval(interval);
  }, [loadViolations, user]);

  useEffect(() => {
    if (!showLayerMenu || !layerButtonRef.current) return;
    const update = () => {
      const rect = layerButtonRef.current?.getBoundingClientRect();
      if (rect) setLayerMenuCoords({ top: rect.bottom + 8, left: rect.left });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [showLayerMenu]);

  const filteredViolations = useMemo(() =>
    violations.filter((v) => {
      if (searchQuery && !v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !v.vehicleId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      return true;
    }), [violations, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: violations.length,
    unverified: violations.filter(v => v.status === "unverified").length,
    verified: violations.filter(v => v.status === "verified").length,
    overspeeding: violations.filter(v => v.type === "overspeeding").length,
    overcapacity: violations.filter(v => v.type === "overcapacity").length,
  }), [violations]);

  const handleVerifyViolation = useCallback(async (id: string, type: ViolationType) => {
    setViolations(prev => prev.map(v => v.id === id ? { ...v, status: "verified" } : v));
    await updateViolationStatus(id, type, "verified");
  }, []);

  const handleDismissViolation = useCallback(async (id: string, type: ViolationType) => {
    setViolations(prev => prev.map(v => v.id === id ? { ...v, status: "dismissed" } : v));
    await updateViolationStatus(id, type, "dismissed");
  }, []);

  const clearFilters = () => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); };

  const layerOptions: { id: MapLayerType; label: string; icon: any; badge?: string }[] = [
    { id: "streets", label: "Streets", icon: MapIcon },
    { id: "satellite", label: "Satellite", icon: Satellite, badge: "+ labels" },
    { id: "terrain", label: "Terrain", icon: Mountain },
    { id: "dark", label: "Dark", icon: Globe },
  ];
  const CurrentLayerIcon = mapLayers[mapLayer].iconComponent;

  return (
    <div className={`h-screen w-full overflow-hidden transition-colors duration-300 ${t(isDark, "bg-slate-900", "bg-slate-50")}`}>
      <header className={`h-16 border-b flex items-center justify-between px-5 shrink-0 backdrop-blur-md ${t(isDark, "bg-slate-900/80 border-slate-700/50", "bg-white/80 border-slate-200/50")}`}>
        <div className="flex items-center gap-3">
          {[
            { label: "Fleet", value: fleetCount, icon: Car, colorKey: "blue" },
            { label: "Pending", value: stats.unverified, icon: AlertTriangle, colorKey: "amber" },
            { label: "Verified", value: stats.verified, icon: CheckCircle, colorKey: "emerald" },
          ].map(({ label, value, icon: Icon, colorKey }) => {
            const colors: Record<string, { wrap: string; inner: string; text: string }> = {
              blue: { wrap: t(isDark, "bg-blue-500/10 border-blue-500/20", "bg-blue-50 border-blue-200/50"), inner: t(isDark, "bg-blue-500/20", "bg-blue-100"), text: "text-sky-900 dark:text-sky-300" },
              amber: { wrap: t(isDark, "bg-amber-500/10 border-amber-500/20", "bg-amber-50 border-amber-200/50"), inner: t(isDark, "bg-amber-500/20", "bg-amber-100"), text: "text-amber-700 dark:text-amber-300" },
              emerald: { wrap: t(isDark, "bg-emerald-500/10 border-emerald-500/20", "bg-emerald-50 border-emerald-200/50"), inner: t(isDark, "bg-emerald-500/20", "bg-emerald-100"), text: "text-emerald-700 dark:text-emerald-300" },
            };
            const c = colors[colorKey];
            return (
              <div key={label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${c.wrap}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.inner}`}>
                  <Icon size={colorKey === "blue" ? 14 : 14} className={colorKey === "blue" ? "text-blue-500" : colorKey === "amber" ? "text-amber-500" : "text-emerald-500"} />
                </div>
                <div>
                  <p className={`text-[9px] font-medium leading-tight ${colorKey === "blue" ? "text-slate-500" : colorKey === "amber" ? "text-amber-600" : "text-emerald-600"}`}>{label}</p>
                  <p className={`text-xl font-black tracking-tight leading-tight ${c.text}`}>{value}</p>
                </div>
              </div>
            );
          })}
          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
          {[
            { label: "Speeding", value: stats.overspeeding, icon: Gauge, colorKey: "red" },
            { label: "Overcapacity", value: stats.overcapacity, icon: Weight, colorKey: "blue" },
          ].map(({ label, value, icon: Icon, colorKey }) => (
            <div key={label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${t(isDark, `bg-${colorKey === "red" ? "red" : "blue"}-500/10 border-${colorKey === "red" ? "red" : "blue"}-500/20`, `bg-${colorKey === "red" ? "red" : "blue"}-50 border-${colorKey === "red" ? "red" : "blue"}-200/50`)}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, `bg-${colorKey === "red" ? "red" : "blue"}-500/20`, `bg-${colorKey === "red" ? "red" : "blue"}-100`)}`}>
                <Icon size={12} className={colorKey === "red" ? "text-red-500" : "text-blue-500"} />
              </div>
              <div>
                <p className={`text-[9px] font-medium leading-tight ${colorKey === "red" ? "text-red-600" : "text-blue-600"}`}>{label}</p>
                <p className={`text-xl font-black tracking-tight leading-tight ${colorKey === "red" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadViolations} disabled={loading} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${t(isDark, "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300", "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}`}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span className="text-[9px] text-slate-400">{format(lastRefresh, "hh:mm:ss")}</span>
          </button>
          <div className="relative z-[99999]">
            <button ref={layerButtonRef} onClick={() => { const rect = layerButtonRef.current?.getBoundingClientRect(); if (rect) setLayerMenuCoords({ top: rect.bottom + 8, left: rect.left }); setShowLayerMenu(p => !p); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${t(isDark, "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300", "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}`}>
              <Layers size={12} />
              <CurrentLayerIcon size={12} className="opacity-70" />
              <span className="capitalize">{mapLayer}</span>
            </button>
            {showLayerMenu && (
              <LayerMenuPortal>
                <div className="fixed inset-0 z-[99998]" onClick={() => setShowLayerMenu(false)} />
                <div className={`fixed rounded-lg border shadow-xl z-[99999] ${t(isDark, "bg-slate-900 border-slate-700", "bg-white border-slate-200")}`} style={{ top: layerMenuCoords.top, left: layerMenuCoords.left, minWidth: 160 }}>
                  <div className="p-2 space-y-1">
                    {layerOptions.map(({ id, label, icon: Icon, badge }) => (
                      <button key={id} onClick={() => { setMapLayer(id); setShowLayerMenu(false); }} className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${mapLayer === id ? t(isDark, "bg-blue-500/20 text-blue-400", "bg-blue-50 text-blue-600") : t(isDark, "text-slate-300 hover:bg-slate-700", "text-slate-600 hover:bg-slate-100")}`}>
                        <Icon size={12} /><span>{label}</span>{badge && <span className="ml-auto text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold">{badge}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </LayerMenuPortal>
            )}
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t(isDark, "bg-emerald-500/10 border-emerald-500/20", "bg-emerald-50 border-emerald-200/50")}`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">LIVE</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t(isDark, "bg-slate-800/50 border-slate-700", "bg-slate-100/50 border-slate-200")}`}>
            <Calendar size={11} className="text-slate-400" />
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{format(currentTime, "MMM dd")}</span>
            <Clock size={11} className="text-slate-400" />
            <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300">{format(currentTime, "hh:mm:ss a")}</span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex-[7] p-3">
          <div className="relative h-full rounded-xl shadow-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            {loading && violations.length === 0 && (
              <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3"><RefreshCw size={24} className="animate-spin text-blue-500" /><p className="text-sm text-slate-500">Loading violations...</p></div>
              </div>
            )}
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }} zoomControl={false} attributionControl={true}>
              <MapLayerController layerType={mapLayer} />
              {violations.map((v, index) => (
                <ViolationMarker key={`${v.id}_${index}`} violation={v} onClick={() => setSelectedViolation(v)} />
              ))}
              <MapController center={mapCenter} zoom={mapZoom} />
            </MapContainer>
            <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-md p-2 border border-slate-200/50 dark:border-slate-700/50 z-[1000]">
              <div className="flex gap-3">{[["#ef4444", "Speeding"], ["#3b82f6", "Overcapacity"], ["#22c55e", "Verified"]].map(([color, label]) => (<div key={label} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /><span className="text-[9px] text-slate-600 dark:text-slate-400">{label}</span></div>))}</div>
            </div>
            <div className="absolute bottom-3 right-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg p-1.5 text-[9px] text-slate-500 z-[1000]"><Navigation size={10} className="inline mr-1" />Zoom • Pan</div>
          </div>
        </div>

        <div className={`flex-[3] border-l flex flex-col overflow-hidden ${t(isDark, "bg-slate-900/95 border-slate-700/50", "bg-white border-slate-200/50")}`}>
          <div className="p-3 space-y-2.5 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="relative flex-1"><Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search plate or vehicle ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium ${t(isDark, "bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500", "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400")}`} /></div>
              {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (<button onClick={clearFilters} className={`p-2 rounded-lg ${t(isDark, "hover:bg-slate-800 text-slate-400", "hover:bg-slate-100 text-slate-400")}`}><X size={12} /></button>)}
            </div>
            <div className="flex gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={`flex-1 text-[10px] rounded-lg border px-3 py-2 font-medium focus:outline-none cursor-pointer ${t(isDark, "bg-slate-800/50 border-slate-700 text-slate-300", "bg-slate-50 border-slate-200 text-slate-700")}`}><option value="all">All Status</option><option value="unverified">Unverified</option><option value="verified">Verified</option><option value="dismissed">Dismissed</option></select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className={`flex-1 text-[10px] rounded-lg border px-3 py-2 font-medium focus:outline-none cursor-pointer ${t(isDark, "bg-slate-800/50 border-slate-700 text-slate-300", "bg-slate-50 border-slate-200 text-slate-700")}`}><option value="all">All Types</option><option value="overspeeding">Speeding</option><option value="overcapacity">Overcapacity</option></select>
            </div>
            <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] border ${t(isDark, "bg-slate-800/30 border-slate-700 text-slate-400", "bg-blue-50 border-blue-200/50 text-slate-600")}`}><span><span className={`font-bold ${t(isDark, "text-slate-200", "text-slate-800")}`}>{filteredViolations.length}</span> of {violations.length} violations</span><div className="flex items-center gap-1"><Filter size={9} />Filtered</div></div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {loading && violations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400"><RefreshCw size={32} className="mb-3 animate-spin opacity-30" /><p className="text-xs font-medium">Fetching violations...</p></div>
            ) : filteredViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400"><CheckCircle size={40} className="mb-3 opacity-20" /><p className="text-xs font-medium">No violations found</p><p className="text-[9px] text-slate-500 mt-1">Try adjusting your filters</p></div>
            ) : (
              filteredViolations.map((violation) => (
                <div key={violation.id} onClick={() => setSelectedViolation(violation)} className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${t(isDark, "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 hover:border-blue-500/50", "bg-blue-50/50 border-slate-200/60 hover:bg-blue-100/60 hover:border-blue-300/50 hover:shadow-md")}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`p-1 rounded-lg ${violation.type === "overspeeding" ? t(isDark, "bg-red-500/20", "bg-red-100") : t(isDark, "bg-blue-500/20", "bg-blue-100")}`}>
                        {violation.type === "overspeeding" ? <Gauge size={10} className="text-red-500" /> : <Weight size={10} className="text-blue-500" />}
                      </div>
                      <div><p className={`font-bold text-sm ${t(isDark, "text-white", "text-slate-800")}`}>{violation.plateNumber}</p><p className="text-[8px] text-slate-500">{violation.vehicleId}</p></div>
                    </div>
                    <div className="flex items-center gap-1 min-w-0 flex-1"><MapPin size={8} className="text-slate-500 flex-shrink-0" /><span className="text-[8px] text-slate-500 truncate">{violation.routeName || typeof violation.location === 'string' ? violation.location.split(",")[0] : 'Unknown'}</span></div>
                    <div className="flex items-center gap-1 flex-shrink-0"><Clock size={8} className="text-slate-500" /><span className="text-[8px] text-slate-500 whitespace-nowrap">{format(violation.timestamp, "hh:mm a")}</span></div>
                    <div className="text-[10px] font-bold flex-shrink-0">{violation.type === "overspeeding" ? <span className="text-red-600 dark:text-red-400">{violation.speed} km/h</span> : <span className="text-blue-600 dark:text-blue-400">{violation.passengerCount} pax</span>}</div>
                    <div className="flex-shrink-0"><StatusBadge status={violation.status} /></div>
                    {violation.status === "unverified" && (
                      <div className="relative flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setActiveActionId(activeActionId === violation.id ? null : violation.id); }} className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${t(isDark, "text-slate-300 bg-slate-700 hover:bg-slate-600", "text-slate-600 bg-slate-200 hover:bg-slate-300")}`}>•••</button>
                        {activeActionId === violation.id && (<><div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveActionId(null); }} /><div className={`absolute right-0 top-full mt-1 rounded-lg border shadow-xl z-[1001] overflow-hidden ${t(isDark, "bg-slate-900 border-slate-700", "bg-white border-slate-200")}`}><button onClick={(e) => { e.stopPropagation(); handleVerifyViolation(violation.id, violation.type); setActiveActionId(null); }} className="w-full text-[8px] font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-3 py-1.5 text-left">Verify</button><button onClick={(e) => { e.stopPropagation(); handleDismissViolation(violation.id, violation.type); setActiveActionId(null); }} className={`w-full text-[8px] font-semibold px-3 py-1.5 text-left ${t(isDark, "text-slate-300 bg-slate-700 hover:bg-slate-600", "text-slate-600 bg-slate-100 hover:bg-slate-200")}`}>Dismiss</button></div></>)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedViolation && (
        <QuickViewModal violation={selectedViolation} isDark={isDark} onClose={() => setSelectedViolation(null)} onVerify={handleVerifyViolation} onDismiss={handleDismissViolation} />
      )}
    </div>
  );
}