"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/violations",
    label: "Violations",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/jeepney",
    label: "Jeepney Registration",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/history",
    label: "History",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/users",
    label: "Users",
    roles: ["SUPER_ADMIN", "ADMIN"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
];

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role ?? "USER");
  });

  return (
    <>
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLogout(false)} />
          <div className="relative z-10 w-80 rounded-2xl bg-[#0b1a2e] border border-[rgba(26,143,209,0.15)] p-6 shadow-2xl">
            <h2 className="text-white font-semibold text-center mb-4">Sign out of Bantai?</h2>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-white transition-all">
                Cancel
              </button>
              <button onClick={logout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition-all">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={`${collapsed ? "w-[68px]" : "w-60"} flex-shrink-0 h-screen flex flex-col border-r transition-all duration-300 ease-in-out relative z-20`}
        style={{ background: "rgba(6,13,26,0.97)", borderColor: "rgba(26,143,209,0.1)" }}
      >
        {/* Logo */}
        <div className="flex items-center h-16 border-b px-4 gap-3 overflow-hidden" style={{ borderColor: "rgba(26,143,209,0.1)" }}>
          <div className="w-8 h-8 rounded-lg bg-[#1a8fd1] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"}`}>
            <p className="font-bold text-sm text-white leading-none">Bantai</p>
            <p className="text-[11px] mt-0.5 text-slate-500">Traffic Management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${collapsed ? "justify-center" : ""} ${active ? "text-white shadow-lg" : "text-slate-400 hover:bg-[rgba(26,143,209,0.08)] hover:text-slate-100"}`}
                style={active ? { background: "linear-gradient(135deg,#1a8fd1,#146da3)", boxShadow: "0 4px 16px rgba(26,143,209,0.3)" } : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button onClick={onToggle}
          className="absolute -right-3 top-[4.5rem] border rounded-full p-1 shadow-md"
          style={{ background: "#0b1a2e", borderColor: "rgba(26,143,209,0.2)", color: "#64748b" }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>

        {/* User */}
        <div className={`p-3 border-t ${collapsed ? "flex justify-center" : ""}`} style={{ borderColor: "rgba(26,143,209,0.1)" }}>
          {collapsed ? (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(26,143,209,0.12)", color: "#42b4f5" }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#1a8fd1,#d4862e)" }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user?.role}</p>
              </div>
              <button onClick={() => setShowLogout(true)}
                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}