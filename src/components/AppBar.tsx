"use client";

interface AppBarProps {
    onLogoutClick: () => void;
}

export default function AppBar({ onLogoutClick }: AppBarProps) {
    return (
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-bold">ADMIN PANEL</span>
            </div>

            <div
                className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full cursor-pointer hover:bg-slate-100 transition"
                onClick={onLogoutClick}
            >
                <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">Admin User</span>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-[11px] text-slate-500">Online</span>
                    </div>
                </div>
                <svg className="w-4 h-4 text-slate-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </header>
    );
}