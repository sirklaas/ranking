'use client';

import React, { useState, useRef } from 'react';
import { rankingService, teamService, faseService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';
import * as XLSX from 'xlsx';

interface RankingSessionFormProps {
  onSessionCreated: (session: RankingSession) => void;
  onCancel: () => void;
}

export default function RankingSessionForm({ onSessionCreated, onCancel }: RankingSessionFormProps) {
  const [formData, setFormData] = useState({
    showname: '',
    city: '',
    photocircle: '',
    nr_teams: 0,
    playernames: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerList, setPlayerList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'nr_teams' ? parseInt(value) || 0 : value
    }));
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        // Extract player names from the first column, filtering out empty cells
        const names = jsonData
          .flat()
          .filter(cell => cell && typeof cell === 'string' && cell.trim())
          .map(name => name.toString().trim());
        
        setPlayerList(names);
        setFormData(prev => ({
          ...prev,
          playernames: names.join(', ')
        }));
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (_err) {
        setError('Failed to parse Excel file. Please make sure it\'s a valid Excel file with player names.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearPlayers = () => {
    setPlayerList([]);
    setFormData(prev => ({
      ...prev,
      playernames: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.showname.trim()) {
        throw new Error('Show name is required');
      }
      if (!formData.city.trim()) {
        throw new Error('City is required');
      }
      if (!formData.photocircle.trim()) {
        throw new Error('Photocircle link is required');
      }
      
      // Calculate nr_players from playernames and assign team numbers by prefixing names
      const playerNames = formData.playernames.split(',').map(name => name.trim()).filter(name => name);
      const playersWithTeamNumbers = teamService.assignTeamNumbersToPlayers(playerNames, formData.nr_teams);
      const sessionData = {
        ...formData,
        nr_players: playerNames.length,
        playernames: playersWithTeamNumbers.join(', '), // Store prefixed names
        team_assignments: '', // No longer needed with prefixed approach
        headings: faseService.createDefaultHeadings(), // Add default headings for fases
        current_fase: '01/00' // Start with first fase
      };

      const session = await rankingService.createSession(sessionData);
      onSessionCreated(session as unknown as RankingSession);
    } catch {
      setError('Failed to create session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Ranking Session</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="showname" className="block text-sm font-medium text-gray-700 mb-2">
              Show Name *
            </label>
            <input
              type="text"
              id="showname"
              name="showname"
              value={formData.showname}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
              placeholder="Enter show name"
              required
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
              placeholder="Enter city"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="photocircle" className="block text-sm font-medium text-gray-700 mb-2">
              Photocircle Link *
            </label>
            <input
              type="url"
              id="photocircle"
              name="photocircle"
              value={formData.photocircle}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
              placeholder="https://join.photocircleapp.com/..."
              required
            />
          </div>

          <div>
            <label htmlFor="nr_teams" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Teams
            </label>
            <input
              type="number"
              id="nr_teams"
              name="nr_teams"
              value={formData.nr_teams}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player Names
          </label>
          
          {/* Excel File Import */}
          <div className="mb-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                📁 Import from Excel
              </button>
              {playerList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearPlayers}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  🗑️ Clear Players
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Upload an Excel file (.xlsx, .xls) or CSV file with player names. Names should be in the first column.
            </p>
          </div>

          {/* Player List Display */}
          {playerList.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Imported Players ({playerList.length}):</h4>
              <div className="max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {playerList.map((name, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual Entry Fallback */}
          <div>
            <label htmlFor="playernames" className="block text-sm font-medium text-gray-600 mb-2">
              Or enter manually (comma-separated):
            </label>
            <textarea
              id="playernames"
              name="playernames"
              value={formData.playernames}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
              placeholder="Enter player names separated by commas (e.g., John, Jane, Bob)"
            />
          </div>
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isLoading ? 'Creating...' : 'Create Session'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
