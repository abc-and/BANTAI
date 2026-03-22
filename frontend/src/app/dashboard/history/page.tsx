"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Violation } from "@/types";

export default function HistoryPage() {
  const [history, setHistory] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/history").then((res) => {
      setHistory(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = history.filter((v) =>
    v.jeepney?.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
    v.type.toLowerCase().includes(search.toLowerCase()) ||
    v.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-slate-400 text-sm mt-1">Full audit trail of all violations</p>
      </div>

      <input
        type="text"
        placeholder="Search by plate, type, or status..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-[#0b1a2e] border border-[rgba(26,143,209,0.15)] text-white placeholder-slate-500 focus:outline-none focus:border-[#1a8fd1] text-sm transition-colors"
      />

      <div className="bg-[#0b1a2e] border border-[rgba(26,143,209,0.1)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center text-slate-500 py-16">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-16">No history found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(26,143,209,0.1)]">
                {["Plate No.", "Type", "Description", "Status", "Issued By", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(26,143,209,0.05)]">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{v.jeepney?.plateNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{v.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-sm text-slate-400 max-w-[200px] truncate">{v.description}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{v.status}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{v.issuedBy?.firstName} {v.issuedBy?.lastName}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(v.issuedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}