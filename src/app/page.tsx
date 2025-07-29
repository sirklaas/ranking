import Link from 'next/link';

export default function Home() {
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
        
        {/* Three Screen Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Presenter Interface */}
          <Link href="/presenter" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:bg-blue-400 transition-colors">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4">Presenter</h2>
                <p className="text-gray-300 mb-6">
                  Control panel for game management and monitoring
                </p>
                <div className="text-sm text-blue-300 font-medium">
                  MacBook Interface →
                </div>
              </div>
            </div>
          </Link>
          
          {/* Player Interface */}
          <Link href="/player" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:bg-green-400 transition-colors">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4">Player</h2>
                <p className="text-gray-300 mb-6">
                  Join games and submit your rankings
                </p>
                <div className="text-sm text-green-300 font-medium">
                  Mobile Interface →
                </div>
              </div>
            </div>
          </Link>
          
          {/* Display Interface */}
          <Link href="/display" className="group">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:bg-purple-400 transition-colors">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4">Display</h2>
                <p className="text-gray-300 mb-6">
                  Live results and animated visualizations
                </p>
                <div className="text-sm text-purple-300 font-medium">
                  TV/Beamer Interface →
                </div>
              </div>
            </div>
          </Link>
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
