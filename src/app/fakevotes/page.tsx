'use client';

import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pinkmilk.pockethost.io');
const SESSION_ID = 'default_session';

interface VoteStats {
  totalVotes: number;
  votesByCharacter: Record<number, number>;
  currentRound: number;
}

interface Player {
  id: string;
  name: string;
  voted: boolean;
  character?: string;
}

export default function FakeVotesPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [voteDuration, setVoteDuration] = useState(20); // seconds
  const [stats, setStats] = useState<VoteStats>({ totalVotes: 0, votesByCharacter: {}, currentRound: 1 });
  const [votingProgress, setVotingProgress] = useState(0);

  useEffect(() => {
    loadPlayers();
    loadStats();
    // Refresh stats every 2 seconds
    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadPlayers() {
    try {
      const records = await pb.collection('players').getFullList({
        sort: 'name'
      });
      const playerList = records.map((p) => ({
        id: p.id,
        name: (p as unknown as { name: string }).name,
        voted: false
      }));
      setPlayers(playerList);
      setStatus(`Loaded ${playerList.length} players`);
    } catch (error) {
      console.error('Failed to load players:', error);
      setStatus('Failed to load players from PocketBase');
    }
  }

  async function loadStats() {
    try {
      // Get current session
      const session = await pb.collection('voting_session')
        .getFirstListItem(`session_id="${SESSION_ID}"`)
        .catch(() => null);
      
      const currentRound = session?.round || 1;
      
      // Get all votes for current round
      const allVotes = await pb.collection('votes').getFullList({
        filter: `session_id=\\"${SESSION_ID}\\" && round=${currentRound}`
      });
      
      // Count votes per character
      const votesByCharacter: Record<number, number> = {};
      allVotes.forEach((vote) => {
        const imageId = (vote as unknown as { image_id: number }).image_id;
        votesByCharacter[imageId] = (votesByCharacter[imageId] || 0) + 1;
      });
      
      setStats({
        totalVotes: allVotes.length,
        votesByCharacter,
        currentRound
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function generateFakeVotes() {
    if (players.length === 0) {
      setStatus('Error: No players loaded!');
      return;
    }

    setIsGenerating(true);
    setVotingProgress(0);
    setStatus('Starting fake voting...');

    try {
      // Get current session state
      const session = await pb.collection('voting_session')
        .getFirstListItem(`session_id="${SESSION_ID}"`)
        .catch(() => null);

      if (!session) {
        setStatus('Error: No active voting session found!');
        setIsGenerating(false);
        return;
      }

      const currentRound = (session as unknown as { round: number }).round;
      const characterIds = [1, 2, 3, 4]; // 4 characters
      const characterNames = ['Ariel', 'Sage', 'Cherry', 'Pandora'];

      // Shuffle players
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      // Calculate time interval between votes
      const intervalMs = (voteDuration * 1000) / shuffledPlayers.length;
      const now = Date.now();

      let successCount = 0;
      
      for (let i = 0; i < shuffledPlayers.length; i++) {
        const player = shuffledPlayers[i];
        
        // Random character choice
        const randomCharacter = characterIds[Math.floor(Math.random() * characterIds.length)];
        const characterName = characterNames[randomCharacter - 1];
        
        // Spread votes over time
        const voteTime = new Date(now - (intervalMs * (shuffledPlayers.length - i)));
        
        const vote = {
          session_id: SESSION_ID,
          round: currentRound,
          voter_id: player.id,
          image_id: randomCharacter,
          created: voteTime.toISOString()
        };

        try {
          await pb.collection('votes').create(vote);
          successCount++;
          
          // Update player status
          setPlayers(prev => prev.map(p => 
            p.id === player.id ? { ...p, voted: true, character: characterName } : p
          ));
          
          setVotingProgress(successCount);
          setStatus(`${successCount}/${shuffledPlayers.length} votes submitted...`);
        } catch (error) {
          console.error('Failed to create vote:', error);
        }
      }

      setStatus(`✅ Successfully created ${successCount} fake votes for round ${currentRound}!`);
      loadStats(); // Refresh stats
    } catch (error) {
      console.error('Error generating fake votes:', error);
      setStatus(`❌ Error: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function clearVotes() {
    if (!confirm('Are you sure you want to delete ALL votes?')) return;
    
    setIsGenerating(true);
    setStatus('Deleting all votes...');

    try {
      // Get all votes
      const allVotes = await pb.collection('votes').getFullList();
      
      let deletedCount = 0;
      for (const vote of allVotes) {
        try {
          await pb.collection('votes').delete(vote.id);
          deletedCount++;
          setStatus(`Deleted ${deletedCount}/${allVotes.length} votes...`);
        } catch (error) {
          console.error('Failed to delete vote:', error);
        }
      }

      setStatus(`✅ Deleted ${deletedCount} votes!`);
      
      // Reset player voted status
      setPlayers(prev => prev.map(p => ({ ...p, voted: false, character: undefined })));
      setVotingProgress(0);
      
      loadStats(); // Refresh stats
    } catch (error) {
      console.error('Error clearing votes:', error);
      setStatus(`❌ Error: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  }

  const characterNames = ['Ariel', 'Sage', 'Cherry', 'Pandora'];
  const totalVotes = stats.totalVotes;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-purple-400 mb-8 text-center">Fakevotes</h1>
        
        {/* Stats Header */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-purple-300 mb-4">Ronde {stats.currentRound} - Stemmen</h2>
          <div className="text-3xl font-bold mb-4">
            {players.length} players / {votingProgress} votes registered
          </div>
          
          {/* Character Percentages */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((id) => {
              const votes = stats.votesByCharacter[id] || 0;
              const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              return (
                <div key={id} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400">{characterNames[id - 1]}</div>
                  <div className="text-2xl font-bold text-purple-300">{percentage}%</div>
                  <div className="text-xs text-gray-500">{votes} {votes === 1 ? 'stem' : 'stemmen'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player List */}
        <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Players ({players.length})</h2>
          <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
            {players.map((player) => (
              <div
                key={player.id}
                className={`text-sm p-2 rounded ${
                  player.voted
                    ? 'bg-green-900/50 border border-green-500/30'
                    : 'bg-gray-700/50 border border-gray-600/30'
                }`}
              >
                <div className="font-semibold truncate">{player.name}</div>
                {player.character && (
                  <div className="text-xs text-green-400">{player.character}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Vote Duration (seconds)</label>
            <input
              type="number"
              value={voteDuration}
              onChange={(e) => setVoteDuration(parseInt(e.target.value))}
              min="1"
              max="300"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">Votes will be spread evenly across this duration</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={generateFakeVotes}
              disabled={isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Fake Votes'}
            </button>

            <button
              onClick={clearVotes}
              disabled={isGenerating}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Clear All Votes
            </button>
          </div>
        </div>

        {status && (
          <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-4">
            <p className="text-sm">{status}</p>
          </div>
        )}

        <div className="mt-8 bg-gray-800/50 border border-purple-500/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>• Generates random votes for the current round</li>
            <li>• Each voter randomly picks one of the 4 characters</li>
            <li>• Vote timestamps are spread across the duration</li>
            <li>• Simulates realistic voting patterns</li>
            <li>• Use &quot;Clear All Votes&quot; to reset before testing</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <a href="/mevotes?view=mepresenter" className="text-purple-400 hover:underline">
            ← Back to Presenter
          </a>
        </div>
      </div>
    </div>
  );
}
