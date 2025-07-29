import React from 'react';

export default function PlayerPage() {
  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Join Ranking Game
          </h1>
          <p className="text-gray-600">Enter the game code to participate</p>
        </div>
        
        {/* Game Code Entry */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="gameCode" className="block text-sm font-medium text-gray-700 mb-2">
            Game Code
          </label>
          <input
            type="text"
            id="gameCode"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono"
            placeholder="XXXX"
            maxLength={6}
          />
          <button className="w-full mt-4 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
            Join Game
          </button>
        </div>
        
        {/* Player Name Entry */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
            Your Name (Optional)
          </label>
          <input
            type="text"
            id="playerName"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your name"
          />
        </div>
        
        {/* Game Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600">Waiting to join game...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
