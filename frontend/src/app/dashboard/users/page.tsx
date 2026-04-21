"use client";

import React, { useState, useEffect } from "react";
import {
  Users, Plus, User as UserIcon,
  Edit, Trash2, Shield, CheckCircle2, AlertTriangle, X, Loader2
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

// Matches your UI logic
type Role = 'Administrator' | 'Manager' | 'Viewer';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  name?: string; // We'll compute this for the UI
  email: string | null;
  username: string;
  role: string; // From DB
  isActive: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = (dark: string, light: string) => (isDark ? dark : light);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'Viewer' as Role
  });

  const API_URL = "http://localhost:4000/api/users";

  // --- DATABASE ACTIONS ---

  const fetchUsers = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setFormData({ name: '', email: '', username: '', password: '', role: 'Viewer' });
        fetchUsers(); // Reload from DB
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to create user");
      }
    } catch (err) {
      alert("Error: Backend server is not running");
    } finally {
      setLoading(false);
    }
  };

  // --- UI HELPERS ---

  const roleStyles: any = {
    Administrator: {
      text: t('text-rose-400', 'text-rose-600'),
      bg: t('bg-rose-900/20', 'bg-rose-50'),
      border: t('border-rose-900/30', 'border-rose-200/50'),
      icon: t('text-rose-400', 'text-rose-500')
    },
    ADMIN: { // Map database enum to style
      text: t('text-rose-400', 'text-rose-600'),
      bg: t('bg-rose-900/20', 'bg-rose-50'),
      border: t('border-rose-900/30', 'border-rose-200/50'),
      icon: t('text-rose-400', 'text-rose-500')
    },
    Manager: {
      text: t('text-indigo-400', 'text-indigo-600'),
      bg: t('bg-indigo-900/20', 'bg-indigo-50'),
      border: t('border-indigo-900/30', 'border-indigo-200/50'),
      icon: t('text-indigo-400', 'text-indigo-500')
    },
    MANAGER: {
      text: t('text-indigo-400', 'text-indigo-600'),
      bg: t('bg-indigo-900/20', 'bg-indigo-50'),
      border: t('border-indigo-900/30', 'border-indigo-200/50'),
      icon: t('text-indigo-400', 'text-indigo-500')
    },
    Viewer: {
      text: t('text-slate-400', 'text-slate-600'),
      bg: t('bg-slate-800/40', 'bg-slate-50'),
      border: t('border-slate-700', 'border-slate-200/50'),
      icon: t('text-slate-500', 'text-slate-500')
    },
    USER: {
      text: t('text-slate-400', 'text-slate-600'),
      bg: t('bg-slate-800/40', 'bg-slate-50'),
      border: t('border-slate-700', 'border-slate-200/50'),
      icon: t('text-slate-500', 'text-slate-500')
    }
  };

  const getUIRole = (dbRole: string): string => {
    if (dbRole === 'ADMIN') return 'Administrator';
    if (dbRole === 'MANAGER') return 'Manager';
    return 'Viewer';
  };

  return (
    <div className={`flex flex-col h-full min-h-screen pb-12 transition-colors duration-300 ${t("bg-[#0f172a]", "bg-slate-50/50")}`}>
      {/* Header */}
      <div className={`border-b p-6 md:p-8 transition-colors duration-300 ${t("bg-[#1e293b] border-slate-700", "bg-white border-slate-200")}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${t("bg-blue-900/20", "bg-blue-50")}`}>
              <Users className={`w-8 h-8 ${t("text-blue-400", "text-blue-600")}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${t("text-white", "text-slate-800")}`}>User Management</h1>
              <p className={`text-sm mt-1 ${t("text-slate-400", "text-slate-500")}`}>Manage system users and permissions</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', email: '', username: '', password: '', role: 'Viewer' });
              setIsAddOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            Add New User
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 mt-8 space-y-8">
        <div className={`border rounded-2xl shadow-sm overflow-hidden transition-colors duration-300 ${t("bg-[#1e293b] border-slate-700", "bg-white border-slate-200")}`}>
          <div className={`p-5 md:p-6 border-b flex items-center justify-between transition-colors ${t("bg-[#1e293b] border-slate-700", "bg-white border-slate-100")}`}>
            <div className="flex items-center gap-3">
              <Users className={`w-6 h-6 ${t("text-blue-400", "text-blue-600")}`} />
              <h2 className={`text-lg font-bold ${t("text-white", "text-slate-800")}`}>System Users</h2>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${t("bg-slate-800 text-slate-400", "bg-slate-100 text-slate-600")}`}>
              {users.length} Users
            </span>
          </div>

          <div className={`p-5 md:p-6 transition-colors ${t("bg-[#1e293b]/50", "bg-slate-50/50")}`}>
            {loading ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className={t("text-slate-400", "text-slate-500")}>Loading users from database...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div key={user.id} className={`flex flex-col md:flex-row md:items-center border rounded-xl p-4 gap-4 hover:shadow-md transition-all ${t("bg-[#1e293b] border-slate-700 hover:bg-slate-800/50", "bg-white border-slate-200 hover:shadow-md")}`}>
                    <div className="flex-2 flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${t("text-slate-100", "text-slate-800")}`}>{user.firstName} {user.lastName}</h3>
                        <p className={`text-xs mt-0.5 ${t("text-slate-400", "text-slate-500")}`}>{user.email || 'No email'}</p>
                        <p className={`text-[10px] mt-1 font-mono ${t("text-blue-400", "text-blue-600")}`}>@{user.username}</p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${roleStyles[user.role]?.bg || 'bg-slate-100'} ${roleStyles[user.role]?.text || 'text-slate-600'}`}>
                        {getUIRole(user.role)}
                      </span>
                    </div>

                    <div className={`flex-1 border-t pt-3 md:border-t-0 md:pt-0 transition-colors ${t("border-slate-800", "border-slate-100")}`}>
                      <p className={`text-xs font-medium ${t("text-slate-300", "text-slate-600")}`}>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                        <span className="text-[10px] uppercase font-bold text-slate-500">{user.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>

                    <div className={`w-full md:w-24 flex md:justify-end gap-2 border-t pt-3 md:border-t-0 md:pt-0 transition-colors ${t("border-slate-800", "border-slate-100")}`}>
                      <button className={`p-2 rounded-lg transition-colors ${t("text-slate-500 hover:text-blue-400 hover:bg-blue-900/40", "text-slate-400 hover:text-blue-600 hover:bg-blue-50")}`} title="Edit User">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeletingUser(user)} className={`p-2 rounded-lg transition-colors ${t("text-slate-500 hover:text-rose-400 hover:bg-rose-900/40", "text-slate-400 hover:text-rose-600 hover:bg-rose-50")}`} title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isAddOpen && (
        <UserModal
          isDark={isDark}
          title="Add New User"
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAddSubmit}
          formData={formData}
          setFormData={setFormData}
          isLoading={loading}
        />
      )}

      {/* ... keeping your existing Delete Modal ... */}
    </div>
  );
}

// Updated UserModal to include Username/Password
function UserModal({ isDark, title, onClose, onSubmit, formData, setFormData, isLoading }: any) {
  const t = (dark: string, light: string) => (isDark ? dark : light);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-4xl shadow-2xl w-full max-w-md overflow-hidden transition-colors duration-300 ${t("bg-[#1e293b] text-white", "bg-white")}`}>
        <div className={`p-8 border-b flex justify-between items-center transition-colors ${t("bg-slate-800/50 border-slate-700", "bg-slate-50 border-slate-100")}`}>
          <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${t("text-slate-400 hover:bg-slate-800 hover:text-white", "text-slate-400 hover:bg-slate-100 hover:text-slate-800")}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[75vh]">
          <div>
            <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${t("text-slate-400", "text-slate-700")}`}>Full Name</label>
            <input
              type="text" required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full rounded-xl px-5 py-3 text-sm font-semibold focus:outline-none border transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-white border-slate-200 text-slate-800")}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${t("text-slate-400", "text-slate-700")}`}>Username</label>
            <input
              type="text" required
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              className={`w-full rounded-xl px-5 py-3 text-sm font-semibold focus:outline-none border transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-white border-slate-200 text-slate-800")}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${t("text-slate-400", "text-slate-700")}`}>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className={`w-full rounded-xl px-5 py-3 text-sm font-semibold focus:outline-none border transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-white border-slate-200 text-slate-800")}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${t("text-slate-400", "text-slate-700")}`}>Password</label>
            <input
              type="password" required
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className={`w-full rounded-xl px-5 py-3 text-sm font-semibold focus:outline-none border transition-all ${t("bg-slate-800 border-slate-700 text-white", "bg-white border-slate-200 text-slate-800")}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${t("text-slate-400", "text-slate-700")}`}>Role Allocation</label>
            <select
              className={`w-full rounded-xl px-5 py-3 text-sm font-black focus:outline-none border appearance-none cursor-pointer ${t("bg-slate-800 border-slate-700 text-white", "bg-white border-slate-200 text-slate-800")}`}
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
            >
              <option value="Administrator">Administrator</option>
              <option value="Manager">Manager</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-sm text-slate-500">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}