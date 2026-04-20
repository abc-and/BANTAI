"use client";
 
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
 
const LOAD_MESSAGES = [
  "Loading platform...",
  "Fetching route data...",
  "Syncing vehicle registry...",
  "Almost there...",
];
 
const SEGS = 20;


// ─── Jeepney SVG ────────────────────────────────────────────────────────────
function JeepneySVG() {
  return (
    <svg width="88" height="46" viewBox="0 0 88 46" fill="none">
      {/* shadow */}
      <ellipse cx="44" cy="44" rx="36" ry="3" fill="#000" opacity="0.18" />
      {/* body */}
      <rect x="4" y="10" width="76" height="28" rx="5" fill="#2563eb" />
      {/* roof rack */}
      <rect x="10" y="5" width="60" height="7" rx="3" fill="#1D4ED8" />
      {/* roof rails */}
      <rect x="13" y="5" width="2.5" height="7" fill="#3B82F6" />
      <rect x="68" y="5" width="2.5" height="7" fill="#3B82F6" />
      {/* stripe top */}
      <rect x="4" y="10" width="76" height="3" rx="1.5" fill="#1D4ED8" />
      {/* stripe mid */}
      <rect x="4" y="27" width="76" height="3" rx="1.5" fill="#1D4ED8" />
      {/* windshield */}
      <rect x="60" y="12" width="17" height="16" rx="2.5" fill="#93C5FD" />
      <rect x="62" y="14" width="6" height="12" rx="1" fill="#BFDBFE" opacity="0.6" />
      {/* side windows */}
      <rect x="20" y="13" width="11" height="11" rx="2" fill="#BFDBFE" />
      <rect x="36" y="13" width="11" height="11" rx="2" fill="#BFDBFE" />
      <rect x="52" y="13" width="6" height="11" rx="2" fill="#BFDBFE" />
      {/* front face */}
      <rect x="77" y="16" width="7" height="12" rx="1.5" fill="#1D4ED8" />
      <rect x="78" y="17" width="5" height="3" rx="0.5" fill="#93C5FD" />
      <rect x="78" y="21" width="5" height="3" rx="0.5" fill="#93C5FD" />
      {/* headlight */}
      <circle cx="82" cy="30" r="3" fill="#FEF08A" />
      <circle cx="82" cy="30" r="1.5" fill="#FDE047" />
      {/* rear lights */}
      <rect x="4" y="25" width="3" height="5" rx="1" fill="#EF4444" />
      {/* back bumper */}
      <rect x="2" y="22" width="4" height="10" rx="1" fill="#1e3a5f" />
      {/* front wheel */}
      <circle cx="68" cy="39" r="8" fill="#0f172a" />
      <circle cx="68" cy="39" r="5" fill="#334155" />
      <circle cx="68" cy="39" r="2" fill="#64748b" />
      {/* rear wheel */}
      <circle cx="22" cy="39" r="8" fill="#0f172a" />
      <circle cx="22" cy="39" r="5" fill="#334155" />
      <circle cx="22" cy="39" r="2" fill="#64748b" />
    </svg>
  );
}

function LoadingScreen({ progress }: { progress: number }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [sceneWidth, setSceneWidth] = useState(440);
 
  useEffect(() => {
    const measure = () => {
      if (sceneRef.current) setSceneWidth(sceneRef.current.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
 
  const jeepW = 88;
  const leftPx = Math.round((progress / 100) * (sceneWidth - jeepW - 8));
  const msgIdx = Math.min(Math.floor(progress / 25), LOAD_MESSAGES.length - 1);
  const segsCount = Math.round((progress / 100) * SEGS);
 
  return (
    <div className="fixed inset-0 bg-[#F8FAFC] z-50 flex flex-col items-center justify-center p-6 gap-5">
 
      {/* Road scene */}
      <div className="w-full max-w-md">
        <div
          ref={sceneRef}
          className="relative h-20 rounded-2xl overflow-hidden"
          style={{ background: "#1e293b", border: "2px solid #334155" }}
        >
          {/* Night sky */}
          <div className="absolute top-0 left-0 right-0 h-7 overflow-hidden" style={{ background: "#0f172a" }}>
            {/* Stars */}
            <div
              className="absolute inset-0 flex items-start"
              style={{ animation: "bantai-stars 8s linear infinite", width: "200%" }}
            >
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 2, height: 2,
                    borderRadius: "50%",
                    background: "#fff",
                    opacity: 0.3 + Math.random() * 0.7,
                    marginTop: Math.floor(Math.random() * 18) + 2,
                    marginLeft: Math.floor(Math.random() * 24) + 8,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>
 
          {/* Silhouette buildings */}
          <div
            className="absolute top-0 left-0 right-0 h-7 flex items-end overflow-hidden"
          >
            <div
              className="flex gap-1 items-end flex-shrink-0"
              style={{ animation: "bantai-bld 4s linear infinite", width: "200%" }}
            >
              {[18, 24, 14, 22, 10, 20, 26, 12, 18, 22, 14, 24, 10, 18, 24, 14, 22, 10, 20, 26, 12, 18, 22, 14, 24, 10].map(
                (h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 16 + (i % 3) * 4,
                      height: h,
                      background: "#1e3a5f",
                      borderRadius: "2px 2px 0 0",
                      flexShrink: 0,
                    }}
                  />
                )
              )}
            </div>
          </div>
 
          {/* Road */}
          <div className="absolute bottom-0 left-0 right-0 h-13" style={{ height: 52, background: "#334155" }} />
          {/* Yellow edge line */}
          <div className="absolute left-0 right-0" style={{ bottom: 51, height: 2, background: "#f59e0b" }} />
          {/* Center dashes */}
          <div className="absolute left-0 right-0 overflow-hidden" style={{ bottom: 18, height: 4 }}>
            <div
              className="flex"
              style={{ animation: "bantai-road 0.35s linear infinite", width: "200%" }}
            >
              {Array.from({ length: 28 }).map((_, i) => (
                <>
                  <div key={`d${i}`} style={{ width: 28, height: 4, background: "#fff", borderRadius: 2, flexShrink: 0 }} />
                  <div key={`g${i}`} style={{ width: 18, flexShrink: 0 }} />
                </>
              ))}
            </div>
          </div>
          {/* Shoulder */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: 6, background: "#475569" }} />
 
          {/* Exhaust puffs */}
          <div
            className="absolute flex flex-row-reverse gap-1"
            style={{ left: Math.max(0, leftPx - 16), bottom: 16, transition: "left 80ms linear" }}
          >
            {[8, 6, 4].map((size, i) => (
              <div
                key={i}
                style={{
                  width: size, height: size,
                  borderRadius: "50%",
                  background: "#94a3b8",
                  opacity: 0.7 - i * 0.2,
                  animation: `bantai-puff 0.6s ease-out ${i * 0.2}s infinite`,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
 
          {/* Jeepney */}
          <div
            className="absolute"
            style={{ left: leftPx, bottom: 6, transition: "left 80ms linear" }}
          >
            <JeepneySVG />
          </div>
        </div>
      </div>
 
      {/* Segment bar */}
      <div className="w-full max-w-md flex gap-1">
        {Array.from({ length: SEGS }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-full transition-colors duration-200"
            style={{ background: i < segsCount ? "#2563eb" : "#e2e8f0" }}
          />
        ))}
      </div>
 
      {/* Smooth progress bar */}
      <div className="w-full max-w-md h-[5px] bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-[width] duration-[80ms] ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
 
      {/* Logo + percentage */}
      <div className="w-full max-w-md flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <Image
            src="/bantai_logo.png"
            alt="Bantai AI"
            width={90}
            height={28}
            className="mix-blend-multiply opacity-80"
          />
          <span className="text-[11px] text-slate-400 tracking-wide">
            {LOAD_MESSAGES[msgIdx]}
          </span>
        </div>
        <span className="text-2xl font-black text-slate-800 tabular-nums">
          {progress}%
        </span>
      </div>
 
      {/* Keyframes injected once */}
      <style>{`
        @keyframes bantai-road {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes bantai-bld {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes bantai-stars {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes bantai-puff {
          0%   { transform: translateY(0) scale(1); opacity: inherit; }
          100% { transform: translateY(-12px) scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [destination, setDestination] = useState("/login");
  const router = useRouter();

  const handleNavigate = (href: string) => {
    setDestination(href);
    setIsLoading(true);
    setProgress(0);
  };

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => router.push(destination), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isLoading, destination, router]);

  if (isLoading) {
    return <LoadingScreen progress={progress} />;
  }

  return (
    <main className="h-screen w-full bg-[#F8FAFC] flex flex-col overflow-hidden text-slate-900">

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">

        {/* Real logo */}
        <div className="mb-6">
          <Image
            src="/bantai_logo.png"
            alt="Bantai AI"
            width={280}
            height={100}
            className="object-contain mix-blend-multiply"
            priority
          />
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.1] text-center mb-6">
          Smart Management for <br />
          <span className="text-blue-600">Modern Transit.</span>
        </h1>

        <p className="text-slate-500 text-base md:text-lg max-w-xl text-center leading-relaxed mb-8">
          Real-time monitoring for jeepney operators — track your units, 
          get instant alerts on overspeeding and overcrowding, and keep your fleet compliant.
        </p>

        {/* Buttons — both trigger jeepney loader */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleNavigate("/login")}
            className="px-10 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            Get Started
          </button>
          <button
            onClick={() => handleNavigate("/about")}
            className="px-10 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-lg hover:border-blue-500 transition-all active:scale-95"
          >
            Learn More
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-slate-100 bg-white/50">
        <div className="max-w-2xl mx-auto flex justify-around items-center">
          {[
            { icon: "🚐", label: "Registration" },
            { icon: "🚨", label: "Violations" },
            { icon: "📊", label: "Reports" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1 group">
              <span className="text-2xl group-hover:scale-110 transition-transform">{f.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-600">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}