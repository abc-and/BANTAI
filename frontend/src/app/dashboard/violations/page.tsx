"use client";
import { useState } from "react";
import { format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";
import { AlertTriangle, ShieldCheck } from "lucide-react";

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
    repeatOffenseCount: number;
    resolvedDate?: Date;
    details: {
        passengers?: number;
        capacity?: number;
        speed?: number;
        limit?: number;
    };
}

interface ViolationsManagementProps {
    violations: Violation[];
    onUpdate: () => void;
}

// ─── Sample data for standalone use ──────────────────────────────────────────

const SAMPLE_VIOLATIONS: Violation[] = [
    {
        id: "VIO-2024-0041",
        type: ViolationType.overload,
        status: ViolationStatus.verified,
        unitId: "PUJ-1234",
        operator: "Metro Transport",
        route: "Route A",
        location: "Mandaue City Hall",
        lat: 10.3285,
        lng: 123.9422,
        timestamp: new Date(Date.now() - 2 * 3600000),
        repeatOffenseCount: 3,
        details: { passengers: 25, capacity: 20 },
    },
    {
        id: "VIO-2024-0042",
        type: ViolationType.overspeed,
        status: ViolationStatus.verified,
        unitId: "BUS-5678",
        operator: "Cebu Bus Lines",
        route: "Route B",
        location: "Cebu North Bus Terminal",
        lat: 10.3385,
        lng: 123.9022,
        timestamp: new Date(Date.now() - 5 * 3600000),
        repeatOffenseCount: 0,
        details: { speed: 85, limit: 60 },
    },
    {
        id: "VIO-2024-0043",
        type: ViolationType.overload,
        status: ViolationStatus.verified,
        unitId: "JEEP-7890",
        operator: "City Transit",
        route: "Route C",
        location: "SM City Cebu",
        lat: 10.3185,
        lng: 123.9122,
        timestamp: new Date(Date.now() - 8 * 3600000),
        repeatOffenseCount: 1,
        details: { passengers: 28, capacity: 22 },
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ViolationsManagement({
    violations: externalViolations,
    onUpdate,
}: Partial<ViolationsManagementProps>) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const t = (dark: string, light: string) => (isDark ? dark : light);

    const [violations, setViolations] = useState<Violation[]>(
        externalViolations ?? SAMPLE_VIOLATIONS
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<ViolationType | "All">("All");
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
    const [snapshotViolation, setSnapshotViolation] = useState<Violation | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [resolveConfirm, setResolveConfirm] = useState<Violation | null>(null);

    // Only show verified violations (not detected/resolved/dismissed)
    const filteredViolations = violations.filter((v) => {
        if (
            v.status === ViolationStatus.detected ||
            v.status === ViolationStatus.resolved ||
            v.status === ViolationStatus.dismissed
        )
            return false;
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
        return true;
    });

    const totalVerified = filteredViolations.length;
    const totalOverload = filteredViolations.filter((v) => v.type === ViolationType.overload).length;
    const totalOverspeed = filteredViolations.filter((v) => v.type === ViolationType.overspeed).length;

    const allSelected =
        selectedIds.size === filteredViolations.length && filteredViolations.length > 0;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredViolations.map((v) => v.id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const markAsResolved = (v: Violation) => {
        setViolations((prev) =>
            prev.map((vio) =>
                vio.id === v.id
                    ? { ...vio, status: ViolationStatus.resolved, resolvedDate: new Date() }
                    : vio
            )
        );
        setSelectedViolation(null);
        setSnapshotViolation(null);
        setResolveConfirm(null);
        onUpdate?.();
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
          .repeat-box { background: #fee2e2; border: 2px solid #b91c1c; padding: 12px; margin: 8px 0; font-size: 10px; }
          .legal { font-size: 9px; line-height: 1.6; text-align: justify; }
          .footer { border-top: 1px solid #9ca3af; margin-top: 30px; padding-top: 16px; display: flex; justify-content: space-between; font-size: 9px; }
          .sig-line { border-top: 1px solid #000; width: 200px; padding-top: 4px; margin-top: 40px; }
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
        <div class="row"><div class="label">Unit Identification Number:</div><div>${v.unitId}</div></div>
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
          <div class="excess-box"><strong>EXCESS PASSENGERS:</strong> ${excessLabel} (${(((v.details.passengers ?? 0) - (v.details.capacity ?? 0)) / (v.details.capacity ?? 1) * 100).toFixed(1)}% over capacity)</div>
        `
                : `
          <div class="row"><div class="label">Posted Speed Limit:</div><div>${v.details.limit} km/h</div></div>
          <div class="row"><div class="label">Detected Vehicle Speed:</div><div>${v.details.speed} km/h</div></div>
          <div class="excess-box"><strong>EXCESS SPEED:</strong> ${excessLabel} (${(((v.details.speed ?? 0) - (v.details.limit ?? 0)) / (v.details.limit ?? 1) * 100).toFixed(1)}% over limit)</div>
        `
            }
 
        ${v.repeatOffenseCount > 0
                ? `<div class="repeat-box"><strong>⚠ REPEAT OFFENDER ALERT</strong><br/>This operator has ${v.repeatOffenseCount} prior recorded violation(s). Enhanced penalties may apply per local ordinances.</div>`
                : ""
            }
 
        <h2>IV. REGULATORY ACTION</h2>
        <p class="legal">This incident report serves as official documentation of a public transport regulation violation. The operator is hereby notified of this violation and may be subject to penalties as prescribed under local ordinances and Republic Act No. 4136 (Land Transportation and Traffic Code).</p>
        <p class="legal">The operator has the right to contest this violation by filing an appeal with the Public Transport Regulation Office within fifteen (15) working days from receipt of this report.</p>
 
        <div class="footer">
          <div><div class="sig-line">Authorized Officer<br/>Public Transport Regulation Office</div></div>
          <div><div class="sig-line">Date</div></div>
        </div>
        <div style="font-size:8px; color:#6b7280; margin-top:16px;">Document authenticity can be verified at: www.mandaue.gov.ph/verify</div>
      </body>
      </html>
    `;

        const win = window.open("", "_blank");
        if (win) {
            win.document.write(html);
            win.document.close();
            win.print();
        }
    };

    const exportSelected = () => {
        const selected = violations.filter((v) => selectedIds.has(v.id));
        selected.forEach((v) => generateReport(v));
    };

    return (
        <div className={`flex h-full transition-colors duration-300 ${t("bg-[#0f172a]", "bg-slate-50")}`}>
            {/* Main panel */}
            <div className="flex flex-col flex-1 min-w-0">

                {/* ✅ NEW HEADER (CENTERED, NO BLUE) */}
                <div className={`px-4 border-b ${t("bg-[#0f172a] border-slate-800", "bg-white border-slate-200")}`}>
                    <div className="max-w-[1600px] mx-auto py-6 flex flex-col items-center justify-center text-center">
                        <h1 className={`text-xl font-black tracking-tight uppercase ${t("text-white", "text-slate-800")}`}>
                            Violations Management
                        </h1>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${t("text-slate-400", "text-slate-500")}`}>
                            Verified Incidents & Report Generation
                        </p>
                    </div>
                </div>

                {/* Stats bar (UNCHANGED) */}
                <div className={`border-b px-4 py-3 grid grid-cols-3 gap-3 transition-colors duration-300 ${t("bg-[#1e293b] border-slate-700", "bg-slate-100 border-slate-200")}`}>
                    <StatChip isDark={isDark} label="Total Verified" count={totalVerified} color="blue" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />} />
                    <StatChip isDark={isDark} label="Overcapacity" count={totalOverload} color="red" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />} />
                    <StatChip isDark={isDark} label="Overspeeding" count={totalOverspeed} color="orange" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />} />
                </div>

                {/* ✅ UPDATED CONTROL BAR */}
                <div className={`border-b px-4 py-3 flex items-center gap-3 transition-colors duration-300 ${t("bg-[#1e293b]/50 border-slate-700", "bg-white border-slate-200")}`}>

                    {/* LEFT */}
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-xs">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by Plate, Operator or Location..."
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
                            <option value="All">All Violation Types</option>
                            <option value={ViolationType.overload}>Overcapacity Only</option>
                            <option value={ViolationType.overspeed}>Overspeeding Only</option>
                        </select>
                    </div>

                    {/* RIGHT (MOVED HERE) */}
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex flex-col items-end">
                            <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">
                                Selected Items
                            </span>
                            <span className={`text-sm font-black ${t("text-white", "text-slate-800")}`}>
                                {selectedIds.size}
                            </span>
                        </div>

                        <button
                            onClick={exportSelected}
                            disabled={selectedIds.size === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg"
                        >
                            Batch Export
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-hidden p-4">
                    <div className={`h-full rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${t("bg-[#1e293b] border-slate-700 shadow-xl", "bg-white border-slate-200 shadow-sm")}`}>
                        {/* Table header */}
                        <div className={`grid grid-cols-[36px_1fr_80px_140px_70px_110px_1fr_90px_80px] gap-0 px-3 py-3 border-b-2 text-[10px] font-extrabold tracking-widest uppercase transition-colors duration-300 ${t("bg-slate-800/50 border-slate-700 text-slate-400", "bg-blue-50 border-blue-200 text-slate-600")}`}>
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className={`rounded border-slate-400 text-blue-600 focus:ring-blue-500 ${t("bg-slate-900 border-slate-700", "bg-white")}`}
                                />
                            </div>
                            <div>ID</div>
                            <div className="text-center">Unit</div>
                            <div>Operator</div>
                            <div className="text-center">Route</div>
                            <div className="text-center">Type</div>
                            <div>Location</div>
                            <div className="text-center">Time</div>
                            <div className="text-center">Actions</div>
                        </div>

                        {/* Table body */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredViolations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <div className="text-center">
                                        <p className={`font-bold ${t("text-slate-500", "text-slate-500")}`}>No verified violations</p>
                                        <p className="text-xs">Verified violations will appear here</p>
                                    </div>
                                </div>
                            ) : (
                                filteredViolations.map((v) => {
                                    const isOverload = v.type === ViolationType.overload;
                                    const isRowSelected = snapshotViolation?.id === v.id;
                                    const isBadgeSelected = selectedViolation?.id === v.id;
                                    const isChecked = selectedIds.has(v.id);

                                    return (
                                        <div
                                            key={v.id}
                                            onClick={() => setSnapshotViolation(v)}
                                            className={`grid grid-cols-[36px_1fr_80px_140px_70px_110px_1fr_90px_80px] gap-0 px-3 py-3 border-b transition-all duration-200 cursor-pointer ${t("border-slate-800 hover:bg-slate-800/40", "border-slate-100 hover:bg-slate-50")} ${isRowSelected ? t("bg-blue-900/40 border-l-4 border-l-blue-500 pl-2", "bg-blue-50 shadow-inner") : ""} ${isBadgeSelected ? "ring-2 ring-blue-500 ring-inset" : ""}`}
                                        >
                                            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleSelect(v.id)}
                                                    className={`rounded border-slate-400 text-blue-600 focus:ring-blue-500 ${t("bg-slate-900 border-slate-700", "bg-white")}`}
                                                />
                                            </div>
                                            <div className={`flex items-center text-[10px] font-mono font-bold truncate pr-2 ${t("text-slate-400", "text-slate-700")}`}>{v.id}</div>
                                            <div className="flex items-center justify-center">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded border truncate max-w-[68px] ${t("bg-indigo-900/30 text-indigo-400 border-indigo-800/50", "bg-blue-900/10 text-blue-900 border-blue-900/20")}`}>{v.unitId}</span>
                                            </div>
                                            <div className={`flex items-center text-[11px] font-semibold truncate pr-2 ${t("text-slate-300", "text-slate-700")}`}>{v.operator}</div>
                                            <div className="flex items-center justify-center">
                                                <span className={`px-2 py-1 text-[10px] font-bold rounded truncate max-w-[58px] ${t("bg-blue-900/20 text-blue-400 border border-blue-800/50", "bg-blue-100 text-blue-700")}`}>{v.route}</span>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedViolation(v);
                                                    }}
                                                    className={`hover:scale-105 active:scale-95 transition-all flex items-center gap-1 px-2 py-1 text-[9px] font-black rounded border uppercase ${isOverload ? t("bg-rose-900/30 text-rose-400 border-rose-800/50 hover:bg-rose-900/50", "bg-red-50 text-red-600 border-red-200 hover:bg-red-100") : t("bg-amber-900/30 text-amber-500 border-amber-800/50 hover:bg-amber-900/50", "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100")}`}
                                                    title="Open Ticket"
                                                >
                                                    {isOverload ? "Overload" : "Overspeed"}
                                                </button>
                                            </div>
                                            <div className={`flex items-center gap-1 text-[10px] font-medium truncate pr-2 ${t("text-slate-400", "text-slate-600")}`}>
                                                <svg className="w-2.5 h-2.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                </svg>
                                                {v.location.split(",")[0]}
                                            </div>
                                            <div className={`flex items-center justify-center text-[10px] font-bold ${t("text-slate-500", "text-slate-500")}`}>{format(v.timestamp, "MM/dd HH:mm")}</div>
                                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Snapshot Sidebar */}
            {snapshotViolation && (
                <SnapshotPanel
                    violation={snapshotViolation}
                    onClose={() => setSnapshotViolation(null)}
                    onUpdate={markAsResolved}
                    isDark={isDark}
                />
            )}

            {/* Ticket Modal */}
            {selectedViolation && (
                <DetailsPanel
                    isDark={isDark}
                    violation={selectedViolation}
                    onClose={() => setSelectedViolation(null)}
                    onGenerateReport={generateReport}
                    onMarkResolved={(v) => setResolveConfirm(v)}
                />
            )}

            {/* Resolve confirmation dialog */}
            {resolveConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 z-[3000] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`rounded-3xl p-8 w-full max-w-sm shadow-2xl scale-in-center ${t("bg-slate-900 border border-slate-700", "bg-white")}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-2xl ${t("bg-emerald-900/30 text-emerald-400 border border-emerald-900/50", "bg-green-100 text-green-600")}`}>
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className={`text-xl font-black tracking-tight ${t("text-white", "text-slate-800")}`}>Confirm Resolution</h2>
                        </div>
                        <p className={`mb-8 text-sm font-medium leading-relaxed ${t("text-slate-400", "text-slate-600")}`}>
                            The violation for unit <span className="font-bold text-blue-500">{resolveConfirm.unitId}</span> will be marked as resolved and moved to history records.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setResolveConfirm(null)} className={`px-6 py-3 rounded-xl font-bold transition duration-200 text-sm ${t("text-slate-500 hover:bg-slate-800 hover:text-white", "text-slate-600 hover:bg-slate-100")}`}>Cancel</button>
                            <button
                                onClick={() => markAsResolved(resolveConfirm)}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-200 text-sm shadow-lg shadow-emerald-500/20 active:scale-95"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Snapshot Sidebar Panel ───────────────────────────────────────────────────

function SnapshotPanel({
    violation: v,
    onClose,
    onUpdate,
    isDark
}: {
    violation: Violation;
    onClose: () => void;
    onUpdate: (v: Violation) => void;
    isDark: boolean
}) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    const isOverload = v.type === ViolationType.overload;

    return (
        <div className={`w-[360px] shrink-0 border-l flex flex-col shadow-2xl transition-all duration-300 animate-in slide-in-from-right ${t("bg-slate-900 border-slate-800", "bg-white border-slate-200")}`}>
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
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Incident Details</h4>
                    <div className={`p-4 rounded-2xl space-y-2 ${t("bg-slate-800/40", "bg-slate-50")}`}>
                        <MetricRow isDark={isDark} label="Unit ID" value={v.unitId} bold />
                        <MetricRow isDark={isDark} label="Time" value={format(v.timestamp, "hh:mm a")} />
                        <MetricRow isDark={isDark} label="Location" value={v.location.split(',')[0]} />
                        <MetricRow isDark={isDark} label="Operator" value={v.operator} />
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Infraction Metrics</h4>
                    <div className={`p-4 rounded-2xl space-y-2 ${t("bg-slate-800/40", "bg-slate-50")}`}>
                        {isOverload ? (
                            <>
                                <MetricRow isDark={isDark} label="Passenger Count" value={`${v.details.passengers} pax`} bold accent="text-rose-500" />
                                <MetricRow isDark={isDark} label="Capacity Limit" value={`${v.details.capacity} pax`} />
                            </>
                        ) : (
                            <>
                                <MetricRow isDark={isDark} label="Detected Speed" value={`${v.details.speed} km/h`} bold accent="text-amber-500" />
                                <MetricRow isDark={isDark} label="Speed Limit" value={`${v.details.limit} km/h`} />
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => onUpdate(v)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest"
                >
                    <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
                    Mark as Resolved
                </button>
            </div>
        </div>
    );
}

// ─── Details Modal Panel ──────────────────────────────────────────────────────

function DetailsPanel({
    violation: v,
    onClose,
    onGenerateReport,
    onMarkResolved,
    isDark
}: {
    violation: Violation;
    onClose: () => void;
    onGenerateReport: (v: Violation) => void;
    onMarkResolved: (v: Violation) => void;
    isDark: boolean
}) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    const isOverload = v.type === ViolationType.overload;

    const headerText = isOverload ? t("text-rose-400", "text-red-500") : t("text-amber-500", "text-orange-500 font-bold");
    const headerIconBg = isOverload ? t("bg-rose-500/20", "bg-red-50") : t("bg-amber-500/20", "bg-orange-50");

    const excess = isOverload
        ? (v.details.passengers ?? 0) - (v.details.capacity ?? 0)
        : (v.details.speed ?? 0) - (v.details.limit ?? 0);

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className={`w-full max-w-[480px] rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${t("bg-slate-900", "bg-white")}`}>
                {/* Header */}
                <div className={`px-8 py-8 flex items-start justify-between border-b ${t("border-slate-800", "border-slate-100")}`}>
                    <div className="flex items-center gap-5">
                        <div className={`${headerIconBg} p-4 rounded-[24px] shadow-sm border ${t("border-rose-500/20", "border-red-100")}`}>
                            <svg className={`w-10 h-10 ${headerText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isOverload ? "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                            </svg>
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black tracking-tight leading-none ${t("text-white", "text-slate-800 uppercase")}`}>{isOverload ? "Overload" : "Overspeeding"}</h2>
                            <p className="text-slate-400 text-sm font-medium mt-2">{format(v.timestamp, "MMMM dd, yyyy 'at' hh:mm a")}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Plate Number</p>
                            <p className={`text-xl font-black ${t("text-white", "text-slate-800")}`}>{v.unitId}</p>
                        </div>
                        <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">
                                {isOverload ? "Capacity Info" : "Detected Speed"}
                            </p>
                            <p className={`text-xl font-black ${t("text-white", "text-slate-800")}`}>
                                {isOverload ? `${v.details.passengers}/${v.details.capacity}` : `${v.details.speed} km/h`}
                            </p>
                        </div>
                    </div>

                    {/* Location Box */}
                    <div className={`p-5 rounded-2xl border ${t("bg-slate-800/40 border-slate-700/50", "bg-slate-50 border-slate-100")}`}>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">Location</p>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                            </div>
                            <p className={`text-base font-bold ${t("text-slate-200", "text-slate-700")}`}>{v.location}</p>
                        </div>
                    </div>

                    {/* Additional Sub-details */}
                    <div className="flex items-center justify-between px-2 pt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"></div>
                            <span className="text-xs font-black text-amber-600 uppercase tracking-widest italic">{v.status}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 tracking-tighter">ID: {v.id}</p>
                    </div>

                    {/* Action buttons matching image style */}
                    <div className="flex gap-4 pt-6">
                        <button
                            onClick={() => onMarkResolved(v)}
                            className="flex-1 h-14 bg-[#10b981] hover:bg-[#059669] text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 text-sm"
                        >
                            Verify Violation
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 h-14 bg-[#1e293b] hover:bg-[#0f172a] text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2 text-sm"
                        >
                            Dismiss
                        </button>
                    </div>

                    {/* Report link */}
                    <button
                        onClick={() => onGenerateReport(v)}
                        className="w-full text-center text-slate-400 hover:text-blue-500 text-[10px] font-black uppercase tracking-widest pt-2 transition-colors"
                    >
                        Generate Formal Incident PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function StatChip({ label, count, color, icon, isDark }: { label: string; count: number; color: "blue" | "red" | "orange"; icon: React.ReactNode; isDark: boolean }) {
    const t = (dark: string, light: string) => (isDark ? dark : light);

    const colors = {
        blue: { bg: t("bg-blue-900/20 border-blue-900/30", "bg-blue-50 border-blue-200"), icon: t("bg-blue-900/40 text-blue-400", "bg-blue-100 text-blue-600"), text: t("text-blue-400", "text-blue-700"), sub: t("text-blue-500/70", "text-blue-500") },
        red: { bg: t("bg-rose-900/20 border-rose-900/30", "bg-red-50 border-red-200"), icon: t("bg-rose-900/40 text-rose-400", "bg-red-100 text-red-600"), text: t("text-rose-400", "text-red-700"), sub: t("text-rose-500/70", "text-red-500") },
        orange: { bg: t("bg-amber-900/20 border-amber-900/30", "bg-orange-50 border-orange-200"), icon: t("bg-amber-900/40 text-amber-500", "bg-orange-100 text-orange-600"), text: t("text-amber-500", "text-orange-700"), sub: t("text-amber-500/70", "text-orange-500") },
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
        <div className={`flex items-center justify-between py-1 transition-colors ${isDark ? "border-b border-white/5" : "border-b border-black/5"} last:border-0`}>
            <span className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? "text-slate-500" : "text-slate-500"}`}>{label}</span>
            <span className={`text-xs font-black ${bold ? accent : isDark ? "text-slate-200" : "text-slate-700"}`}>{value}</span>
        </div>
    );
}