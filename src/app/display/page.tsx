import React from 'react';

export default function DisplayPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Ranking Gameshow
          </h1>
          <p className="text-2xl text-gray-300">Live Results Display</p>
        </div>
        
        {/* Game Status */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-8 py-4">
            <div className="w-4 h-4 bg-gray-400 rounded-full mr-3 animate-pulse"></div>
            <span className="text-xl font-medium">Waiting for game to start...</span>
          </div>
        </div>
        
        {/* Chart Area */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-xl text-gray-300">Chart will appear here when game starts</p>
            </div>
          </div>
        </div>
        
        {/* Player Count */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">0</div>
            <p className="text-gray-300">Connected Players</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">0</div>
            <p className="text-gray-300">Responses Received</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-yellow-400 mb-2">--</div>
            <p className="text-gray-300">Time Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}
