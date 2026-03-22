import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#081020] flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300 text-sm mb-8">
          🚌 Modern Jeepney Traffic Management
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          Bantai <span className="text-[#1a8fd1]">System</span>
        </h1>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Streamlined modern jeepney registration, violations tracking, and
          regulatory compliance for local government units.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl bg-[#1a8fd1] hover:bg-[#146da3] text-white font-medium transition-all shadow-lg shadow-blue-900/40"
          >
            Get Started
          </Link>
          <Link
            href="#features"
            className="px-8 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white font-medium transition-all"
          >
            Learn More
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full" id="features">
        {[
          { icon: "🚌", title: "Jeepney Registration", desc: "Register and manage modern jeepney units with ease." },
          { icon: "⚠️", title: "Violations Tracking", desc: "Issue and monitor traffic violations in real time." },
          { icon: "📋", title: "History & Reports", desc: "Access full audit trails and generate reports." },
        ].map((f) => (
          <div key={f.title} className="p-6 rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="text-white font-semibold mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}