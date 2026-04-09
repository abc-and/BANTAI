"use client";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Car, Bell, Calendar, Clock } from "lucide-react";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type ViolationType = "overloading" | "overspeeding";
type ViolationStatus = "unverified" | "verified" | "dismissed";

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
];

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

const createIcon = (color: string) =>
    L.divIcon({
        className: "",
        html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
    });

const overspeedingIcon = createIcon("#ef4444");
const overloadingIcon = createIcon("#3b82f6");
const verifiedIcon = createIcon("#22c55e");

// ─────────────────────────────────────────
// THEME HELPER — t(isDark, darkClasses, lightClasses)
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

function ViolationMarker({ violation, onClick }: { violation: Violation; onClick: () => void }) {
    const icon = violation.type === "overspeeding" ? overspeedingIcon : overloadingIcon;

    return (
        <Marker position={violation.coordinates} icon={icon} eventHandlers={{ click: onClick }}>
            <Popup>
                <div className="text-sm min-w-[160px]">
                    <p className="font-bold text-slate-800">{violation.plateNumber}</p>
                    <p className="text-slate-500 text-xs">{violation.location}</p>
                    <p className="mt-1 capitalize text-xs font-semibold"
                        style={{ color: violation.type === "overspeeding" ? "#ef4444" : "#3b82f6" }}>
                        {violation.type}
                        {violation.speed ? ` · ${violation.speed} km/h` : ""}
                        {violation.capacity ? ` · ${violation.capacity}% over` : ""}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{format(violation.timestamp, "hh:mm a")}</p>
                </div>
            </Popup>
        </Marker>
    );
}

function StatusBadge({ status }: { status: ViolationStatus }) {
    const map: Record<ViolationStatus, { label: string; cls: string }> = {
        unverified: { label: "Unverified", cls: "bg-amber-100 text-amber-700" },
        verified: { label: "Verified", cls: "bg-green-100 text-green-700" },
        dismissed: { label: "Dismissed", cls: "bg-slate-200 text-slate-500" },
    };
    const { label, cls } = map[status];
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function QuickViewModal({
    violation, isDark, onClose, onVerify, onDismiss,
}: {
    violation: Violation;
    isDark: boolean;
    onClose: () => void;
    onVerify: (id: string) => void;
    onDismiss: (id: string) => void;
}) {
    return (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`rounded-2xl shadow-2xl w-[420px] p-6 relative transition-colors ${t(isDark, "bg-[#1e293b]", "bg-white")}`}>
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 transition ${t(isDark, "text-slate-400 hover:text-white", "text-slate-400 hover:text-slate-700")}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${violation.type === "overspeeding" ? "bg-red-100" : "bg-blue-100"}`}>
                        {violation.type === "overspeeding" ? (
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h2 className={`font-bold text-lg capitalize ${t(isDark, "text-white", "text-slate-800")}`}>{violation.type}</h2>
                        <p className="text-slate-400 text-xs">{format(violation.timestamp, "MMM dd, yyyy · hh:mm a")}</p>
                    </div>
                    <div className="ml-auto"><StatusBadge status={violation.status} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                        { label: "Plate Number", value: violation.plateNumber },
                        {
                            label: violation.type === "overspeeding" ? "Speed" : "Over Capacity",
                            value: violation.speed ? `${violation.speed} km/h` : `${violation.capacity}%`,
                        },
                    ].map(({ label, value }) => (
                        <div key={label} className={`rounded-xl p-3 ${t(isDark, "bg-[#334155]", "bg-slate-50")}`}>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">{label}</p>
                            <p className={`font-bold ${t(isDark, "text-white", "text-slate-800")}`}>{value}</p>
                        </div>
                    ))}
                    <div className={`rounded-xl p-3 col-span-2 ${t(isDark, "bg-[#334155]", "bg-slate-50")}`}>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Location</p>
                        <p className={`font-medium text-sm ${t(isDark, "text-white", "text-slate-800")}`}>{violation.location}</p>
                    </div>
                </div>

                {violation.status === "unverified" && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => { onVerify(violation.id); onClose(); }}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                        >Verify</button>
                        <button
                            onClick={() => { onDismiss(violation.id); onClose(); }}
                            className={`flex-1 font-semibold py-2.5 rounded-xl text-sm transition ${t(isDark, "bg-[#334155] hover:bg-[#475569] text-slate-200", "bg-slate-100 hover:bg-slate-200 text-slate-700")}`}
                        >Dismiss</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function LogoutModal({
    isDark, onConfirm, onCancel,
}: {
    isDark: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`rounded-2xl shadow-2xl w-[360px] p-6 transition-colors ${t(isDark, "bg-[#1e293b]", "bg-white")}`}>
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </div>
                </div>
                <h2 className={`text-center font-bold text-lg mb-1 ${t(isDark, "text-white", "text-slate-800")}`}>Sign Out</h2>
                <p className="text-center text-slate-400 text-sm mb-6">Are you sure you want to log out of the admin panel?</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 font-semibold py-2.5 rounded-xl text-sm transition ${t(isDark, "bg-[#334155] hover:bg-[#475569] text-slate-200", "bg-slate-100 hover:bg-slate-200 text-slate-700")}`}
                    >Cancel</button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                    >Log Out</button>
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

    const [timeFilter, setTimeFilter] = useState("Today");
    const [showOverloading, setShowOverloading] = useState(true);
    const [showOverspeeding, setShowOverspeeding] = useState(true);
    const [mapCenter] = useState<[number, number]>([10.3235, 123.9222]);
    const [mapZoom] = useState(13);
    const [violations, setViolations] = useState<Violation[]>(SAMPLE_VIOLATIONS);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ── Derived ───────────────────────────
    const filteredViolations = violations.filter((v) => {
        if (!showOverloading && v.type === "overloading") return false;
        if (!showOverspeeding && v.type === "overspeeding") return false;
        return true;
    });

    const unverifiedViolations = violations.filter((v) => v.status === "unverified");
    const overspeedingCount = violations.filter((v) => v.type === "overspeeding").length;
    const overloadingCount = violations.filter((v) => v.type === "overloading").length;

    // ── Handlers ──────────────────────────
    const handleVerifyViolation = (id: string) =>
        setViolations((prev) => prev.map((v) => v.id === id ? { ...v, status: "verified" } : v));

    const handleDismissViolation = (id: string) =>
        setViolations((prev) => prev.map((v) => v.id === id ? { ...v, status: "dismissed" } : v));

    const showQuickView = (violation: Violation) => setSelectedViolation(violation);

    const handleLogout = () => { logout?.(); router.push("/login"); };

    // ── Render ────────────────────────────
    return (
        <div className={`flex flex-col h-screen w-full overflow-hidden transition-colors duration-300 ${t(isDark, "bg-[#0f172a]", "bg-slate-50")}`}>

            {/* ── AppBar ── */}
            <header className={`h-[72px] border-b flex items-center justify-between px-6 shrink-0 shadow-sm transition-colors duration-300 ${t(isDark, "bg-[#1e293b] border-slate-700", "bg-white border-slate-200")}`}>
                <div className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-400 rounded-full text-white shadow">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-sm font-bold tracking-wide">ADMIN PANEL</span>
                </div>

                <div
                    onClick={() => setShowLogoutModal(true)}
                    className={`flex items-center gap-3 px-3 py-1.5 border rounded-full cursor-pointer transition ${t(isDark, "bg-[#334155] border-slate-600 hover:bg-[#475569]", "bg-slate-50 border-slate-200 hover:bg-slate-100")}`}
                >
                    <div className="w-9 h-9 bg-linear-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold ${t(isDark, "text-white", "text-slate-800")}`}>Admin User</span>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-[11px] text-slate-400">Online</span>
                        </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </header>

            {/* ── Body ── */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Control Bar */}
                <div className={`border-b px-6 py-4 shadow-sm transition-colors duration-300 ${t(isDark, "bg-[#1e293b] border-slate-700", "bg-white border-slate-200")}`}>
                    <div className="flex items-center gap-4 flex-wrap">

                        {/* Time Filter */}
                        <div className="relative">
                            <select
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                                className={`appearance-none border rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${t(isDark, "bg-[#334155] border-slate-600 text-white", "bg-slate-50 border-slate-300 text-black")}`}
                            >
                                <option>Today</option>
                                <option>This Week</option>
                                <option>This Month</option>
                            </select>
                            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {/* Toggle: Overcapacity */}
                        <button
                            onClick={() => setShowOverloading((p) => !p)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition ${showOverloading
                                ? "bg-blue-50 border-blue-300 text-blue-700"
                                : t(isDark, "bg-[#334155] border-slate-600 text-slate-400", "bg-slate-50 border-slate-300 text-slate-400")
                                }`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${showOverloading ? "bg-blue-500" : "bg-slate-400"}`} />
                            Overcapacity
                        </button>

                        {/* Toggle: Overspeeding */}
                        <button
                            onClick={() => setShowOverspeeding((p) => !p)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition ${showOverspeeding
                                ? "bg-red-50 border-red-300 text-red-700"
                                : t(isDark, "bg-[#334155] border-slate-600 text-slate-400", "bg-slate-50 border-slate-300 text-slate-400")
                                }`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${showOverspeeding ? "bg-red-500" : "bg-slate-400"}`} />
                            Overspeeding
                        </button>

                        <div className="flex-1" />

                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-blue-500 font-bold text-sm">Live Vehicle Monitoring</span>
                        </div>
                    </div>
                </div>

                {/* ── Map + Right Panel ── */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Map */}
                    <div className="flex-7 p-6">
                        <div className="relative h-full rounded-2xl shadow-lg overflow-hidden">
                            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: "100%", width: "100%" }} className="z-0">
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                {filteredViolations.map((violation) => (
                                    <ViolationMarker
                                        key={violation.id}
                                        violation={violation}
                                        onClick={() => showQuickView(violation)}
                                    />
                                ))}
                                <MapController center={mapCenter} zoom={mapZoom} />
                            </MapContainer>

                            {/* Map Legend */}
                            <div className={`absolute bottom-5 left-5 rounded-xl shadow-md p-4 z-1000 transition-colors ${t(isDark, "bg-[#1e293b]", "bg-white")}`}>
                                <p className={`font-bold text-sm mb-3 ${t(isDark, "text-white", "text-slate-800")}`}>Map Legend</p>
                                <div className="flex flex-col gap-2">
                                    {[
                                        { color: "bg-red-500", label: "Overspeeding" },
                                        { color: "bg-blue-500", label: "Overcapacity" },
                                    ].map(({ color, label }) => (
                                        <div key={label} className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${color}`} />
                                            <span className={`text-xs ${t(isDark, "text-slate-300", "text-slate-600")}`}>{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right Panel ── */}
                    <div className={`w-[380px] border-l flex flex-col overflow-hidden transition-colors duration-300 ${t(isDark, "bg-[#1e293b] border-slate-700", "bg-white border-slate-200")}`}>

                        {/* Stats Grid */}
                        <div className={`border-b p-6 transition-colors duration-300 ${t(isDark, "bg-[#0f172a] border-slate-700", "bg-slate-50 border-slate-200")}`}>
                            <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${t(isDark, "text-slate-400", "text-slate-500")}`}>
                                Overview · {timeFilter}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Active Vehicles", value: violations.length, color: "blue", Icon: Car },
                                    { label: "Alerts Today", value: unverifiedViolations.length, color: "amber", Icon: Bell },
                                    { label: "Date", value: format(currentTime, "MMM dd, yyyy"), color: "rose", Icon: Calendar },
                                    { label: "Time", value: format(currentTime, "hh:mm:ss a"), color: "indigo", Icon: Clock },
                                ].map(({ label, value, color, Icon }) => {
                                    const colors: any = {
                                        blue: { text: "text-white", bg: "bg-blue-600 shadow-blue-100 dark:shadow-blue-900/10" },
                                        amber: { text: "text-white", bg: "bg-amber-600 shadow-amber-100 dark:shadow-amber-900/10" },
                                        rose: { text: "text-white", bg: "bg-rose-600 shadow-rose-100 dark:shadow-rose-900/10" },
                                        indigo: { text: "text-white", bg: "bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/10" },
                                    }[color];

                                    return (
                                        <div key={label} className={`rounded-2xl p-4 border transition-all ${t(isDark, "bg-[#1e293b] border-slate-700 shadow-sm", "bg-white border-slate-100 shadow-md shadow-slate-200/50")}`}>
                                            <div className={`mb-3 p-2 rounded-xl inline-flex ${colors.bg} ${colors.text} shadow-sm`}>
                                                <Icon size={18} strokeWidth={2.4} />
                                            </div>
                                            <p className={`text-[10px] uppercase tracking-widest mb-1 ${t(isDark, "text-slate-400", "text-slate-500")}`}>{label}</p>
                                            <p className={`text-sm truncate ${t(isDark, "text-slate-50", "text-slate-800")}`}>{value}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Alerts Header */}
                        <div className={`border-b px-5 py-4 flex items-center justify-between shrink-0 ${t(isDark, "border-slate-700", "border-slate-200")}`}>
                            <p className={`font-bold text-sm ${t(isDark, "text-white", "text-slate-800")}`}>Recent Alerts</p>
                            <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                                {unverifiedViolations.length} pending
                            </span>
                        </div>

                        {/* Violation List */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                            {violations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm">No violations recorded</p>
                                </div>
                            ) : (
                                violations.map((violation) => (
                                    <div
                                        key={violation.id}
                                        onClick={() => showQuickView(violation)}
                                        className={`border rounded-xl p-4 cursor-pointer transition group ${t(isDark,
                                            "bg-[#334155] border-slate-600 hover:bg-[#3d5068] hover:border-blue-500",
                                            "bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-200"
                                        )}`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${violation.type === "overspeeding" ? "bg-red-100" : "bg-blue-100"}`}>
                                                    {violation.type === "overspeeding" ? (
                                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-sm ${t(isDark, "text-white", "text-slate-800")}`}>{violation.plateNumber}</p>
                                                    <p className="text-slate-400 text-[11px] capitalize">{violation.type}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={violation.status} />
                                        </div>

                                        <p className="text-slate-400 text-xs mb-2 truncate">{violation.location}</p>

                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-slate-400">{format(violation.timestamp, "hh:mm a")}</span>
                                            {violation.status === "unverified" && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleVerifyViolation(violation.id); }}
                                                        className="text-[11px] font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg transition"
                                                    >Verify</button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDismissViolation(violation.id); }}
                                                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition ${t(isDark, "text-slate-300 bg-slate-600 hover:bg-slate-500", "text-slate-500 bg-slate-100 hover:bg-slate-200")}`}
                                                    >Dismiss</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Modals ── */}
            {selectedViolation && (
                <QuickViewModal
                    violation={selectedViolation}
                    isDark={isDark}
                    onClose={() => setSelectedViolation(null)}
                    onVerify={handleVerifyViolation}
                    onDismiss={handleDismissViolation}
                />
            )}

            {showLogoutModal && (
                <LogoutModal
                    isDark={isDark}
                    onConfirm={handleLogout}
                    onCancel={() => setShowLogoutModal(false)}
                />
            )}
        </div>
    );
}