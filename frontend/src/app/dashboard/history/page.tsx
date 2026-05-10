"use client";
import { useState, useEffect, useCallback } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, isWithinInterval } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
    History, Search, X, RefreshCw, Gauge, Weight,
    ChevronRight, AlertTriangle, User, Car, Hash, Building2, ArrowLeft
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export enum ViolationType {
    overload = "overload",
    overspeed = "overspeed",
}

export enum ViolationStatus {
    detected = "detected",
    verified = "verified",
    dismissed = "dismissed",
    resolved = "resolved",
    confirmed = "confirmed",
}

export interface Violation {
    id: string;
    type: ViolationType;
    status: ViolationStatus;
    unitId: string;
    plateNumber?: string;
    driverName?: string;
    operator: string;
    route: string;
    location: string;
    lat: number;
    lng: number;
    timestamp: Date;
    resolvedDate?: Date;
    details: {
        passengers?: number;
        capacity?: number;
        speed?: number;
        limit?: number;
    };
    imageUrl?: string;
}

// A driver's grouped record
interface DriverRecord {
    driverName: string;
    unitId: string;
    plateNumber: string;
    operator: string;
    violations: Violation[];
    overcapacityCount: number;
    overspeedCount: number;
    lastSeen: Date;
}

type TimeFilter = "All" | "Today" | "This Week" | "This Month";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskLevel(total: number): { label: string; color: string; dot: string } {
    if (total >= 5) return { label: "HIGH RISK",   color: "text-red-600",    dot: "bg-red-500"    };
    if (total >= 3) return { label: "MODERATE",    color: "text-orange-500", dot: "bg-orange-400" };
    return              { label: "LOW RISK",    color: "text-emerald-600", dot: "bg-emerald-400" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ViolationHistory() {
    const { theme } = useTheme();
    const { user }  = useAuth();
    const isDark    = theme === "dark";
    const t = (dark: string, light: string) => (isDark ? dark : light);

    const [violations,       setViolations]       = useState<Violation[]>([]);
    const [isLoading,        setIsLoading]        = useState(true);
    const [searchQuery,      setSearchQuery]      = useState("");
    const [typeFilter,       setTypeFilter]       = useState<ViolationType | "All">("All");
    const [timeFilter,       setTimeFilter]       = useState<TimeFilter>("All");
    const [selectedDriver,   setSelectedDriver]   = useState<DriverRecord | null>(null);
    const [detailViolation,  setDetailViolation]  = useState<Violation | null>(null);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/violations?includeConfirmed=true");
            if (!response.ok) throw new Error("Failed to fetch history");
            const data = await response.json();

            const all = [
                ...(data.overcapacity  || []),
                ...(data.overspeeding  || []),
            ]
            .filter((v: any) => (v.status || "").toUpperCase() === "RESOLVED")
            .map((v: any) => ({
                id:          v.id,
                type:        v.type === "overspeeding" ? ViolationType.overspeed : ViolationType.overload,
                status:      ViolationStatus.resolved,
                unitId:      v.vehicle_code || v.plate_number || v.vehicle_id || "—",
                plateNumber: v.plate_number  || "—",
                driverName:  v.driver_name   || "Unknown Driver",
                operator:    v.operator_name || v.operator?.operator_name || "Unknown Operator",
                route:       v.route_name    || "Unknown Route",
                location:    v.location      || "Mandaue City",
                lat:         v.coordinates?.[0] || 10.3235,
                lng:         v.coordinates?.[1] || 123.9222,
                timestamp:   new Date(v.timestamp || v.detected_at),
                resolvedDate: v.resolved_at  ? new Date(v.resolved_at)
                            : v.updated_at   ? new Date(v.updated_at)
                            : undefined,
                details: v.type === "overspeeding"
                    ? { speed: v.speed, limit: v.speedLimit }
                    : { passengers: v.passengerCount, capacity: v.totalCapacity },
                imageUrl: v.imageUrl || undefined,
            }));

            let filtered = all.sort((a: Violation, b: Violation) =>
                b.timestamp.getTime() - a.timestamp.getTime()
            );

            const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "SUPERADMIN";
            if (user && !isSuperAdmin && user.operatorName) {
                filtered = filtered.filter((v: Violation) => v.operator === user.operatorName);
            }

            setViolations(filtered);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadHistory();
        const interval = setInterval(loadHistory, 30000);
        return () => clearInterval(interval);
    }, [loadHistory]);

    const isWithinTimeRange = (timestamp: Date, filter: TimeFilter): boolean => {
        const now = new Date();
        switch (filter) {
            case "Today":      return isWithinInterval(timestamp, { start: startOfDay(now),   end: now });
            case "This Week":  return isWithinInterval(timestamp, { start: startOfWeek(now),  end: now });
            case "This Month": return isWithinInterval(timestamp, { start: startOfMonth(now), end: now });
            default: return true;
        }
    };

    // Filter individual violations first
    const filteredViolations = violations.filter((v) => {
        if (typeFilter !== "All" && v.type !== typeFilter) return false;
        if (!isWithinTimeRange(v.timestamp, timeFilter)) return false;
        return true;
    });

    // Group by driver
    const driverMap = new Map<string, DriverRecord>();
    filteredViolations.forEach((v) => {
        const key = v.driverName || "Unknown Driver";
        if (!driverMap.has(key)) {
            driverMap.set(key, {
                driverName:       key,
                unitId:           v.unitId,
                plateNumber:      v.plateNumber || "—",
                operator:         v.operator,
                violations:       [],
                overcapacityCount: 0,
                overspeedCount:   0,
                lastSeen:         v.timestamp,
            });
        }
        const rec = driverMap.get(key)!;
        rec.violations.push(v);
        if (v.type === ViolationType.overload) rec.overcapacityCount++;
        else rec.overspeedCount++;
        if (v.timestamp > rec.lastSeen) rec.lastSeen = v.timestamp;
    });

    // Apply search across driver name, plate, unit, operator
    const driverRecords = Array.from(driverMap.values())
        .filter((dr) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
                dr.driverName.toLowerCase().includes(q)  ||
                dr.plateNumber.toLowerCase().includes(q) ||
                dr.unitId.toLowerCase().includes(q)      ||
                dr.operator.toLowerCase().includes(q)
            );
        })
        .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

    return (
        <div className={`flex h-full transition-colors duration-300 ${t("bg-[#0f172a]", "bg-slate-50")}`}>
            <div className="flex flex-col flex-1 min-w-0">

                {/* HEADER */}
                <div className={`px-4 border-b ${t("bg-[#0f172a] border-slate-800", "bg-white border-slate-200")}`}>
                    <div className="max-w-[1600px] mx-auto py-6 flex flex-col items-center justify-center text-center">
                        <div className="flex items-center gap-3 mb-2">
                            <History className="w-6 h-6 text-emerald-500" />
                            <h1 className={`text-xl font-black tracking-tight uppercase ${t("text-white", "text-slate-800")}`}>
                                Resolved Violations History
                            </h1>
                        </div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${t("text-slate-400", "text-slate-500")}`}>
                            Archive of all processed and resolved incidents — grouped by driver
                        </p>
                    </div>
                </div>

                {/* FILTERS */}
                <div className={`border-b px-4 py-3 flex items-center gap-3 transition-colors duration-300 ${t("bg-[#1e293b]/50 border-slate-700", "bg-white border-slate-200")}`}>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search driver, plate, unit, operator..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white placeholder-slate-500", "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400")}`}
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as ViolationType | "All")}
                            className={`border rounded-xl px-4 py-2.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800")}`}
                        >
                            <option value="All">All Types</option>
                            <option value={ViolationType.overload}>Overcapacity</option>
                            <option value={ViolationType.overspeed}>Overspeeding</option>
                        </select>
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                            className={`border rounded-xl px-4 py-2.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800")}`}
                        >
                            <option value="All">All Time</option>
                            <option value="Today">Today</option>
                            <option value="This Week">This Week</option>
                            <option value="This Month">This Month</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                            {driverRecords.length} Driver{driverRecords.length !== 1 ? "s" : ""} · {filteredViolations.length} Incidents
                        </span>
                    </div>
                </div>

                {/* TABLE - Using HTML table for perfect alignment */}
                <div className="flex-1 overflow-hidden p-4">
                    <div className={`h-full rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${t("bg-[#1e293b] border-slate-700 shadow-xl", "bg-white border-slate-200 shadow-sm")}`}>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full">
                                <thead className={`sticky top-0 z-10 ${t("bg-slate-800/50", "bg-blue-50")}`}>
                                    <tr className={`border-b-2 text-[10px] font-extrabold tracking-widest uppercase ${t("border-slate-700 text-slate-400", "border-blue-200 text-slate-600")}`}>
                                        <th className="px-4 py-3 text-left w-64">Driver</th>
                                        <th className="px-3 py-3 text-center w-28">Unit Code</th>
                                        <th className="px-3 py-3 text-center w-28">Plate No.</th>
                                        <th className="px-3 py-3 text-left w-48">Operator</th>
                                        <th className="px-3 py-3 text-center w-28">Overcapacity</th>
                                        <th className="px-3 py-3 text-center w-28">Overspeed</th>
                                        <th className="px-3 py-3 text-center w-20">Total</th>
                                        <th className="px-3 py-3 text-center w-28">Risk</th>
                                        <th className="px-3 py-3 text-center w-28">Last Incident</th>
                                        <th className="px-3 py-3 text-center w-20">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading && violations.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="h-64">
                                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                                    <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading History...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : driverRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="h-64">
                                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                                    <History className="w-16 h-16 opacity-10" />
                                                    <p className="font-bold">No resolved violations found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        driverRecords.map((dr) => {
                                            const total = dr.overcapacityCount + dr.overspeedCount;
                                            const risk  = riskLevel(total);
                                            return (
                                                <tr
                                                    key={dr.driverName}
                                                    onClick={() => setSelectedDriver(dr)}
                                                    className={`cursor-pointer border-b transition-all duration-200 ${t("border-slate-800 hover:bg-slate-800/40", "border-slate-100 hover:bg-slate-50")}`}
                                                >
                                                    {/* Driver */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${t("bg-indigo-900/40 text-indigo-400", "bg-indigo-100 text-indigo-600")}`}>
                                                                {dr.driverName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className={`text-[12px] font-bold ${t("text-slate-200", "text-slate-800")}`}>
                                                                {dr.driverName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {/* Unit Code */}
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`inline-block px-2 py-1 text-[10px] font-black rounded border ${t("bg-indigo-900/30 text-indigo-400 border-indigo-800/50", "bg-indigo-50 text-indigo-700 border-indigo-200")}`}>
                                                            {dr.unitId}
                                                        </span>
                                                    </td>
                                                    {/* Plate */}
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`inline-block px-2 py-1 text-[10px] font-black rounded border ${t("bg-slate-700/60 text-slate-200 border-slate-600", "bg-slate-100 text-slate-800 border-slate-300")}`}>
                                                            {dr.plateNumber}
                                                        </span>
                                                    </td>
                                                    {/* Operator */}
                                                    <td className={`px-3 py-3 text-[11px] font-semibold ${t("text-slate-300", "text-slate-700")}`}>
                                                        {dr.operator}
                                                    </td>
                                                    {/* Overcapacity count */}
                                                    <td className="px-3 py-3 text-center">
                                                        {dr.overcapacityCount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200">
                                                                <Weight size={10} />{dr.overcapacityCount}×
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 text-[10px]">—</span>
                                                        )}
                                                    </td>
                                                    {/* Overspeed count */}
                                                    <td className="px-3 py-3 text-center">
                                                        {dr.overspeedCount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200">
                                                                <Gauge size={10} />{dr.overspeedCount}×
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 text-[10px]">—</span>
                                                        )}
                                                    </td>
                                                    {/* Total */}
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`text-sm font-black ${t("text-white", "text-slate-800")}`}>{total}</span>
                                                    </td>
                                                    {/* Risk */}
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase ${risk.color}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                                                            {risk.label}
                                                        </span>
                                                    </td>
                                                    {/* Last incident */}
                                                    <td className={`px-3 py-3 text-center text-[10px] font-bold ${t("text-slate-500", "text-slate-500")}`}>
                                                        {format(dr.lastSeen, "MM/dd HH:mm")}
                                                    </td>
                                                    {/* View */}
                                                    <td className="px-3 py-3 text-center">
                                                        <ChevronRight className={`w-4 h-4 mx-auto ${t("text-slate-500", "text-slate-400")}`} />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── DRIVER DETAIL PANEL ────────────────────────────────────── */}
            {selectedDriver && !detailViolation && (
                <DriverPanel
                    driver={selectedDriver}
                    isDark={isDark}
                    onClose={() => setSelectedDriver(null)}
                    onSelectViolation={setDetailViolation}
                />
            )}

            {/* ── SINGLE VIOLATION DETAIL MODAL ─────────────────────────── */}
            {detailViolation && (
                <ViolationDetailModal
                    violation={detailViolation}
                    isDark={isDark}
                    onBack={() => setDetailViolation(null)}
                    onClose={() => { setDetailViolation(null); setSelectedDriver(null); }}
                />
            )}
        </div>
    );
}

// ── Driver side panel ─────────────────────────────────────────────────────────

function DriverPanel({ driver: dr, isDark, onClose, onSelectViolation }: {
    driver: DriverRecord;
    isDark: boolean;
    onClose: () => void;
    onSelectViolation: (v: Violation) => void;
}) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    const total = dr.overcapacityCount + dr.overspeedCount;
    const risk  = riskLevel(total);

    return (
        <div className={`w-[420px] shrink-0 border-l flex flex-col shadow-2xl transition-all duration-300 animate-in slide-in-from-right ${t("bg-slate-900 border-slate-800", "bg-white border-slate-200")}`}>

            {/* Panel header */}
            <div className={`px-6 py-5 border-b flex items-start justify-between ${t("border-slate-800", "border-slate-100")}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 ${t("bg-indigo-900/40 text-indigo-400", "bg-indigo-100 text-indigo-600")}`}>
                        {dr.driverName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest leading-tight ${t("text-white", "text-slate-800")}`}>{dr.driverName}</h3>
                        <p className={`text-[10px] font-bold mt-1 ${risk.color}`}>{risk.label} · {total} total incident{total !== 1 ? "s" : ""}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {/* Metadata strip */}
            <div className={`grid grid-cols-3 divide-x border-b ${t("divide-slate-800 border-slate-800 bg-slate-800/30", "divide-slate-100 border-slate-100 bg-slate-50")}`}>
                <MetaCell icon={<Car size={12} />} label="Unit" value={dr.unitId} isDark={isDark} />
                <MetaCell icon={<Hash size={12} />} label="Plate" value={dr.plateNumber} isDark={isDark} />
                <MetaCell icon={<Building2 size={12} />} label="Operator" value={dr.operator} isDark={isDark} />
            </div>

            {/* Frequency summary */}
            <div className={`grid grid-cols-2 gap-3 p-4 border-b ${t("border-slate-800", "border-slate-100")}`}>
                <FreqCard
                    label="Overcapacity"
                    count={dr.overcapacityCount}
                    icon={<Weight size={16} />}
                    color={t("bg-rose-900/30 text-rose-400 border-rose-800/40", "bg-red-50 text-red-600 border-red-200")}
                />
                <FreqCard
                    label="Overspeeding"
                    count={dr.overspeedCount}
                    icon={<Gauge size={16} />}
                    color={t("bg-amber-900/30 text-amber-400 border-amber-800/40", "bg-orange-50 text-orange-600 border-orange-200")}
                />
            </div>

            {/* Violations list */}
            <p className={`px-6 pt-4 pb-2 text-[10px] font-black uppercase tracking-widest ${t("text-slate-500", "text-slate-400")}`}>
                Violation History ({dr.violations.length})
            </p>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {dr.violations
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .map((v) => {
                        const isOverload = v.type === ViolationType.overload;
                        return (
                            <button
                                key={v.id}
                                onClick={() => onSelectViolation(v)}
                                className={`w-full text-left p-4 rounded-2xl border flex items-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99] ${t("bg-slate-800/40 border-slate-700/50 hover:border-slate-600", "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-sm")}`}
                            >
                                <div className={`p-2.5 rounded-xl shrink-0 ${isOverload ? t("bg-rose-900/30 text-rose-400", "bg-red-50 text-red-500") : t("bg-amber-900/30 text-amber-400", "bg-orange-50 text-orange-500")}`}>
                                    {isOverload ? <Weight size={16} /> : <Gauge size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-[10px] font-black uppercase ${isOverload ? "text-rose-500" : "text-amber-500"}`}>
                                            {isOverload ? "Overcapacity" : "Overspeed"}
                                        </span>
                                        <span className="text-slate-400 text-[9px]">·</span>
                                        <span className={`text-[9px] font-bold ${t("text-slate-500", "text-slate-400")}`}>
                                            {format(v.timestamp, "MMM dd, yyyy")}
                                        </span>
                                    </div>
                                    <p className={`text-[11px] font-bold truncate ${t("text-slate-300", "text-slate-700")}`}>
                                        {isOverload
                                            ? `${v.details.passengers} pax (limit ${v.details.capacity})`
                                            : `${v.details.speed} km/h (limit ${v.details.limit})`}
                                    </p>
                                    <p className={`text-[9px] truncate mt-0.5 ${t("text-slate-500", "text-slate-400")}`}>{v.location}</p>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 shrink-0" />
                            </button>
                        );
                    })}
            </div>
        </div>
    );
}

// ── Violation detail modal ────────────────────────────────────────────────────

function ViolationDetailModal({ violation: v, isDark, onBack, onClose }: {
    violation: Violation;
    isDark: boolean;
    onBack: () => void;
    onClose: () => void;
}) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    const isOverload = v.type === ViolationType.overload;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${t("bg-slate-900 border border-slate-800", "bg-white")}`}>
                {/* Header */}
                <div className={`px-8 py-6 border-b flex items-center justify-between ${t("border-slate-800", "border-slate-100")}`}>
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${t("hover:bg-slate-800 text-slate-400", "hover:bg-slate-100 text-slate-500")}`}>
                            <ArrowLeft size={18} />
                        </button>
                        <div className={`p-3 rounded-2xl ${isOverload ? t("bg-rose-500/20 text-rose-400", "bg-red-50 text-red-500") : t("bg-amber-500/20 text-amber-400", "bg-orange-50 text-orange-500")}`}>
                            <AlertTriangle size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black uppercase tracking-tight ${t("text-white", "text-slate-800")}`}>
                                {isOverload ? "Overcapacity" : "Overspeeding"}
                            </h2>
                            <p className={`text-[10px] font-bold ${t("text-slate-500", "text-slate-400")}`}>{v.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${t("hover:bg-slate-800 text-slate-400", "hover:bg-slate-100 text-slate-400")}`}>
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-4 max-h-[65vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                        <InfoCard label="Driver"   value={v.driverName  || "Unknown"} isDark={isDark} />
                        <InfoCard label="Unit Code" value={v.unitId}                  isDark={isDark} />
                        <InfoCard label="Plate No." value={v.plateNumber || "—"}      isDark={isDark} />
                        <InfoCard label="Operator"  value={v.operator}                isDark={isDark} />
                    </div>

                    <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                            {isOverload ? "Capacity Details" : "Speed Details"}
                        </p>
                        {isOverload ? (
                            <div className="space-y-1.5">
                                <DetailRow label="Passengers" value={`${v.details.passengers} pax`} accent isDark={isDark} />
                                <DetailRow label="Capacity Limit" value={`${v.details.capacity} pax`} isDark={isDark} />
                                <DetailRow label="Excess" value={`+${(v.details.passengers ?? 0) - (v.details.capacity ?? 0)} pax`} accent isDark={isDark} />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <DetailRow label="Detected Speed" value={`${v.details.speed} km/h`} accent isDark={isDark} />
                                <DetailRow label="Speed Limit"    value={`${v.details.limit} km/h`} isDark={isDark} />
                                <DetailRow label="Excess"         value={`+${(v.details.speed ?? 0) - (v.details.limit ?? 0)} km/h`} accent isDark={isDark} />
                            </div>
                        )}
                    </div>

                    <div className={`p-5 rounded-2xl border space-y-2 ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                        <DetailRow label="Location"    value={v.location}                                            isDark={isDark} />
                        <DetailRow label="Detected At" value={format(v.timestamp, "PPP p")}                         isDark={isDark} />
                        <DetailRow label="Resolved At" value={v.resolvedDate ? format(v.resolvedDate, "PPP p") : "N/A"} accent isDark={isDark} />
                    </div>
                </div>

                <div className={`px-8 pb-8 pt-2 border-t ${t("border-slate-800", "border-slate-100")}`}>
                    <button
                        onClick={onBack}
                        className={`w-full py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${t("bg-slate-800 hover:bg-slate-700 text-white", "bg-slate-900 hover:bg-slate-800 text-white")}`}
                    >
                        Back to Driver Record
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaCell({ icon, label, value, isDark }: { icon: React.ReactNode; label: string; value: string; isDark: boolean }) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    return (
        <div className="px-4 py-3 flex flex-col gap-1">
            <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${t("text-slate-500", "text-slate-400")}`}>
                {icon}{label}
            </div>
            <span className={`text-[11px] font-black truncate ${t("text-slate-200", "text-slate-800")}`}>{value}</span>
        </div>
    );
}

function FreqCard({ label, count, icon, color }: { label: string; count: number; icon: React.ReactNode; color: string }) {
    return (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${color}`}>
            <div className="opacity-80">{icon}</div>
            <div>
                <p className="text-xl font-black leading-none">{count}×</p>
                <p className="text-[9px] font-black uppercase tracking-wider opacity-70 mt-0.5">{label}</p>
            </div>
        </div>
    );
}

function InfoCard({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    return (
        <div className={`p-4 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-sm font-black truncate ${t("text-slate-200", "text-slate-800")}`}>{value}</p>
        </div>
    );
}

function DetailRow({ label, value, accent, isDark }: { label: string; value: string; accent?: boolean; isDark: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">{label}</span>
            <span className={`text-xs font-black text-right ${accent ? "text-emerald-500" : (isDark ? "text-slate-300" : "text-slate-700")}`}>{value}</span>
        </div>
    );
}