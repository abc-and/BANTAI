"use client";
import { useState, useEffect, useCallback } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, isWithinInterval } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, ShieldCheck, RefreshCw, CheckCircle, X, Camera, ZoomIn } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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
    plateNumber: string;
    operator: string;
    route: string;
    location: string;
    lat: number;
    lng: number;
    timestamp: Date;
    driverName?: string;
    repeatOffenseCount: number;
    resolvedDate?: Date;
    details: {
        passengers?: number;
        capacity?: number;
        sitting?: number;
        standing?: number;
        sittingCapacity?: number;
        standingCapacity?: number;
        breachTypes?: string[];
        speed?: number;
        limit?: number;
    };
    imageUrlFront?: string;
    imageUrlRear?: string;
    imageUrl?: string;
}

interface ViolationsManagementProps {
    violations: Violation[];
    onUpdate: () => void;
}

async function uploadViolationImage(
    violationId: string,
    violationType: string,
    file: File,
    camera: "front" | "rear" = "front"
) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("violationId", violationId);
    formData.append("violationType", violationType);
    formData.append("camera", camera);

    const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
    }
    return response.json();
}

type TimeFilter = "All" | "Today" | "This Week" | "This Month";

export default function ViolationsManagement({
    violations: externalViolations,
    onUpdate,
}: Partial<ViolationsManagementProps>) {
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
    const [snapshotViolation, setSnapshotViolation] = useState<Violation | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [resolveConfirm, setResolveConfirm] = useState<Violation | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const searchParams = useSearchParams();
    const highlightId = searchParams.get("highlight");

    useEffect(() => {
        if (highlightId) {
            const timer = setTimeout(() => {
                const el = document.getElementById(`violation-row-${highlightId}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [highlightId, violations]);

    const loadViolations = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/violations?includeConfirmed=true");
            if (!response.ok) throw new Error("Failed to fetch violations");
            const data = await response.json();

            const transformStatus = (s: string) => {
                const status = (s || "").toUpperCase();
                if (status === "CONFIRMED") return ViolationStatus.confirmed;
                if (status === "VERIFIED")  return ViolationStatus.verified;
                if (status === "RESOLVED")  return ViolationStatus.resolved;   // ← was mapping to confirmed
                if (status === "DISMISSED") return ViolationStatus.dismissed;
                return ViolationStatus.detected;
            };

            const all: Violation[] = [
                ...(data.overcapacity || []).map((v: any) => {
                    let recordedSitting  = parseInt(v.recorded_sitting)  || 0;
                    let recordedStanding = parseInt(v.recorded_standing) || 0;
                    let sittingCapacity  = parseInt(v.sitting_capacity)  || 0;
                    let standingCapacity = parseInt(v.standing_capacity) || 0;
                    let breachTypes = Array.isArray(v.breach_types) ? v.breach_types : [];

                    if (v.metadata) {
                        try {
                            const meta = typeof v.metadata === "string" ? JSON.parse(v.metadata) : v.metadata;
                            recordedSitting  = recordedSitting  || parseInt(meta.recorded_sitting)  || 0;
                            recordedStanding = recordedStanding || parseInt(meta.recorded_standing) || 0;
                            sittingCapacity  = sittingCapacity  || parseInt(meta.sitting_capacity)  || 0;
                            standingCapacity = standingCapacity || parseInt(meta.standing_capacity) || 0;
                            if (breachTypes.length === 0 && meta.breach_types) {
                                breachTypes = Array.isArray(meta.breach_types) ? meta.breach_types : [];
                            }
                        } catch (e) {}
                    }

                    const imageUrlFront: string | undefined = v.image_url_front || undefined;
                    const imageUrlRear:  string | undefined = v.image_url_rear  || undefined;
                    const imageUrlLegacy: string | undefined =
                        !imageUrlFront && !imageUrlRear
                            ? v.imageUrl || v.image_url || undefined
                            : undefined;

                    return {
                        id: v.id,
                        type: ViolationType.overload,
                        status: transformStatus(v.status),
                        unitId: v.vehicle_code || v.vehicle_id || "—",
                        plateNumber: v.plate_number || "—",
                        operator: v.operator?.operator_name || v.operator_name || v.operator || "Unknown Operator",
                        route: v.route_name || "Unknown Route",
                        location: v.location || "Mandaue City",
                        driverName: v.driver_name || "Unknown Driver",
                        lat: v.coordinates?.[0] || 10.3235,
                        lng: v.coordinates?.[1] || 123.9222,
                        timestamp: new Date(v.timestamp),
                        repeatOffenseCount: 0,
                        details: {
                            passengers: v.passengerCount || recordedSitting + recordedStanding,
                            capacity: v.totalCapacity || (sittingCapacity + standingCapacity > 0 ? sittingCapacity + standingCapacity : 20),
                            sitting: recordedSitting,
                            standing: recordedStanding,
                            sittingCapacity,
                            standingCapacity,
                            breachTypes,
                        },
                        imageUrlFront,
                        imageUrlRear,
                        imageUrl: imageUrlLegacy,
                    };
                }),
                ...(data.overspeeding || []).map((v: any) => ({
                    id: v.id,
                    type: ViolationType.overspeed,
                    status: transformStatus(v.status),
                    unitId: v.vehicle_code || v.vehicle_id || "—",
                    plateNumber: v.plate_number || "—",
                    operator: v.operator?.operator_name || v.operator_name || v.operator || "Unknown Operator",
                    route: v.route_name || "Unknown Route",
                    location: v.location || "Mandaue City",
                    driverName: v.driver_name || "Unknown Driver",
                    lat: v.coordinates?.[0] || 10.3235,
                    lng: v.coordinates?.[1] || 123.9222,
                    timestamp: new Date(v.timestamp),
                    repeatOffenseCount: 0,
                    details: { speed: v.speed, limit: v.speedLimit },
                    imageUrl: v.imageUrl || v.image_url || undefined,
                })),
            ];

            let filtered = all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "SUPERADMIN";
            if (user && !isSuperAdmin && user.operatorName) {
                const norm = user.operatorName.toLowerCase().trim();
                filtered = filtered.filter((v) => (v.operator || "").toLowerCase().trim() === norm);
            }

            setViolations(filtered);
        } catch (error) {
            console.error("Failed to load violations:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadViolations();
        const interval = setInterval(loadViolations, 15000);
        return () => clearInterval(interval);
    }, [loadViolations]);

    const isWithinTimeRange = (timestamp: Date, filter: TimeFilter): boolean => {
        const now = new Date();
        switch (filter) {
            case "Today":      return isWithinInterval(timestamp, { start: startOfDay(now),  end: now });
            case "This Week":  return isWithinInterval(timestamp, { start: startOfWeek(now), end: now });
            case "This Month": return isWithinInterval(timestamp, { start: startOfMonth(now), end: now });
            default: return true;
        }
    };

const filteredViolations = violations.filter((v) => {
    if (![ViolationStatus.confirmed, ViolationStatus.verified].includes(v.status)) return false;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        // Convert violation type to string for searching
        const typeString = v.type === ViolationType.overload ? "overcapacity" : "overspeed";
        
        if (
            !v.id.toLowerCase().includes(q) &&
            !v.unitId.toLowerCase().includes(q) &&
            !v.plateNumber.toLowerCase().includes(q) &&
            !(v.driverName || "").toLowerCase().includes(q) &&
            !v.operator.toLowerCase().includes(q) &&
            !v.route.toLowerCase().includes(q) &&
            !typeString.includes(q) &&
            !v.location.toLowerCase().includes(q)
        ) return false;
    }
    if (typeFilter !== "All" && v.type !== typeFilter) return false;
    if (!isWithinTimeRange(v.timestamp, timeFilter)) return false;
    return true;
});

    const totalVerified  = filteredViolations.length;
    const totalOverload  = filteredViolations.filter((v) => v.type === ViolationType.overload).length;
    const totalOverspeed = filteredViolations.filter((v) => v.type === ViolationType.overspeed).length;
    const allSelected    = selectedIds.size === filteredViolations.length && filteredViolations.length > 0;

    const toggleSelectAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredViolations.map((v) => v.id)));
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

        const markAsResolved = async (v: Violation) => {
            try {
                const response = await fetch(`/api/violations/${v.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: "RESOLVED",  // ← was "CONFIRMED"
                        type: v.type === ViolationType.overspeed ? "overspeeding" : "overcapacity",
                    }),
                });

            const data = await response.json();
            console.log("PATCH response:", data);        // ← add this
            console.log("PATCH status:", response.ok);   // ← add this
            console.log("Violation id:", v.id);          // ← add this
            console.log("Violation type:", v.type);      // ← add this

            if (!response.ok) throw new Error(data.error || "Failed to resolve violation");

            setViolations((prev) => prev.filter((vio) => vio.id !== v.id));
            setSelectedViolation(null);
            setSnapshotViolation(null);
            setResolveConfirm(null);
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 4000);
            loadViolations();

        } catch (error: any) {
            console.error("markAsResolved error:", error);
        }
    };
    const generateReport = (v: Violation) => {
        const isOverload = v.type === ViolationType.overload;
        const excessLabel = isOverload
            ? `${(v.details.passengers ?? 0) - (v.details.capacity ?? 0)} persons over capacity`
            : `${(v.details.speed ?? 0) - (v.details.limit ?? 0)} km/h over limit`;

        const html = `
      <html>
      <head>
        <title>Incident Report - ${v.id}</title>
        <style>
          body { font-family: Georgia, serif; margin: 40px; color: #1a1a2e; }
          h1 { font-size: 22px; font-weight: bold; color: #1e3a8a; }
          .subtitle { color: #1d4ed8; font-size: 12px; margin-top: 2px; }
          .header-box { border: 2px solid #1d4ed8; background: #eff6ff; padding: 20px; margin-bottom: 20px; }
          .meta { display: flex; justify-content: space-between; }
          .type-badge { padding: 10px 14px; border: 1.5px solid ${isOverload ? "#b91c1c" : "#c2410c"}; background: ${isOverload ? "#fef2f2" : "#fff7ed"}; color: ${isOverload ? "#7f1d1d" : "#7c2d12"}; font-weight: bold; font-size: 12px; margin-bottom: 20px; }
          h2 { font-size: 13px; font-weight: bold; border-bottom: 1px solid #9ca3af; padding-bottom: 6px; margin-top: 20px; }
          .row { display: flex; padding: 4px 0; font-size: 10px; }
          .label { width: 180px; font-weight: bold; }
          .excess-box { background: ${isOverload ? "#fee2e2" : "#ffedd5"}; border: 1px solid ${isOverload ? "#b91c1c" : "#c2410c"}; padding: 10px; margin: 8px 0; font-size: 10px; }
          .legal { font-size: 9px; line-height: 1.6; text-align: justify; }
          .footer { border-top: 1px solid #9ca3af; margin-top: 30px; padding-top: 16px; display: flex; justify-content: space-between; font-size: 9px; }
          .sig-line { border-top: 1px solid #000; width: 200px; padding-top: 4px; margin-top: 40px; }
          .evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
          .evidence-img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
          .evidence-label { font-size: 9px; font-weight: bold; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="meta">
            <div>
              <h1>OFFICIAL INCIDENT REPORT</h1>
              <div class="subtitle">Mandaue City Government</div>
              <div class="subtitle">Public Transport Regulation Office</div>
            </div>
            <div style="text-align:right; font-size:10px;">
              <div><strong>Report No: ${v.id}</strong></div>
              <div>Generated: ${format(new Date(), "MMMM dd, yyyy")}</div>
              <div>Time: ${format(new Date(), "HH:mm:ss")}</div>
            </div>
          </div>
        </div>
        <div class="type-badge">VIOLATION TYPE: ${isOverload ? "PASSENGER LIMIT VIOLATION" : "SPEED LIMIT VIOLATION"}</div>

        <h2>I. VEHICLE INFORMATION</h2>
        <div class="row"><div class="label">Unit / Vehicle Code:</div><div>${v.unitId}</div></div>
        <div class="row"><div class="label">Plate Number:</div><div>${v.plateNumber}</div></div>
        <div class="row"><div class="label">Driver:</div><div>${v.driverName || "Unknown Driver"}</div></div>
        <div class="row"><div class="label">Registered Operator:</div><div>${v.operator}</div></div>
        <div class="row"><div class="label">Designated Route:</div><div>${v.route}</div></div>

        <h2>II. INCIDENT DETAILS</h2>
        <div class="row"><div class="label">Date of Incident:</div><div>${format(v.timestamp, "MMMM dd, yyyy")}</div></div>
        <div class="row"><div class="label">Time of Incident:</div><div>${format(v.timestamp, "HH:mm:ss")}</div></div>
        <div class="row"><div class="label">Location:</div><div>${v.location}</div></div>
        <div class="row"><div class="label">Coordinates:</div><div>Lat: ${v.lat.toFixed(6)}, Lng: ${v.lng.toFixed(6)}</div></div>

        <h2>III. VIOLATION SPECIFICS</h2>
        ${isOverload
            ? `
          <div class="row"><div class="label">Legal Passenger Capacity:</div><div>${v.details.capacity} persons</div></div>
          <div class="row"><div class="label">Detected Passenger Count:</div><div>${v.details.passengers} persons</div></div>
          <div class="row"><div class="label">Sitting Details:</div><div>${v.details.sitting} recorded / ${v.details.sittingCapacity} limit</div></div>
          <div class="row"><div class="label">Standing Details:</div><div>${v.details.standing} recorded / ${v.details.standingCapacity} limit</div></div>
          <div class="row"><div class="label">Breach Type(s):</div><div>${v.details.breachTypes?.join(", ") || "N/A"}</div></div>
          <div class="excess-box"><strong>EXCESS PASSENGERS:</strong> ${excessLabel} (${(((v.details.passengers ?? 0) - (v.details.capacity ?? 0)) / (v.details.capacity ?? 1) * 100).toFixed(1)}% over capacity)</div>
          ${(v.imageUrlFront || v.imageUrlRear || v.imageUrl) ? `
          <h2>IV. EVIDENCE IMAGES</h2>
          <div class="evidence-grid">
            ${v.imageUrlFront ? `<div><div class="evidence-label">Front Camera</div><img src="${v.imageUrlFront}" class="evidence-img" alt="Front camera" /></div>` : ""}
            ${v.imageUrlRear  ? `<div><div class="evidence-label">Rear Camera</div><img src="${v.imageUrlRear}"  class="evidence-img" alt="Rear camera"  /></div>` : ""}
            ${!v.imageUrlFront && !v.imageUrlRear && v.imageUrl ? `<div><div class="evidence-label">Evidence Photo</div><img src="${v.imageUrl}" class="evidence-img" alt="Evidence" /></div>` : ""}
          </div>` : ""}
        `
            : `
          <div class="row"><div class="label">Posted Speed Limit:</div><div>${v.details.limit} km/h</div></div>
          <div class="row"><div class="label">Detected Vehicle Speed:</div><div>${v.details.speed} km/h</div></div>
          <div class="excess-box"><strong>EXCESS SPEED:</strong> ${excessLabel} (${(((v.details.speed ?? 0) - (v.details.limit ?? 0)) / (v.details.limit ?? 1) * 100).toFixed(1)}% over limit)</div>
        `}

        <h2>${isOverload && (v.imageUrlFront || v.imageUrlRear || v.imageUrl) ? "V" : "IV"}. REGULATORY ACTION</h2>
        <p class="legal">This incident report serves as official documentation of a public transport regulation violation...</p>
        <p class="legal">The operator has the right to contest this violation by filing an appeal within fifteen (15) working days.</p>

        <div class="footer">
          <div><div class="sig-line">Authorized Officer<br/>Public Transport Regulation Office</div></div>
          <div><div class="sig-line">Date</div></div>
        </div>
      </body>
      </html>
    `;

        const win = window.open("", "_blank");
        if (win) { win.document.write(html); win.document.close(); win.print(); }
    };

    const exportSelected = () => {
        violations.filter((v) => selectedIds.has(v.id)).forEach(generateReport);
    };

    return (
        <div className={`flex h-full transition-colors duration-300 ${t("bg-[#0f172a]", "bg-slate-50")}`}>
            <div className="flex flex-col flex-1 min-w-0">

                {/* Header */}
                <div className={`px-4 border-b ${t("bg-[#0f172a] border-slate-800", "bg-white border-slate-200")}`}>
                    <div className="max-w-[1600px] mx-auto py-6 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h1 className={`text-xl font-black tracking-tight uppercase ${t("text-white", "text-slate-800")}`}>Violations Management</h1>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${t("text-slate-400", "text-slate-500")}`}>Verified Incidents & Report Generation</p>
                        </div>
                        {user && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t("bg-indigo-500/10 border-indigo-500/20", "bg-indigo-50 border-indigo-200/50")}`}>
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                    {user.role === "SUPERADMIN" || user.role === "SUPER_ADMIN" ? "SUPER ADMIN" : user.operatorName || "OPERATOR"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stat chips */}
                <div className={`border-b px-4 py-3 grid grid-cols-3 gap-3 transition-colors duration-300 ${t("bg-[#1e293b] border-slate-700", "bg-slate-100 border-slate-200")}`}>
                    <StatChip isDark={isDark} label="Total Verified" count={totalVerified} color="blue" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />} />
                    <StatChip isDark={isDark} label="Overcapacity"  count={totalOverload}  color="red"    icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />} />
                    <StatChip isDark={isDark} label="Overspeeding"  count={totalOverspeed} color="orange" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />} />
                </div>

                {/* Filters */}
                <div className={`border-b px-4 py-3 flex items-center gap-3 transition-colors duration-300 ${t("bg-[#1e293b]/50 border-slate-700", "bg-white border-slate-200")}`}>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-xs">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search plate, unit code, operator, location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white placeholder-slate-500", "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400")}`}
                            />
                        </div>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ViolationType | "All")} className={`border rounded-xl px-4 py-2.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800")}`}>
                            <option value="All">All Violation Types</option>
                            <option value={ViolationType.overload}>Overcapacity Only</option>
                            <option value={ViolationType.overspeed}>Overspeeding Only</option>
                        </select>
                        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as TimeFilter)} className={`border rounded-xl px-4 py-2.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800")}`}>
                            <option value="All">All Time</option>
                            <option value="Today">Today</option>
                            <option value="This Week">This Week</option>
                            <option value="This Month">This Month</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex flex-col items-end">
                            <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Selected Items</span>
                            <span className={`text-sm font-black ${t("text-white", "text-slate-800")}`}>{selectedIds.size}</span>
                        </div>
                        <button onClick={exportSelected} disabled={selectedIds.size === 0} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg">
                            Batch Export
                        </button>
                    </div>
                </div>

                {/* Table - Using HTML table for perfect alignment */}
                <div className="flex-1 overflow-hidden p-4">
                    <div className={`h-full rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${t("bg-[#1e293b] border-slate-700 shadow-xl", "bg-white border-slate-200 shadow-sm")}`}>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full">
                                <thead className={`sticky top-0 z-10 ${t("bg-slate-800/50", "bg-blue-50")}`}>
                                    <tr className={`border-b-2 text-[10px] font-extrabold tracking-widest uppercase transition-colors duration-300 ${t("border-slate-700 text-slate-400", "border-blue-200 text-slate-600")}`}>
                                        <th className="w-12 px-3 py-3 text-center">
                                            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className={`rounded border-slate-400 text-blue-600 focus:ring-blue-500 ${t("bg-slate-900 border-slate-700", "bg-white")}`} />
                                        </th>
                                        <th className="px-3 py-3 text-left">ID</th>
                                        <th className="w-24 px-3 py-3 text-center">Unit Code</th>
                                        <th className="w-28 px-3 py-3 text-center">Plate No.</th>
                                        <th className="px-3 py-3 text-left">Driver</th>
                                        <th className="px-3 py-3 text-left">Operator</th>
                                        <th className="w-28 px-3 py-3 text-center">Route</th>
                                        <th className="w-28 px-3 py-3 text-center">Type</th>
                                        <th className="px-3 py-3 text-left">Location</th>
                                        <th className="w-24 px-3 py-3 text-center">Time</th>
                                        <th className="w-20 px-3 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading && violations.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="h-64">
                                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                                    <RefreshCw className="w-12 h-12 animate-spin opacity-30" />
                                                    <p className="text-xs font-bold uppercase tracking-widest">Fetching violations...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredViolations.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="h-64">
                                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                                    <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                    </svg>
                                                    <div className="text-center">
                                                        <p className={`font-bold ${t("text-slate-500", "text-slate-500")}`}>No violations found</p>
                                                        <p className="text-xs">Violations will appear here</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredViolations.map((v) => {
                                            const isOverload = v.type === ViolationType.overload;
                                            const isRowSelected = snapshotViolation?.id === v.id;
                                            const isBadgeSelected = selectedViolation?.id === v.id;
                                            const isChecked = selectedIds.has(v.id);

                                            const hasFront = Boolean(v.imageUrlFront);
                                            const hasRear = Boolean(v.imageUrlRear);
                                            const hasLegacy = Boolean(v.imageUrl) && !hasFront && !hasRear;
                                            const camCount = (hasFront ? 1 : 0) + (hasRear ? 1 : 0) + (hasLegacy ? 1 : 0);

                                            return (
                                                <tr
                                                    key={v.id}
                                                    id={`violation-row-${v.id}`}
                                                    onClick={() => setSnapshotViolation(v)}
                                                    className={`cursor-pointer transition-all duration-200 border-b ${t("border-slate-800 hover:bg-slate-800/40", "border-slate-100 hover:bg-slate-50")}
                                                        ${highlightId === v.id ? "bg-emerald-500/20" : ""}
                                                        ${isRowSelected ? t("bg-blue-900/40", "bg-blue-50 shadow-inner") : ""}
                                                        ${isBadgeSelected ? "ring-2 ring-blue-500 ring-inset" : ""}`}
                                                >
                                                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(v.id)} className={`rounded border-slate-400 text-blue-600 focus:ring-blue-500 ${t("bg-slate-900 border-slate-700", "bg-white")}`} />
                                                    </td>
                                                    <td className={`px-3 py-3 text-[10px] font-mono font-bold ${t("text-slate-400", "text-slate-700")}`}>
                                                        <div className="flex items-center gap-1.5">
                                                            {v.id}
                                                            {isOverload && camCount > 0 && (
                                                                <span className={`shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-bold ${t("bg-slate-700 text-slate-400", "bg-slate-100 text-slate-500")}`}>
                                                                    <Camera size={7} />{camCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`inline-block px-2 py-1 text-[10px] font-black rounded border ${t("bg-indigo-900/30 text-indigo-400 border-indigo-800/50", "bg-indigo-50 text-indigo-700 border-indigo-200")}`}>
                                                            {v.unitId}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`inline-block px-2 py-1 text-[10px] font-black rounded border ${t("bg-slate-700/60 text-slate-200 border-slate-600", "bg-slate-100 text-slate-800 border-slate-300")}`}>
                                                            {v.plateNumber}
                                                        </span>
                                                    </td>
                                                    <td className={`px-3 py-3 text-[11px] font-semibold ${t("text-slate-300", "text-slate-700")}`}>
                                                        {v.driverName || <span className="text-slate-400 italic text-[10px]">Unknown</span>}
                                                    </td>
                                                    <td className={`px-3 py-3 text-[11px] font-semibold ${t("text-slate-300", "text-slate-700")}`}>
                                                        {v.operator}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded border ${t("bg-blue-900/20 text-blue-400 border border-blue-800/50", "bg-blue-100 text-blue-700")}`}>
                                                            {v.route}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedViolation(v); }}
                                                            className={`hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-1 px-2 py-1 text-[9px] font-black rounded border uppercase whitespace-nowrap ${isOverload ? t("bg-rose-900/30 text-rose-400 border-rose-800/50 hover:bg-rose-900/50", "bg-red-50 text-red-600 border-red-200 hover:bg-red-100") : t("bg-amber-900/30 text-amber-500 border-amber-800/50 hover:bg-amber-900/50", "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100")}`}
                                                        >
                                                            {isOverload ? "Overcapacity" : "Overspeed"}
                                                        </button>
                                                    </td>
                                                    <td className={`px-3 py-3 text-[10px] font-medium ${t("text-slate-400", "text-slate-600")}`}>
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-2.5 h-2.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            </svg>
                                                            {typeof v.location === "string" ? v.location.split(",")[0] : "Unknown Location"}
                                                        </div>
                                                    </td>
                                                    <td className={`px-3 py-3 text-center text-[10px] font-bold ${t("text-slate-500", "text-slate-500")}`}>
                                                        {format(v.timestamp, "MM/dd HH:mm")}
                                                    </td>
                                                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => setSnapshotViolation(v)}
                                                            className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${t("text-indigo-400 hover:bg-slate-700", "text-blue-600 hover:bg-blue-50")}`}
                                                            title="View Snapshot"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
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

            {snapshotViolation && (
                <SnapshotPanel violation={snapshotViolation} onClose={() => setSnapshotViolation(null)} onUpdate={markAsResolved} isDark={isDark} />
            )}
            {selectedViolation && (
                <DetailsPanel isDark={isDark} violation={selectedViolation} onClose={() => setSelectedViolation(null)} onGenerateReport={generateReport} onMarkResolved={(v) => setResolveConfirm(v)} />
            )}

            {resolveConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 z-[3000] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`rounded-3xl p-8 w-full max-w-sm shadow-2xl ${t("bg-slate-900 border border-slate-700", "bg-white")}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-2xl ${t("bg-emerald-900/30 text-emerald-400 border border-emerald-900/50", "bg-green-100 text-green-600")}`}>
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className={`text-xl font-black tracking-tight ${t("text-white", "text-slate-800")}`}>Confirm Resolution</h2>
                        </div>
                        <p className={`mb-8 text-sm font-medium leading-relaxed ${t("text-slate-400", "text-slate-600")}`}>
                            The violation for unit <span className="font-bold text-indigo-400">{resolveConfirm.unitId}</span> — plate <span className="font-bold text-blue-500">{resolveConfirm.plateNumber}</span> will be marked as resolved.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setResolveConfirm(null)} className={`px-6 py-3 rounded-xl font-bold transition duration-200 text-sm ${t("text-slate-500 hover:bg-slate-800 hover:text-white", "text-slate-600 hover:bg-slate-100")}`}>Cancel</button>
                            <button onClick={() => markAsResolved(resolveConfirm)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-200 text-sm shadow-lg shadow-emerald-500/20 active:scale-95">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[3000] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border-2 backdrop-blur-xl ${t("bg-emerald-500/20 border-emerald-500/50 text-emerald-400", "bg-white border-emerald-200 text-emerald-800")}`}>
                        <div className="p-2 rounded-xl bg-emerald-500"><CheckCircle size={20} className="text-white" strokeWidth={3} /></div>
                        <div className="flex flex-col">
                            <p className="text-[11px] font-black uppercase tracking-wider">Violation Resolved</p>
                            <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">The infraction has been confirmed and archived</p>
                        </div>
                        <button onClick={() => setShowSuccessModal(false)} className="ml-4 p-1 hover:bg-black/10 rounded-full transition-colors"><X size={14} strokeWidth={3} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Dual-camera gallery ───────────────────────────────────────────────────────

function DualCameraGallery({ imageUrlFront, imageUrlRear, imageUrlLegacy, isDark, compact = false }: {
    imageUrlFront?: string; imageUrlRear?: string; imageUrlLegacy?: string; isDark: boolean; compact?: boolean;
}) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    const [fullscreen, setFullscreen] = useState<{ url: string; label: string } | null>(null);

    const front    = imageUrlFront || (!imageUrlRear && imageUrlLegacy ? imageUrlLegacy : undefined);
    const rear     = imageUrlRear;
    const hasFront = Boolean(front);
    const hasRear  = Boolean(rear);
    const hasBoth  = hasFront && hasRear;
    const hasAny   = hasFront || hasRear;

    if (!hasAny) return null;
    const imgH = compact ? "h-32" : "h-48";

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Camera size={14} className="text-slate-400" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Evidence {hasBoth ? "Images" : "Image"}</p>
                    </div>
                    <span className="text-[8px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-500 font-bold uppercase">
                        {hasBoth ? "Both Cameras" : hasFront ? "Front Camera" : "Rear Camera"}
                    </span>
                </div>
                <div className={`grid gap-2 ${hasBoth ? "grid-cols-2" : "grid-cols-1"}`}>
                    {hasFront && (
                        <div onClick={() => setFullscreen({ url: front!, label: "Front Camera" })} className="relative group cursor-pointer overflow-hidden rounded-xl shadow-md">
                            <img src={front} alt="Front camera" className={`w-full ${imgH} object-cover transition-transform duration-500 group-hover:scale-105`} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-md rounded-full p-2"><ZoomIn size={16} className="text-white" /></div>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 text-[8px] text-white font-black tracking-widest flex items-center gap-1"><Camera size={7} /> FRONT</div>
                        </div>
                    )}
                    {hasRear && (
                        <div onClick={() => setFullscreen({ url: rear!, label: "Rear Camera" })} className="relative group cursor-pointer overflow-hidden rounded-xl shadow-md">
                            <img src={rear} alt="Rear camera" className={`w-full ${imgH} object-cover transition-transform duration-500 group-hover:scale-105`} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-md rounded-full p-2"><ZoomIn size={16} className="text-white" /></div>
                            </div>
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 text-[8px] text-white font-black tracking-widest flex items-center gap-1"><Camera size={7} /> REAR</div>
                        </div>
                    )}
                </div>
            </div>
            {fullscreen && (
                <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setFullscreen(null)}>
                    <div className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute -top-10 left-0 bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 text-white text-xs font-bold flex items-center gap-2"><Camera size={12} />{fullscreen.label}</div>
                        <img src={fullscreen.url} alt={fullscreen.label} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
                        <button onClick={() => setFullscreen(null)} className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"><X size={24} /></button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-xs font-medium flex items-center gap-2"><ZoomIn size={14} />Click anywhere to close</div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Snapshot Panel ────────────────────────────────────────────────────────────

function SnapshotPanel({ violation: v, onClose, onUpdate, isDark }: {
    violation: Violation; onClose: () => void; onUpdate: (v: Violation) => void; isDark: boolean;
}) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    const isOverload = v.type === ViolationType.overload;
    const [uploading, setUploading] = useState<"front" | "rear" | null>(null);
    const [frontPreview, setFrontPreview] = useState<string | undefined>(v.imageUrlFront || (!v.imageUrlRear ? v.imageUrl : undefined));
    const [rearPreview,  setRearPreview]  = useState<string | undefined>(v.imageUrlRear);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, camera: "front" | "rear") => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
        if (file.size > 5 * 1024 * 1024) { alert("Image must be less than 5MB"); return; }
        setUploading(camera);
        try {
            const data = await uploadViolationImage(v.id, isOverload ? "overcapacity" : "overspeeding", file, camera);
            if (data.success) {
                if (camera === "front") { setFrontPreview(data.imageUrl); v.imageUrlFront = data.imageUrl; }
                else { setRearPreview(data.imageUrl); v.imageUrlRear = data.imageUrl; }
            } else { alert("Upload failed: " + data.error); }
        } catch { alert("Failed to upload image"); }
        finally { setUploading(null); }
    };

    return (
        <div className={`w-[380px] shrink-0 border-l flex flex-col shadow-2xl transition-all duration-300 animate-in slide-in-from-right ${t("bg-slate-900 border-slate-800", "bg-white border-slate-200")}`}>
            <div className={`px-6 py-6 flex items-center justify-between border-b ${t("border-slate-800", "border-slate-100")}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isOverload ? t("bg-rose-500/20 text-rose-500", "bg-red-50 text-red-600") : t("bg-amber-500/20 text-amber-500", "bg-orange-50 text-orange-600")}`}>
                        <AlertTriangle className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-widest ${t("text-white", "text-slate-800")}`}>Infraction Snapshot</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">{v.id}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Incident Details</h4>
                    <div className={`p-4 rounded-2xl space-y-2 ${t("bg-slate-800/40", "bg-slate-50")}`}>
                        <MetricRow isDark={isDark} label="Unit Code"   value={v.unitId}      bold />
                        <MetricRow isDark={isDark} label="Plate No."   value={v.plateNumber} bold />
                        <MetricRow isDark={isDark} label="Driver" value={v.driverName || "Unknown"} bold />
                        <MetricRow isDark={isDark} label="Time"        value={format(v.timestamp, "hh:mm a")} />
                        <MetricRow isDark={isDark} label="Location"    value={typeof v.location === "string" ? v.location.split(",")[0] : "Unknown"} />
                        <MetricRow isDark={isDark} label="Operator"    value={v.operator} />
                    </div>
                </div>
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Infraction Metrics</h4>
                    <div className={`p-4 rounded-2xl space-y-2 ${t("bg-slate-800/40", "bg-slate-50")}`}>
                        {isOverload ? (
                            <>
                                <MetricRow isDark={isDark} label="Passenger Count" value={`${v.details.passengers} pax`} bold accent="text-rose-500" />
                                <MetricRow isDark={isDark} label="Capacity Limit"  value={`${v.details.capacity} pax`} />
                                <div className="pt-2 border-t border-slate-700/50" />
                                <MetricRow isDark={isDark} label="Sitting"  value={`${v.details.sitting} / ${v.details.sittingCapacity}`} />
                                <MetricRow isDark={isDark} label="Standing" value={`${v.details.standing} / ${v.details.standingCapacity}`} />
                                {v.details.breachTypes && v.details.breachTypes.length > 0 && (
                                    <MetricRow isDark={isDark} label="Breach Type" value={v.details.breachTypes.join(", ")} bold accent="text-rose-500" />
                                )}
                            </>
                        ) : (
                            <>
                                <MetricRow isDark={isDark} label="Detected Speed" value={`${v.details.speed} km/h`} bold accent="text-amber-500" />
                                <MetricRow isDark={isDark} label="Speed Limit"    value={`${v.details.limit} km/h`} />
                            </>
                        )}
                    </div>
                </div>
                {isOverload && <DualCameraGallery imageUrlFront={frontPreview} imageUrlRear={rearPreview} isDark={isDark} compact />}
                {isOverload && (
                    <div className={`p-4 rounded-2xl space-y-3 ${t("bg-slate-800/40", "bg-slate-50")}`}>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upload / Replace Images</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {(["front", "rear"] as const).map((cam) => (
                                <label key={cam} className={`cursor-pointer px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all border ${uploading === cam ? t("bg-slate-700 border-slate-600 text-slate-400", "bg-slate-200 border-slate-300 text-slate-400") : t("bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30", "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100")}`}>
                                    {uploading === cam ? "Uploading…" : `📷 ${cam} cam`}
                                    <input type="file" accept="image/*" className="hidden" disabled={Boolean(uploading)} onChange={(e) => handleUpload(e, cam)} />
                                </label>
                            ))}
                        </div>
                        <p className="text-[9px] text-slate-400">JPG, PNG, WebP · Max 5 MB each</p>
                    </div>
                )}
                <button onClick={() => onUpdate(v)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest">
                    <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />Mark as Resolved
                </button>
            </div>
        </div>
    );
}

// ── Details Panel ─────────────────────────────────────────────────────────────

function DetailsPanel({ violation: v, onClose, onGenerateReport, onMarkResolved, isDark }: {
    violation: Violation; onClose: () => void;
    onGenerateReport: (v: Violation) => void; onMarkResolved: (v: Violation) => void; isDark: boolean;
}) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    const isOverload = v.type === ViolationType.overload;
    const [uploading, setUploading] = useState<"front" | "rear" | null>(null);
    const [frontPreview, setFrontPreview] = useState<string | undefined>(v.imageUrlFront || (!v.imageUrlRear ? v.imageUrl : undefined));
    const [rearPreview,  setRearPreview]  = useState<string | undefined>(v.imageUrlRear);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, camera: "front" | "rear") => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { alert("Please upload an image file"); return; }
        if (file.size > 5 * 1024 * 1024) { alert("Image must be less than 5MB"); return; }
        setUploading(camera);
        try {
            const data = await uploadViolationImage(v.id, isOverload ? "overcapacity" : "overspeeding", file, camera);
            if (data.success) {
                if (camera === "front") { setFrontPreview(data.imageUrl); v.imageUrlFront = data.imageUrl; }
                else { setRearPreview(data.imageUrl); v.imageUrlRear = data.imageUrl; }
            } else { alert("Upload failed: " + data.error); }
        } catch { alert("Failed to upload image"); }
        finally { setUploading(null); }
    };

    const headerText   = isOverload ? t("text-rose-400", "text-red-500")  : t("text-amber-500", "text-orange-500 font-bold");
    const headerIconBg = isOverload ? t("bg-rose-500/20", "bg-red-50")    : t("bg-amber-500/20", "bg-orange-50");

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className={`w-full max-w-[520px] rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${t("bg-slate-900", "bg-white")}`}>
                <div className={`px-8 py-8 flex items-start justify-between border-b ${t("border-slate-800", "border-slate-100")}`}>
                    <div className="flex items-center gap-5">
                        <div className={`${headerIconBg} p-4 rounded-[24px] shadow-sm border ${t("border-rose-500/20", "border-red-100")}`}>
                            <svg className={`w-10 h-10 ${headerText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isOverload ? "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                            </svg>
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black tracking-tight leading-none ${t("text-white", "text-slate-800 uppercase")}`}>{isOverload ? "Overcapacity" : "Overspeeding"}</h2>
                            <p className="text-slate-400 text-sm font-medium mt-2">{format(v.timestamp, "MMMM dd, yyyy 'at' hh:mm a")}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="w-6 h-6" strokeWidth={3} />
                    </button>
                </div>
                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Unit Code</p>
                            <p className={`text-xl font-black ${t("text-indigo-400", "text-indigo-700")}`}>{v.unitId}</p>
                        </div>
                        <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Plate Number</p>
                            <p className={`text-xl font-black ${t("text-white", "text-slate-800")}`}>{v.plateNumber}</p>
                        </div>
                        <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Driver</p>
                            <p className={`text-xl font-black ${t("text-white", "text-slate-800")}`}>{v.driverName || "Unknown"}</p>
                        </div>
                    </div>
                    <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">{isOverload ? "Capacity Info" : "Detected Speed"}</p>
                        <p className={`text-xl font-black ${t("text-white", "text-slate-800")}`}>{isOverload ? `${v.details.passengers}/${v.details.capacity} pax` : `${v.details.speed} km/h`}</p>
                    </div>
                    {isOverload && (
                        <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">Sitting</p>
                                    <p className={`text-base font-black ${t("text-slate-200", "text-slate-700")}`}>{v.details.sitting} <span className="text-xs text-slate-400">/ {v.details.sittingCapacity}</span></p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">Standing</p>
                                    <p className={`text-base font-black ${t("text-slate-200", "text-slate-700")}`}>{v.details.standing} <span className="text-xs text-slate-400">/ {v.details.standingCapacity}</span></p>
                                </div>
                            </div>
                            {v.details.breachTypes && v.details.breachTypes.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-200/20">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Breach Types</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {v.details.breachTypes.map((bt) => (
                                            <span key={bt} className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase">{bt.replace("_", " ")}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Location</p>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                            </div>
                            <p className={`text-base font-bold ${t("text-slate-200", "text-slate-700")}`}>{v.location}</p>
                        </div>
                    </div>
                    {isOverload && (
                        <div className="space-y-3">
                            <DualCameraGallery imageUrlFront={frontPreview} imageUrlRear={rearPreview} isDark={isDark} />
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                {(["front", "rear"] as const).map((cam) => (
                                    <label key={cam} className={`cursor-pointer px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all border ${uploading === cam ? t("bg-slate-700 border-slate-600 text-slate-400", "bg-slate-200 border-slate-300 text-slate-400") : t("bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30", "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100")}`}>
                                        {uploading === cam ? "Uploading…" : `📷 ${cam} cam`}
                                        <input type="file" accept="image/*" className="hidden" disabled={Boolean(uploading)} onChange={(e) => handleUpload(e, cam)} />
                                    </label>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-400">JPG, PNG, WebP · Max 5 MB each</p>
                        </div>
                    )}
                    <div className="flex items-center justify-between px-2 pt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                            <span className="text-xs font-black text-amber-600 uppercase tracking-widest italic">{v.status}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 tracking-tighter">ID: {v.id}</p>
                    </div>
                    <div className="flex gap-4 pt-6">
                        <button onClick={() => onMarkResolved(v)} className="flex-1 h-14 bg-[#10b981] hover:bg-[#059669] text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm">
                            Verify Violation
                        </button>
                        <button onClick={onClose} className="flex-1 h-14 bg-[#1e293b] hover:bg-[#0f172a] text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 text-sm">
                            Dismiss
                        </button>
                    </div>
                    <button onClick={() => onGenerateReport(v)} className="w-full text-center text-slate-400 hover:text-blue-500 text-[10px] font-black uppercase tracking-widest pt-2 transition-colors">
                        Generate Formal Incident PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

function StatChip({ label, count, color, icon, isDark }: { label: string; count: number; color: "blue" | "red" | "orange"; icon: React.ReactNode; isDark: boolean }) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    const colors = {
        blue:   { bg: t("bg-blue-900/20 border-blue-900/30",   "bg-blue-50 border-blue-200"),    icon: t("bg-blue-900/40 text-blue-400",   "bg-blue-100 text-blue-600"),   text: t("text-blue-400",   "text-blue-700"),   sub: t("text-blue-500/70",   "text-blue-500")   },
        red:    { bg: t("bg-rose-900/20 border-rose-900/30",    "bg-red-50 border-red-200"),       icon: t("bg-rose-900/40 text-rose-400",   "bg-red-100 text-red-600"),     text: t("text-rose-400",   "text-red-700"),    sub: t("text-rose-500/70",   "text-red-500")    },
        orange: { bg: t("bg-amber-900/20 border-amber-900/30",  "bg-orange-50 border-orange-200"), icon: t("bg-amber-900/40 text-amber-500", "bg-orange-100 text-orange-600"), text: t("text-amber-500", "text-orange-700"), sub: t("text-amber-500/70", "text-orange-500") },
    }[color];
    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${colors.bg}`}>
            <div className={`p-2.5 rounded-xl shadow-inner ${colors.icon}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
            </div>
            <div>
                <div className={`text-2xl font-black leading-none tracking-tight ${colors.text}`}>{count}</div>
                <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${colors.sub}`}>{label}</div>
            </div>
        </div>
    );
}

function MetricRow({ label, value, bold, accent, isDark }: { label: string; value: string; bold?: boolean; accent?: string; isDark: boolean }) {
    return (
        <div className={`flex items-center justify-between py-1 ${isDark ? "border-b border-white/5" : "border-b border-black/5"} last:border-0`}>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
            <span className={`text-xs font-black ${bold ? accent : isDark ? "text-slate-200" : "text-slate-700"}`}>{value}</span>
        </div>
    );
}