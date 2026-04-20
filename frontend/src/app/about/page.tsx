"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function AboutPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Toggle function
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        isDarkMode ? "bg-[#0a0f1e] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
      style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}
    >
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: isDarkMode
            ? "linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)"
            : "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Nav - Reduced padding from py-5 to py-3 */}
      <nav className={`relative z-10 flex items-center justify-between px-8 py-3 border-b ${isDarkMode ? "border-white/5" : "border-black/5"}`}>
        <div className="flex items-center gap-3">
          {/* Official Bantai Logo - Resized smaller */}
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Image 
              src="/bantai_logo.png" 
              alt="Bantai Logo" 
              width={85} 
              height={28} 
              className="object-contain mix-blend-multiply"
              priority
            />
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all ${isDarkMode ? "bg-white/10 hover:bg-white/20 text-yellow-400" : "bg-black/5 hover:bg-black/10 text-blue-600"}`}
            aria-label="Toggle Theme"
          >
            {isDarkMode ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 0A9 9 0 1111.25 3v11.25z" /></svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          <Link
            href="/"
            className={`flex items-center gap-1.5 text-sm transition-colors ${isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-blue-600"}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pt-24 pb-16">
        <p className="text-blue-500 text-xs font-semibold uppercase tracking-widest mb-4">
          About BANTAI
        </p>
        <h1 className={`text-5xl md:text-6xl font-black leading-tight mb-6 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Know Before You're<br />
          <span className="text-blue-500">Fined.</span>
        </h1>
        <p className={`text-lg leading-relaxed max-w-2xl ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          BANTAI — <span className={`font-medium ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>Modern Jeepney Traffic Management</span> — gives jeepney operators full visibility into their fleet's violations, so they can act early and stay clear of penalties.
        </p>
      </section>

      {/* Divider */}
      <div className="relative z-10 max-w-4xl mx-auto px-8">
        <div className={`h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-10`} />
      </div>

      {/* The Problem */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">The Problem</h2>
            <p className={`text-base leading-relaxed mb-5 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              Many operators only find out about a violation after the fine has already been issued. By then, it's too late — the penalty is recorded, the cost is incurred, and the unit's compliance standing takes a hit.
            </p>
            <p className={`text-base leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Without a clear window into what each unit is doing on the road, operators are left guessing — and guessing is expensive.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">How BANTAI Helps</h2>
            <p className={`text-base leading-relaxed mb-5 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              BANTAI puts operators in the loop the moment a violation is detected. Whether it's a unit taking on too many passengers or a driver going too fast, you'll know about it right away — not after the damage is done.
            </p>
            <p className={`text-base leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              No more surprises. No more avoidable fines. Just clear, timely information that helps you run a cleaner fleet.
            </p>
          </div>
        </div>
      </section>

      {/* Violations We Track */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pb-16">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-10">Violations We Track</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div
            className={`rounded-2xl p-8 transition-all ${
              isDarkMode ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-100 shadow-sm"
            }`}
          >
            <div className="text-3xl mb-5">👥</div>
            <h3 className={`font-bold text-base mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Overcrowding</h3>
            <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              When a unit loads more passengers than its LTFRB-mandated capacity allows, BANTAI flags it immediately. Operators are notified so corrective action can be taken before an enforcer does.
            </p>
          </div>
          <div
            className={`rounded-2xl p-8 transition-all ${
              isDarkMode ? "bg-orange-500/10 border border-orange-500/20" : "bg-orange-50 border border-orange-100 shadow-sm"
            }`}
          >
            <div className="text-3xl mb-5">⚡</div>
            <h3 className={`font-bold text-base mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Overspeeding</h3>
            <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Speed violations are one of the most common causes of PUV penalties. BANTAI tracks unit speed in real-time and alerts operators the moment a driver exceeds the allowable limit on their route.
            </p>
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pb-24">
        <div
          className={`rounded-2xl p-8 md:p-12 border transition-all ${
            isDarkMode ? "bg-white/5 border-white/5" : "bg-white border-black/5 shadow-md"
          }`}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-6">
            Why It Matters for Operators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🛡️",
                title: "Avoid Fines",
                desc: "Early awareness of violations means you can address them before they turn into official penalties on record.",
              },
              {
                icon: "📍",
                title: "Know Every Unit",
                desc: "See which specific units are violating, when, and where — so you always know the state of your entire fleet.",
              },
              {
                icon: "📈",
                title: "Build a Clean Record",
                desc: "A fleet with fewer violations builds credibility with authorities and lowers the risk of franchise suspension.",
              },
            ].map((item) => (
              <div key={item.title}>
                <div className="text-xl mb-3">{item.icon}</div>
                <p className={`font-bold text-sm mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{item.title}</p>
                <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative z-10 border-t px-8 py-6 text-center ${isDarkMode ? "border-white/5" : "border-black/5"}`}>
        <p className="text-xs text-slate-500">
          © 2026 BANTAI · Modern Jeepney Traffic Management · Cebu City, Philippines
        </p>
      </footer>
    </div>
  );
}