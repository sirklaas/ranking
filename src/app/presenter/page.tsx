'use client';

import React, { useState } from 'react';
import RankingSessionForm from '@/components/game/RankingSessionForm';
import RankingSessionList from '@/components/game/RankingSessionList';
import { RankingSession } from '@/types';
import { teamService } from '@/lib/pocketbase';

export default function PresenterPage() {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'manage'>('list');
  const [selectedSession, setSelectedSession] = useState<RankingSession | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSessionCreated = (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSessionSelect = (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSession(null);
  };

  const renderSessionDetails = () => {
    if (!selectedSession) return null;

    const playerNames = teamService.parsePlayerNames(selectedSession.playernames);
    const [, setStats] = useState({
      totalGames: 0,
      totalPlayers: 0,
      averageScore: 0
    });

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedSession.showname}</h2>
            <p className="text-gray-600">{selectedSession.city}</p>
          </div>
          <button
            onClick={handleBackToList}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            ← Back to List
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{selectedSession.nr_players}</div>
            <div className="text-sm text-gray-600">Players</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{selectedSession.nr_teams}</div>
            <div className="text-sm text-gray-600">Teams</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{playerNames.length}</div>
            <div className="text-sm text-gray-600">Named Players</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">Active</div>
            <div className="text-sm text-gray-600">Status</div>
          </div>
        </div>

        {selectedSession.teamname && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Team Name</h3>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{selectedSession.teamname}</p>
          </div>
        )}

        {playerNames.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Player Names</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex flex-wrap gap-2">
                {playerNames.map((name, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Session Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold">
              Start Ranking Game
            </button>
            <button className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              View Live Results
            </button>
            <button className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-semibold">
              Export Data
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Ranking Gameshow - Presenter Dashboard
          </h1>
          {currentView === 'list' && (
            <button
              onClick={() => setCurrentView('create')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              + Create New Session
            </button>
          )}
        </div>

        {currentView === 'list' && (
          <RankingSessionList
            onSessionSelect={handleSessionSelect}
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentView === 'create' && (
          <RankingSessionForm
            onSessionCreated={handleSessionCreated}
            onCancel={() => setCurrentView('list')}
          />
        )}

        {currentView === 'manage' && renderSessionDetails()}
      </div>
    </div>
  );
}
