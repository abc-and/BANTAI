// app/dashboard/page.tsx
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
import {
  Car, Calendar, Clock, Gauge, Weight, CheckCircle, XCircle,
  AlertTriangle, MapPin, Navigation, Search, Filter, X,
  Layers, Map as MapIcon, Satellite, Mountain, Globe, RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────
// SUPABASE CONFIG
// ─────────────────────────────────────────
const SUPABASE_URL = "https://imsmosjkayjtkalxrybm.supabase.co";
const SUPABASE_KEY = "sb_publishable_Fkt87iloltUYw01cipNTnA_V2AXL9Ib";
const SUPABASE_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type ViolationType   = "overloading" | "overspeeding";
type ViolationStatus = "unverified"  | "verified" | "dismissed";
type MapLayerType    = "streets"     | "satellite" | "terrain" | "dark";

interface Violation {
  id:              string;
  type:            ViolationType;
  status:          ViolationStatus;
  plateNumber:     string;
  vehicleId:       string;
  location:        string;
  coordinates:     [number, number];
  timestamp:       Date;
  speed?:          number;
  speedLimit?:     number;
  speedExcess?:    number;
  passengerCount?: number;
  totalCapacity?:  number;
  excessCount?:    number;
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
  if (status === "verified")  return "CONFIRMED";
  if (status === "dismissed") return "DISMISSED";
  return "PENDING";
}

// ─────────────────────────────────────────
// METADATA PARSER — handles string or object
// ─────────────────────────────────────────
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
  const [speedRes, capacityRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/overspeeding_violations?select=*&order=detected_at.desc`, { headers: SUPABASE_HEADERS }),
    fetch(`${SUPABASE_URL}/rest/v1/overcapacity_violations?select=*&order=detected_at.desc`,  { headers: SUPABASE_HEADERS }),
  ]);

  const speedRows:    any[] = await speedRes.json();
  const capacityRows: any[] = await capacityRes.json();

  const speedViolations: Violation[] = (Array.isArray(speedRows) ? speedRows : []).map((row) => {
    const meta = parseMeta(row.metadata);
    return {
      id:          row.id,
      type:        "overspeeding" as ViolationType,
      status:      mapStatus(row.status),
      vehicleId:   row.vehicle_id,
      plateNumber: meta?.vehicle?.plateNumber   ?? row.vehicle_id,
      location:    meta?.location?.locationName ?? "Unknown Location",
      coordinates: [
        meta?.location?.latitude  ?? 10.3235,
        meta?.location?.longitude ?? 123.9222,
      ] as [number, number],
      timestamp:   new Date(row.detected_at),
      speed:       meta?.speed?.recordedSpeed,
      speedLimit:  meta?.speed?.speedLimit,
      speedExcess: meta?.speed?.speedExcess,
    };
  });

  const capacityViolations: Violation[] = (Array.isArray(capacityRows) ? capacityRows : []).map((row) => {
    const meta = parseMeta(row.metadata);
    return {
      id:             row.id,
      type:           "overloading" as ViolationType,
      status:         mapStatus(row.status),
      vehicleId:      row.vehicle_id,
      plateNumber:    meta?.vehicle?.plateNumber   ?? row.vehicle_id,
      location:       meta?.location?.locationName ?? "Unknown Location",
      coordinates:    [
        meta?.location?.latitude  ?? 10.3235,
        meta?.location?.longitude ?? 123.9222,
      ] as [number, number],
      timestamp:      new Date(row.detected_at),
      passengerCount: meta?.capacity?.passengerCount,
      totalCapacity:  meta?.capacity?.totalCapacity,
      excessCount:    meta?.capacity?.excessCount,
    };
  });

  return [...speedViolations, ...capacityViolations].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

async function updateViolationStatus(id: string, type: ViolationType, newStatus: ViolationStatus) {
  const table    = type === "overspeeding" ? "overspeeding_violations" : "overcapacity_violations";
  const dbStatus = mapStatusToDb(newStatus);
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method:  "PATCH",
    headers: SUPABASE_HEADERS,
    body:    JSON.stringify({ status: dbStatus }),
  });
}

// ─────────────────────────────────────────
// MAP TILE LAYERS
// ─────────────────────────────────────────
const mapLayers: Record<MapLayerType, { url: string; iconComponent: any }> = {
  streets:   { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",                                               iconComponent: MapIcon   },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",                iconComponent: Satellite },
  terrain:   { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",                                                             iconComponent: Mountain  },
  dark:      { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",                                                iconComponent: Globe     },
};

// ─────────────────────────────────────────
// LEAFLET ICON FIX
// ─────────────────────────────────────────
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
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
const overloadingIcon  = createCustomIcon("#3b82f6");
const verifiedIcon     = createCustomIcon("#22c55e", true);

// ─────────────────────────────────────────
// THEME HELPER
// ─────────────────────────────────────────
const t = (isDark: boolean, dark: string, light: string) => isDark ? dark : light;

// ─────────────────────────────────────────
// SUB-COMPONENTS
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
    map.eachLayer((layer) => { if (layer instanceof L.TileLayer) map.removeLayer(layer); });
    L.tileLayer(mapLayers[layerType].url, { attribution: "", maxZoom: 19 }).addTo(map);
  }, [map, layerType]);
  return null;
}

function ViolationMarker({ violation, onClick }: { violation: Violation; onClick: () => void }) {
  const icon = violation.status === "verified"
    ? verifiedIcon
    : violation.type === "overspeeding" ? overspeedingIcon : overloadingIcon;

  return (
    <Marker position={violation.coordinates} icon={icon} eventHandlers={{ click: onClick }}>
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <div className={"h-1 " + (violation.status === "verified" ? "bg-emerald-500" : violation.type === "overspeeding" ? "bg-red-500" : "bg-blue-500")} />
        <div className="px-3 py-2">
          <div className="font-semibold mb-1">{violation.plateNumber}</div>
          <div className="flex items-center gap-1 text-[10px] mb-0.5">
            {violation.type === "overspeeding"
              ? <><Gauge size={10} className="text-red-500" /><span className="text-red-600">Overspeeding</span></>
              : <><Weight size={10} className="text-blue-500" /><span className="text-blue-600">Overloading</span></>}
          </div>
          <div className="text-[10px] text-slate-500">
            {violation.type === "overspeeding"
              ? `${violation.speed} km/h (+${violation.speedExcess})`
              : `${violation.passengerCount}/${violation.totalCapacity} pax (+${violation.excessCount})`}
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
            <MapPin size={10} /><span>{violation.location}</span>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1">
              {violation.type === "overspeeding"
                ? <><Gauge size={12} className="text-red-500" /><span className="text-xs font-semibold text-red-600">{violation.speed} km/h</span></>
                : <><Weight size={12} className="text-blue-500" /><span className="text-xs font-semibold text-blue-600">{violation.passengerCount} pax</span></>}
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

function StatusBadge({ status }: { status: ViolationStatus }) {
  const config = {
    unverified: { label: "Unverified", icon: AlertTriangle, className: "bg-amber-50 text-amber-700" },
    verified:   { label: "Verified",   icon: CheckCircle,   className: "bg-emerald-50 text-emerald-700" },
    dismissed:  { label: "Dismissed",  icon: XCircle,       className: "bg-slate-100 text-slate-500" },
  };
  const { label, icon: Icon, className } = config[status];
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${className}`}>
      <Icon size={8} />{label}
    </span>
  );
}

function LayerMenuPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function QuickViewModal({ violation, isDark, onClose, onVerify, onDismiss }: {
  violation: Violation;
  isDark: boolean;
  onClose: () => void;
  onVerify:  (id: string, type: ViolationType) => void;
  onDismiss: (id: string, type: ViolationType) => void;
}) {
  const isOverload = violation.type === "overloading";

  // Format coordinates to 5 decimal places
  const lat = violation.coordinates[0].toFixed(5);
  const lng = violation.coordinates[1].toFixed(5);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className={`w-full max-w-[480px] rounded-[32px] overflow-hidden shadow-2xl ${t(isDark, "bg-slate-900", "bg-white")}`}>
        {/* Header */}
        <div className={`px-8 py-8 flex items-start justify-between border-b ${t(isDark, "border-slate-800", "border-slate-100")}`}>
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-[24px] border ${isOverload
              ? t(isDark, "bg-blue-500/20 border-blue-500/20", "bg-blue-50 border-blue-100")
              : t(isDark, "bg-rose-500/20 border-rose-500/20", "bg-red-50 border-red-100")}`}>
              {isOverload
                ? <Weight size={32} className={t(isDark, "text-blue-400", "text-blue-600")} strokeWidth={2.5} />
                : <Gauge  size={32} className={t(isDark, "text-rose-400", "text-red-500")}  strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tight leading-none uppercase ${t(isDark, "text-white", "text-slate-800")}`}>{violation.type}</h2>
              <p className="text-slate-400 text-sm font-medium mt-1">{violation.vehicleId} • {violation.plateNumber}</p>
              <p className="text-slate-400 text-xs mt-1">{format(violation.timestamp, "MMMM dd, yyyy 'at' hh:mm a")}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border ${t(isDark, "bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Plate Number</p>
              <p className={`text-xl font-black ${t(isDark, "text-white", "text-slate-800")}`}>{violation.plateNumber}</p>
            </div>
            <div className={`p-5 rounded-2xl border ${t(isDark, "bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">
                {isOverload ? "Passengers / Limit" : "Detected Speed"}
              </p>
              <p className={`text-xl font-black ${t(isDark, "text-white", "text-slate-800")}`}>
                {isOverload ? `${violation.passengerCount} / ${violation.totalCapacity}` : `${violation.speed} km/h`}
              </p>
              {!isOverload && violation.speedExcess != null  && <p className="text-xs text-red-500 font-bold mt-1">+{violation.speedExcess} km/h over limit</p>}
              {isOverload  && violation.excessCount != null  && <p className="text-xs text-blue-500 font-bold mt-1">+{violation.excessCount} over capacity</p>}
            </div>
          </div>

          {/* ── Location block — shows street name + coordinates ── */}
          <div className={`p-5 rounded-2xl border ${t(isDark, "bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-3">Location</p>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mt-0.5 flex-shrink-0">
                <MapPin size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                {/* Street name */}
                <p className={`text-base font-bold leading-snug ${t(isDark, "text-slate-200", "text-slate-700")}`}>
                  {violation.location}
                </p>
                {/* Coordinates row */}
                <div className={`flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg w-fit ${t(isDark, "bg-slate-700/60", "bg-slate-200/70")}`}>
                  <Navigation size={10} className="text-slate-400 flex-shrink-0" />
                  <span className={`text-[11px] font-mono font-semibold tracking-wide ${t(isDark, "text-slate-300", "text-slate-600")}`}>
                    {lat}, {lng}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-xs font-black text-amber-600 uppercase tracking-widest italic">{violation.status}</span>
            </div>
            <p className="text-xs font-bold text-slate-400">ID: {violation.id.slice(0, 8)}...</p>
          </div>

          {violation.status === "unverified" && (
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => { onVerify(violation.id, violation.type); onClose(); }}
                className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all active:scale-95 text-sm"
              >
                Verify Violation
              </button>
              <button
                onClick={() => { onDismiss(violation.id, violation.type); onClose(); }}
                className={`flex-1 h-14 font-black rounded-2xl transition-all active:scale-95 text-sm ${t(isDark, "bg-slate-800 text-white hover:bg-slate-700", "bg-slate-900 text-white hover:bg-slate-800")}`}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────
export default function AdminDashboard() {
  const { theme }  = useTheme();
  const { logout } = useAuth();
  const router     = useRouter();
  const isDark     = theme === "dark";

  const [mapCenter]  = useState<[number, number]>([10.3235, 123.9222]);
  const [mapZoom]    = useState(12);
  const [mapLayer, setMapLayer]               = useState<MapLayerType>("streets");
  const [showLayerMenu, setShowLayerMenu]     = useState(false);
  const [layerMenuCoords, setLayerMenuCoords] = useState({ top: 0, left: 0 });
  const layerButtonRef = useRef<HTMLButtonElement | null>(null);

  const [violations, setViolations]               = useState<Violation[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [lastRefresh, setLastRefresh]             = useState(new Date());
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [activeActionId, setActiveActionId]       = useState<string | null>(null);
  const [currentTime, setCurrentTime]             = useState(new Date());
  const [searchQuery, setSearchQuery]             = useState("");
  const [statusFilter, setStatusFilter]           = useState<ViolationStatus | "all">("all");
  const [typeFilter, setTypeFilter]               = useState<ViolationType   | "all">("all");

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch + auto-refresh every 15s
  const loadViolations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllViolations();
      setViolations(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Failed to fetch violations:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadViolations();
    const interval = setInterval(loadViolations, 15000);
    return () => clearInterval(interval);
  }, [loadViolations]);

  // Layer menu position
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
      if (typeFilter   !== "all" && v.type   !== typeFilter)   return false;
      return true;
    }),
  [violations, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total:        violations.length,
    unverified:   violations.filter(v => v.status === "unverified").length,
    verified:     violations.filter(v => v.status === "verified").length,
    overspeeding: violations.filter(v => v.type   === "overspeeding").length,
    overloading:  violations.filter(v => v.type   === "overloading").length,
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

  const layerOptions: { id: MapLayerType; label: string; icon: any }[] = [
    { id: "streets",   label: "Streets",   icon: MapIcon   },
    { id: "satellite", label: "Satellite", icon: Satellite },
    { id: "terrain",   label: "Terrain",   icon: Mountain  },
    { id: "dark",      label: "Dark",      icon: Globe     },
  ];
  const CurrentLayerIcon = mapLayers[mapLayer].iconComponent;

  return (
    <div className={`h-screen w-full overflow-hidden transition-colors duration-300 ${t(isDark, "bg-slate-900", "bg-slate-50")}`}>

      {/* ── Header ── */}
      <header className={`h-16 border-b flex items-center justify-between px-5 shrink-0 backdrop-blur-md ${t(isDark, "bg-slate-900/80 border-slate-700/50", "bg-white/80 border-slate-200/50")}`}>
        <div className="flex items-center gap-3">
          {/* Total */}
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${t(isDark, "bg-blue-500/10 border-blue-500/20", "bg-blue-50 border-blue-200/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, "bg-blue-500/20", "bg-blue-100")}`}><Car size={14} className="text-blue-500" /></div>
            <div>
              <p className="text-[9px] font-medium text-slate-500 leading-tight">Total</p>
              <p className="text-xl font-black tracking-tight text-sky-900 dark:text-sky-300 leading-tight">{stats.total}</p>
            </div>
          </div>
          {/* Pending */}
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${t(isDark, "bg-amber-500/10 border-amber-500/20", "bg-amber-50 border-amber-200/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, "bg-amber-500/20", "bg-amber-100")}`}><AlertTriangle size={14} className="text-amber-500" /></div>
            <div>
              <p className="text-[9px] font-medium text-amber-600 leading-tight">Pending</p>
              <p className="text-xl font-black tracking-tight text-amber-700 dark:text-amber-300 leading-tight">{stats.unverified}</p>
            </div>
          </div>
          {/* Verified */}
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${t(isDark, "bg-emerald-500/10 border-emerald-500/20", "bg-emerald-50 border-emerald-200/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, "bg-emerald-500/20", "bg-emerald-100")}`}><CheckCircle size={14} className="text-emerald-500" /></div>
            <div>
              <p className="text-[9px] font-medium text-emerald-600 leading-tight">Verified</p>
              <p className="text-xl font-black tracking-tight text-emerald-700 dark:text-emerald-300 leading-tight">{stats.verified}</p>
            </div>
          </div>
          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
          {/* Speeding */}
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${t(isDark, "bg-red-500/10 border-red-500/20", "bg-red-50 border-red-200/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, "bg-red-500/20", "bg-red-100")}`}><Gauge size={12} className="text-red-500" /></div>
            <div>
              <p className="text-[9px] font-medium text-red-600 leading-tight">Speeding</p>
              <p className="text-xl font-black tracking-tight text-red-600 dark:text-red-400 leading-tight">{stats.overspeeding}</p>
            </div>
          </div>
          {/* Overload */}
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${t(isDark, "bg-blue-500/10 border-blue-500/20", "bg-blue-50 border-blue-200/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, "bg-blue-500/20", "bg-blue-100")}`}><Weight size={12} className="text-blue-500" /></div>
            <div>
              <p className="text-[9px] font-medium text-blue-600 leading-tight">Overload</p>
              <p className="text-xl font-black tracking-tight text-blue-600 dark:text-blue-400 leading-tight">{stats.overloading}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={loadViolations}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${t(isDark, "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300", "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}`}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span className="text-[9px] text-slate-400">{format(lastRefresh, "hh:mm:ss")}</span>
          </button>

          {/* Layer picker */}
          <div className="relative z-[99999]">
            <button
              ref={layerButtonRef}
              onClick={() => {
                const rect = layerButtonRef.current?.getBoundingClientRect();
                if (rect) setLayerMenuCoords({ top: rect.bottom + 8, left: rect.left });
                setShowLayerMenu(p => !p);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${t(isDark, "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300", "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}`}
            >
              <Layers size={12} />
              <CurrentLayerIcon size={12} className="opacity-70" />
              <span className="capitalize">{mapLayer}</span>
            </button>
            {showLayerMenu && (
              <LayerMenuPortal>
                <div className="fixed inset-0 z-[99998]" onClick={() => setShowLayerMenu(false)} />
                <div
                  className={`fixed rounded-lg border shadow-xl z-[99999] ${t(isDark, "bg-slate-900 border-slate-700", "bg-white border-slate-200")}`}
                  style={{ top: layerMenuCoords.top, left: layerMenuCoords.left, minWidth: 150 }}
                >
                  <div className="p-2 space-y-1">
                    {layerOptions.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => { setMapLayer(id); setShowLayerMenu(false); }}
                        className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors ${mapLayer === id ? t(isDark, "bg-blue-500/20 text-blue-400", "bg-blue-50 text-blue-600") : t(isDark, "text-slate-300 hover:bg-slate-700", "text-slate-600 hover:bg-slate-100")}`}
                      >
                        <Icon size={12} />{label}
                      </button>
                    ))}
                  </div>
                </div>
              </LayerMenuPortal>
            )}
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Live pill */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t(isDark, "bg-emerald-500/10 border-emerald-500/20", "bg-emerald-50 border-emerald-200/50")}`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">LIVE</span>
          </div>

          {/* Clock */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t(isDark, "bg-slate-800/50 border-slate-700", "bg-slate-100/50 border-slate-200")}`}>
            <Calendar size={11} className="text-slate-400" />
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{format(currentTime, "MMM dd")}</span>
            <Clock size={11} className="text-slate-400" />
            <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300">{format(currentTime, "hh:mm:ss a")}</span>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* Map (70%) */}
        <div className="flex-[7] p-3">
          <div className="relative h-full rounded-xl shadow-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            {loading && violations.length === 0 && (
              <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-blue-500" />
                  <p className="text-sm text-slate-500">Loading violations...</p>
                </div>
              </div>
            )}
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }} zoomControl={false} attributionControl={false}>
              <MapLayerController layerType={mapLayer} />
              {violations.map((v) => (
                <ViolationMarker key={v.id} violation={v} onClick={() => setSelectedViolation(v)} />
              ))}
              <MapController center={mapCenter} zoom={mapZoom} />
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-md p-2 border border-slate-200/50 dark:border-slate-700/50 z-[1000]">
              <div className="flex gap-3">
                {[["#ef4444","Speeding"],["#3b82f6","Overload"],["#22c55e","Verified"]].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-[9px] text-slate-600 dark:text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-3 right-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg p-1.5 text-[9px] text-slate-500 z-[1000]">
              <Navigation size={10} className="inline mr-1" />Zoom • Pan
            </div>
          </div>
        </div>

        {/* Right Panel (30%) */}
        <div className={`flex-[3] border-l flex flex-col overflow-hidden ${t(isDark, "bg-slate-900/95 border-slate-700/50", "bg-white border-slate-200/50")}`}>

          {/* Filters */}
          <div className="p-3 space-y-2.5 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plate or vehicle ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium ${t(isDark, "bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500", "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400")}`}
                />
              </div>
              {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
                <button onClick={clearFilters} className={`p-2 rounded-lg ${t(isDark, "hover:bg-slate-800 text-slate-400", "hover:bg-slate-100 text-slate-400")}`}>
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`flex-1 text-[10px] rounded-lg border px-3 py-2 font-medium focus:outline-none cursor-pointer ${t(isDark, "bg-slate-800/50 border-slate-700 text-slate-300", "bg-slate-50 border-slate-200 text-slate-700")}`}>
                <option value="all">All Status</option>
                <option value="unverified">Unverified</option>
                <option value="verified">Verified</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}
                className={`flex-1 text-[10px] rounded-lg border px-3 py-2 font-medium focus:outline-none cursor-pointer ${t(isDark, "bg-slate-800/50 border-slate-700 text-slate-300", "bg-slate-50 border-slate-200 text-slate-700")}`}>
                <option value="all">All Types</option>
                <option value="overspeeding">Speeding</option>
                <option value="overloading">Overload</option>
              </select>
            </div>
            <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] border ${t(isDark, "bg-slate-800/30 border-slate-700 text-slate-400", "bg-blue-50 border-blue-200/50 text-slate-600")}`}>
              <span>
                <span className={`font-bold ${t(isDark, "text-slate-200", "text-slate-800")}`}>{filteredViolations.length}</span>
                {" "}of {violations.length} violations
              </span>
              <div className="flex items-center gap-1"><Filter size={9} />Filtered</div>
            </div>
          </div>

          {/* Violation list */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {loading && violations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <RefreshCw size={32} className="mb-3 animate-spin opacity-30" />
                <p className="text-xs font-medium">Fetching violations...</p>
              </div>
            ) : filteredViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <CheckCircle size={40} className="mb-3 opacity-20" />
                <p className="text-xs font-medium">No violations found</p>
                <p className="text-[9px] text-slate-500 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredViolations.map((violation) => (
                <div
                  key={violation.id}
                  onClick={() => setSelectedViolation(violation)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${t(isDark, "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 hover:border-blue-500/50", "bg-blue-50/50 border-slate-200/60 hover:bg-blue-100/60 hover:border-blue-300/50 hover:shadow-md")}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Icon + plate */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`p-1 rounded-lg ${violation.type === "overspeeding" ? t(isDark, "bg-red-500/20", "bg-red-100") : t(isDark, "bg-blue-500/20", "bg-blue-100")}`}>
                        {violation.type === "overspeeding" ? <Gauge size={10} className="text-red-500" /> : <Weight size={10} className="text-blue-500" />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${t(isDark, "text-white", "text-slate-800")}`}>{violation.plateNumber}</p>
                        <p className="text-[8px] text-slate-500">{violation.vehicleId}</p>
                      </div>
                    </div>
                    {/* Location */}
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <MapPin size={8} className="text-slate-500 flex-shrink-0" />
                      <span className="text-[8px] text-slate-500 truncate">{violation.location.split(",")[0]}</span>
                    </div>
                    {/* Time */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Clock size={8} className="text-slate-500" />
                      <span className="text-[8px] text-slate-500 whitespace-nowrap">{format(violation.timestamp, "hh:mm a")}</span>
                    </div>
                    {/* Metric */}
                    <div className="text-[10px] font-bold flex-shrink-0">
                      {violation.type === "overspeeding"
                        ? <span className="text-red-600 dark:text-red-400">{violation.speed} km/h</span>
                        : <span className="text-blue-600 dark:text-blue-400">{violation.passengerCount} pax</span>}
                    </div>
                    {/* Status */}
                    <div className="flex-shrink-0"><StatusBadge status={violation.status} /></div>
                    {/* Quick actions */}
                    {violation.status === "unverified" && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveActionId(activeActionId === violation.id ? null : violation.id); }}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${t(isDark, "text-slate-300 bg-slate-700 hover:bg-slate-600", "text-slate-600 bg-slate-200 hover:bg-slate-300")}`}
                        >•••</button>
                        {activeActionId === violation.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveActionId(null); }} />
                            <div className={`absolute right-0 top-full mt-1 rounded-lg border shadow-xl z-[1001] overflow-hidden ${t(isDark, "bg-slate-900 border-slate-700", "bg-white border-slate-200")}`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVerifyViolation(violation.id, violation.type); setActiveActionId(null); }}
                                className="w-full text-[8px] font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-3 py-1.5 text-left"
                              >Verify</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDismissViolation(violation.id, violation.type); setActiveActionId(null); }}
                                className={`w-full text-[8px] font-semibold px-3 py-1.5 text-left ${t(isDark, "text-slate-300 bg-slate-700 hover:bg-slate-600", "text-slate-600 bg-slate-100 hover:bg-slate-200")}`}
                              >Dismiss</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedViolation && (
        <QuickViewModal
          violation={selectedViolation}
          isDark={isDark}
          onClose={() => setSelectedViolation(null)}
          onVerify={handleVerifyViolation}
          onDismiss={handleDismissViolation}
        />
      )}
    </div>
  );
}