"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login: authLogin } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      authLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex bg-[#FDFDFD] overflow-hidden font-sans">

      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col p-8">

        {/* BACK BUTTON AND TITLE */}
        <div className="relative z-20 flex items-center gap-5 mt-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white hover:bg-white/30 transition-all group shadow-2xl"
          >
            <span className="material-icons text-2xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </button>

          <div>
            <h2 className="text-xl font-black tracking-[0.25em] text-white uppercase leading-none">
              MPUJ MONITORING SYSTEM
            </h2>
            <p className="text-blue-400/80 text-[10px] font-bold tracking-widest mt-1 uppercase">
              Public Transport Office
            </p>
          </div>
        </div>

        {/* BACKGROUND IMAGE */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/modjep.png"
            alt="Background"
            fill
            priority
            quality={75}
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#0f213a]/55" />
        </div>

        <div className="flex-1" />

        {/* AUTHORIZED TAG */}
        <div className="relative z-10 flex items-center gap-4 text-white/70 text-sm py-4 px-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 w-fit">
          <span className="material-icons text-blue-400">verified_user</span>
          <p className="font-medium tracking-tight">Authorized Personnel Only. Access is securely monitored.</p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-[420px] bg-white rounded-[40px] shadow-xl border border-gray-100 p-10 relative z-10 transition-all hover:shadow-2xl">
          <form onSubmit={handleLogin} className="flex flex-col items-center">

            {/* Logo */}
            <div className="relative w-48 h-48 -mb-8 transition-transform duration-500">
              <Image
                src="/icon.png"
                alt="BANT.AI Logo"
                fill
                priority
                sizes="192px"
                className="object-contain"
              />
            </div>

            {/* Header */}
            <div className="text-center mb-10 pt-0">
              <h1 className="text-4xl font-[900] tracking-tighter text-[#0f213a] mb-2">
                Login
              </h1>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-1 w-2 bg-blue-600 rounded-full" />
                <div className="h-1 w-8 bg-blue-600 rounded-full" />
                <div className="h-1 w-2 bg-blue-600 rounded-full" />
              </div>
              <p className="text-gray-400 text-[10px] font-black tracking-[0.3em] uppercase">
                Management Portal
              </p>
            </div>

            {error && (
              <div className="mb-6 w-full p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-sm">error</span>
                  {error}
                </div>
              </div>
            )}

            <div className="w-full space-y-4">
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 material-icons text-xl group-focus-within:text-blue-600 transition-colors duration-300">person</span>
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full pl-14 pr-5 py-5 bg-gray-50/50 border border-gray-200 rounded-[22px] focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all duration-300 text-gray-800 text-sm font-medium placeholder:text-gray-400"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 material-icons text-xl group-focus-within:text-blue-600 transition-colors duration-300">lock</span>
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  placeholder="Password"
                  className="w-full pl-14 pr-14 py-5 bg-gray-50/50 border border-gray-200 rounded-[22px] focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all duration-300 text-gray-800 text-sm font-medium placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-600 transition-colors p-1"
                >
                  <span className="material-icons text-xl">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-16 bg-[#0f213a] hover:bg-blue-700 text-white rounded-[22px] font-black text-xs tracking-[0.25em] transition-all duration-300 shadow-lg shadow-blue-900/10 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 mt-4"
              >
                {isLoading ? (
                  <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <span className="material-icons text-lg">arrow_forward</span>
                  </>
                )}
              </button>
            </div>

            <footer className="mt-10 text-center">
              <p className="text-[10px] font-black text-black-300 tracking-[0.3em] uppercase hover:text-gray-400 transition-colors cursor-default">
                © 2026 MANDAUE CITY
              </p>
            </footer>
          </form>
        </div>
      </div>
    </div>
  );
}