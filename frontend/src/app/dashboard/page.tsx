// app/dashboard/page.tsx
"use client";
import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Car, 
  Calendar, 
  Clock, 
  Gauge, 
  Weight, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  MapPin,
  Navigation,
  Search,
  Filter,
  X,
  Layers,
  Map as MapIcon,
  Satellite,
  Mountain,
  Globe
} from "lucide-react";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type ViolationType = "overloading" | "overspeeding";
type ViolationStatus = "unverified" | "verified" | "dismissed";
type MapLayerType = "streets" | "satellite" | "terrain" | "dark";

interface Violation {
  id: string;
  type: ViolationType;
  status: ViolationStatus;
  plateNumber: string;
  location: string;
  coordinates: [number, number];
  timestamp: Date;
  speed?: number;
  capacity?: number;
  imageUrl?: string;
}

// ─────────────────────────────────────────
// SAMPLE DATA
// ─────────────────────────────────────────
const SAMPLE_VIOLATIONS: Violation[] = [
  {
    id: "v001",
    type: "overspeeding",
    status: "unverified",
    plateNumber: "ABC 1234",
    location: "Colon St, Cebu City",
    coordinates: [10.2942, 123.9017],
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    speed: 87,
  },
  {
    id: "v002",
    type: "overloading",
    status: "unverified",
    plateNumber: "XYZ 5678",
    location: "Osmena Blvd, Cebu City",
    coordinates: [10.3101, 123.8934],
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    capacity: 35,
  },
  {
    id: "v003",
    type: "overspeeding",
    status: "verified",
    plateNumber: "DEF 9012",
    location: "N. Bacalso Ave, Cebu City",
    coordinates: [10.2788, 123.8901],
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    speed: 102,
  },
  {
    id: "v004",
    type: "overloading",
    status: "unverified",
    plateNumber: "GHI 3456",
    location: "V. Rama Ave, Cebu City",
    coordinates: [10.3198, 123.9105],
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    capacity: 52,
  },
  {
    id: "v005",
    type: "overspeeding",
    status: "dismissed",
    plateNumber: "JKL 7890",
    location: "M.J. Cuenco Ave, Cebu City",
    coordinates: [10.3312, 123.9201],
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    speed: 75,
  },
  {
    id: "v006",
    type: "overloading",
    status: "verified",
    plateNumber: "MNO 2345",
    location: "Sergio Osmeña Sr. Blvd",
    coordinates: [10.3056, 123.8956],
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    capacity: 28,
  },
  {
    id: "v007",
    type: "overspeeding",
    status: "unverified",
    plateNumber: "PQR 6789",
    location: "F. Ramos St, Cebu City",
    coordinates: [10.3001, 123.8989],
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    speed: 95,
  },
  {
    id: "v008",
    type: "overloading",
    status: "unverified",
    plateNumber: "STU 0123",
    location: "Lapu-Lapu St, Cebu City",
    coordinates: [10.3156, 123.9123],
    timestamp: new Date(Date.now() - 1000 * 60 * 150),
    capacity: 45,
  },
  {
    id: "v009",
    type: "overspeeding",
    status: "unverified",
    plateNumber: "VWX 4567",
    location: "Banilad Town Center",
    coordinates: [10.3356, 123.9056],
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    speed: 88,
  },
  {
    id: "v010",
    type: "overloading",
    status: "verified",
    plateNumber: "YZA 8901",
    location: "IT Park, Cebu City",
    coordinates: [10.3256, 123.9056],
    timestamp: new Date(Date.now() - 1000 * 60 * 210),
    capacity: 40,
  },
];

// ─────────────────────────────────────────
// MAP TILE LAYERS (with labels enabled)
// ─────────────────────────────────────────
const mapLayers: Record<MapLayerType, { url: string; attribution: string; iconComponent: any }> = {
  streets: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '',
    iconComponent: MapIcon,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '',
    iconComponent: Satellite,
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '',
    iconComponent: Mountain,
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '',
    iconComponent: Globe,
  },
};

// ─────────────────────────────────────────
// FIX LEAFLET DEFAULT MARKER ICONS
// ─────────────────────────────────────────
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// Custom marker icons
const createCustomIcon = (color: string, isVerified: boolean = false) => {
  if (isVerified) {
    return L.divIcon({
      className: "",
      html: `<div style="
        width: 28px;
        height: 28px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" style="position: absolute; top: 7px; left: 7px;">
          <path d="M20 6L9 17L4 12" stroke="white" stroke-linecap="round"/>
        </svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
  }
  
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 7px;
        left: 7px;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const overspeedingIcon = createCustomIcon("#ef4444", false);
const overloadingIcon = createCustomIcon("#3b82f6", false);
const verifiedIcon = createCustomIcon("#22c55e", true);

// ─────────────────────────────────────────
// THEME HELPER
// ─────────────────────────────────────────
const t = (isDark: boolean, dark: string, light: string) => (isDark ? dark : light);

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
    
    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    
    // Add new tile layer without attribution
    const layer = mapLayers[layerType];
    L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [map, layerType]);
  
  return null;
}

function ViolationMarker({ violation, onClick }: { violation: Violation; onClick: () => void }) {
  let icon;
  if (violation.status === "verified") {
    icon = verifiedIcon;
  } else {
    icon = violation.type === "overspeeding" ? overspeedingIcon : overloadingIcon;
  }

  return (
    <Marker position={violation.coordinates} icon={icon} eventHandlers={{ click: onClick }}>
      <Tooltip
        direction="top"
        offset={[0, -10]}
        opacity={0.95}
        className="rounded-2xl bg-white/95 text-slate-800 text-[11px] shadow-lg border border-slate-200 p-0 overflow-hidden"
      >
        <div className={"h-1 " + (violation.status === "verified" ? "bg-emerald-500" : violation.type === "overspeeding" ? "bg-red-500" : "bg-blue-500")}></div>
        <div className="px-3 py-2">
          <div className="font-semibold mb-1">{violation.plateNumber}</div>
          <div className="flex items-center gap-1 text-[10px] mb-0.5">
            {violation.type === "overspeeding" ? (
              <>
                <Gauge size={10} className="text-red-500" />
                <span className="text-red-600">Overspeeding</span>
              </>
            ) : (
              <>
                <Weight size={10} className="text-blue-500" />
                <span className="text-blue-600">Overloading</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-500">
            {violation.status === "verified" ? "Verified" : violation.status === "dismissed" ? "Dismissed" : "Unverified"}
            {" • "}
            {violation.type === "overspeeding" ? `${violation.speed} km/h` : `${violation.capacity}% over`}
          </div>
        </div>
      </Tooltip>
      <Popup>
        <div className="min-w-[180px] p-1">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-slate-800 text-sm">{violation.plateNumber}</p>
            {violation.status === "verified" && (
              <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Verified</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
            <MapPin size={10} />
            <span>{violation.location}</span>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1">
              {violation.type === "overspeeding" ? (
                <>
                  <Gauge size={12} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-600">{violation.speed} km/h</span>
                </>
              ) : (
                <>
                  <Weight size={12} className="text-blue-500" />
                  <span className="text-xs font-semibold text-blue-600">{violation.capacity}% over</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-[9px]">
              <Clock size={8} />
              <span>{format(violation.timestamp, "hh:mm a")}</span>
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
    verified: { label: "Verified", icon: CheckCircle, className: "bg-emerald-50 text-emerald-700" },
    dismissed: { label: "Dismissed", icon: XCircle, className: "bg-slate-100 text-slate-500" },
  };
  
  const { label, icon: Icon, className } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${className}`}>
      <Icon size={8} />
      {label}
    </span>
  );
}

function LayerMenuPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function QuickViewModal({ violation, isDark, onClose, onVerify, onDismiss }: any) {
  const isOverload = violation.type === "overloading";
  
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
      <div className={`w-full max-w-[480px] rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${t(isDark, "bg-slate-900", "bg-white")}`}>
        {/* Header */}
        <div className={`px-8 py-8 flex items-start justify-between border-b ${t(isDark, "border-slate-800", "border-slate-100")}`}>
          <div className="flex items-center gap-5">
            <div className={`${isOverload ? t(isDark, "bg-blue-500/20", "bg-blue-50") : t(isDark, "bg-rose-500/20", "bg-red-50")} p-4 rounded-[24px] shadow-sm border ${isOverload ? t(isDark, "border-blue-500/20", "border-blue-100") : t(isDark, "border-rose-500/20", "border-red-100")}`}>
              {isOverload ? (
                <Weight size={32} className={t(isDark, "text-blue-400", "text-blue-600")} strokeWidth={2.5} />
              ) : (
                <Gauge size={32} className={t(isDark, "text-rose-400", "text-red-500")} strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tight leading-none ${t(isDark, "text-white", "text-slate-800 uppercase")}`}>
                {violation.type}
              </h2>
              <p className="text-slate-400 text-sm font-medium mt-2">{format(violation.timestamp, "MMMM dd, yyyy 'at' hh:mm a")}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border ${t(isDark, "bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Plate Number</p>
              <p className={`text-xl font-black ${t(isDark, "text-white", "text-slate-800")}`}>{violation.plateNumber}</p>
            </div>
            <div className={`p-5 rounded-2xl border ${t(isDark, "bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">
                {isOverload ? "Over Capacity" : "Detected Speed"}
              </p>
              <p className={`text-xl font-black ${t(isDark, "text-white", "text-slate-800")}`}>
                {isOverload ? `${violation.capacity}%` : `${violation.speed} km/h`}
              </p>
            </div>
          </div>

          {/* Location Box */}
          <div className={`p-5 rounded-2xl border ${t(isDark, "bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Location</p>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                <MapPin size={14} strokeWidth={2.5} />
              </div>
              <p className={`text-base font-bold ${t(isDark, "text-slate-200", "text-slate-700")}`}>{violation.location}</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"></div>
              <span className="text-xs font-black text-amber-600 uppercase tracking-widest italic">{violation.status}</span>
            </div>
            <p className="text-xs font-bold text-slate-400 tracking-tighter">ID: {violation.id}</p>
          </div>

          {/* Action buttons */}
          {violation.status === "unverified" && (
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => { onVerify(violation.id); onClose(); }}
                className="flex-1 h-14 bg-[#10b981] hover:bg-[#059669] text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                Verify Violation
              </button>
              <button
                onClick={() => { onDismiss(violation.id); onClose(); }}
                className={`flex-1 h-14 font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 text-sm ${t(isDark, "bg-slate-800 text-white hover:bg-slate-700", "bg-slate-900 text-white hover:bg-slate-800")}`}
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
  const { theme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();

  const isDark = theme === "dark";

  const [mapCenter] = useState<[number, number]>([10.3235, 123.9222]);
  const [mapZoom] = useState(12);
  const [mapLayer, setMapLayer] = useState<MapLayerType>("streets");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [layerMenuCoords, setLayerMenuCoords] = useState({ top: 0, left: 0 });
  const layerButtonRef = useRef<HTMLButtonElement | null>(null);
  const [violations, setViolations] = useState<Violation[]>(SAMPLE_VIOLATIONS);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ViolationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ViolationType | "all">("all");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showLayerMenu || !layerButtonRef.current) return;

    const updateLayerMenuCoords = () => {
      const rect = layerButtonRef.current?.getBoundingClientRect();
      if (rect) {
        setLayerMenuCoords({ top: rect.bottom + 8, left: rect.left });
      }
    };

    updateLayerMenuCoords();
    window.addEventListener("resize", updateLayerMenuCoords);

    return () => window.removeEventListener("resize", updateLayerMenuCoords);
  }, [showLayerMenu]);

  // Filtered violations based on search and filters
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      if (searchQuery && !v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== "all" && v.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && v.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [violations, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: violations.length,
    unverified: violations.filter(v => v.status === "unverified").length,
    verified: violations.filter(v => v.status === "verified").length,
    dismissed: violations.filter(v => v.status === "dismissed").length,
    overspeeding: violations.filter(v => v.type === "overspeeding").length,
    overloading: violations.filter(v => v.type === "overloading").length,
  }), [violations]);

  const handleVerifyViolation = useCallback((id: string) => {
    setViolations((prev) => prev.map((v) => v.id === id ? { ...v, status: "verified" } : v));
  }, []);

  const handleDismissViolation = useCallback((id: string) => {
    setViolations((prev) => prev.map((v) => v.id === id ? { ...v, status: "dismissed" } : v));
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const layerOptions: { id: MapLayerType; label: string; icon: any }[] = [
    { id: "streets", label: "Streets", icon: MapIcon },
    { id: "satellite", label: "Satellite", icon: Satellite },
    { id: "terrain", label: "Terrain", icon: Mountain },
    { id: "dark", label: "Dark", icon: Globe },
  ];

  const CurrentLayerIcon = mapLayers[mapLayer].iconComponent;

  return (
    <div className={`h-screen w-full overflow-hidden transition-colors duration-300 ${t(isDark, "bg-slate-900", "bg-slate-50")}`}>
      
      {/* Improved Header - Clean and Professional */}
      <header className={`h-16 border-b flex items-center justify-between px-5 shrink-0 transition-all ${t(isDark, "bg-slate-900/80 border-slate-700/50", "bg-white/80 border-slate-200/50")} backdrop-blur-md`}>
        
        {/* Left - Stats Cards */}
        <div className="flex items-center gap-3">
          {/* Total Events */}
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${t(isDark, "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15", "bg-blue-50 border-blue-200/50 hover:bg-blue-100/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, "bg-blue-500/20", "bg-blue-100")}`}>
              <Car size={14} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight">Total</p>
              <p className="text-xl font-black tracking-tight text-sky-900 dark:text-sky-300 leading-tight">{stats.total}</p>
            </div>
          </div>

          {/* Unverified */}
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${t(isDark, "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15", "bg-amber-50 border-amber-200/50 hover:bg-amber-100/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, "bg-amber-500/20", "bg-amber-100")}`}>
              <AlertTriangle size={14} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-amber-600 dark:text-amber-400 leading-tight">Pending</p>
              <p className="text-xl font-black tracking-tight text-amber-700 dark:text-amber-300 leading-tight">{stats.unverified}</p>
            </div>
          </div>

          {/* Verified */}
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${t(isDark, "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15", "bg-emerald-50 border-emerald-200/50 hover:bg-emerald-100/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t(isDark, "bg-emerald-500/20", "bg-emerald-100")}`}>
              <CheckCircle size={14} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 leading-tight">Verified</p>
              <p className="text-xl font-black tracking-tight text-emerald-700 dark:text-emerald-300 leading-tight">{stats.verified}</p>
            </div>
          </div>

          {/* Type Stats Divider & Cards */}
          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
          
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${t(isDark, "bg-red-500/10 border-red-500/20 hover:bg-red-500/15", "bg-red-50 border-red-200/50 hover:bg-red-100/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t(isDark, "bg-red-500/20", "bg-red-100")}`}>
              <Gauge size={12} className="text-red-500" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-red-600 dark:text-red-400 leading-tight">Speeding</p>
              <p className="text-xl font-black tracking-tight text-red-600 dark:text-red-400 leading-tight">{stats.overspeeding}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${t(isDark, "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15", "bg-blue-50 border-blue-200/50 hover:bg-blue-100/50")}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t(isDark, "bg-blue-500/20", "bg-blue-100")}`}>
              <Weight size={12} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-blue-600 dark:text-blue-400 leading-tight">Overload</p>
              <p className="text-xl font-black tracking-tight text-blue-600 dark:text-blue-400 leading-tight">{stats.overloading}</p>
            </div>
          </div>
        </div>

        {/* Right - Map Layer Selector, Live Status & Time */}
        <div className="flex items-center gap-3">
          {/* Map Layer Dropdown - Fixed positioning to prevent overlap */}
          <div className="relative z-[99999] overflow-visible">
            <button
              ref={layerButtonRef}
              onClick={() => {
                const rect = layerButtonRef.current?.getBoundingClientRect();
                if (rect) {
                  setLayerMenuCoords({ top: rect.bottom + 8, left: rect.left });
                }
                setShowLayerMenu((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${t(isDark, "bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300", "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700")}`}
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
                    {layerOptions.map((layer) => {
                      const Icon = layer.icon;
                      return (
                        <button
                          key={layer.id}
                          onClick={() => {
                            setMapLayer(layer.id);
                            setShowLayerMenu(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors ${
                            mapLayer === layer.id
                              ? t(isDark, "bg-blue-500/20 text-blue-400", "bg-blue-50 text-blue-600")
                              : t(isDark, "text-slate-300 hover:bg-slate-700", "text-slate-600 hover:bg-slate-100")
                          }`}
                        >
                          <Icon size={12} />
                          {layer.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </LayerMenuPortal>
            )}
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Live Status Tile */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t(isDark, "bg-emerald-500/10 border-emerald-500/20", "bg-emerald-50 border-emerald-200/50")}`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">LIVE</span>
          </div>
          
          {/* Date & Time Tile */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t(isDark, "bg-slate-800/50 border-slate-700", "bg-slate-100/50 border-slate-200")}`}>
            <Calendar size={11} className="text-slate-400" />
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 min-w-[35px]">
              {format(currentTime, "MMM dd")}
            </span>
            <Clock size={11} className="text-slate-400" />
            <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300">
              {format(currentTime, "hh:mm:ss a")}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        
        {/* Map Area - Larger (70%) */}
        <div className="flex-[7] p-3">
          <div className="relative h-full rounded-xl shadow-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <MapContainer 
              center={mapCenter} 
              zoom={mapZoom} 
              style={{ height: "100%", width: "100%" }} 
              className="z-0"
              zoomControl={false}
              attributionControl={false}
            >
              <MapLayerController layerType={mapLayer} />
              {violations.map((violation) => (
                <ViolationMarker
                  key={violation.id}
                  violation={violation}
                  onClick={() => setSelectedViolation(violation)}
                />
              ))}
              <MapController center={mapCenter} zoom={mapZoom} />
            </MapContainer>

            {/* Map Legend - Compact */}
            <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-md p-2 border border-slate-200/50 dark:border-slate-700/50 z-[1000]">
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm" />
                  <span className="text-[9px] text-slate-600 dark:text-slate-400">Speeding</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm" />
                  <span className="text-[9px] text-slate-600 dark:text-slate-400">Overload</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm" />
                  <span className="text-[9px] text-slate-600 dark:text-slate-400">Verified</span>
                </div>
              </div>
            </div>

            {/* Map Controls Hint */}
            <div className="absolute bottom-3 right-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg shadow-md p-1.5 text-[9px] text-slate-500 dark:text-slate-400 z-[1000]">
              <Navigation size={10} className="inline mr-1" />
              Zoom • Pan
            </div>
          </div>
        </div>

        {/* Right Panel - Compact List with Filters (30%) */}
        <div className={`flex-[3] border-l flex flex-col overflow-hidden ${t(isDark, "bg-slate-900/95 border-slate-700/50", "bg-white border-slate-200/50")}`}>
          
          {/* Filter Bar - Enhanced Tile Design */}
          <div className="p-3 space-y-2.5 border-b border-slate-200/50 dark:border-slate-700/50">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plate..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all font-medium ${t(isDark, "bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800", "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white")}`}
                />
              </div>
              {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
                <button
                  onClick={clearFilters}
                  className={`p-2 rounded-lg transition-all ${t(isDark, "hover:bg-slate-800 text-slate-400 hover:text-slate-300", "hover:bg-slate-100 text-slate-400 hover:text-slate-600")}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            
            {/* Filter Selects - Tile Design */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`flex-1 text-[10px] rounded-lg border px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all cursor-pointer ${t(isDark, "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800", "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")}`}
              >
                <option value="all">All Status</option>
                <option value="unverified">Unverified</option>
                <option value="verified">Verified</option>
                <option value="dismissed">Dismissed</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className={`flex-1 text-[10px] rounded-lg border px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all cursor-pointer ${t(isDark, "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800", "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")}`}
              >
                <option value="all">All Types</option>
                <option value="overspeeding">Speeding</option>
                <option value="overloading">Overload</option>
              </select>
            </div>
            
            {/* Filter Info */}
            <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] border ${t(isDark, "bg-slate-800/30 border-slate-700 text-slate-400", "bg-blue-50 border-blue-200/50 text-slate-600")}`}>
              <div>
                <span className={`font-bold ${t(isDark, "text-slate-200", "text-slate-800")}`}>{filteredViolations.length}</span>
                <span className={`${t(isDark, "text-slate-400", "text-slate-600")}`}> of {violations.length} violations</span>
              </div>
              <div className="flex items-center gap-1">
                <Filter size={9} />
                Filtered
              </div>
            </div>
          </div>

          {/* Compact Violation List - Tile Design */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredViolations.length === 0 ? (
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
                  className={`group p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    t(isDark, 
                      "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10", 
                      "bg-blue-50/50 border-slate-200/60 hover:bg-blue-100/60 hover:border-blue-300/50 hover:shadow-md hover:shadow-blue-400/8"
                    )
                  }`}
                >
                  {/* Single Row: Type + Plate + Location + Time + Metric + Status + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Type Icon + Plate */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`p-1 rounded-lg flex-shrink-0 ${violation.type === "overspeeding" ? t(isDark, "bg-red-500/20", "bg-red-100") : t(isDark, "bg-blue-500/20", "bg-blue-100")}`}>
                        {violation.type === "overspeeding" ? (
                          <Gauge size={10} className="text-red-500" />
                        ) : (
                          <Weight size={10} className="text-blue-500" />
                        )}
                      </div>
                      <p className={`font-bold text-sm truncate min-w-0 ${t(isDark, "text-white", "text-slate-800")}`}>
                        {violation.plateNumber}
                      </p>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <MapPin size={8} className="text-slate-500 flex-shrink-0" />
                      <span className="text-[8px] text-slate-500 truncate">{violation.location.split(',')[0]}</span>
                    </div>
                    
                    {/* Time */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Clock size={8} className="text-slate-500" />
                      <span className="text-[8px] text-slate-500 whitespace-nowrap">{format(violation.timestamp, "hh:mm a")}</span>
                    </div>
                    
                    {/* Metric Value */}
                    <div className="text-[10px] font-bold flex-shrink-0 min-w-max">
                      {violation.type === "overspeeding" ? (
                        <span className="text-red-600 dark:text-red-400">{violation.speed} km/h</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">{violation.capacity}%</span>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      <StatusBadge status={violation.status} />
                    </div>
                    
                    {/* Actions */}
                    {violation.status === "unverified" && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionId(activeActionId === violation.id ? null : violation.id);
                          }}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-all ${t(isDark, "text-slate-300 bg-slate-700 hover:bg-slate-600", "text-slate-600 bg-slate-200 hover:bg-slate-300")}`}
                        >
                          ...
                        </button>
                        {activeActionId === violation.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveActionId(null); }} />
                            <div className={`absolute right-0 top-full mt-1 rounded-lg border shadow-xl z-[1001] ${t(isDark, "bg-slate-900 border-slate-700", "bg-white border-slate-200")}`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVerifyViolation(violation.id); setActiveActionId(null); }}
                                className="w-full text-[8px] font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-2 py-1 rounded text-left transition-all"
                              >
                                Verify
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDismissViolation(violation.id); setActiveActionId(null); }}
                                className={`w-full text-[8px] font-semibold px-2 py-1 rounded text-left transition-all ${t(isDark, "text-slate-300 bg-slate-700 hover:bg-slate-600", "text-slate-600 bg-slate-200 hover:bg-slate-300")}`}
                              >
                                Dismiss
                              </button>
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