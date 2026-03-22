"use client";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: "Total Jeepneys", value: "0", icon: "🚌", color: "from-blue-600 to-blue-700" },
    { label: "Active Violations", value: "0", icon: "⚠️", color: "from-amber-600 to-amber-700" },
    { label: "Resolved Today", value: "0", icon: "✅", color: "from-emerald-600 to-emerald-700" },
    { label: "Total Users", value: "0", icon: "👥", color: "from-purple-600 to-purple-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Here&apos;s what&apos;s happening with Bantai today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label}
            className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-lg`}>
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm opacity-80 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0b1a2e] border border-[rgba(26,143,209,0.1)] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Recent Violations</h2>
          <div className="text-slate-500 text-sm text-center py-8">No violations yet</div>
        </div>
        <div className="bg-[#0b1a2e] border border-[rgba(26,143,209,0.1)] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Recently Registered</h2>
          <div className="text-slate-500 text-sm text-center py-8">No jeepneys registered yet</div>
        </div>
      </div>
    </div>
  );
}