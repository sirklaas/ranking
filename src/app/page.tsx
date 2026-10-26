'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If opened on mobile (iPhone, Android, small screen), redirect straight to /player
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth < 768);

    if (isMobile) {
      router.replace('/player' + window.location.search);
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center text-white">
        <div className="animate-pulse text-lg" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
          Laden...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      <div className="container mx-auto px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Ranking Gameshow
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Interactive ranking games with real-time audience participation
          </p>
        </div>

        {/* Ranking Game Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center border-b border-white/20 pb-4">Ranking Game</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Presenter Interface */}
            <Link href="/presenter" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer h-full flex flex-col justify-between">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-5 flex items-center justify-center group-hover:bg-blue-400 transition-colors">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Presenter</h2>
                  <p className="text-gray-300 mb-5 text-sm">
                    Control panel for game management
                  </p>
                </div>
                <div className="text-center text-sm text-blue-300 font-medium">
                  MacBook Interface →
                </div>
              </div>
            </Link>

            {/* Display Interface */}
            <Link href="/display" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer h-full flex flex-col justify-between">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-5 flex items-center justify-center group-hover:bg-purple-400 transition-colors">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Display</h2>
                  <p className="text-gray-300 mb-5 text-sm">
                    Live results & animations on Beamer
                  </p>
                </div>
                <div className="text-center text-sm text-purple-300 font-medium">
                  TV/Beamer Interface →
                </div>
              </div>
            </Link>

            {/* Player Interface */}
            <Link href="/player" className="group">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer h-full flex flex-col justify-between">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full mx-auto mb-5 flex items-center justify-center group-hover:bg-emerald-400 transition-colors">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Player</h2>
                  <p className="text-gray-300 mb-5 text-sm">
                    Single player phone interface
                  </p>
                </div>
                <div className="text-center text-sm text-emerald-300 font-medium">
                  Mobile Phone →
                </div>
              </div>
            </Link>

            {/* 6 Test Phones Interface */}
            <Link href="/test-phones" className="group">
              <div className="bg-orange-950/40 border border-orange-500/40 backdrop-blur-sm rounded-2xl p-6 hover:bg-orange-900/40 hover:border-orange-500 transition-all duration-300 transform hover:scale-105 cursor-pointer h-full flex flex-col justify-between shadow-lg shadow-orange-950/50">
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-600 rounded-full mx-auto mb-5 flex items-center justify-center group-hover:bg-orange-500 transition-colors shadow-md shadow-orange-700/50">
                    <span className="text-3xl">📱</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-orange-400">6 Test Phones</h2>
                  <p className="text-gray-300 mb-5 text-sm">
                    Simulate 6 synced mobile players side-by-side
                  </p>
                </div>
                <div className="text-center text-sm text-orange-300 font-medium">
                  6 Phones Matrix →
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Masked Employee Section */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-center border-b border-white/20 pb-4">Masked Employee</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Presenter Interface */}
            <Link href="/me/presenter" className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-white/10">
                <div className="text-center">
                  <div className="w-16 h-16 bg-indigo-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:bg-indigo-400 transition-colors">
                    <span className="text-2xl">🎭</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-4">ME Presenter</h2>
                  <p className="text-gray-300 mb-6">
                    Manage Masked Employee game
                  </p>
                  <div className="text-sm text-indigo-300 font-medium">
                    /me/presenter →
                  </div>
                </div>
              </div>
            </Link>

            {/* Phone Interface */}
            <Link href="/me/phone" className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-white/10">
                <div className="text-center">
                  <div className="w-16 h-16 bg-pink-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:bg-pink-400 transition-colors">
                    <span className="text-2xl">📱</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-4">ME Phone</h2>
                  <p className="text-gray-300 mb-6">
                    Vote for Masked Employee
                  </p>
                  <div className="text-sm text-pink-300 font-medium">
                    /me/phone →
                  </div>
                </div>
              </div>
            </Link>

            {/* Display Interface */}
            <Link href="/me/display" className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 cursor-pointer border border-white/10">
                <div className="text-center">
                  <div className="w-16 h-16 bg-cyan-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:bg-cyan-400 transition-colors">
                    <span className="text-2xl">📺</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-4">ME Display</h2>
                  <p className="text-gray-300 mb-6">
                    Show ME results
                  </p>
                  <div className="text-sm text-cyan-300 font-medium">
                    /me/display →
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-8">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-3xl mb-2">⚡</div>
              <div className="font-semibold">Real-time Sync</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-3xl mb-2">📱</div>
              <div className="font-semibold">100+ Players</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-3xl mb-2">📊</div>
              <div className="font-semibold">Live Charts</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-3xl mb-2">🎮</div>
              <div className="font-semibold">Easy Controls</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
