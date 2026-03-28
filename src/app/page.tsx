"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function LandingPage() {
  const [logoError, setLogoError] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="text-center max-w-2xl">
        {/* Tagline */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-100 bg-blue-50 text-blue-600 text-sm mb-6 animate-fade-in">
          🚌 Modern Jeepney Traffic Management
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          {!logoError ? (
            <div className="relative w-48 h-48 md:w-56 md:h-56">
              <Image
                src="/bantai_logo.png"
                alt="Bantai Logo"
                fill
                sizes="(max-width: 768px) 192px, 224px"
                style={{ objectFit: 'contain' }}
                priority
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="text-7xl">🚌</div>
          )}
        </div>

        {/* Description */}
        <p className="text-slate-600 text-lg mb-8 leading-relaxed font-['Playfair_Display'] italic">
          Streamlined modern jeepney registration, violations tracking, and
          regulatory compliance for local government units.
        </p>

        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
          <Link
            href="#features"
            className="px-8 py-3 rounded-xl border-2 border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 font-bold transition-all duration-300 hover:bg-blue-50 active:scale-95"
          >
            Learn More
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-3 gap-4" id="features">
          {[
            { icon: "🚌", title: "Jeepney Registration" },
            { icon: "⚠️", title: "Violations Tracking" },
            { icon: "📊", title: "History & Reports" },
          ].map((f) => (
            <div key={f.title} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{f.icon}</div>
              <h3 className="text-slate-800 text-xs font-bold leading-tight">{f.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}