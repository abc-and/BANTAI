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
        <div className={`flex flex-col h-full transition-colors duration-300 ${t("bg-[#0f172a]", "bg-slate-50")}`}>
            {/* Main panel */}
            <div className="flex flex-col flex-1 min-w-0">
                {/* Header */}
                <div className={`px-6 py-5 flex items-center gap-4 shadow-md transition-all duration-300 ${t("bg-linear-to-r from-blue-900 to-indigo-900", "bg-linear-to-r from-blue-700 to-blue-500")}`}>
                    <div className="bg-white/20 rounded-2xl p-3 backdrop-blur-md">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-white text-2xl font-black tracking-tight uppercase">Violations Management</h1>
                        <p className="text-blue-100 text-sm font-medium">Generate formal incident reports and manage verified violations</p>
                    </div>
                </div>

                {/* Stats bar */}
                <div className={`border-b px-4 py-3 grid grid-cols-3 gap-3 transition-colors duration-300 ${t("bg-[#1e293b] border-slate-700", "bg-slate-100 border-slate-200")}`}>
                    <StatChip isDark={isDark} label="Total Verified" count={totalVerified} color="blue" icon={
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    } />
                    <StatChip isDark={isDark} label="Overcapacity" count={totalOverload} color="red" icon={
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    } />
                    <StatChip isDark={isDark} label="Overspeeding" count={totalOverspeed} color="orange" icon={
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    } />
                </div>

                {/* Control bar */}
                <div className={`border-b px-4 py-3 flex items-center gap-3 transition-colors duration-300 ${t("bg-[#1e293b]/50 border-slate-700", "bg-white border-slate-200")}`}>
                    <div className="relative flex-1 max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search violations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white placeholder-slate-500", "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400")}`}
                        />
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as ViolationType | "All")}
                        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-slate-50 border-slate-300 text-slate-800")}`}
                    >
                        <option value="All">All Types</option>
                        <option value={ViolationType.overload}>Overcapacity</option>
                        <option value={ViolationType.overspeed}>Overspeeding</option>
                    </select>

                    <button
                        onClick={exportSelected}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800/50 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed border border-blue-500/20 text-white text-sm font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-500/10"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Generate Reports ({selectedIds.size})
                    </button>
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
                            <div>Actions</div>
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
                                    const isRowSelected = selectedViolation?.id === v.id;
                                    const isChecked = selectedIds.has(v.id);

                                    return (
                                        <div
                                            key={v.id}
                                            onClick={() => setSelectedViolation(v)}
                                            className={`grid grid-cols-[36px_1fr_80px_140px_70px_110px_1fr_90px_80px] gap-0 px-3 py-3 border-b transition-all duration-200 cursor-pointer ${t("border-slate-800 hover:bg-slate-800/40", "border-slate-100 hover:bg-slate-50")} ${isRowSelected ? t("bg-blue-900/40 border-l-4 border-l-blue-500 pl-2", "bg-blue-50 shadow-inner") : ""}`}
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
                                                <span className={`flex items-center gap-1 px-2 py-1 text-[9px] font-bold rounded border uppercase ${isOverload ? t("bg-rose-900/30 text-rose-400 border-rose-800/50", "bg-red-50 text-red-600 border-red-200") : t("bg-amber-900/30 text-amber-500 border-amber-800/50", "bg-orange-50 text-orange-600 border-orange-200")}`}>
                                                    {isOverload ? "Overload" : "Overspeed"}
                                                </span>
                                            </div>
                                            <div className={`flex items-center gap-1 text-[10px] font-medium truncate pr-2 ${t("text-slate-400", "text-slate-600")}`}>
                                                <svg className="w-2.5 h-2.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                </svg>
                                                {v.location.split(",")[0]}
                                            </div>
                                            <div className={`flex items-center justify-center text-[10px] font-bold ${t("text-slate-500", "text-slate-500")}`}>{format(v.timestamp, "MM/dd HH:mm")}</div>
                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setSelectedViolation(v)}
                                                    className={`p-1 rounded transition-all ${t("text-indigo-400 hover:bg-slate-700", "text-blue-600 hover:bg-blue-50")}`}
                                                    title="View details"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                {v.repeatOffenseCount > 2 && (
                                                    <div className={`p-1 rounded-full ${t("bg-rose-900/30", "bg-red-100")}`} title="Repeat offender">
                                                        <svg className="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Details panel */}
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
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className={`rounded-3xl p-8 w-full max-w-sm shadow-2xl transition-colors duration-300 ${t("bg-[#1e293b] border border-slate-700", "bg-white")}`}>
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

// ─── Stat Chip ────────────────────────────────────────────────────────────────

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

// ─── Details Panel ────────────────────────────────────────────────────────────

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

    const headerBg = isOverload
        ? t("from-rose-900 to-rose-700", "from-red-600 to-red-500")
        : t("from-amber-900 to-amber-700", "from-orange-500 to-orange-400");

    const accentBg = isOverload
        ? t("bg-rose-900/20 border-rose-900/30", "bg-red-50 border-red-200")
        : t("bg-amber-900/20 border-amber-900/30", "bg-orange-50 border-orange-200");

    const accentText = isOverload ? t("text-rose-400", "text-red-700") : t("text-amber-500", "text-orange-700");
    const accentIcon = isOverload ? t("text-rose-500", "text-red-500") : t("text-amber-500", "text-orange-500");

    const excess = isOverload
        ? (v.details.passengers ?? 0) - (v.details.capacity ?? 0)
        : (v.details.speed ?? 0) - (v.details.limit ?? 0);

    return (
        <div className={`w-[420px] shrink-0 border-l-2 flex flex-col shadow-2xl transition-all duration-300 ${t("bg-[#1e293b] border-slate-800", "bg-white border-slate-200")}`}>
            {/* Panel header */}
            <div className={`bg-linear-to-r ${headerBg} px-6 py-6 flex items-center gap-4 shadow-lg`}>
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
                    <svg className="w-7 h-7 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isOverload ? "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-white font-black text-lg tracking-tight uppercase leading-tight">{isOverload ? "Overload" : "Overspeed"}</div>
                    <div className="text-white/70 text-[10px] font-bold tracking-widest uppercase mt-0.5">Verified Violation</div>
                </div>
                <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-xl transition-colors hover:bg-white/10 active:scale-95">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Info card */}
                <div className={`rounded-2xl border p-5 space-y-5 transition-colors duration-300 ${t("bg-slate-800/40 border-slate-700 shadow-inner", "bg-slate-50 border-slate-200")}`}>
                    {[
                        { icon: "M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4", label: "Ticket ID", value: v.id, isMono: true },
                        { icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4", label: "Unit ID", value: v.unitId, isBadge: true },
                        { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", label: "Operator", value: v.operator },
                        { icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", label: "Route", value: v.route },
                        { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", label: "Violation Area", value: v.location },
                        { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Timestamp", value: format(v.timestamp, "MMMM dd, yyyy HH:mm") },
                    ].map(({ icon, label, value, isMono, isBadge }) => (
                        <div key={label} className="flex items-start gap-4">
                            <div className={`p-1.5 rounded-lg border transition-colors ${t("bg-slate-700/50 border-slate-600 text-slate-500", "bg-white border-slate-200 text-slate-400")}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon} />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1">{label}</div>
                                {isBadge ? (
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-black border transition-colors ${t("bg-indigo-900/30 text-indigo-400 border-indigo-800/50", "bg-blue-900/10 text-blue-900 border-blue-900/20")}`}>{value}</span>
                                ) : (
                                    <div className={`text-sm font-bold wrap-break-word transition-colors ${isMono ? "font-mono tracking-wider" : ""} ${t("text-slate-200", "text-slate-800")}`}>{value}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Violation details card */}
                <div className={`rounded-2xl border-2 p-5 shadow-lg shadow-black/5 ${accentBg}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2.5 rounded-xl shadow-inner border ${isOverload ? t("bg-rose-900/40 border-rose-800/50", "bg-red-100 border-red-200") : t("bg-amber-900/40 border-amber-800/50", "bg-orange-100 border-orange-200")}`}>
                            <svg className={`w-5 h-5 ${accentIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isOverload ? "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                            </svg>
                        </div>
                        <span className={`text-xs font-black tracking-widest uppercase ${accentText}`}>
                            {isOverload ? "Infraction Snapshot" : "Detection Log"}
                        </span>
                    </div>
                    <div className={`border-t border-dashed mb-4 ${isOverload ? "border-rose-300/30" : "border-amber-300/30"}`} />

                    <div className="space-y-3">
                        {isOverload ? (
                            <>
                                <MetricRow isDark={isDark} label="Full Capacity" value={`${v.details.capacity} pax`} />
                                <MetricRow isDark={isDark} label="Occupancy Count" value={`${v.details.passengers} pax`} bold accent={accentText} />
                            </>
                        ) : (
                            <>
                                <MetricRow isDark={isDark} label="Regulatory Limit" value={`${v.details.limit} kph`} />
                                <MetricRow isDark={isDark} label="Detected Velocity" value={`${v.details.speed} kph`} bold accent={accentText} />
                            </>
                        )}
                    </div>

                    <div className={`mt-5 p-4 rounded-xl shadow-inner border animate-pulse ${isOverload ? "bg-rose-900/40 border-rose-800/50" : "bg-amber-900/40 border-amber-800/50"}`}>
                        <div className="flex items-center gap-3">
                            <AlertTriangle className={`w-5 h-5 ${accentIcon} shrink-0`} strokeWidth={2.5} />
                            <div>
                                <div className={`text-[9px] font-black uppercase tracking-widest ${accentText}`}>{isOverload ? "NET OVER CAPACITY" : "SPEED EXCEEDANCE"}</div>
                                <div className={`text-sm font-black mt-0.5 ${accentText}`}>
                                    +{excess} {isOverload ? "passengers" : "km/h"} detected
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Repeat offender */}
                {v.repeatOffenseCount > 0 && (
                    <div className={`rounded-2xl p-5 flex items-center gap-5 border-2 shadow-lg shadow-rose-900/10 ${t("bg-rose-900/20 border-rose-800/60", "bg-red-50 border-red-300")}`}>
                        <div className={`p-2.5 rounded-xl border ${t("bg-rose-900/40 border-rose-800/50 text-rose-400", "bg-red-100 border-red-200 text-red-600")}`}>
                            <AlertTriangle className="w-7 h-7 shrink-0" strokeWidth={3} />
                        </div>
                        <div>
                            <div className="text-sm font-black tracking-tight text-rose-500 uppercase">Repeat Offender</div>
                            <div className={`text-xs font-bold mt-1 ${t("text-rose-300/70", "text-red-600")}`}>{v.repeatOffenseCount} prior infractions documented</div>
                        </div>
                    </div>
                )}

                {/* Evidence Photo */}
                <div className={`h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-colors duration-300 ${t("bg-slate-800/50 border-slate-700 text-slate-600 hover:border-blue-500/50 hover:text-blue-500", "bg-slate-50 border-slate-300 text-slate-400 hover:border-blue-500/50")}`}>
                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm mb-3">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secondary Evidence Snapshot</span>
                </div>

                {/* Action buttons */}
                <div className="space-y-3 pt-4">
                    <button
                        onClick={() => onGenerateReport(v)}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-600/20 active:scale-95 uppercase text-xs tracking-widest"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Generate Formal Report
                    </button>
                    <button
                        onClick={() => onMarkResolved(v)}
                        className={`w-full flex items-center justify-center gap-3 px-6 py-4 font-black rounded-2xl transition-all duration-300 active:scale-95 uppercase text-xs tracking-widest ${t("bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-600 hover:text-white", "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white")}`}
                    >
                        <ShieldCheck className="w-5 h-5" strokeWidth={2.5} />
                        Mark as Resolved
                    </button>
                </div>
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