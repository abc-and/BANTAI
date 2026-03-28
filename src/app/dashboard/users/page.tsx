"use client";

import React, { useState } from "react";
import { 
  Users, Plus, User as UserIcon, 
  Edit, Trash2, Shield, CheckCircle2, AlertTriangle, X
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

type Role = 'Administrator' | 'Manager' | 'Officer' | 'Viewer';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  lastActive: Date;
}

const initialUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@mandaue.gov.ph',
    role: 'Administrator',
    permissions: ['Full Access'],
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: '2',
    name: 'Traffic Officer 1',
    email: 'officer1@mandaue.gov.ph',
    role: 'Officer',
    permissions: ['View Violations', 'Verify Violations'],
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: '3',
    name: 'Traffic Officer 2',
    email: 'officer2@mandaue.gov.ph',
    role: 'Officer',
    permissions: ['View Violations', 'Verify Violations'],
    lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
  {
    id: '4',
    name: 'Compliance Manager',
    email: 'manager@mandaue.gov.ph',
    role: 'Manager',
    permissions: ['View Violations', 'Verify Violations', 'Generate Reports', 'Manage Users'],
    lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },
];

export default function UserManagement() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = (dark: string, light: string) => (isDark ? dark : light);

  const [users, setUsers] = useState<User[]>(initialUsers);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Officer' as Role });

  const roleStyles: Record<Role, { text: string, bg: string, border: string, icon: string }> = {
    Administrator: { 
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
    Officer: { 
        text: t('text-blue-400', 'text-blue-600'), 
        bg: t('bg-blue-900/20', 'bg-blue-50'), 
        border: t('border-blue-900/30', 'border-blue-200/50'), 
        icon: t('text-blue-400', 'text-blue-500') 
    },
    Viewer: { 
        text: t('text-slate-400', 'text-slate-600'), 
        bg: t('bg-slate-800/40', 'bg-slate-50'), 
        border: t('border-slate-700', 'border-slate-200/50'), 
        icon: t('text-slate-500', 'text-slate-500') 
    },
  };

  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const getTimeAgo = (date: Date) => {
    const diffInMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      email: formData.email,
      role: formData.role,
      permissions: formData.role === 'Administrator' ? ['Full Access'] : ['View Violations'],
      lastActive: new Date(),
    };
    setUsers([...users, newUser]);
    setIsAddOpen(false);
    setFormData({ name: '', email: '', role: 'Officer' });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
    setEditingUser(null);
  };

  const handleDelete = () => {
    if (!deletingUser) return;
    setUsers(users.filter(u => u.id !== deletingUser.id));
    setDeletingUser(null);
  };

  const openEdit = (user: User) => {
    setFormData({ name: user.name, email: user.email, role: user.role });
    setEditingUser(user);
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
              setFormData({ name: '', email: '', role: 'Officer' });
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
        
        {/* Users List */}
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
            {/* Table Header - hidden on mobile */}
            <div className={`hidden md:flex px-4 py-3 rounded-xl border mb-3 transition-colors ${t("bg-slate-800/80 border-slate-700 text-slate-500", "bg-slate-100/80 border-slate-200/50 text-slate-500")}`}>
              <div className="flex-2 text-xs font-bold tracking-wider">USER</div>
              <div className="flex-1 text-xs font-bold tracking-wider">ROLE</div>
              <div className="flex-1 text-xs font-bold tracking-wider">LAST ACTIVE</div>
              <div className="w-24 text-xs font-bold tracking-wider text-right pr-2">ACTIONS</div>
            </div>

            {/* User Rows */}
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className={`flex flex-col md:flex-row md:items-center border rounded-xl p-4 gap-4 hover:shadow-md transition-all ${t("bg-[#1e293b] border-slate-700 hover:bg-slate-800/50", "bg-white border-slate-200 hover:shadow-md")}`}>
                  
                  {/* User Info */}
                  <div className="flex-2 flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${t("text-slate-100", "text-slate-800")}`}>{user.name}</h3>
                      <p className={`text-xs mt-0.5 ${t("text-slate-400", "text-slate-500")}`}>{user.email}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {user.permissions.map(perm => (
                          <span key={perm} className={`text-[10px] font-medium px-2 py-0.5 rounded border ${t("bg-slate-800 border-slate-700 text-slate-400 font-bold", "bg-slate-100 text-slate-600 border-slate-200/60")}`}>
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="flex-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${roleStyles[user.role].bg} ${roleStyles[user.role].text}`}>
                      {user.role}
                    </span>
                  </div>

                  {/* Last Active */}
                  <div className={`flex-1 border-t pt-3 md:border-t-0 md:pt-0 transition-colors ${t("border-slate-800", "border-slate-100")}`}>
                    <p className={`text-sm font-medium ${t("text-slate-300", "text-slate-600")}`}>{formatDate(user.lastActive)}</p>
                    <p className={`text-xs font-medium italic mt-0.5 ${t("text-slate-500", "text-slate-400")}`}>{getTimeAgo(user.lastActive)}</p>
                  </div>

                  {/* Actions */}
                  <div className={`w-full md:w-24 flex md:justify-end gap-2 border-t pt-3 md:border-t-0 md:pt-0 transition-colors ${t("border-slate-800", "border-slate-100")}`}>
                    <button 
                      onClick={() => openEdit(user)}
                      className={`p-2 rounded-lg transition-colors ${t("text-slate-500 hover:text-blue-400 hover:bg-blue-900/40", "text-slate-400 hover:text-blue-600 hover:bg-blue-50")}`}
                      title="Edit User"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingUser(user)}
                      className={`p-2 rounded-lg transition-colors ${t("text-slate-500 hover:text-rose-400 hover:bg-rose-900/40", "text-slate-400 hover:text-rose-600 hover:bg-rose-50")}`}
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Roles & Permissions Section */}
        <div className={`border rounded-2xl shadow-sm overflow-hidden p-6 transition-colors duration-300 ${t("bg-[#1e293b] border-slate-700", "bg-white border-slate-200")}`}>
          <div className="mb-6">
            <h2 className={`text-lg font-bold ${t("text-white", "text-slate-800")}`}>User Roles & Permissions</h2>
            <p className={`text-sm mt-1 ${t("text-slate-400", "text-slate-500")}`}>Define user roles and their permissions in the system</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RoleCard 
              isDark={isDark}
              role="Administrator"
              description="Full system access"
              colorStyle={roleStyles.Administrator}
              permissions={['Full Access']}
            />
            <RoleCard 
              isDark={isDark}
              role="Manager"
              description="Manage violations and reports"
              colorStyle={roleStyles.Manager}
              permissions={['View Violations', 'Verify Violations', 'Generate Reports', 'Manage Users']}
            />
            <RoleCard 
              isDark={isDark}
              role="Officer"
              description="Monitor and verify violations"
              colorStyle={roleStyles.Officer}
              permissions={['View Violations', 'Verify Violations']}
            />
            <RoleCard 
              isDark={isDark}
              role="Viewer"
              description="Read-only access"
              colorStyle={roleStyles.Viewer}
              permissions={['View Violations']}
            />
          </div>
        </div>

      </div>

      {/* Add/Edit/Delete Modals - Updated for Dark Mode */}
      {isAddOpen && (
        <UserModal 
          isDark={isDark}
          title="Add New User" 
          onClose={() => setIsAddOpen(false)} 
          onSubmit={handleAddSubmit}
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {editingUser && (
        <UserModal 
          isDark={isDark}
          title="Edit User" 
          onClose={() => setEditingUser(null)} 
          onSubmit={handleEditSubmit}
          formData={formData}
          setFormData={setFormData}
        />
      )}

      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-center p-8 transition-colors ${t("bg-[#1e293b] text-white", "bg-white text-slate-800")}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border ${t("bg-rose-900/30 text-rose-400 border-rose-900/50", "bg-rose-100 text-rose-600 border-rose-200")}`}>
              <AlertTriangle className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-black mb-2 uppercase tracking-tight">Delete User?</h2>
            <p className={`text-sm mb-8 leading-relaxed font-medium ${t("text-slate-400", "text-slate-500")}`}>
              Are you sure you want to delete <span className="font-bold text-blue-500">{deletingUser.name}</span>? This action is permanent.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingUser(null)}
                className={`flex-1 px-4 py-3 rounded-xl font-bold transition-colors text-sm border ${t("text-slate-400 border-slate-700 hover:bg-slate-800", "text-slate-600 border-slate-200 hover:bg-slate-50")}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-linear-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold transition-all active:scale-95 text-sm shadow-lg shadow-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function RoleCard({ role, description, colorStyle, permissions, isDark }: { role: string, description: string, colorStyle: any, permissions: string[], isDark: boolean }) {
  const t = (dark: string, light: string) => (isDark ? dark : light);
  
  return (
    <div className={`border rounded-xl p-5 transition-all hover:shadow-lg ${colorStyle.border} ${t("bg-[#1e293b]/50 hover:bg-[#1e293b]", "bg-slate-50 hover:bg-white")}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-xl shadow-inner ${colorStyle.bg}`}>
          <Shield className={`w-4 h-4 ${colorStyle.icon}`} strokeWidth={2.5} />
        </div>
        <h3 className={`font-black text-xs uppercase tracking-wider ${colorStyle.text}`}>{role}</h3>
      </div>
      <p className={`text-xs mb-5 h-8 font-medium leading-relaxed ${t("text-slate-400", "text-slate-500")}`}>{description}</p>
      <div className="space-y-2.5">
        {permissions.map(perm => (
          <div key={perm} className="flex items-start gap-2">
            <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${colorStyle.icon}`} strokeWidth={2.5} />
            <span className={`text-[11px] font-bold ${t("text-slate-300", "text-slate-600")}`}>{perm}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserModal({ isDark, title, onClose, onSubmit, formData, setFormData }: any) {
    const t = (dark: string, light: string) => (isDark ? dark : light);
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transition-colors duration-300 ${t("bg-[#1e293b] text-white", "bg-white")}`}>
            <div className={`p-8 border-b flex justify-between items-center transition-colors ${t("bg-slate-800/50 border-slate-700", "bg-slate-50 border-slate-100")}`}>
              <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
              <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${t("text-slate-400 hover:bg-slate-800 hover:text-white", "text-slate-400 hover:bg-slate-100 hover:text-slate-800")}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onSubmit} className="p-8 space-y-6">
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${t("text-slate-400", "text-slate-700")}`}>Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className={`w-full rounded-xl px-5 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 border transition-all ${t("bg-slate-800 border-slate-700 text-white placeholder-slate-600", "bg-white border-slate-200 text-slate-800")}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${t("text-slate-400", "text-slate-700")}`}>Email Address</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className={`w-full rounded-xl px-5 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 border transition-all ${t("bg-slate-800 border-slate-700 text-white placeholder-slate-600", "bg-white border-slate-200 text-slate-800")}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${t("text-slate-400", "text-slate-700")}`}>Role Allocation</label>
                <select 
                  className={`w-full rounded-xl px-5 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 border transition-all outline-none appearance-none cursor-pointer ${t("bg-slate-800 border-slate-700 text-white", "bg-white border-slate-200 text-slate-800")}`}
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as Role})}
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%2364748b"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Manager">Manager</option>
                  <option value="Officer">Officer</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className={`px-6 py-3 rounded-xl font-bold transition-colors text-sm ${t("text-slate-400 hover:bg-slate-800", "text-slate-600 hover:bg-slate-100")}`}>
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all active:scale-95 text-sm shadow-lg shadow-blue-500/20">
                  {title === "Edit User" ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
    );
}