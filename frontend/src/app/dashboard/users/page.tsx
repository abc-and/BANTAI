"use client";

import { useEffect, useState } from "react";
import {
  Shield, Users, UserPlus, Trash2, X, ChevronDown,
  ChevronRight, Search, Building2, User, AlertCircle,
  Eye, EyeOff, RefreshCw, Plus, Mail, Phone
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = "http://localhost:4000";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "SUPERADMIN" | "ADMIN" | "MANAGER";

/**
 * Shape returned by your /api/auth/login route:
 *   { id, email, firstName, lastName, role, isActive, createdAt }
 *
 * NOTE: there is no `username` or `operator_id` in this response.
 * - role === "ADMIN" with no operator_id  → treated as SUPERADMIN
 * - role === "ADMIN" with an operator_id  → operator-level admin
 * - role === "MANAGER"                    → read-only manager view
 */
interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  operator_id?: string;   // only present for operator-scoped admins/managers
  operator_name?: string;
  isActive: boolean;
  createdAt: string;
}

interface Operator {
  operator_id: string;
  operator_name: string;
  email?: string;
  contact_number?: string;
}

interface OperatorUser {
  user_id: string;
  username: string;
  employee_name: string;
  email: string;
  contact_number: string;
  role: "ADMIN" | "MANAGER";
  operator_id: string;
  operator_name: string;
}

interface OperatorGroup {
  operator: Operator;
  admin: OperatorUser | null;
  managers: OperatorUser[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getToken = () =>
  typeof window !== "undefined"
    ? localStorage.getItem("bantai_token") ?? ""
    : "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: rawAuthUser, loading } = useAuth();

  /**
   * Normalize the raw auth context user into our local AuthUser shape.
   *
   * Your login API returns:
   *   { id, email, firstName, lastName, role, isActive, createdAt }
   *
   * It does NOT return `username` or `operator_id`.
   * A plain ADMIN account (no operator_id) is treated as SUPERADMIN.
   */
  const currentUser: AuthUser | null = rawAuthUser
    ? (() => {
        const u = rawAuthUser as any;
        const rawRole: string = u.role ?? "";
        const operatorId: string | undefined =
          u.operator_id ?? u.operatorId ?? undefined;

        // Determine effective role:
        // - "ADMIN" without an operator_id → this is the global SUPERADMIN
        // - "ADMIN" with an operator_id    → operator-scoped admin
        // - anything else                  → keep as-is (e.g. "MANAGER")
        let effectiveRole: Role;
        if (rawRole === "ADMIN" && !operatorId) {
          effectiveRole = "SUPERADMIN";
        } else {
          effectiveRole = rawRole as Role;
        }

        return {
          id: u.id ?? u.user_id ?? "",
          email: u.email ?? "",
          firstName: u.firstName ?? u.first_name ?? "",
          lastName: u.lastName ?? u.last_name ?? "",
          role: effectiveRole,
          operator_id: operatorId,
          operator_name: u.operator_name ?? u.operatorName ?? undefined,
          isActive: u.isActive ?? u.is_active ?? true,
          createdAt: u.createdAt ?? u.created_at ?? "",
        };
      })()
    : null;

  if (loading) {
    return (
      <div className="bg-background text-foreground h-full flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-background text-foreground h-full flex items-center justify-center">
        <p className="text-foreground/50 text-sm">Not authenticated.</p>
      </div>
    );
  }

  // Route to the correct view based on effective role
  if (currentUser.role === "SUPERADMIN") {
    return <SuperAdminView currentUser={currentUser} />;
  }

  if (currentUser.role === "ADMIN") {
    return <OperatorAdminView currentUser={currentUser} />;
  }

  // MANAGER — read-only profile view
  const displayName =
    [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
    currentUser.email ||
    "Manager";

  return (
    <div className="bg-background text-foreground h-full flex flex-col">
      <PageHeader title="Users" subtitle="Your account information" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
            <User size={24} className="text-blue-500" />
          </div>
          <p className="text-sm font-bold text-foreground">{displayName}</p>
          <p className="text-[11px] text-foreground/50 uppercase tracking-wider">
            Manager{currentUser.operator_name ? ` · ${currentUser.operator_name}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SuperAdmin View ──────────────────────────────────────────────────────────

type ModalMode = "operator" | "admin" | null;

function SuperAdminView({ currentUser }: { currentUser: AuthUser }) {
  const [groups, setGroups] = useState<OperatorGroup[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalTarget, setModalTarget] = useState<Operator | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Operator form
  const [opName, setOpName] = useState("");
  const [opEmail, setOpEmail] = useState("");
  const [opContact, setOpContact] = useState("");

  // Admin form
  const [auEmployeeName, setAuEmployeeName] = useState("");
  const [auEmail, setAuEmail] = useState("");
  const [auContact, setAuContact] = useState("");
  const [auUsername, setAuUsername] = useState("");
  const [auPassword, setAuPassword] = useState("");
  const [auShowPw, setAuShowPw] = useState(false);

  const load = async () => {
    try {
      const [opsRes, usersRes] = await Promise.all([
        fetch(`${API}/api/operators`, { headers: authHeaders() }),
        fetch(`${API}/api/operator-users`, { headers: authHeaders() }),
      ]);
      const ops: Operator[] = await opsRes.json();
      const users: OperatorUser[] = await usersRes.json();

      const built: OperatorGroup[] = ops.map((op) => {
        const opUsers = users.filter(
          (u) => u.operator_id === op.operator_id
        );
        return {
          operator: op,
          admin: opUsers.find((u) => u.role === "ADMIN") ?? null,
          managers: opUsers.filter((u) => u.role === "MANAGER"),
        };
      });
      setGroups(built);

      const exp: Record<string, boolean> = {};
      ops.forEach((op) => (exp[op.operator_id] = true));
      setExpanded(exp);
    } catch {
      setError("Failed to load data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openOperatorModal = () => {
    setOpName("");
    setOpEmail("");
    setOpContact("");
    setError(null);
    setModalMode("operator");
  };

  const openAdminModal = (op: Operator) => {
    setModalTarget(op);
    setAuEmployeeName("");
    setAuEmail("");
    setAuContact("");
    setAuUsername("");
    setAuPassword("");
    setAuShowPw(false);
    setError(null);
    setModalMode("admin");
  };

  const closeModal = () => {
    setModalMode(null);
    setModalTarget(null);
  };

  const handleCreateOperator = async () => {
    if (!opName.trim() || !opEmail.trim() || !opContact.trim()) {
      setError("All fields are required");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/operators`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          operator_name: opName.trim(),
          email: opEmail.trim(),
          contact_number: opContact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create operator");
      closeModal();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!modalTarget) return;
    if (
      !auEmployeeName.trim() ||
      !auEmail.trim() ||
      !auContact.trim() ||
      !auUsername.trim() ||
      !auPassword.trim()
    ) {
      setError("All fields are required");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/operator-users`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          operator_id: modalTarget.operator_id,
          employee_name: auEmployeeName.trim(),
          email: auEmail.trim(),
          contact_number: auContact.trim(),
          username: auUsername.trim(),
          password: auPassword,
          role: "ADMIN",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      closeModal();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      await fetch(`${API}/api/operator-users/${userId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      await load();
    } catch {
      alert("Failed to delete user");
    }
  };

  const handleDeleteOperator = async (operatorId: string) => {
    if (
      !confirm(
        "Delete this operator? This will also remove all their users."
      )
    )
      return;
    try {
      await fetch(`${API}/api/operators/${operatorId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      await load();
    } catch {
      alert("Failed to delete operator");
    }
  };

  const filtered = groups.filter(
    (g) =>
      search === "" ||
      g.operator.operator_name
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const totalAdmins = groups.filter((g) => g.admin).length;
  const totalManagers = groups.reduce((s, g) => s + g.managers.length, 0);

  // Display name for the current superadmin
  const adminDisplayName =
    [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
    currentUser.email ||
    "SuperAdmin";

  return (
    <div className="bg-background text-foreground h-full flex flex-col">
      <PageHeader
        title="User Management"
        subtitle={`SuperAdmin · ${adminDisplayName}`}
      />

      <div className="border-b px-4 py-3 grid grid-cols-3 gap-3 bg-muted/30 border-border-custom">
        <StatChip label="Operators" count={groups.length} color="blue" />
        <StatChip label="Admins" count={totalAdmins} color="amber" />
        <StatChip label="Managers" count={totalManagers} color="green" />
      </div>

      <div className="border-b px-4 py-3 flex items-center gap-3 bg-background border-border-custom">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Search operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-background border-border-custom text-foreground placeholder-foreground/40"
          />
        </div>
        <button
          onClick={load}
          className="p-2.5 rounded-xl border border-border-custom text-foreground/50 hover:text-foreground hover:bg-muted transition-all"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
        <button
          onClick={openOperatorModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-[11px] uppercase tracking-wider shadow-lg transition-all transform active:scale-[0.98]"
        >
          <Plus size={13} /> Add Operator
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-foreground/30">
            <Building2 size={32} className="mb-3 opacity-30" />
            <p className="text-[11px] font-bold uppercase tracking-wider">
              No operators yet
            </p>
            <p className="text-[10px] mt-1">
              Click "Add Operator" to create one
            </p>
          </div>
        )}
        {filtered.map((g) => {
          const isExpanded = expanded[g.operator.operator_id];
          return (
            <div
              key={g.operator.operator_id}
              className="rounded-2xl border border-border-custom bg-card overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [g.operator.operator_id]:
                        !prev[g.operator.operator_id],
                    }))
                  }
                  className="flex-1 px-4 py-3.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Building2 size={15} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground">
                      {g.operator.operator_name}
                    </p>
                    <p className="text-[10px] text-foreground/50 font-medium mt-0.5">
                      {g.admin ? "1 Admin" : "No Admin"} ·{" "}
                      {g.managers.length} Manager
                      {g.managers.length !== 1 ? "s" : ""}
                      {g.operator.email && (
                        <span className="ml-2 opacity-60">
                          · {g.operator.email}
                        </span>
                      )}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown
                      size={16}
                      className="text-foreground/40"
                    />
                  ) : (
                    <ChevronRight
                      size={16}
                      className="text-foreground/40"
                    />
                  )}
                </button>
                <button
                  onClick={() => openAdminModal(g.operator)}
                  className="mr-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all text-[10px] font-black uppercase tracking-wider border border-amber-500/20 shrink-0"
                >
                  <UserPlus size={11} />
                  {g.admin ? "Replace Admin" : "Add Admin"}
                </button>
                <button
                  onClick={() =>
                    handleDeleteOperator(g.operator.operator_id)
                  }
                  className="mr-3 p-1.5 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                  title="Delete Operator"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-border-custom px-4 py-3 space-y-2.5 bg-background/40">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-4 bg-amber-500 rounded-full shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                      Operator Admin (role = ADMIN)
                    </span>
                  </div>
                  {g.admin ? (
                    <UserRow
                      user={g.admin}
                      roleColor="amber"
                      onDelete={() => handleDeleteUser(g.admin!.user_id)}
                    />
                  ) : (
                    <p className="text-[11px] text-foreground/30 pl-3 italic">
                      No admin assigned — use "Add Admin" above
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 mb-1">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                      Managers (role = MANAGER)
                    </span>
                  </div>
                  {g.managers.length === 0 ? (
                    <p className="text-[11px] text-foreground/30 pl-3 italic">
                      No managers — created by the Operator Admin
                    </p>
                  ) : (
                    g.managers.map((m) => (
                      <UserRow
                        key={m.user_id}
                        user={m}
                        roleColor="green"
                        onDelete={() => handleDeleteUser(m.user_id)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Add Operator */}
      {modalMode === "operator" && (
        <Modal
          title="Add Operator"
          subtitle="Operator · operator_name, email, contact"
          icon={<Building2 size={20} className="text-blue-500" />}
          onClose={closeModal}
        >
          <div className="space-y-3">
            {error && <ErrorBanner message={error} />}
            <SectionLabel label="Company Info" color="blue" />
            <InputField
              label="Operator Name"
              value={opName}
              onChange={(e: any) => setOpName(e.target.value)}
              placeholder="e.g. MANTRASCO"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Email"
                type="email"
                value={opEmail}
                onChange={(e: any) => setOpEmail(e.target.value)}
                placeholder="admin@company.com"
                required
              />
              <InputField
                label="Contact Number"
                value={opContact}
                onChange={(e: any) => setOpContact(e.target.value)}
                placeholder="09XXXXXXXXX"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreateOperator}
                disabled={isBusy}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-[11px] uppercase tracking-wider disabled:opacity-50 transition-all"
              >
                {isBusy ? "Creating..." : "Create Operator"}
              </button>
              <button
                onClick={closeModal}
                className="px-5 py-3 rounded-xl border border-border-custom text-foreground/60 font-black text-[11px] uppercase tracking-wider hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Add Admin */}
      {modalMode === "admin" && modalTarget && (
        <Modal
          title="Add Operator Admin"
          subtitle={`Operator_User · role=ADMIN · ${modalTarget.operator_name}`}
          icon={<Shield size={20} className="text-amber-500" />}
          onClose={closeModal}
        >
          <div className="space-y-3">
            {error && <ErrorBanner message={error} />}
            <SectionLabel label="Personal Info" color="amber" />
            <InputField
              label="Employee Name"
              value={auEmployeeName}
              onChange={(e: any) => setAuEmployeeName(e.target.value)}
              placeholder="Full name"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Email"
                type="email"
                value={auEmail}
                onChange={(e: any) => setAuEmail(e.target.value)}
                placeholder="admin@email.com"
                required
              />
              <InputField
                label="Contact Number"
                value={auContact}
                onChange={(e: any) => setAuContact(e.target.value)}
                placeholder="09XXXXXXXXX"
                required
              />
            </div>
            <SectionLabel label="Login Credentials" color="blue" />
            <InputField
              label="Username"
              value={auUsername}
              onChange={(e: any) =>
                setAuUsername(e.target.value.toLowerCase())
              }
              placeholder="e.g. mantrasco_admin"
              required
            />
            <PasswordField
              label="Password"
              value={auPassword}
              show={auShowPw}
              onToggle={() => setAuShowPw(!auShowPw)}
              onChange={(e: any) => setAuPassword(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreateAdmin}
                disabled={isBusy}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[11px] uppercase tracking-wider disabled:opacity-50 transition-all"
              >
                {isBusy ? "Creating..." : "Create Admin"}
              </button>
              <button
                onClick={closeModal}
                className="px-5 py-3 rounded-xl border border-border-custom text-foreground/60 font-black text-[11px] uppercase tracking-wider hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Operator Admin View ──────────────────────────────────────────────────────

function OperatorAdminView({ currentUser }: { currentUser: AuthUser }) {
  const [managers, setManagers] = useState<OperatorUser[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeName, setEmployeeName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/operator-users`, {
        headers: authHeaders(),
      });
      const all: OperatorUser[] = await res.json();
      setManagers(
        all.filter(
          (u) =>
            u.operator_id === currentUser.operator_id &&
            u.role === "MANAGER"
        )
      );
    } catch {
      setError("Failed to load managers");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = () => {
    setEmployeeName("");
    setEmail("");
    setContact("");
    setUsername("");
    setPassword("");
    setShowPw(false);
    setError(null);
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (
      !employeeName.trim() ||
      !email.trim() ||
      !contact.trim() ||
      !username.trim() ||
      !password.trim()
    ) {
      setError("All fields are required");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/operator-users`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          operator_id: currentUser.operator_id,
          employee_name: employeeName.trim(),
          email: email.trim(),
          contact_number: contact.trim(),
          username: username.trim(),
          password,
          role: "MANAGER",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShowModal(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this manager?")) return;
    try {
      await fetch(`${API}/api/operator-users/${userId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      await load();
    } catch {
      alert("Failed to delete manager");
    }
  };

  const filtered = managers.filter(
    (m) =>
      search === "" ||
      m.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      m.username.toLowerCase().includes(search.toLowerCase())
  );

  const operatorLabel =
    currentUser.operator_name ?? "Operator";

  return (
    <div className="bg-background text-foreground h-full flex flex-col">
      <PageHeader
        title="User Management"
        subtitle={`${operatorLabel} · Manager Accounts`}
      />

      <div className="border-b px-4 py-3 bg-muted/30 border-border-custom">
        <StatChip label="Managers" count={managers.length} color="green" />
      </div>

      <div className="border-b px-4 py-3 flex items-center gap-3 bg-background border-border-custom">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Search managers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-background border-border-custom text-foreground placeholder-foreground/40"
          />
        </div>
        <button
          onClick={load}
          className="p-2.5 rounded-xl border border-border-custom text-foreground/50 hover:text-foreground hover:bg-muted transition-all"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-[11px] uppercase tracking-wider shadow-lg transition-all transform active:scale-[0.98]"
        >
          <UserPlus size={13} /> Add Manager
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border-custom px-4 py-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-3">
          {["Employee Name", "Username", "Contact", "Action"].map((h) => (
            <span
              key={h}
              className="text-[9px] font-black uppercase tracking-widest text-foreground/40"
            >
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-foreground/30">
            <Users size={32} className="mb-3 opacity-30" />
            <p className="text-[11px] font-bold uppercase tracking-wider">
              No managers yet
            </p>
            <p className="text-[10px] mt-1">
              Click "Add Manager" to create one
            </p>
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.user_id}
              className="px-4 py-3 border-b border-border-custom grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <User size={13} className="text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate">
                    {m.employee_name}
                  </p>
                  <p className="text-[10px] text-foreground/40 truncate">
                    {m.email}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-foreground/70 truncate">
                {m.username}
              </span>
              <span className="text-[11px] text-foreground/60 truncate">
                {m.contact_number}
              </span>
              <button
                onClick={() => handleDelete(m.user_id)}
                className="p-1.5 rounded-lg text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all"
                title="Delete Manager"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <Modal
          title="Add Manager"
          subtitle={`Operator_User · role=MANAGER · ${operatorLabel}`}
          icon={<User size={20} className="text-emerald-500" />}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-3">
            {error && <ErrorBanner message={error} />}
            <SectionLabel label="Personal Info" color="green" />
            <InputField
              label="Employee Name"
              value={employeeName}
              onChange={(e: any) => setEmployeeName(e.target.value)}
              placeholder="Full name"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Email"
                type="email"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                placeholder="manager@email.com"
                required
              />
              <InputField
                label="Contact Number"
                value={contact}
                onChange={(e: any) => setContact(e.target.value)}
                placeholder="09XXXXXXXXX"
                required
              />
            </div>
            <SectionLabel label="Login Credentials" color="blue" />
            <InputField
              label="Username"
              value={username}
              onChange={(e: any) =>
                setUsername(e.target.value.toLowerCase())
              }
              placeholder="e.g. juan_manager"
              required
            />
            <PasswordField
              label="Password"
              value={password}
              show={showPw}
              onToggle={() => setShowPw(!showPw)}
              onChange={(e: any) => setPassword(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={isBusy}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-[11px] uppercase tracking-wider disabled:opacity-50 transition-all"
              >
                {isBusy ? "Creating..." : "Create Manager"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-3 rounded-xl border border-border-custom text-foreground/60 font-black text-[11px] uppercase tracking-wider hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-4 border-b bg-background border-border-custom">
      <div className="max-w-[1600px] mx-auto py-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-xl font-black tracking-tight uppercase text-foreground">
          {title}
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mt-1">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function SectionLabel({
  label,
  color,
}: {
  label: string;
  color: "blue" | "amber" | "green";
}) {
  const c = {
    blue: "bg-blue-500 text-blue-500",
    amber: "bg-amber-500 text-amber-500",
    green: "bg-emerald-500 text-emerald-500",
  }[color];
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1 h-4 rounded-full ${c.split(" ")[0]}`} />
      <span
        className={`text-[10px] font-black uppercase tracking-wider ${
          c.split(" ")[1]
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StatChip({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "blue" | "amber" | "green";
}) {
  const colors = {
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      border: "border-blue-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      border: "border-amber-500/20",
    },
    green: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      border: "border-emerald-500/20",
    },
  }[color];
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${colors.bg} ${colors.border}`}
    >
      <div>
        <div
          className={`text-2xl font-black leading-none tracking-tight ${colors.text}`}
        >
          {count}
        </div>
        <div
          className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${colors.text}/70`}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  roleColor,
  onDelete,
}: {
  user: OperatorUser;
  roleColor: "amber" | "green";
  onDelete: () => void;
}) {
  const colors = {
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    green: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
  }[roleColor];
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border-custom bg-background/60 hover:bg-muted/30 transition-colors">
      <div
        className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}
      >
        {roleColor === "amber" ? (
          <Shield size={13} className={colors.text} />
        ) : (
          <User size={13} className={colors.text} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-foreground truncate">
          {user.employee_name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] font-mono text-foreground/50 truncate">
            {user.username}
          </span>
          {user.email && (
            <span className="text-[10px] text-foreground/40 truncate flex items-center gap-1">
              <Mail size={9} />
              {user.email}
            </span>
          )}
          {user.contact_number && (
            <span className="text-[10px] text-foreground/40 truncate flex items-center gap-1">
              <Phone size={9} />
              {user.contact_number}
            </span>
          )}
        </div>
      </div>
      <span
        className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${colors.badge}`}
      >
        {user.role}
      </span>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all ml-1"
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 bg-card border border-border-custom">
        <div className="relative px-5 pt-5 pb-3 border-b border-border-custom bg-gradient-to-r from-blue-500/5 to-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                {icon}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">
                  {title}
                </h2>
                <p className="text-[10px] text-foreground/50 font-medium mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted transition-all text-foreground/50 hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-medium flex items-center gap-2">
      <AlertCircle size={13} /> {message}
    </div>
  );
}

const InputField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className="w-full px-3 py-2.5 bg-background border border-border-custom rounded-xl text-sm font-medium text-foreground placeholder:text-foreground/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
    />
  </div>
);

const PasswordField = ({
  label,
  value,
  show,
  onToggle,
  onChange,
}: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-foreground/60 uppercase tracking-wider">
      {label}
    </label>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder="••••••••"
        className="w-full px-3 py-2.5 pr-10 bg-background border border-border-custom rounded-xl text-sm font-medium text-foreground placeholder:text-foreground/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </div>
);