'use client';

import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pinkmilk.pockethost.io');
const SESSION_ID = 'default_session';

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
  const [votingProgress, setVotingProgress] = useState(0);

  useEffect(() => {
    // Just load players once on mount
    loadPlayers();
  }, []);

  async function loadPlayers() {
    try {
      console.log('FAKEVOTES - Loading players from voting_session...');
      const session = await pb.collection('voting_session')
        .getFirstListItem(`session_id="${SESSION_ID}"`);
      
      console.log('FAKEVOTES - Session:', session);
      const playersArray = (session as unknown as { players: string[] }).players || [];
      console.log('FAKEVOTES - Players array:', playersArray);
      
      const playerList = playersArray.map((name, idx) => ({
        id: `player_${idx}`,
        name: name,
        voted: false
      }));
      
      setPlayers(playerList);
      setStatus(`✅ Loaded ${playerList.length} players from voting session`);
      console.log('FAKEVOTES - Player list:', playerList);
    } catch (error) {
      const err = error as { status?: number };
      if (err.status === 429) {
        console.error('FAKEVOTES - Rate limited! Wait a few minutes before trying again.');
        setStatus(`⏰ Rate limited - wait 5 minutes and refresh the page`);
      } else {
        console.error('FAKEVOTES - Failed to load players:', error);
        setStatus(`❌ Failed to load players: ${error}`);
      }
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
      const sessionTimer = (session as unknown as { timer: number }).timer || 20;
      const characterIds = [1, 2, 3, 4]; // 4 characters
      const characterNames = ['Ariel', 'Sage', 'Cherry', 'Pandora'];

      // Shuffle players
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      // Use session timer, not local voteDuration
      const intervalMs = (sessionTimer * 1000) / shuffledPlayers.length;
      const now = Date.now();
      
      setStatus(`Generating ${shuffledPlayers.length} votes over ${sessionTimer} seconds...`);

      let successCount = 0;
      
      // Add delay to avoid rate limiting
      const delayBetweenVotes = 100; // 100ms delay = max 10 votes/second
      
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
          
          // Delay to avoid rate limiting (except for last vote)
          if (i < shuffledPlayers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenVotes));
          }
        } catch (error) {
          console.error(`Failed to create vote for ${player.name}:`, error);
          console.error('Vote data:', vote);
          // Continue with next player even if this one fails
        }
      }
      
      console.log(`FAKEVOTES - Completed: ${successCount}/${shuffledPlayers.length} votes created`);

      setStatus(`✅ Successfully created ${successCount} fake votes for round ${currentRound}!`);
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
    } catch (error) {
      console.error('Error clearing votes:', error);
      setStatus(`❌ Error: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-purple-400 mb-8 text-center">Fakevotes</h1>
        
        {/* Simple Status */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-6 mb-6 text-center">
          <div className="text-2xl font-bold mb-2">
            {players.length} players loaded
          </div>
          {votingProgress > 0 && (
            <div className="text-xl text-green-400">
              {votingProgress} votes created
            </div>
          )}
        </div>

        {/* Player List */}
        <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Players ({players.length})</h2>
          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="mb-2">No players loaded</p>
              <p className="text-sm">Make sure players are imported in voting_session</p>
              <p className="text-xs mt-2">Check browser console (F12) for errors</p>
            </div>
          ) : (
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
          )}
        </div>

        <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <p className="text-sm text-gray-400 mb-6">
            Votes will use the timer duration set in the presenter
          </p>

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
