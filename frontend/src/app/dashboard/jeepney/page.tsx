"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Jeepney } from "@/types";

export default function JeepneyPage() {
  const [jeepneys, setJeepneys] = useState<Jeepney[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/jeepney").then((res) => {
      setJeepneys(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    SUSPENDED: "bg-red-500/15 text-red-400 border-red-500/25",
    EXPIRED: "bg-slate-500/15 text-slate-400 border-slate-500/25",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Jeepney Registration</h1>
          <p className="text-slate-400 text-sm mt-1">Manage registered modern jeepneys</p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-[#1a8fd1] hover:bg-[#146da3] text-white text-sm font-medium transition-all">
          + Register Jeepney
        </button>
      </div>

      <div className="bg-[#0b1a2e] border border-[rgba(26,143,209,0.1)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center text-slate-500 py-16">Loading...</div>
        ) : jeepneys.length === 0 ? (
          <div className="text-center text-slate-500 py-16">No jeepneys registered yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(26,143,209,0.1)]">
                {["Plate No.", "Owner", "Route", "Color", "Year", "Status", "Registered"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(26,143,209,0.05)]">
              {jeepneys.map((j) => (
                <tr key={j.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{j.plateNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{j.ownerName}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{j.route}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{j.color || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{j.yearModel || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor[j.status] ?? statusColor.PENDING}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(j.registeredAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}