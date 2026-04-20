export default function JeepneyLoader() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
      <div className="relative w-64 h-24">
        {/* The Road Path */}
        <div className="absolute bottom-0 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 animate-road-travel"></div>
        </div>
        
        {/* The Jeepney */}
        <div className="text-5xl absolute bottom-1 animate-jeepney-bounce left-0">
          🚐
        </div>
      </div>
      <p className="mt-4 font-bold text-blue-600 animate-pulse tracking-widest uppercase text-xs">
        Loading System...
      </p>

      <style jsx>{`
        @keyframes road-travel {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes jeepney-bounce {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-5px) rotate(1deg); }
          25% { transform: translateX(10px); }
          75% { transform: translateX(190px); }
        }
        .animate-road-travel {
          animation: road-travel 1.5s infinite linear;
        }
        .animate-jeepney-bounce {
          animation: jeepney-bounce 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}