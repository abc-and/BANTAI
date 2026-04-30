"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Bus, Edit, Search, X, Plus, CheckCircle, RefreshCw } from "lucide-react";

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

const VEHICLE_TYPE_OPTIONS = ["Electric", "HINO", "Euro 4"];
const VEHICLE_MODEL_OPTIONS = ["Hino", "Others"];

export default function ModernJeepneyRegistration() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const t = (dark: string, light: string) => (isDark ? dark : light);

  const [registeredVehicles, setRegisteredVehicles] = useState<ModernJeepney[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<{ id: string; name: string }[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<{ id: string; name: string }[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [editingVehicle, setEditingVehicle] = useState<ModernJeepney | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successType, setSuccessType] = useState<"register" | "update">("register");
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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
    setIsLoading(true);
    try {
      const response = await fetch(`/api/vehicles?t=${Date.now()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error || "Failed to load vehicles");
      }
      const rawVehicles = await response.json();
      // Deduplicate by vehicleId to prevent React key conflicts
      const seen = new Set<string>();
      const unique = rawVehicles.filter((v: any) => {
        if (seen.has(v.vehicleId)) return false;
        seen.add(v.vehicleId);
        return true;
      });
      let filtered: ModernJeepney[] = unique.map(normalizeVehicle);
      
      // Filter by operator if not super admin
      const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "SUPERADMIN";
      if (user && !isSuperAdmin && user.operatorName) {
        filtered = filtered.filter(v => v.operator === user.operatorName);
      }
      
      setRegisteredVehicles(filtered);
    } catch (error) {
      console.error("Load error:", error);
    }
  };

  const loadOperators = async () => {
    try {
      const response = await fetch("/api/operators");
      if (!response.ok) throw new Error("Failed to load operators");
      const data = await response.json();
      setOperatorOptions(data.map((op: any) => ({ id: op.operator_id, name: op.operator_name })));
    } catch (error) {
      console.error("Operator load error:", error);
    }
  };

  const loadRoutes = async () => {
    try {
      const res = await fetch("/api/routes");
      if (!res.ok) throw new Error("Failed to load routes");
      const data = await res.json();
      setAvailableRoutes(data.map((r: any) => ({ id: r.route_id, name: r.route_name })));
    } catch (error) {
      console.error("Route load error:", error);
    }
  };

  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 10000); // Refresh every 10s
    loadOperators();
    loadRoutes();
    return () => clearInterval(interval);
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
    setOperator("");
    setSelectedRoute("");
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

  useEffect(() => {
    if (user && user.operatorName && !operator) {
      setOperator(user.operatorName);
    }
  }, [user, operator]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    const payload = {
      vehicleId,
      driverName,
      plateNumber,
      vehicleType,
      vehicleModel,
      operatorName: operator.trim(),
      routeName: selectedRoute.trim(),
      sittingCapacity: parseInt(sittingCapacity, 10),
      standingCapacity: parseInt(standingCapacity, 10),
      speedLimit: parseInt(speedLimit, 10),
    };

    try {
      const response = await fetch(
        editingVehicle ? `/api/vehicles/${editingVehicle.vehicleId}` : "/api/vehicles",
        {
          method: editingVehicle ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Submission failed");
      }

      await loadVehicles();
      const type = editingVehicle ? "update" : "register";
      setSuccessType(type);
      closeModal();
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 4000);
    } catch (error: any) {
      setErrorMessage(error?.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (id: string) => {
    const vehicle = registeredVehicles.find((v) => v.vehicleId === id);
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
      v.route.toLowerCase().includes(query);
    const filterMatch =
      selectedFilter === "All" ||
      (selectedFilter === "Active" && v.status === "Active") ||
      (selectedFilter === "Inactive" && v.status === "Inactive");
    return searchMatch && filterMatch;
  });

  return (
    <div className={`flex h-full transition-colors duration-300 ${t("bg-[#0f172a]", "bg-slate-50")}`}>
      <div className="flex flex-col flex-1 min-w-0">

        {/* HEADER */}
        <div className={`px-4 border-b ${t("bg-[#0f172a] border-slate-800", "bg-white border-slate-200")}`}>
          <div className="max-w-[1600px] mx-auto py-6 flex flex-col items-center justify-center text-center">
            <h1 className={`text-xl font-black tracking-tight uppercase ${t("text-white", "text-slate-800")}`}>
              Modern Jeepney Registration
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${t("text-slate-400", "text-slate-500")}`}>
              Fleet Management &amp; Vehicle Registration
            </p>
          </div>
        </div>

        {/* CONTROL BAR */}
        <div className={`border-b px-4 py-3 flex items-center gap-3 transition-colors duration-300 ${t("bg-[#1e293b]/50 border-slate-700", "bg-white border-slate-200")}`}>
          <div className="relative flex-1 max-w-xs">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t("text-slate-500", "text-slate-400")}`} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${t("bg-slate-800 border-slate-700 text-white placeholder-slate-500", "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400")}`}
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={loadVehicles}
              disabled={isLoading}
              className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 transition-all active:scale-95 ${t("bg-slate-800 border-slate-700 text-slate-400 hover:text-white", "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}`}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
                Synced {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </button>
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg"
            >
              <Plus size={14} strokeWidth={3} />Register
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="flex-1 overflow-hidden p-4">
          <div className={`h-full rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ${t("bg-[#1e293b] border-slate-700 shadow-xl", "bg-white border-slate-200 shadow-sm")}`}>
            <div className={`grid grid-cols-[60px_1fr_120px_140px_100px_1fr_100px_90px] px-3 py-3 border-b-2 text-[10px] font-extrabold tracking-widest uppercase transition-colors duration-300 ${t("bg-slate-800/50 border-slate-700 text-slate-400", "bg-blue-50 border-blue-200 text-slate-600")}`}>
              <div className="text-center">Status</div>
              <div>Vehicle ID</div>
              <div className="text-center">Plate</div>
              <div>Driver</div>
              <div className="text-center">Type</div>
              <div>Route</div>
              <div className="text-center">Cap.</div>
              <div className="text-center">Edit</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <Bus className="w-16 h-16 opacity-30" />
                  <p className={`font-bold ${t("text-slate-500", "text-slate-500")}`}>No vehicles found</p>
                </div>
              ) : (
                filteredVehicles.map((v, index) => (
                  <div
                    key={`${v.vehicleId}-${index}`}
                    className={`grid grid-cols-[60px_1fr_120px_140px_100px_1fr_100px_90px] px-3 py-3 border-b transition-all duration-200 ${t("border-slate-800 hover:bg-slate-800/40", "border-slate-100 hover:bg-slate-50")}`}
                  >
                    <div className="flex justify-center items-center">
                      <button
                        onClick={() => toggleStatus(v.vehicleId)}
                        className={`w-3 h-3 rounded-full ${v.status === "Active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-500"}`}
                      />
                    </div>
                    <div className={`flex items-center text-[11px] font-mono font-bold ${t("text-slate-300", "text-slate-700")}`}>{v.vehicleId}</div>
                    <div className="flex items-center justify-center">
                      <span className={`px-2 py-1 text-[10px] font-black rounded border truncate max-w-[80px] ${t("bg-slate-800 text-white border-slate-700", "bg-white text-slate-800 border-slate-300 shadow-sm")}`}>{v.plateNumber}</span>
                    </div>
                    <div className={`flex items-center text-[11px] font-semibold truncate pr-2 ${t("text-slate-300", "text-slate-700")}`}>{v.driverName}</div>
                    <div className="flex items-center justify-center">
                      <span className={`px-2 py-1 text-[9px] font-black rounded uppercase ${t("bg-blue-900/30 text-blue-400 border border-blue-800/50", "bg-blue-50 text-blue-600 border border-blue-200")}`}>{v.vehicleType}</span>
                    </div>
                    <div className={`flex items-center text-[10px] truncate ${t("text-slate-400", "text-slate-600")}`}>{v.route}</div>
                    <div className={`flex items-center justify-center text-[10px] font-bold ${t("text-slate-400", "text-slate-600")}`}>{v.sittingCapacity + v.standingCapacity}</div>
                    <div className="flex justify-center items-center">
                      <button
                        onClick={() => startEdit(v)}
                        className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${t("text-blue-400 hover:bg-slate-800", "text-blue-600 hover:bg-blue-50")}`}
                      >
                        <Edit size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className={`w-full max-w-[480px] rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ${t("bg-slate-900 border border-slate-800", "bg-white border border-slate-200")}`}>
              {/* Modal Header */}
              <div className={`px-8 py-8 flex items-start justify-between border-b ${t("border-slate-800", "border-slate-100")}`}>
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-[24px] shadow-sm border ${t("bg-blue-500/20 border-blue-500/20", "bg-blue-50 border-blue-100")}`}>
                    <Bus className={`w-10 h-10 ${t("text-blue-400", "text-blue-600")}`} />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black tracking-tight leading-none uppercase ${t("text-white", "text-slate-800")}`}>
                      {editingVehicle ? "Edit Jeepney" : "New Jeepney"}
                    </h2>
                    <p className="text-slate-400 text-sm font-medium mt-2">Vehicle Registration</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className={`p-2 rounded-full transition-colors ${t("text-slate-400 hover:text-white hover:bg-slate-800", "text-slate-400 hover:text-slate-600 hover:bg-slate-100")}`}
                >
                  <X className="w-6 h-6" strokeWidth={3} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="max-h-[70vh] overflow-y-auto p-8 space-y-6">
                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 text-sm font-bold border border-red-500/20">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      isDark={isDark}
                      label="Vehicle ID"
                      value={vehicleId}
                      onChange={(e: any) => setVehicleId(e.target.value.toUpperCase())}
                      required
                      disabled={!!editingVehicle}
                    />
                    <InputField
                      isDark={isDark}
                      label="Plate Number"
                      value={plateNumber}
                      onChange={(e: any) => setPlateNumber(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <InputField
                    isDark={isDark}
                    label="Driver's Name"
                    value={driverName}
                    onChange={(e: any) => setDriverName(e.target.value)}
                    required
                  />

                  <div>
                    <SectionLabel color="bg-blue-500" textColor="text-blue-500" label="Vehicle Specifications" />
                    <div className="mt-3">
                      <SelectField
                        isDark={isDark}
                        label="Vehicle Type"
                        value={vehicleType}
                        onChange={(e: any) => setVehicleType(e.target.value)}
                        options={VEHICLE_TYPE_OPTIONS}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <SectionLabel color="bg-emerald-500" textColor="text-emerald-500" label="Route & Operator" />
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <SelectField
                        isDark={isDark}
                        label="Operator"
                        value={operator}
                        onChange={(e: any) => setOperator(e.target.value)}
                        options={operatorOptions.map((op) => op.name)}
                        required
                      />
                      <SelectField
                        isDark={isDark}
                        label="Designated Route"
                        value={selectedRoute}
                        onChange={(e: any) => setSelectedRoute(e.target.value)}
                        options={availableRoutes.map((r) => r.name)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <SectionLabel color="bg-amber-500" textColor="text-amber-500" label="Capacity" />
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <InputField
                        isDark={isDark}
                        label="Sitting"
                        type="number"
                        value={sittingCapacity}
                        onChange={(e: any) => setSittingCapacity(e.target.value)}
                        required
                      />
                      <InputField
                        isDark={isDark}
                        label="Standing"
                        type="number"
                        value={standingCapacity}
                        onChange={(e: any) => setStandingCapacity(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <SectionLabel color="bg-rose-500" textColor="text-rose-500" label="Speed Limit" />
                    <div className="mt-3">
                      <InputField
                        isDark={isDark}
                        label="Speed Limit (km/h)"
                        type="number"
                        value={speedLimit}
                        onChange={(e: any) => setSpeedLimit(e.target.value)}
                        required
                        placeholder="e.g. 60"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-60"
                    >
                      {isSaving ? "SAVING..." : editingVehicle ? "UPDATE" : "REGISTER"}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className={`px-8 py-4 rounded-2xl font-bold text-sm uppercase transition-all ${t("bg-slate-800 hover:bg-slate-700 text-slate-300", "bg-slate-100 hover:bg-slate-200 text-slate-600")}`}
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS NOTIFICATION TILE */}
        {showSuccessModal && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[3000] animate-in fade-in slide-in-from-top-4 duration-500">
            <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border-2 backdrop-blur-xl ${
              successType === "register" 
                ? t("bg-emerald-500/20 border-emerald-500/50 text-emerald-400", "bg-white border-emerald-200 text-emerald-800")
                : t("bg-blue-500/20 border-blue-500/50 text-blue-400", "bg-white border-blue-200 text-blue-800")
            }`}>
              <div className={`p-2 rounded-xl ${successType === "register" ? "bg-emerald-500" : "bg-blue-500"}`}>
                <CheckCircle size={20} className="text-white" strokeWidth={3} />
              </div>
              <div className="flex flex-col">
                <p className="text-[11px] font-black uppercase tracking-wider">
                  {successType === "register" ? "Registered Successfully" : "Updated Successfully"}
                </p>
                <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">
                  {successType === "register" ? "New vehicle added to fleet" : "Vehicle details have been synced"}
                </p>
              </div>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="ml-4 p-1 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ color, textColor, label }: { color: string; textColor: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1 h-4 ${color} rounded-full`} />
      <h3 className={`text-[10px] font-black uppercase tracking-wider ${textColor}`}>{label}</h3>
    </div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  required,
  disabled,
  placeholder,
  isDark,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  isDark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 ${isDark ? "bg-slate-800/50 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"}`}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
  isDark,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  required?: boolean;
  disabled?: boolean;
  isDark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`w-full px-4 py-3 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all cursor-pointer disabled:opacity-50 ${isDark ? "bg-slate-800/50 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
        >
          <option value="" disabled>Select {label}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}