// app/admin/login/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Matches your Flutter 2-second delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (username === 'admin' && password === 'bantai2026') {
      login("mock-token", {
          id: "1",
          email: "admin@bantai.ai",
          firstName: "Admin",
          lastName: "User",
          role: "ADMIN",
          isActive: true,
          createdAt: new Date().toISOString()
      });
    } else {
      setIsLoading(false);
      setError('Invalid username or password');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F9FAFB] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-[#143054]/10 pointer-events-none" />

      <div className="relative w-full max-w-[480px] p-5 z-10">
        <div className="bg-white rounded-[24px] shadow-2xl p-8 md:p-10">
          <form onSubmit={handleLogin} className="flex flex-col items-center">

            <div className="h-[130px] flex items-center justify-center mb-2">
              {!logoError ? (
                <Image src="/bantai_logo.png" alt="Logo" width={120} height={120} priority onError={() => setLogoError(true)} />
              ) : (
                <div className="w-[120px] h-[120px] bg-gradient-to-r from-blue-700 to-blue-500 rounded-full flex items-center justify-center text-white"><span className="material-icons text-6xl">smart_toy</span></div>
              )}
            </div>

            <h1 className="text-[#143054] text-3xl font-bold">Admin Access</h1>
            <p className="text-gray-500 text-sm mt-1">Secure administration portal</p>

            {error && <div className="mt-4 w-full p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center font-medium">{error}</div>}

            <div className="mt-8 w-full space-y-4">
              <div className="relative">
                {/* Made icon darker: text-gray-700 */}
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 material-icons">person_outline</span>
                {/* Made text darker: text-gray-900 */}
                <input type="text" placeholder="Username" disabled={isLoading} className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-gray-900" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>

              <div className="relative">
                {/* Made icon darker: text-gray-700 */}
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 material-icons">lock_outline</span>
                {/* Made text darker: text-gray-900 */}
                <input type={isPasswordVisible ? 'text' : 'password'} placeholder="Password" disabled={isLoading} className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-gray-900" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700"><span className="material-icons">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span></button>
              </div>

              <button type="submit" disabled={isLoading} className="w-full h-[50px] bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold tracking-wider transition-all disabled:opacity-50">LOGIN TO ADMIN DASHBOARD</button>

              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-gray-700">
                <span className="material-icons text-amber-500 text-[18px]">security</span>
                <p className="text-[12px] font-medium">Restricted area. All access is logged.</p>
              </div>
            </div>

            <footer className="mt-8 text-center text-gray-400 text-[10px]">
              <p className="font-medium text-gray-500">© 2026 BANT.AI - MANDAUE CITY GOVERNMENT</p>
              <p>Public Transport Regulation Office</p>
            </footer>
          </form>
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl flex flex-col items-center w-[220px]">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-gray-800">Verifying...</p>
          </div>
        </div>
      )}
    </div>
  );
}