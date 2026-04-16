// app/dashboard/page.tsx
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

function QuickViewModal({ violation, isDark, onClose, onVerify, onDismiss }: any) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`rounded-2xl shadow-2xl w-[460px] max-w-[90vw] overflow-hidden transition-all animate-in zoom-in-95 duration-200 ${t(isDark, "bg-slate-900", "bg-white")}`}>
        <div className={`p-5 border-b ${t(isDark, "border-slate-700", "border-slate-100")}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${violation.type === "overspeeding" ? "bg-red-100 dark:bg-red-500/20" : "bg-blue-100 dark:bg-blue-500/20"}`}>
                {violation.type === "overspeeding" ? (
                  <Gauge size={20} className="text-red-600 dark:text-red-400" />
                ) : (
                  <Weight size={20} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h2 className={`text-lg font-bold capitalize ${t(isDark, "text-white", "text-slate-800")}`}>
                  {violation.type}
                </h2>
                <p className="text-slate-500 text-xs">{format(violation.timestamp, "MMMM dd, yyyy 'at' hh:mm a")}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <XCircle size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl ${t(isDark, "bg-slate-800/50", "bg-slate-50")}`}>
              <p className="text-slate-500 text-[10px] font-medium uppercase mb-0.5">Plate Number</p>
              <p className={`text-base font-bold ${t(isDark, "text-white", "text-slate-800")}`}>{violation.plateNumber}</p>
            </div>
            <div className={`p-3 rounded-xl ${t(isDark, "bg-slate-800/50", "bg-slate-50")}`}>
              <p className="text-slate-500 text-[10px] font-medium uppercase mb-0.5">
                {violation.type === "overspeeding" ? "Speed" : "Over Capacity"}
              </p>
              <p className={`text-base font-bold ${t(isDark, "text-white", "text-slate-800")}`}>
                {violation.speed ? `${violation.speed} km/h` : `${violation.capacity}%`}
              </p>
            </div>
          </div>
          
          <div className={`p-3 rounded-xl ${t(isDark, "bg-slate-800/50", "bg-slate-50")}`}>
            <p className="text-slate-500 text-[10px] font-medium uppercase mb-0.5">Location</p>
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-slate-400" />
              <p className={`text-sm font-medium ${t(isDark, "text-white", "text-slate-800")}`}>{violation.location}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <StatusBadge status={violation.status} />
            <div className="text-[10px] text-slate-400">ID: {violation.id}</div>
          </div>
        </div>

        {violation.status === "unverified" && (
          <div className={`p-5 border-t flex gap-3 ${t(isDark, "border-slate-700", "border-slate-100")}`}>
            <button
              onClick={() => { onVerify(violation.id); onClose(); }}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-2 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25"
            >
              Verify Violation
            </button>
            <button
              onClick={() => { onDismiss(violation.id); onClose(); }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2 rounded-xl text-sm transition"
            >
              Dismiss
            </button>
          </div>
        )}
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
  const [violations, setViolations] = useState<Violation[]>(SAMPLE_VIOLATIONS);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ViolationStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ViolationType | "all">("all");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      <header className={`h-12 border-b flex items-center justify-between px-5 shrink-0 transition-all ${t(isDark, "bg-slate-900/80 border-slate-700/50", "bg-white/80 border-slate-200/50")} backdrop-blur-md`}>
        
        {/* Left - Stats Cards */}
        <div className="flex items-center gap-4">
          {/* Total Events */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Car size={13} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight">Total</p>
              <p className="text-sm font-bold text-slate-700 dark:text-white leading-tight">{stats.total}</p>
            </div>
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

          {/* Unverified */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle size={13} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-amber-600 dark:text-amber-400 leading-tight">Pending</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 leading-tight">{stats.unverified}</p>
            </div>
          </div>

          {/* Verified */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle size={13} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 leading-tight">Verified</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{stats.verified}</p>
            </div>
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

          {/* Type Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400">Speeding</span>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">{stats.overspeeding}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400">Overload</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{stats.overloading}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400">Dismissed</span>
              <span className="text-xs font-bold text-slate-500">{stats.dismissed}</span>
            </div>
          </div>
        </div>

        {/* Right - Map Layer Selector, Live Status & Time */}
        <div className="flex items-center gap-4">
          {/* Map Layer Dropdown - Fixed positioning */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all z-10 relative ${t(isDark, "bg-slate-800 hover:bg-slate-700 text-slate-300", "bg-slate-100 hover:bg-slate-200 text-slate-700")}`}
            >
              <Layers size={12} />
              <CurrentLayerIcon size={12} className="opacity-70" />
              <span className="capitalize">{mapLayer}</span>
            </button>
            
            {showLayerMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLayerMenu(false)} />
                <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg border overflow-hidden z-50 min-w-[130px] ${t(isDark, "bg-slate-800 border-slate-700", "bg-white border-slate-200")}`}>
                  {layerOptions.map((layer) => {
                    const Icon = layer.icon;
                    return (
                      <button
                        key={layer.id}
                        onClick={() => {
                          setMapLayer(layer.id);
                          setShowLayerMenu(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                          mapLayer === layer.id
                            ? t(isDark, "bg-blue-500/20 text-blue-400", "bg-blue-50 text-blue-600")
                            : t(isDark, "text-slate-300 hover:bg-slate-700", "text-slate-700 hover:bg-slate-50")
                        }`}
                      >
                        <Icon size={12} />
                        {layer.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

          {/* Live Status */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">LIVE</span>
          </div>
          
          {/* Date & Time */}
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={11} />
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
              {format(currentTime, "MMM dd")}
            </span>
            <Clock size={11} />
            <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300">
              {format(currentTime, "hh:mm:ss a")}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
        
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
          
          {/* Filter Bar - Compact */}
          <div className="p-3 space-y-2 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plate..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${t(isDark, "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500", "bg-slate-50 border-slate-200 text-slate-800")}`}
                />
              </div>
              {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
                <button
                  onClick={clearFilters}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={12} className="text-slate-400" />
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className={`flex-1 text-[10px] rounded-lg border px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 ${t(isDark, "border-slate-700 text-slate-300", "border-slate-200 text-slate-700")}`}
              >
                <option value="all">All Status</option>
                <option value="unverified">Unverified</option>
                <option value="verified">Verified</option>
                <option value="dismissed">Dismissed</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className={`flex-1 text-[10px] rounded-lg border px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 ${t(isDark, "border-slate-700 text-slate-300", "border-slate-200 text-slate-700")}`}
              >
                <option value="all">All Types</option>
                <option value="overspeeding">Speeding</option>
                <option value="overloading">Overload</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredViolations.length}</span> of {violations.length}
              </p>
              <div className="flex items-center gap-1">
                <Filter size={9} className="text-slate-400" />
                <span className="text-[8px] text-slate-400">Filtered</span>
              </div>
            </div>
          </div>

          {/* Compact Violation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <CheckCircle size={32} className="mb-2 opacity-30" />
                <p className="text-xs">No violations found</p>
              </div>
            ) : (
              filteredViolations.map((violation) => (
                <div
                  key={violation.id}
                  onClick={() => setSelectedViolation(violation)}
                  className={`group p-2 rounded-lg border cursor-pointer transition-all duration-150 ${
                    t(isDark, 
                      "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50", 
                      "bg-white border-slate-200/50 hover:bg-slate-50 hover:border-blue-300/50"
                    )
                  }`}
                >
                  {/* Row 1: Plate + Type + Status */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`p-1 rounded ${violation.type === "overspeeding" ? "bg-red-100 dark:bg-red-500/20" : "bg-blue-100 dark:bg-blue-500/20"}`}>
                        {violation.type === "overspeeding" ? (
                          <Gauge size={10} className="text-red-600 dark:text-red-400" />
                        ) : (
                          <Weight size={10} className="text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <p className={`font-bold text-xs ${t(isDark, "text-white", "text-slate-800")}`}>
                        {violation.plateNumber}
                      </p>
                    </div>
                    <StatusBadge status={violation.status} />
                  </div>
                  
                  {/* Row 2: Location + Time */}
                  <div className="flex items-center justify-between text-slate-400 text-[9px] mb-1">
                    <div className="flex items-center gap-1">
                      <MapPin size={8} />
                      <span className="truncate max-w-[120px]">{violation.location.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={8} />
                      <span>{format(violation.timestamp, "hh:mm a")}</span>
                    </div>
                  </div>
                  
                  {/* Row 3: Value + Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold">
                      {violation.type === "overspeeding" ? (
                        <span className="text-red-600 dark:text-red-400">{violation.speed} km/h</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">{violation.capacity}% over</span>
                      )}
                    </div>
                    {violation.status === "unverified" && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleVerifyViolation(violation.id); }}
                          className="text-[9px] font-medium text-emerald-600 hover:text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20"
                        >
                          Verify
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismissViolation(violation.id); }}
                          className="text-[9px] font-medium text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700"
                        >
                          Dismiss
                        </button>
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