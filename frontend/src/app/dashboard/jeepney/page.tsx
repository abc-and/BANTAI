"use client";

import { FormEvent, useEffect, useState } from "react";
import {
    Bus, Edit, Info, CheckCircle2, PauseCircle, Search,
    X, Filter, Download
} from "lucide-react";

export interface ModernJeepney {
    vehicleId: string;
    driverName: string;
    plateNumber: string;
    vehicleType: string;
    vehicleModel: string;
    operator: string;
    route: string;
    sittingCapacity: number;
    standingCapacity: number;
    speedLimit: number;
    registrationDate: string;
    status: "Active" | "Inactive";
    violationCount: number;
}

const AVAILABLE_ROUTES = [
    "Paknaan - Parkmall (vice versa)",
    "Parkmall - Cabancalan",
    "Mandaue City Hall - SM City Cebu (vice versa)",
    "IT Park - Ayala Center Cebu",
    "Lahug - Talamban",
    "Carbon Market - Cebu City Hall",
    "SM City Cebu - Ayala Center Cebu",
    "Talisay - Cebu City"
];

const OPERATOR_OPTIONS = ["MANTRASCO", "UDOTCO", "Others"];
const VEHICLE_TYPE_OPTIONS = ["Electric", "Diesel-Electric Hybrid", "Euro 4 Compliant"];
const VEHICLE_MODEL_OPTIONS = ["Hino", "Others"];


export default function ModernJeepneyRegistration() {
    const [registeredVehicles, setRegisteredVehicles] = useState<ModernJeepney[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilter, setSelectedFilter] = useState("All");

    const [vehicleId, setVehicleId] = useState("");
    const [driverName, setDriverName] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [vehicleType, setVehicleType] = useState(VEHICLE_TYPE_OPTIONS[0]);
    const [vehicleModel, setVehicleModel] = useState(VEHICLE_MODEL_OPTIONS[0]);
    const [operator, setOperator] = useState(OPERATOR_OPTIONS[0]);
    const [selectedRoute, setSelectedRoute] = useState(AVAILABLE_ROUTES[0]);
    const [sittingCapacity, setSittingCapacity] = useState("");
    const [standingCapacity, setStandingCapacity] = useState("");
    const [speedLimit, setSpeedLimit] = useState("50");
    const [isEditing, setIsEditing] = useState(false);
    const [vehicleToEdit, setVehicleToEdit] = useState<ModernJeepney | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadVehicles = async () => {
        try {
            const response = await fetch("http://localhost:4000/api/jeepneys");
            if (!response.ok) throw new Error("Failed to load vehicles");
            const rawVehicles = await response.json();
            const vehicles = rawVehicles.map(normalizeVehicle);
            setRegisteredVehicles(vehicles);
            setVehicleId(getNextVehicleId(vehicles));
            return vehicles;
        } catch (error) {
           
        }
    };

    useEffect(() => {
        loadVehicles();
    }, []);

    const filteredVehicles = registeredVehicles.filter((v) => {
        const query = searchQuery.toLowerCase();
        const searchMatch =
            query === "" ||
            v.vehicleId.toLowerCase().includes(query) ||
            v.driverName.toLowerCase().includes(query) ||
            v.plateNumber.toLowerCase().includes(query) ||
            v.vehicleModel.toLowerCase().includes(query);

        const filterMatch =
            selectedFilter === "All" ||
            (selectedFilter === "Active" && v.status === "Active") ||
            (selectedFilter === "Inactive" && v.status === "Inactive");

        return searchMatch && filterMatch;
    });

    const resetForm = (vehicles: ModernJeepney[]) => {
        setVehicleId(getNextVehicleId(vehicles));
        setDriverName("");
        setPlateNumber("");
        setVehicleType(VEHICLE_TYPE_OPTIONS[0]);
        setVehicleModel(VEHICLE_MODEL_OPTIONS[0]);
        setOperator(OPERATOR_OPTIONS[0]);
        setSelectedRoute(AVAILABLE_ROUTES[0]);
        setSittingCapacity("");
        setStandingCapacity("");
        setSpeedLimit("50");
        setIsEditing(false);
        setVehicleToEdit(null);
    };

    const clearForm = () => resetForm(registeredVehicles);

    const normalizeVehicle = (raw: any): ModernJeepney => ({
        vehicleId: raw.vehicleId,
        driverName: raw.driverName,
        plateNumber: raw.plateNumber,
        vehicleType: raw.vehicleType,
        vehicleModel: raw.vehicleModel,
        operator: raw.operator,
        route: raw.routeName ?? raw.route ?? "",
        sittingCapacity: raw.sittingCapacity,
        standingCapacity: raw.standingCapacity,
        speedLimit: raw.speedLimit,
        registrationDate: raw.registrationDate,
        status: raw.status === "ACTIVE" ? "Active" : raw.status === "INACTIVE" ? "Inactive" : raw.status,
        violationCount: raw.violationCount,
    });

    const getNextVehicleId = (vehicles: ModernJeepney[]) => {
        const numbers = vehicles.map((v) => parseInt(v.vehicleId.replace(/^MPUJ-0*/, ""), 10) || 0);
        const nextNumber = Math.max(0, ...numbers) + 1;
        return `MPUJ-${String(nextNumber).padStart(3, "0")}`;
    };

    const registerOrUpdateVehicle = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const sitting = parseInt(sittingCapacity, 10);
        const standing = parseInt(standingCapacity, 10);
        const speed = parseInt(speedLimit, 10);

        if (isEditing && vehicleToEdit) {
            setRegisteredVehicles((prev) =>
                prev.map((v) =>
                    v.vehicleId === vehicleToEdit.vehicleId
                        ? { ...v, vehicleId, driverName, plateNumber, vehicleType, vehicleModel, operator, route: selectedRoute, sittingCapacity: sitting, standingCapacity: standing, speedLimit: speed }
                        : v
                )
            );
            clearForm();
            return;
        }

        const newVehicle: ModernJeepney = {
            vehicleId,
            driverName,
            plateNumber,
            vehicleType,
            vehicleModel,
            operator,
            route: selectedRoute,
            sittingCapacity: sitting,
            standingCapacity: standing,
            speedLimit: speed,
            registrationDate: new Date().toISOString(),
            status: "Active",
            violationCount: 0,
        };

        if (!window.confirm(`Register ${vehicleId} for route ${selectedRoute}?`)) {
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);

        try {
            const response = await fetch("http://localhost:4000/api/jeepneys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleId: newVehicle.vehicleId,
                    driverName: newVehicle.driverName,
                    plateNumber: newVehicle.plateNumber,
                    vehicleType: newVehicle.vehicleType,
                    vehicleModel: newVehicle.vehicleModel,
                    operator: newVehicle.operator,
                    routeName: newVehicle.route,
                    sittingCapacity: newVehicle.sittingCapacity,
                    standingCapacity: newVehicle.standingCapacity,
                    speedLimit: newVehicle.speedLimit,
                }),
            });

            if (!response.ok) {
                const payload = await response.json();
                throw new Error(payload?.error || "Failed to register vehicle");
            }

            const createdVehicle = normalizeVehicle(await response.json());
            const updatedVehicles = [createdVehicle, ...registeredVehicles];
            setRegisteredVehicles(updatedVehicles);
            resetForm(updatedVehicles);
            await loadVehicles();
        } catch (error: any) {
            setErrorMessage(error?.message || "Registration failed. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = (id: string) => {
        setRegisteredVehicles((prev) =>
            prev.map((v) =>
                v.vehicleId === id ? { ...v, status: v.status === "Active" ? "Inactive" : "Active" } : v
            )
        );
    };

    const startEdit = (v: ModernJeepney) => {
        setIsEditing(true);
        setVehicleToEdit(v);
        setVehicleId(v.vehicleId);
        setDriverName(v.driverName);
        setPlateNumber(v.plateNumber);
        setVehicleType(v.vehicleType);
        setVehicleModel(v.vehicleModel);
        setOperator(v.operator);
        setSelectedRoute(v.route);
        setSittingCapacity(v.sittingCapacity.toString());
        setStandingCapacity(v.standingCapacity.toString());
        setSpeedLimit(v.speedLimit.toString());
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const activeCount = registeredVehicles.filter((v) => v.status === "Active").length;
    const inactiveCount = registeredVehicles.filter((v) => v.status === "Inactive").length;

    return (
        <div className="bg-background text-foreground flex flex-col xl:flex-row gap-6 transition-colors duration-300">
            {/* Registration Form Column */}
            <div className="flex-1 xl:max-w-xl">
                <div className="bg-card border border-border-custom rounded-2xl p-6 shadow-sm sticky top-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${isEditing ? "bg-linear-to-br from-amber-500 to-rose-500" : "bg-linear-to-br from-blue-500 to-blue-700"}`}>
                            {isEditing ? <Edit size={24} /> : <Bus size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold pb-1">{isEditing ? "Edit Jeepney" : "Register New Jeepney"}</h2>
                            <p className="text-sm text-foreground/50 font-medium">
                                {isEditing ? "Update the details of this registered jeepney" : "Complete the form to add a modernized jeepney to the fleet"}
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-px bg-border-custom mb-6" />

                    <form onSubmit={registerOrUpdateVehicle} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Vehicle's ID" value={vehicleId} onChange={(e: any) => setVehicleId(e.target.value.toUpperCase())} required />
                            <InputField label="Driver's Name" value={driverName} onChange={(e: any) => setDriverName(e.target.value)} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Plate Number" value={plateNumber} onChange={(e: any) => setPlateNumber(e.target.value.toUpperCase())} maxLength={7} required />
                            <SelectField label="Vehicle Type" value={vehicleType} onChange={(e: any) => setVehicleType(e.target.value)} options={VEHICLE_TYPE_OPTIONS} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField label="Vehicle Model" value={vehicleModel} onChange={(e: any) => setVehicleModel(e.target.value)} options={VEHICLE_MODEL_OPTIONS} />
                            <SelectField label="Operator" value={operator} onChange={(e: any) => setOperator(e.target.value)} options={OPERATOR_OPTIONS} />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <SelectField label="Route" value={selectedRoute} onChange={(e: any) => setSelectedRoute(e.target.value)} options={AVAILABLE_ROUTES} />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <InputField label="Sitting Capacity" type="number" value={sittingCapacity} onChange={(e: any) => setSittingCapacity(e.target.value.replace(/\D/g, ""))} required />
                            <InputField label="Standing Capacity" type="number" value={standingCapacity} onChange={(e: any) => setStandingCapacity(e.target.value.replace(/\D/g, ""))} required />
                            <InputField label="Speed Limit" type="number" value={speedLimit} onChange={(e: any) => setSpeedLimit(e.target.value.replace(/\D/g, ""))} required />
                        </div>

                        <div className="pt-6 flex gap-4">
                            <button type="submit" className={`flex-1 py-4 flex flex-row items-center justify-center gap-2 rounded-xl text-white font-bold transition-transform active:scale-[0.98] ${isEditing ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}>
                                {isEditing ? <Edit size={18} /> : <CheckCircle2 size={18} />}
                                {isEditing ? "UPDATE VEHICLE" : "REGISTER VEHICLE"}
                            </button>
                            <button type="button" onClick={clearForm} className="px-8 py-4 rounded-xl border-2 border-border-custom text-foreground/70 font-bold hover:bg-background transition-colors">
                                {isEditing ? "CANCEL" : "CLEAR"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* List & Stats Column */}
            <div className="flex-[1.5] w-full flex flex-col gap-6">
                <div className="bg-card border border-border-custom rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl font-extrabold text-foreground">Registered Jeepneys</h2>
                            <p className="text-sm text-foreground/50 font-medium">{filteredVehicles.length} vehicles shown</p>
                        </div>
                        <button className="flex flex-row items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 rounded-lg font-bold text-sm transition-colors">
                            <Download size={16} /> Export Data
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-background border border-border-custom rounded-xl">
                        <div className="flex-1 relative">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 bg-card border border-border-custom rounded-lg text-sm text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                            />
                        </div>
                        <div className="w-full sm:w-48 relative">
                            <Filter size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                            <select
                                value={selectedFilter}
                                onChange={(e) => setSelectedFilter(e.target.value)}
                                className="w-full pl-10 pr-8 py-3 bg-card border border-border-custom rounded-lg text-sm font-bold text-foreground appearance-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                            >
                                <option value="All">Filter: All</option>
                                <option value="Active">Filter: Active</option>
                                <option value="Inactive">Filter: Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {filteredVehicles.map((vehicle) => (
                            <div key={vehicle.vehicleId} className="bg-card border border-border-custom rounded-xl p-4 shadow-sm flex items-start gap-5 hover:shadow-md transition-shadow">
                                <button onClick={() => toggleStatus(vehicle.vehicleId)} className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-white ${vehicle.status === "Active" ? "bg-linear-to-br from-emerald-400 to-emerald-600" : "bg-linear-to-br from-amber-400 to-amber-600"}`}>
                                    <Bus size={28} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                        <span className="text-base font-extrabold text-foreground">{vehicle.vehicleId}</span>
                                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md text-[11px] font-bold">{vehicle.vehicleModel}</span>
                                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${vehicle.status === "Active" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>{vehicle.status}</span>
                                    </div>
                                    <div className="text-[13px] font-semibold text-foreground/60 mb-1.5">Plate: {vehicle.plateNumber} | Route: {vehicle.route}</div>
                                    <div className="text-xs text-foreground/50 font-medium">
                                        Driver: <span className="font-bold text-foreground">{vehicle.driverName}</span> • Operator: <span className="font-bold text-foreground">{vehicle.operator}</span>
                                    </div>
                                </div>
                                <button onClick={() => startEdit(vehicle)} className="p-2 text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors">
                                    <Edit size={22} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <StatCard icon={<CheckCircle2 size={24} />} label="Active Vehicles" value={activeCount} colorClass="text-emerald-500" subLabel="On Route" />
                    <StatCard icon={<PauseCircle size={24} />} label="Inactive Vehicles" value={inactiveCount} colorClass="text-amber-500" subLabel="Maintenance" />
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ icon, label, value, colorClass, subLabel }: any) => (
    <div className="flex-1 bg-card border border-border-custom rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl bg-background flex items-center justify-center ${colorClass}`}>{icon}</div>
            <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold bg-background uppercase tracking-wider ${colorClass}`}>{subLabel}</div>
        </div>
        <div className="text-xs font-bold text-foreground/50 mb-1">{label}</div>
        <div className={`text-2xl font-black ${colorClass}`}>{value}</div>
    </div>
);

const InputField = ({ label, type = "text", value, onChange, maxLength, required = false }: any) => (
    <div className="flex flex-col">
        <label className="text-[13px] font-bold text-foreground/80 mb-1.5">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            maxLength={maxLength}
            required={required}
            className="px-4 py-3 bg-background border border-border-custom rounded-xl text-sm font-semibold text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
    </div>
);

const SelectField = ({ label, value, options, onChange }: any) => (
    <div className="flex flex-col">
        <label className="text-[13px] font-bold text-foreground/80 mb-1.5">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                className="w-full pl-4 pr-10 py-3 bg-background border border-border-custom rounded-xl text-sm font-semibold text-foreground appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
            >
                {options.map((opt: string) => (
                    <option key={opt} value={opt} className="bg-card">{opt}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-foreground/40">
                <svg className="fill-current w-4 h-4" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
            </div>
        </div>
    </div>
);