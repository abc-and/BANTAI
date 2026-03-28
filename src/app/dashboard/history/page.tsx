"use client";
import React, { useState, useMemo } from "react";
import {
    History, Settings, Search, Download, CheckCircle,
    Users, Gauge, XCircle, AlertTriangle, User as UserIcon,
    Route, MapPin, Eye, Inbox, Info, ShieldCheck, Filter, ChevronRight
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

type ViolationStatus = "RESOLVED" | "DISMISSED";
type ViolationType = "OVERCAPACITY" | "OVERSPEEDING";

interface HistoryViolation {
    id: string;
    status: ViolationStatus;
    timestamp: Date;
    resolvedDate?: Date;
    type: ViolationType;
    unitId: string;
    operator: string;
    route: string;
    location: string;
    repeatOffenseCount: number;
    details: any;
    penalty?: string;
}

// Mock Data
const MOCK_VIOLATIONS: HistoryViolation[] = [
    {
        id: "VIO-2026-081",
        status: "RESOLVED",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        resolvedDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
        type: "OVERCAPACITY",
        unitId: "JPU-123",
        operator: "Juan Dela Cruz",
        route: "13C",
        location: "Colon St. Corner Osmena Blvd, Cebu City",
        repeatOffenseCount: 1,
        details: { capacity: 20, passengers: 25 },
        penalty: "1500"
    },
    {
        id: "VIO-2026-082",
        status: "DISMISSED",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        resolvedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        type: "OVERSPEEDING",
        unitId: "XYZ-789",
        operator: "Pedro Penduko",
        route: "04L",
        location: "SRP Highway, Southbound",
        repeatOffenseCount: 0,
        details: { limit: 60, speed: 82 },
    },
    {
        id: "VIO-2026-085",
        status: "RESOLVED",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        resolvedDate: new Date(Date.now() - 1000 * 60 * 30),
        type: "OVERSPEEDING",
        unitId: "CBA-321",
        operator: "Mario Batali",
        route: "14D",
        location: "Escario St. near Capitol",
        repeatOffenseCount: 3,
        details: { limit: 40, speed: 65 },
        penalty: "2000"
    }
];

export default function HistoryCompliancePage() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const t = (dark: string, light: string) => (isDark ? dark : light);

    const [timeFilter, setTimeFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [retentionMonths, setRetentionMonths] = useState(6);

    const [violations] = useState<HistoryViolation[]>(MOCK_VIOLATIONS);
    const [selectedViolation, setSelectedViolation] = useState<HistoryViolation | null>(null);
    const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

    const resolvedViolations = useMemo(() => {
        return violations.filter(v => v.status === "RESOLVED" || v.status === "DISMISSED");
    }, [violations]);

    const filteredViolations = useMemo(() => {
        let list = [...resolvedViolations];
        const now = new Date();

        if (timeFilter === "today") {
            list = list.filter(v => {
                const date = v.resolvedDate || v.timestamp;
                return date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
            });
        } else if (timeFilter === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            list = list.filter(v => (v.resolvedDate || v.timestamp) > weekAgo);
        } else if (timeFilter === "month") {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            list = list.filter(v => (v.resolvedDate || v.timestamp) > monthAgo);
        }

        if (typeFilter === "overcapacity") {
            list = list.filter(v => v.type === "OVERCAPACITY");
        } else if (typeFilter === "overspeed") {
            list = list.filter(v => v.type === "OVERSPEEDING");
        }

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            list = list.filter(v =>
                v.unitId.toLowerCase().includes(query) ||
                v.operator.toLowerCase().includes(query) ||
                v.id.toLowerCase().includes(query)
            );
        }

        list.sort((a, b) => (b.resolvedDate || b.timestamp).getTime() - (a.resolvedDate || a.timestamp).getTime());

        return list;
    }, [resolvedViolations, timeFilter, typeFilter, searchQuery]);

    const statistics = useMemo(() => {
        return {
            total: resolvedViolations.length,
            overcapacity: resolvedViolations.filter(v => v.type === "OVERCAPACITY").length,
            overspeeding: resolvedViolations.filter(v => v.type === "OVERSPEEDING").length,
        };
    }, [resolvedViolations]);

    const formatDate = (date: Date) => {
        return date.toLocaleString('en-US', {
            month: '2-digit', day: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    };

    const handleExport = () => {
        window.print();
    };

    return (
        <div className={`flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 pb-12 print:p-0 relative transition-colors duration-300 ${t("bg-[#0f172a]", "bg-slate-50")}`}>

            {/* 1. Header Hero Card */}
            <div className={`rounded-[2rem] p-8 sm:p-10 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden transition-all duration-300 ${t("bg-linear-to-br from-indigo-900 to-blue-900 shadow-indigo-900/40", "bg-linear-to-br from-indigo-600 to-blue-700 shadow-blue-500/20")}`}>
                <div className="absolute inset-x-0 top-0 h-40 bg-white/10 blur-3xl rounded-full translate-y-[-50%] pointer-events-none"></div>
                <div className="absolute right-0 bottom-0 w-64 h-64 bg-blue-400/20 blur-3xl rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner shrink-0">
                        <History className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2 uppercase">History & Compliance</h1>
                        <p className="text-blue-50 text-sm font-medium opacity-90 max-w-md">Review resolved Mandaue City violations, export archives, and manage regional data retention policies.</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsRetentionModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3.5 rounded-xl font-bold transition-all backdrop-blur-md active:scale-95 shrink-0 z-10"
                >
                    <Settings className="w-5 h-5" />
                    Data Retention
                </button>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                {[
                    { icon: <CheckCircle className="w-7 h-7" />, value: statistics.total, label: "Total Resolved", color: "blue", accent: "text-blue-600", bg: t("bg-blue-900/20 border-blue-900/30", "bg-blue-50 border-blue-100") },
                    { icon: <Users className="w-7 h-7" />, value: statistics.overcapacity, label: "Overcapacity Cases", color: "rose", accent: "text-rose-600", bg: t("bg-rose-900/20 border-rose-900/30", "bg-rose-50 border-rose-100") },
                    { icon: <Gauge className="w-7 h-7" />, value: statistics.overspeeding, label: "Overspeeding Cases", color: "cyan", accent: "text-cyan-600", bg: t("bg-cyan-900/20 border-cyan-900/30", "bg-cyan-50 border-cyan-100") }
                ].map((stat, i) => (
                    <div key={i} className={`rounded-[2rem] p-6 border shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300 ${t("bg-[#1e293b] border-slate-700", "bg-white border-slate-200")}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${stat.bg} ${stat.accent}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className={`text-3xl font-black tracking-tight ${t("text-white", "text-slate-800")} ${stat.color === 'rose' || stat.color === 'cyan' ? stat.accent : ''}`}>{stat.value}</p>
                            <p className={`font-bold text-sm tracking-wide ${t("text-slate-400", "text-slate-500")}`}>{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 3. Filters & Actions Bar */}
            <div className={`border rounded-[2rem] p-2 shadow-sm flex flex-col lg:flex-row gap-2 print:hidden z-20 sticky top-4 transition-all duration-300 ${t("bg-[#1e293b] border-slate-700 shadow-indigo-900/10", "bg-white border-slate-200 shadow-slate-200/50")}`}>
                <div className="flex-1 relative flex items-center">
                    <div className={`absolute left-4 p-2 rounded-xl text-slate-400 ${t("bg-slate-800", "bg-slate-100")}`}>
                        <Search className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search records by ID, operator, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-16 pr-6 py-4 bg-transparent font-semibold placeholder-slate-400 focus:outline-none text-sm transition-colors ${t("text-white", "text-slate-800")}`}
                    />
                </div>

                <div className={`w-px hidden lg:block my-2 ${t("bg-slate-700", "bg-slate-200")}`} />

                <div className="flex flex-wrap flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 shrink-0">
                    <div className="relative group flex-1 sm:flex-none">
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                            className={`w-full border font-bold text-sm rounded-xl pl-5 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all duration-300 ${t("bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700", "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")}`}
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                        <Filter className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative group flex-1 sm:flex-none">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className={`w-full border font-bold text-sm rounded-xl pl-5 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all duration-300 ${t("bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700", "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")}`}
                        >
                            <option value="all">All Types</option>
                            <option value="overcapacity">Overcapacity</option>
                            <option value="overspeed">Overspeeding</option>
                        </select>
                        <Filter className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <button
                        onClick={handleExport}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all text-sm shadow-sm ${t("bg-blue-600 hover:bg-blue-700 text-white", "bg-slate-800 hover:bg-slate-900 text-white")}`}
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="hidden print:block mb-8 mt-4">
                <h1 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-800 pb-2 mb-4 uppercase">Violation History & Compliance Report</h1>
                <div className="flex justify-between text-sm text-slate-600 font-semibold">
                    <p>Mandaue City Government - Public Transport Regulation Office</p>
                    <p>Generated: {new Date().toLocaleString()}</p>
                </div>
            </div>

            {/* 4. History List */}
            <div className="space-y-4">
                {filteredViolations.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-24 print:hidden border rounded-[2rem] shadow-sm transition-colors duration-300 ${t("bg-[#1e293b] border-slate-700", "bg-white border-slate-200")}`}>
                        <div className={`p-6 rounded-3xl mb-5 shadow-inner ${t("bg-slate-800 text-slate-500", "bg-slate-50 text-slate-400")}`}>
                            <Inbox className="w-12 h-12" />
                        </div>
                        <h3 className={`text-xl font-extrabold ${t("text-white", "text-slate-800")}`}>No records found</h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    filteredViolations.map((v) => (
                        <div key={v.id} className={`border rounded-[2.5rem] p-3 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 print:border-slate-300 print:shadow-none print:break-inside-avoid items-center group duration-300 ${t("bg-[#1e293b] border-slate-700 hover:border-indigo-500/50 hover:bg-[#243147]", "bg-white border-slate-200 hover:bg-slate-50")}`}>

                            {/* Icon Status Indicator */}
                            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shrink-0 border transition-all duration-300 ${v.status === 'RESOLVED' ? t('bg-blue-900/30 text-blue-400 border-blue-800/50', 'bg-blue-50 text-blue-500 border-blue-100/50') : t('bg-slate-800 text-slate-500 border-slate-700', 'bg-slate-50 text-slate-400 border-slate-100')}`}>
                                {v.status === 'RESOLVED' ? <CheckCircle className="w-8 h-8" strokeWidth={2.5} /> : <XCircle className="w-8 h-8" strokeWidth={2.5} />}
                            </div>

                            {/* Main Violation Detail */}
                            <div className="flex-1 py-1 px-2 md:px-3 flex flex-col justify-center">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h3 className={`text-xl font-black tracking-tight ${t("text-white", "text-slate-800")}`}>{v.unitId}</h3>
                                    <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl tracking-wider uppercase border border-opacity-50 ${v.type === 'OVERCAPACITY' ? t('bg-rose-900/30 text-rose-400 border-rose-800/50', 'bg-rose-50 text-rose-600 border-rose-200') : t('bg-cyan-900/30 text-cyan-400 border-cyan-800/50', 'bg-cyan-50 text-cyan-600 border-cyan-200')}`}>
                                        {v.type}
                                    </span>
                                    {v.repeatOffenseCount > 0 && (
                                        <div className={`flex items-center px-3 py-1.5 rounded-xl border ${t('bg-rose-900/30 text-rose-400 border-rose-800/50', 'bg-rose-50 text-rose-600 border-rose-200')}`} title="Repeat offender">
                                            <AlertTriangle className="w-3.5 h-3.5 mr-1" strokeWidth={2.5} />
                                            <span className="text-[11px] font-black uppercase tracking-wider">Repeat</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium mb-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <UserIcon className="w-4 h-4 text-slate-400" />
                                        <span className={t("text-slate-300", "text-slate-600")}>{v.operator}</span>
                                    </div>
                                    <div className={`w-1.5 h-1.5 rounded-full hidden md:block ${t("bg-slate-700", "bg-slate-300")}`}></div>
                                    <div className="flex items-center gap-1.5">
                                        <Route className="w-4 h-4 text-slate-400" />
                                        <span className={t("text-slate-300", "text-slate-600")}>Route <span className={`font-bold ${t("text-slate-100", "text-slate-700")}`}>{v.route}</span></span>
                                    </div>
                                    <div className={`w-1.5 h-1.5 rounded-full hidden xl:block ${t("bg-slate-700", "bg-slate-300")}`}></div>
                                    <div className="flex items-center gap-1.5 xl:w-auto w-full">
                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className={`truncate max-w-sm ${t("text-slate-400", "text-slate-500")}`}>{v.location}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ID & Date Wrap */}
                            <div className={`flex flex-row md:flex-col items-center md:items-end justify-between self-stretch border-t md:border-t-0 pt-4 md:pt-0 pb-2 md:pb-0 px-4 md:px-6 md:border-l print:flex-col print:items-end min-w-[200px] transition-colors duration-300 ${t("border-slate-800", "border-slate-100")}`}>
                                <div className="text-left md:text-right flex flex-col justify-center h-full">
                                    <div className={`inline-block border text-[10px] font-bold px-3 py-1.5 rounded-xl tracking-widest mb-2 shadow-inner ${t("bg-slate-800 border-slate-700 text-slate-400", "bg-slate-50 border-slate-200 text-slate-500")}`}>
                                        #{v.id}
                                    </div>
                                    <div className={`text-sm font-bold ${t("text-slate-400", "text-slate-600")}`}>
                                        {formatDate(v.resolvedDate || v.timestamp)}
                                    </div>
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className={`hidden md:flex flex-col justify-center pr-3 border-l pl-4 print:hidden transition-colors duration-300 ${t("border-slate-800", "border-slate-50")}`}>
                                <button
                                    onClick={() => setSelectedViolation(v)}
                                    className={`w-14 h-14 flex items-center justify-center rounded-[1.5rem] transition-all duration-300 group-hover:scale-105 active:scale-95 ${t("bg-indigo-900/40 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-500/30", "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-blue-500/30")}`}
                                    title="View Record Details"
                                >
                                    <Eye className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Mobile action button */}
                            <button
                                onClick={() => setSelectedViolation(v)}
                                className={`md:hidden w-full font-bold p-4 rounded-b-[2rem] rounded-t-lg transition-colors border-t mt-2 flex items-center justify-center gap-2 ${t("bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700", "bg-slate-50 border-slate-100 text-slate-700 hover:bg-blue-50")}`}
                            >
                                <Eye className="w-5 h-5" />
                                View Full Record
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Modals & Dialogs */}
            {isRetentionModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden animate-in fade-in duration-300">
                    <div className={`rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${t("bg-[#1e293b] text-white", "bg-white text-slate-800")}`}>
                        <div className={`p-8 border-b flex items-center gap-4 transition-colors duration-300 ${t("bg-slate-800/50 border-slate-700", "bg-slate-50/50 border-slate-100")}`}>
                            <div className={`p-3 rounded-2xl shadow-inner border ${t("bg-amber-900/20 text-amber-500 border-amber-900/30", "bg-amber-100 text-amber-600 border-amber-200")}`}>
                                <Settings className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight uppercase">Data Retention</h2>
                        </div>
                        <div className="p-8">
                            <p className={`font-medium text-sm mb-8 leading-relaxed ${t("text-slate-400", "text-slate-600")}`}>
                                Establish how long resolved and dismissed traffic violations should instantly be available before safely moving into cold archive storage.
                            </p>

                            <div className="mb-3 flex justify-between items-end">
                                <label className={`font-bold tracking-wide text-sm uppercase ${t("text-slate-200", "text-slate-800")}`}>Active Retention</label>
                                <span className={`text-4xl font-black ${t("text-blue-400", "text-blue-600")}`}>{retentionMonths} <span className="text-sm font-bold text-slate-400 lowercase uppercase-none">months</span></span>
                            </div>

                            <input
                                type="range"
                                min="1" max="24"
                                value={retentionMonths}
                                onChange={(e) => setRetentionMonths(parseInt(e.target.value))}
                                className={`w-full h-3 rounded-full appearance-none cursor-pointer accent-blue-500 mb-8 border shadow-inner ${t("bg-slate-700 border-slate-600", "bg-slate-100 border-slate-200")}`}
                            />

                            <div className={`p-5 rounded-2xl flex gap-4 shadow-sm border ${t("bg-amber-900/20 border-amber-900/30 text-amber-200", "bg-amber-50 border-amber-200/60 text-amber-800")}`}>
                                <Info className="w-6 h-6 shrink-0 text-amber-500" />
                                <p className="text-xs font-semibold leading-loose opacity-80">
                                    Administrative records older than <strong>{retentionMonths} months</strong> will be automatically archived. You'll be prompted to export before strict deletion logic applies.
                                </p>
                            </div>
                        </div>
                        <div className={`p-6 flex justify-end gap-3 border-t transition-colors duration-300 ${t("bg-slate-800/30 border-slate-700", "bg-white border-slate-100")}`}>
                            <button
                                onClick={() => setIsRetentionModalOpen(false)}
                                className={`px-6 py-3.5 rounded-xl font-bold transition-all text-sm ${t("text-slate-400 hover:bg-slate-800", "text-slate-600 hover:bg-slate-100")}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setIsRetentionModalOpen(false)}
                                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all text-sm shadow-md shadow-blue-600/20 active:scale-95"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedViolation && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden animate-in fade-in duration-300" onClick={() => setSelectedViolation(null)}>
                    <div className={`rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors ${t("bg-[#1e293b] text-white", "bg-white text-slate-800")}`} onClick={(e) => e.stopPropagation()}>
                        <div className={`p-8 border-b flex items-center justify-between transition-colors duration-300 ${t("bg-slate-800/50 border-slate-700", "bg-slate-50/50 border-slate-100")}`}>
                            <div className="flex items-center gap-4">
                                {selectedViolation.status === 'RESOLVED' ? (
                                    <div className={`p-3 rounded-2xl shadow-inner border ${t("bg-blue-900/30 text-blue-400 border-blue-800/50", "bg-blue-100 text-blue-600 border-blue-200")}`}><CheckCircle className="w-6 h-6" strokeWidth={2.5} /></div>
                                ) : (
                                    <div className={`p-3 rounded-2xl shadow-inner border ${t("bg-slate-800 text-slate-500 border-slate-700", "bg-slate-100 text-slate-500 border-slate-200")}`}><XCircle className="w-6 h-6" strokeWidth={2.5} /></div>
                                )}
                                <h2 className="text-2xl font-black tracking-tight uppercase">Ticket Record</h2>
                            </div>
                            <button onClick={() => setSelectedViolation(null)} className={`p-2 rounded-xl transition-colors active:scale-95 ${t("text-slate-500 hover:bg-slate-800 hover:text-white", "text-slate-400 hover:bg-slate-200 hover:text-slate-600")}`}>
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                            <DetailSection title="Base Information" isDark={isDark}>
                                <DetailRow label="Violation ID" isDark={isDark} value={<span className={`font-mono border px-2 py-1 rounded-md text-xs font-bold tracking-wider ${t("bg-slate-800 border-slate-700 text-slate-300", "bg-slate-100 border-slate-200 text-slate-800")}`}>{selectedViolation.id}</span>} />
                                <DetailRow label="Unit Model ID" isDark={isDark} value={<span className={`font-bold ${t("text-slate-200", "text-slate-700")}`}>{selectedViolation.unitId}</span>} />
                                <DetailRow label="Operator" isDark={isDark} value={<span className={`font-bold ${t("text-slate-200", "text-slate-700")}`}>{selectedViolation.operator}</span>} />
                                <DetailRow label="Patrol Route" isDark={isDark} value={<span className={`font-bold ${t("text-slate-200", "text-slate-700")}`}>{selectedViolation.route}</span>} />
                                <DetailRow label="Location Area" isDark={isDark} value={<span className={`font-medium ${t("text-slate-400", "text-slate-600")}`}>{selectedViolation.location}</span>} />
                            </DetailSection>

                            <DetailSection title="Record Timeline" isDark={isDark}>
                                <DetailRow label="Detected" isDark={isDark} value={formatDate(selectedViolation.timestamp)} />
                                <DetailRow label="Resolved" isDark={isDark} value={formatDate(selectedViolation.resolvedDate || selectedViolation.timestamp)} />
                            </DetailSection>

                            <DetailSection title="Infraction Specifics" isDark={isDark}>
                                {selectedViolation.type === 'OVERCAPACITY' ? (
                                    <>
                                        <DetailRow label="Infraction Type" isDark={isDark} value={<span className={`font-black uppercase tracking-wider text-xs px-3 py-1.5 rounded-lg ${t("bg-rose-900/30 text-rose-400", "bg-rose-50 text-rose-600")}`}>Overcapacity</span>} />
                                        <DetailRow label="Snapshot" isDark={isDark} value={<span className={`font-bold ${t("text-slate-300", "text-slate-600")}`}>{selectedViolation.details.passengers} / {selectedViolation.details.capacity} allowed</span>} />
                                        <DetailRow label="Excess Total" isDark={isDark} value={<span className={`font-bold ${t("text-rose-400", "text-rose-600")}`}>{selectedViolation.details.passengers - selectedViolation.details.capacity} passengers</span>} />
                                    </>
                                ) : (
                                    <>
                                        <DetailRow label="Infraction Type" isDark={isDark} value={<span className={`font-black uppercase tracking-wider text-xs px-3 py-1.5 rounded-lg ${t("bg-cyan-900/30 text-cyan-400", "bg-cyan-50 text-cyan-600")}`}>Overspeeding</span>} />
                                        <DetailRow label="Recorded Velocity" isDark={isDark} value={<span className={`font-bold ${t("text-slate-300", "text-slate-600")}`}>{selectedViolation.details.speed} kph</span>} />
                                        <DetailRow label="Zonal Limit" isDark={isDark} value={<span className={`font-bold ${t("text-blue-400", "text-blue-600")}`}>{selectedViolation.details.limit} kph</span>} />
                                        <DetailRow label="Excess Total" isDark={isDark} value={<span className={`font-bold ${t("text-cyan-400", "text-cyan-600")}`}>{selectedViolation.details.speed - selectedViolation.details.limit} kph</span>} />
                                    </>
                                )}
                            </DetailSection>

                            <div className={`p-5 rounded-2xl flex items-center gap-4 border shadow-sm transition-all duration-300 ${selectedViolation.status === 'RESOLVED' ? t('bg-blue-900/20 border-blue-900/30 text-blue-300', 'bg-blue-50 border-blue-100 text-blue-800') : t('bg-slate-800 border-slate-700 text-slate-400', 'bg-slate-50 border-slate-200 text-slate-700')}`}>
                                {selectedViolation.status === 'RESOLVED' ? <ShieldCheck className="w-8 h-8 text-blue-500 shrink-0" strokeWidth={2.5} /> : <XCircle className="w-8 h-8 text-slate-500 shrink-0" strokeWidth={2.5} />}
                                <p className="text-sm font-semibold leading-relaxed">
                                    {selectedViolation.status === 'RESOLVED'
                                        ? "This violation has been officially resolved, penalties collected, and safely closed out."
                                        : "This violation ticket was dismissed upon secondary investigation and review."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailSection({ title, children, isDark }: { title: string, children: React.ReactNode, isDark: boolean }) {
    return (
        <div>
            <h3 className={`text-xs font-black mb-4 uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>{title}</h3>
            <div className={`border shadow-sm rounded-2xl p-5 space-y-4 transition-colors duration-300 ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200"}`}>
                {children}
            </div>
        </div>
    );
}

function DetailRow({ label, value, isDark }: { label: string, value: React.ReactNode, isDark: boolean }) {
    return (
        <div className={`flex sm:flex-row flex-col sm:items-center justify-between gap-1 sm:gap-4 text-sm pb-4 border-b last:pb-0 last:border-0 border-dashed transition-colors duration-300 ${isDark ? "border-slate-700" : "border-slate-100"}`}>
            <span className={`w-36 shrink-0 font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>{label}:</span>
            <span className={`sm:text-right ${isDark ? "text-slate-200" : "text-slate-800"}`}>{value}</span>
        </div>
    );
}