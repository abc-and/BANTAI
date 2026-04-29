"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Bus, Edit, CheckCircle2, Search, X, Download, Plus
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

const VEHICLE_TYPE_OPTIONS = ["Electric", "Diesel-Electric Hybrid", "Euro 4 Compliant"];
const VEHICLE_MODEL_OPTIONS = ["Hino", "Others"];

export default function ModernJeepneyRegistration() {
  const [registeredVehicles, setRegisteredVehicles] = useState<ModernJeepney[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<string[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [editingVehicle, setEditingVehicle] = useState<ModernJeepney | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [vehicleId, setVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPE_OPTIONS[0]);
  const [vehicleModel, setVehicleModel] = useState(VEHICLE_MODEL_OPTIONS[0]);
  const [operator, setOperator] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [sittingCapacity, setSittingCapacity] = useState("");
  const [standingCapacity, setStandingCapacity] = useState("");
  const [speedLimit, setSpeedLimit] = useState("");

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
    violationCount: raw.violationCount ?? 0,
  });

  const loadVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      if (!response.ok) throw new Error("Failed to load vehicles");
      const rawVehicles = await response.json();
      const vehicles = rawVehicles.map(normalizeVehicle);
      setRegisteredVehicles(vehicles);
      return vehicles;
    } catch (error) {
      console.error("Load error:", error);
    }
  };

  const loadOperators = async () => {
    try {
      const response = await fetch("/api/operators");
      if (!response.ok) throw new Error("Failed to load operators");
      const data = await response.json();
      const names = data.map((op: any) => typeof op === "string" ? op : op.operator_name);
      setOperatorOptions(names);
      if (names.length > 0) setOperator(names[0]);
    } catch (error) {
      console.error("Operator load error:", error);
      setOperatorOptions(["MANTRASCO", "UDOTCO", "Others"]);
    }
  };

  const loadRoutes = async () => {
    try {
      const res = await fetch("/api/routes");
      if (!res.ok) throw new Error("Failed to load routes");
      const data = await res.json();
      const names = data.map((r: any) => r.route_name);
      setAvailableRoutes(names);
      if (names.length > 0) setSelectedRoute(names[0]);
    } catch (error) {
      console.error("Route load error:", error);
    }
  };

  useEffect(() => {
    loadVehicles();
    loadOperators();
    loadRoutes();
  }, []);

  const getNextVehicleId = (vehicles: ModernJeepney[]) => {
    const numbers = vehicles.map((v) => parseInt(v.vehicleId.replace(/^MPUJ-0*/, ""), 10) || 0);
    const nextNumber = Math.max(0, ...numbers) + 1;
    return `MPUJ-${String(nextNumber).padStart(3, "0")}`;
  };

  const resetForm = () => {
    setVehicleId(getNextVehicleId(registeredVehicles));
    setDriverName("");
    setPlateNumber("");
    setVehicleType(VEHICLE_TYPE_OPTIONS[0]);
    setVehicleModel(VEHICLE_MODEL_OPTIONS[0]);
    setOperator(operatorOptions[0] || "");
    setSelectedRoute(availableRoutes[0] || "");
    setSittingCapacity("");
    setStandingCapacity("");
    setSpeedLimit("");
    setEditingVehicle(null);
    setErrorMessage(null);
  };

  const openModal = () => { resetForm(); setShowModal(true); };
  const closeModal = () => { setShowModal(false); resetForm(); };

  const startEdit = (vehicle: ModernJeepney) => {
    setEditingVehicle(vehicle);
    setVehicleId(vehicle.vehicleId);
    setDriverName(vehicle.driverName);
    setPlateNumber(vehicle.plateNumber);
    setVehicleType(vehicle.vehicleType);
    setVehicleModel(vehicle.vehicleModel);
    setOperator(vehicle.operator);
    setSelectedRoute(vehicle.route);
    setSittingCapacity(vehicle.sittingCapacity.toString());
    setStandingCapacity(vehicle.standingCapacity.toString());
    setSpeedLimit(vehicle.speedLimit.toString());
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sitting = parseInt(sittingCapacity, 10);
    const standing = parseInt(standingCapacity, 10);
    const speed = parseInt(speedLimit, 10);

    const payload = {
      vehicleId, driverName, plateNumber, vehicleType, vehicleModel,
      operator, routeName: selectedRoute,
      sittingCapacity: sitting, standingCapacity: standing, speedLimit: speed,
    };

    if (editingVehicle) {
      try {
        const response = await fetch(`/api/vehicles/${editingVehicle.vehicleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to update vehicle");
        await loadVehicles();
        closeModal();
      } catch (error) {
        setErrorMessage("Failed to update vehicle");
      }
      return;
    }

    if (!window.confirm(`Register ${vehicleId} for route ${selectedRoute}?`)) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Failed to register vehicle");
      }

      await loadVehicles();
      closeModal();
    } catch (error: any) {
      setErrorMessage(error?.message || "Registration failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (id: string) => {
    const vehicle = registeredVehicles.find(v => v.vehicleId === id);
    if (!vehicle) return;
    const newStatus = vehicle.status === "Active" ? "INACTIVE" : "ACTIVE";
    try {
      const response = await fetch(`/api/vehicles/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      await loadVehicles();
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  const filteredVehicles = registeredVehicles.filter((v) => {
    const query = searchQuery.toLowerCase();
    const searchMatch =
      query === "" ||
      v.vehicleId.toLowerCase().includes(query) ||
      v.driverName.toLowerCase().includes(query) ||
      v.plateNumber.toLowerCase().includes(query) ||
      v.vehicleModel.toLowerCase().includes(query) ||
      v.route.toLowerCase().includes(query);
    const filterMatch =
      selectedFilter === "All" ||
      (selectedFilter === "Active" && v.status === "Active") ||
      (selectedFilter === "Inactive" && v.status === "Inactive");
    return searchMatch && filterMatch;
  });

  const activeCount = registeredVehicles.filter(v => v.status === "Active").length;
  const inactiveCount = registeredVehicles.filter(v => v.status === "Inactive").length;

  return (
    <div className="bg-background text-foreground h-full flex flex-col">
      {/* Header */}
      <div className="px-4 border-b bg-background border-border-custom">
        <div className="max-w-[1600px] mx-auto py-6 flex flex-col items-center justify-center text-center">
          <h1 className="text-xl font-black tracking-tight uppercase text-foreground">Modern Jeepney Registry</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Fleet Management & Vehicle Registration</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b px-4 py-3 grid grid-cols-2 gap-3 bg-muted/30 border-border-custom">
        <StatChip label="Active Vehicles" count={activeCount} color="green" />
        <StatChip label="Inactive Vehicles" count={inactiveCount} color="amber" />
      </div>

      {/* Control Bar */}
      <div className="border-b px-4 py-3 flex items-center gap-3 bg-background border-border-custom">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="text"
              placeholder="Search by ID, Driver, Plate, or Route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-background border-border-custom text-foreground placeholder-foreground/40"
            />
          </div>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="border rounded-xl px-4 py-2.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-background border-border-custom text-foreground"
          >
            <option value="All">All Vehicles</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg"
          >
            <Plus size={14} />Register
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg"
          >
            <Download size={14} />Export Data
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full rounded-2xl border flex flex-col overflow-hidden bg-card border-border-custom shadow-sm">
          <div className="grid grid-cols-[60px_1fr_120px_140px_100px_1fr_100px_90px] px-3 py-3 border-b-2 text-[10px] font-extrabold tracking-widest uppercase bg-muted/50 border-border-custom text-foreground/60">
            <div className="flex items-center justify-center">Status</div>
            <div>Vehicle ID</div>
            <div>Plate Number</div>
            <div>Driver</div>
            <div className="text-center">Type</div>
            <div>Route</div>
            <div className="text-center">Capacity</div>
            <div className="text-center">Actions</div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-foreground/40 gap-3">
                <Bus className="w-16 h-16 opacity-30" />
                <div className="text-center">
                  <p className="font-bold">No vehicles found</p>
                  <p className="text-xs">Click the Register button to add a new jeepney</p>
                </div>
              </div>
            ) : (
              filteredVehicles.map((v) => {
                const isActive = v.status === "Active";
                const totalCapacity = v.sittingCapacity + v.standingCapacity;
                return (
                  <div
                    key={v.vehicleId}
                    className="grid grid-cols-[60px_1fr_120px_140px_100px_1fr_100px_90px] px-3 py-3 border-b border-border-custom hover:bg-muted/30 transition-all duration-200"
                  >
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleStatus(v.vehicleId)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isActive ? "bg-emerald-500/20 hover:bg-emerald-500/30" : "bg-amber-500/20 hover:bg-amber-500/30"}`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                      </button>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[11px] font-mono font-bold text-foreground">{v.vehicleId}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="px-2 py-1 text-[10px] font-black rounded border bg-background border-border-custom text-foreground">{v.plateNumber}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[11px] font-semibold text-foreground truncate">{v.driverName}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="px-2 py-1 text-[9px] font-black rounded border bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap">
                        {v.vehicleType === "Electric" ? "⚡ Electric" : v.vehicleType === "Diesel-Electric Hybrid" ? "🔋 Hybrid" : "🌿 Euro 4"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-medium truncate pr-2 text-foreground/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate">{v.route.split(" - ")[0]}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-[10px] font-bold text-foreground/80">{totalCapacity}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => startEdit(v)}
                        className="p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 text-blue-500 hover:bg-blue-500/10"
                        title="Edit Vehicle"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 bg-card border border-border-custom">
            <div className="relative px-5 pt-5 pb-3 border-b border-border-custom bg-gradient-to-r from-blue-500/10 to-transparent">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${editingVehicle ? "bg-gradient-to-br from-amber-500 to-rose-500" : "bg-gradient-to-br from-blue-500 to-blue-700"}`}>
                    {editingVehicle ? <Edit size={20} /> : <Bus size={20} />}
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-foreground">{editingVehicle ? "Edit Jeepney" : "New Jeepney"}</h2>
                    <p className="text-[10px] text-foreground/50 font-medium mt-0.5">
                      {editingVehicle ? "Update vehicle information" : "Add a modernized jeepney to fleet"}
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-muted transition-all text-foreground/50 hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="p-5">
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-medium flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <SectionLabel color="bg-blue-500" textColor="text-blue-500" label="Basic Information" />
                    <InputField label="Vehicle ID" value={vehicleId} onChange={(e: any) => setVehicleId(e.target.value.toUpperCase())} required disabled={!!editingVehicle} placeholder="e.g., MPUJ-001" />
                    <InputField label="Driver's Name" value={driverName} onChange={(e: any) => setDriverName(e.target.value)} required placeholder="Full name of assigned driver" />
                    <InputField label="Plate Number" value={plateNumber} onChange={(e: any) => setPlateNumber(e.target.value.toUpperCase())} maxLength={7} required placeholder="ABC-1234" />
                  </div>

                  {/* Specifications */}
                  <div className="space-y-3">
                    <SectionLabel color="bg-purple-500" textColor="text-purple-500" label="Specifications" />
                    <SelectField label="Vehicle Type" value={vehicleType} onChange={(e: any) => setVehicleType(e.target.value)} options={VEHICLE_TYPE_OPTIONS} />
                    <SelectField label="Vehicle Model" value={vehicleModel} onChange={(e: any) => setVehicleModel(e.target.value)} options={VEHICLE_MODEL_OPTIONS} />
                    <SelectField label="Operator" value={operator} onChange={(e: any) => setOperator(e.target.value)} options={operatorOptions} />
                  </div>

                  {/* Route */}
                  <div className="space-y-3">
                    <SectionLabel color="bg-emerald-500" textColor="text-emerald-500" label="Route" />
                    <SelectField label="Designated Route" value={selectedRoute} onChange={(e: any) => setSelectedRoute(e.target.value)} options={availableRoutes} />
                  </div>

                  {/* Capacity */}
                  <div className="space-y-3">
                    <SectionLabel color="bg-amber-500" textColor="text-amber-500" label="Capacity & Limits" />
                    <div className="grid grid-cols-2 gap-3">
                      <InputField label="Sitting" type="number" value={sittingCapacity} onChange={(e: any) => setSittingCapacity(e.target.value.replace(/\D/g, ""))} required placeholder="Seats" />
                      <InputField label="Standing" type="number" value={standingCapacity} onChange={(e: any) => setStandingCapacity(e.target.value.replace(/\D/g, ""))} required placeholder="Standing" />
                    </div>
                    <InputField label="Speed Limit (km/h)" type="number" value={speedLimit} onChange={(e: any) => setSpeedLimit(e.target.value.replace(/\D/g, ""))} required placeholder="Maximum speed limit" />
                  </div>

                  {/* Actions */}
                  <div className="sticky bottom-0 pt-4 pb-1 flex gap-3 bg-card">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`flex-1 py-3 flex flex-row items-center justify-center gap-2 rounded-xl text-white font-bold transition-all transform active:scale-[0.98] shadow-lg text-[11px] ${editingVehicle ? "bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600" : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {editingVehicle ? <Edit size={14} /> : <CheckCircle2 size={14} />}
                      {isSaving ? "SAVING..." : editingVehicle ? "UPDATE" : "REGISTER"}
                    </button>
                    <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl border border-border-custom text-foreground/60 font-bold hover:bg-muted transition-all transform active:scale-95 text-[11px]">
                      CANCEL
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SectionLabel({ color, textColor, label }: { color: string; textColor: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1 h-4 ${color} rounded-full`} />
      <h3 className={`text-[10px] font-black uppercase tracking-wider ${textColor}`}>{label}</h3>
    </div>
  );
}

function StatChip({ label, count, color }: { label: string; count: number; color: "green" | "amber" }) {
  const colors = {
    green: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  }[color];
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
      <div className={`p-2.5 rounded-xl ${colors.bg}`}>
        <Bus size={20} className={colors.text} />
      </div>
      <div>
        <div className={`text-2xl font-black leading-none tracking-tight ${colors.text}`}>{count}</div>
        <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${colors.text}/70`}>{label}</div>
      </div>
    </div>
  );
}

const InputField = ({ label, type = "text", value, onChange, maxLength, required = false, disabled = false, placeholder }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      maxLength={maxLength}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-background border border-border-custom rounded-xl text-sm font-medium text-foreground placeholder:text-foreground/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

const SelectField = ({ label, value, options, onChange }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2.5 bg-background border border-border-custom rounded-xl text-sm font-medium text-foreground appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
      >
        {options && options.map((opt: string, i: number) => (
          <option key={`${opt}-${i}`} value={opt} className="bg-card">{opt}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-foreground/40">
        <svg className="fill-current w-3 h-3" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  </div>
);