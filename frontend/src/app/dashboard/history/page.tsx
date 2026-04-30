"use client";
import { useState, useEffect, useCallback } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, isWithinInterval } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { History, Search, X, RefreshCw, Gauge, Weight, CheckCircle, FileText } from "lucide-react";

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

type TimeFilter = "All" | "Today" | "This Week" | "This Month";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ViolationHistory() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const isDark = theme === "dark";
    const t = (dark: string, light: string) => (isDark ? dark : light);

    const [violations, setViolations] = useState<Violation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<ViolationType | "All">("All");
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("All");
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/violations");
            if (!response.ok) throw new Error("Failed to fetch history");
            const data = await response.json();
            
            const all = [
                ...(data.overcapacity || []),
                ...(data.overspeeding || [])
            ]
            .filter((v: any) => v.status?.toUpperCase() === "CONFIRMED")
            .map((v: any) => ({
                id: v.id,
                type: v.type === "overspeeding" ? ViolationType.overspeed : ViolationType.overload,
                status: ViolationStatus.confirmed,
                unitId: v.vehicle_code || v.plate_number || v.vehicle_id,
                operator: v.operator_name || "Unknown Operator",
                route: v.route_name || "Unknown Route",
                location: v.location || "Mandaue City",
                lat: v.coordinates?.[0] || 10.3235,
                lng: v.coordinates?.[1] || 123.9222,
                timestamp: new Date(v.timestamp),
                resolvedDate: v.updated_at ? new Date(v.updated_at) : new Date(),
                details: v.type === "overspeeding" 
                    ? { speed: v.speed, limit: v.speedLimit }
                    : { passengers: v.passengerCount, capacity: v.totalCapacity },
                imageUrl: v.imageUrl
            }));
            
            let filtered = all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            // Filter by operator if not super admin
            const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "SUPERADMIN";
            if (user && !isSuperAdmin && user.operatorName) {
                filtered = filtered.filter(v => v.operator === user.operatorName);
            }

            setViolations(filtered);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();
        const interval = setInterval(loadHistory, 30000); // History updates less frequently
        return () => clearInterval(interval);
    }, [loadHistory]);

    const isWithinTimeRange = (timestamp: Date, filter: TimeFilter): boolean => {
        const now = new Date();
        switch (filter) {
            case "Today":
                return isWithinInterval(timestamp, { start: startOfDay(now), end: now });
            case "This Week":
                return isWithinInterval(timestamp, { start: startOfWeek(now), end: now });
            case "This Month":
                return isWithinInterval(timestamp, { start: startOfMonth(now), end: now });
            default:
                return true;
        }
    };

    const filteredViolations = violations.filter((v) => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (
                !v.unitId.toLowerCase().includes(q) &&
                !v.operator.toLowerCase().includes(q) &&
                !v.location.toLowerCase().includes(q) &&
                !v.id.toLowerCase().includes(q)
            )
                return false;
        }
        if (typeFilter !== "All" && v.type !== typeFilter) return false;
        if (!isWithinTimeRange(v.timestamp, timeFilter)) return false;
        return true;
    });

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
                            Archive of all processed and resolved incidents
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
                                placeholder="Search history..."
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
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Archive Count: {filteredViolations.length}</span>
                    </div>
                </div>

                {/* TABLE */}
                <div className="flex-1 overflow-hidden p-4">
                    <div className={`h-full rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${t("bg-[#1e293b] border-slate-700 shadow-xl", "bg-white border-slate-200 shadow-sm")}`}>
                        <div className={`grid grid-cols-[1fr_80px_140px_110px_1fr_90px_90px_70px] px-3 py-3 border-b-2 text-[10px] font-extrabold tracking-widest uppercase transition-colors duration-300 ${t("bg-slate-800/50 border-slate-700 text-slate-400", "bg-blue-50 border-blue-200 text-slate-600")}`}>
                            <div>ID</div>
                            <div className="text-center">Unit</div>
                            <div>Operator</div>
                            <div className="text-center">Type</div>
                            <div>Location</div>
                            <div className="text-center">Detected</div>
                            <div className="text-center">Resolved</div>
                            <div className="text-center">View</div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {isLoading && violations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading History...</p>
                                </div>
                            ) : filteredViolations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <CheckCircle className="w-16 h-16 opacity-10" />
                                    <p className="font-bold">No resolved violations found</p>
                                </div>
                            ) : (
                                filteredViolations.map((v) => (
                                    <div key={v.id} className={`grid grid-cols-[1fr_80px_140px_110px_1fr_90px_90px_70px] px-3 py-4 border-b transition-all duration-200 ${t("border-slate-800 hover:bg-slate-800/40", "border-slate-100 hover:bg-slate-50")}`}>
                                        <div className="flex items-center text-[10px] font-mono font-bold truncate pr-4 text-slate-500">{v.id}</div>
                                        <div className="flex items-center justify-center">
                                            <span className="px-2 py-1 text-[10px] font-black rounded border bg-slate-900/10 text-slate-700 border-slate-200">{v.unitId}</span>
                                        </div>
                                        <div className="flex items-center text-[11px] font-semibold truncate pr-2 text-slate-600">{v.operator}</div>
                                        <div className="flex items-center justify-center">
                                            <span className={`px-2 py-1 text-[9px] font-black rounded uppercase ${v.type === ViolationType.overload ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                                                {v.type === ViolationType.overload ? "Overcapacity" : "Overspeed"}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-[10px] font-medium truncate pr-2 text-slate-500">{v.location}</div>
                                        <div className="flex items-center justify-center text-[10px] font-bold text-slate-400">{format(v.timestamp, "MM/dd HH:mm")}</div>
                                        <div className="flex items-center justify-center text-[10px] font-bold text-emerald-500">{v.resolvedDate ? format(v.resolvedDate, "MM/dd HH:mm") : "N/A"}</div>
                                        <div className="flex items-center justify-center">
                                            <button 
                                              onClick={() => setSelectedViolation(v)}
                                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                            >
                                              <FileText size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {selectedViolation && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                  <div className={`w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${t("bg-slate-900 border border-slate-800", "bg-white")}`}>
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                          <CheckCircle size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Resolved Incident</h2>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedViolation.id}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedViolation(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                    </div>
                    <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle</p>
                          <p className="text-sm font-black text-slate-800">{selectedViolation.unitId}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                          <p className="text-sm font-black text-emerald-600 uppercase">Confirmed</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Violation Type</span>
                          <span className="font-black text-slate-800 uppercase">{selectedViolation.type === ViolationType.overload ? "Overcapacity" : "Overspeeding"}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Detected At</span>
                          <span className="font-bold text-slate-600">{format(selectedViolation.timestamp, "PPP p")}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Resolved At</span>
                          <span className="font-bold text-emerald-600">{selectedViolation.resolvedDate ? format(selectedViolation.resolvedDate, "PPP p") : "N/A"}</span>
                        </div>
                      </div>
                      <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                        {selectedViolation.type === ViolationType.overspeed ? <Gauge className="text-emerald-500" /> : <Weight className="text-emerald-500" />}
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Final Metric</p>
                          <p className="text-lg font-black text-emerald-700">
                            {selectedViolation.type === ViolationType.overspeed 
                              ? `${selectedViolation.details.speed} km/h (Limit: ${selectedViolation.details.limit})`
                              : `${selectedViolation.details.passengers} pax (Limit: ${selectedViolation.details.capacity})`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-8 border-t border-slate-100">
                      <button onClick={() => setSelectedViolation(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all">Close Record</button>
                    </div>
                  </div>
                </div>
            )}
        </div>
    );
}