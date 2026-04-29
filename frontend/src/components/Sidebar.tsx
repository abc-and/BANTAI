"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

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
    // ─── FIX: your auth returns "ADMIN" (not "SUPER_ADMIN").
    //         List every role string that should see this page.
    //         "ADMIN" without operator_id is your superadmin account.
    roles: ["ADMIN", "SUPERADMIN"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogout, setShowLogout] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true; // no restriction → always show
    const userRole = (user as any)?.role ?? "";
    return item.roles.includes(userRole);
  });

  return (
    <>
      {showLogout && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowLogout(false)}
          />
          <div className="relative z-10 w-80 rounded-2xl bg-card border border-border-custom p-6 shadow-2xl">
            <h2 className="text-foreground font-bold text-center mb-4">
              Sign out of BANT.AI?
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-custom bg-background text-foreground/70 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-medium text-sm hover:bg-rose-700 transition-all shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={`${
          collapsed ? "w-[68px]" : "w-60"
        } shrink-0 h-screen flex flex-col border-r border-border-custom bg-sidebar transition-all duration-300 ease-in-out relative z-20 shadow-sm`}
      >
        {/* Logo */}
        <div className="relative h-16 border-b border-border-custom bg-sidebar z-50">
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-60 transition-all duration-300 pointer-events-none ${
              collapsed ? "w-10 h-10 top-3" : ""
            }`}
            style={
              !collapsed
                ? { height: "120px", width: "250px", top: "-25px" }
                : {}
            }
          >
            <Image
              src="/bantai_logo.png"
              alt="Bantai Logo"
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              style={{ objectFit: "contain" }}
              priority
              className={theme === "dark" ? "brightness-110" : ""}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "text-white shadow-md shadow-blue-500/20 bg-gradient-to-br from-indigo-600 to-blue-700"
                    : "text-foreground/70 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="text-sm truncate">{item.label}</span>
                )}
                {!collapsed && active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3.5 top-18 bg-card border border-border-custom text-foreground/40 hover:text-blue-600 rounded-full p-1.5 shadow-sm hover:shadow transition-all"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>

        {/* Theme Toggle */}
        <div
          className={`px-4 py-3 flex items-center justify-center gap-2 border-t border-border-custom ${
            collapsed
              ? "flex-col"
              : "bg-background/50 mx-2 my-2 rounded-2xl"
          }`}
        >
          <button
            onClick={() => theme !== "light" && toggleTheme()}
            className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-200 ${
              theme === "light"
                ? "text-blue-600 bg-card shadow-sm border border-blue-100 dark:border-blue-900/30"
                : "text-foreground/40 hover:text-foreground"
            }`}
            title="Switch to Light Mode"
          >
            <Sun size={18} strokeWidth={2.5} />
            {!collapsed && (
              <span className="text-[10px] font-bold tracking-widest">
                LIGHT
              </span>
            )}
          </button>

          {!collapsed && (
            <div className="w-px h-4 bg-border-custom mx-1" />
          )}

          <button
            onClick={() => theme !== "dark" && toggleTheme()}
            className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-200 ${
              theme === "dark"
                ? "text-indigo-400 bg-card shadow-sm border border-indigo-900/50"
                : "text-foreground/40 hover:text-foreground"
            }`}
            title="Switch to Dark Mode"
          >
            <Moon size={18} strokeWidth={2.5} />
            {!collapsed && (
              <span className="text-[10px] font-bold tracking-widest uppercase">
                DARK
              </span>
            )}
          </button>
        </div>

        {/* User Section */}
        <div
          className={`p-4 border-t border-border-custom bg-background/30 ${
            collapsed ? "flex justify-center" : ""
          }`}
        >
          {collapsed ? (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border border-border-custom">
              {(user as any)?.firstName?.[0]}
              {(user as any)?.lastName?.[0]}
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                {(user as any)?.firstName?.[0]}
                {(user as any)?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate leading-tight">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </p>
                <p className="text-xs font-medium text-foreground/50 mt-0.5">
                  {(user as any)?.role}
                </p>
              </div>
              <button
                onClick={() => setShowLogout(true)}
                className="p-2 rounded-xl text-foreground/40 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                title="Sign Out"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}