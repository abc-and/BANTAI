"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { User } from "@/types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users").then((res) => {
      setUsers(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const roleColor: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    ADMIN: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    USER: "bg-slate-500/15 text-slate-400 border-slate-500/25",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-1">Manage system users</p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-[#1a8fd1] hover:bg-[#146da3] text-white text-sm font-medium transition-all">
          + Add User
        </button>
      </div>

      <div className="bg-[#0b1a2e] border border-[rgba(26,143,209,0.1)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center text-slate-500 py-16">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center text-slate-500 py-16">No users found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(26,143,209,0.1)]">
                {["Name", "Email", "Role", "Status", "Joined"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(26,143,209,0.05)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#1a8fd1,#d4862e)" }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <span className="text-sm text-white">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${roleColor[u.role] ?? roleColor.USER}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${u.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-red-500/15 text-red-400 border-red-500/25"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}