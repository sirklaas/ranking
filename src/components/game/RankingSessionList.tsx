'use client';

import React, { useState, useEffect } from 'react';
import { rankingService, teamService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';

interface RankingSessionListProps {
  onSessionSelect: (session: RankingSession) => void;
  refreshTrigger?: number;
}

export default function RankingSessionList({ onSessionSelect, refreshTrigger }: RankingSessionListProps) {
  const [sessions, setSessions] = useState<RankingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await rankingService.getAllSessions();
      setSessions(data as unknown as RankingSession[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [refreshTrigger]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await rankingService.searchSessions(query);
        setSessions(results as unknown as RankingSession[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      }
    } else {
      loadSessions();
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await rankingService.deleteSession(sessionId);
        setSessions(prev => prev.filter(session => session.id !== sessionId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete session');
      }
    }
  };

  const togglePriority = async (sessionId: string, currentPriority: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // If this session is already priority, unset it. Otherwise set it and clear all others.
      if (currentPriority === 1) {
        await fetch('/api/session-state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sessionId, data: { priority: 0 } })
        });
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, priority: 0 } as RankingSession : s));
      } else {
        // Clear all others first
        for (const s of sessions) {
          if ((s as unknown as Record<string, unknown>).priority === 1) {
            await fetch('/api/session-state', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: s.id, data: { priority: 0 } })
            });
          }
        }
        // Set this one
        await fetch('/api/session-state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sessionId, data: { priority: 1 } })
        });
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, priority: 1 } as RankingSession
            : { ...s, priority: 0 } as RankingSession
        ));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle priority');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Ranking Sessions</h2>
        <button
          onClick={loadSessions}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by show name or city..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'No sessions found matching your search.' : 'No ranking sessions found.'}
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sessions.map((session) => {
            const playerNames = teamService.parsePlayerNames(session.playernames);
            return (
              <div
                key={session.id}
                onClick={() => onSessionSelect(session)}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {session.showname}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {session.city} • {formatDate(session.created)}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {session.nr_players} players
                      </span>

                      {session.nr_teams > 0 && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {session.nr_teams} teams
                        </span>
                      )}

                      {session.teamname && (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h1m-1-4h1m4 4h1m-1-4h1" />
                          </svg>
                          {session.teamname}
                        </span>
                      )}
                    </div>

                    {playerNames.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Players:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {playerNames.slice(0, 5).join(', ')}
                          {playerNames.length > 5 && ` +${playerNames.length - 5} more`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* Priority star toggle */}
                    <button
                      onClick={(e) => togglePriority(session.id, (session as unknown as Record<string, unknown>).priority as number || 0, e)}
                      className={`p-2 rounded-lg transition-all ${(session as unknown as Record<string, unknown>).priority === 1
                        ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100 scale-110'
                        : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-100'
                        }`}
                      title={(session as unknown as Record<string, unknown>).priority === 1 ? 'Active show (click to deactivate)' : 'Set as active show'}
                    >
                      <svg className="w-12 h-12" fill={(session as unknown as Record<string, unknown>).priority === 1 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(session.id, e)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete session"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
