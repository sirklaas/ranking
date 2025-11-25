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

export default function FakeVotesPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [numVoters, setNumVoters] = useState(20);
  const [voteDuration, setVoteDuration] = useState(20); // seconds
  const [stats, setStats] = useState<VoteStats>({ totalVotes: 0, votesByCharacter: {}, currentRound: 1 });

  useEffect(() => {
    loadStats();
    // Refresh stats every 2 seconds
    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      // Get current session
      const session = await pb.collection('voting_session')
        .getFirstListItem(`session_id="${SESSION_ID}"`)
        .catch(() => null);
      
      const currentRound = session?.round || 1;
      
      // Get all votes for current round
      const allVotes = await pb.collection('votes').getFullList({
        filter: `session_id="${SESSION_ID}" && round=${currentRound}`
      });
      
      // Count votes per character
      const votesByCharacter: Record<number, number> = {};
      allVotes.forEach((vote: any) => {
        const imageId = vote.image_id;
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
    setIsGenerating(true);
    setStatus('Generating fake votes...');

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

      const currentRound = session.round;
      const characterIds = [1, 2, 3, 4]; // 4 characters

      setStatus(`Creating ${numVoters} fake votes for round ${currentRound}...`);

      // Generate votes spread over the voting duration
      const votes = [];
      const now = Date.now();
      
      for (let i = 0; i < numVoters; i++) {
        // Random character choice
        const randomCharacter = characterIds[Math.floor(Math.random() * characterIds.length)];
        
        // Random timestamp within voting duration
        const randomDelay = Math.random() * voteDuration * 1000;
        const voteTime = new Date(now - randomDelay);
        
        votes.push({
          session_id: SESSION_ID,
          round: currentRound,
          voter_id: `fake_voter_${i}_${Date.now()}`,
          image_id: randomCharacter,
          created: voteTime.toISOString()
        });
      }

      // Submit all votes
      let successCount = 0;
      for (const vote of votes) {
        try {
          await pb.collection('votes').create(vote);
          successCount++;
          setStatus(`Submitted ${successCount}/${numVoters} votes...`);
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
      <div className="max-w-2xl mx-auto">
        {/* Stats Header */}
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-purple-300 mb-4">Ronde {stats.currentRound} - Stemmen</h2>
          <div className="text-3xl font-bold mb-4">
            Aantal stemmen: {stats.totalVotes}/{numVoters}
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

        <h1 className="text-4xl font-bold text-purple-400 mb-2">Fake Votes Generator</h1>
        <p className="text-gray-400 mb-8">Generate realistic fake votes for testing</p>

        <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Number of Voters</label>
            <input
              type="number"
              value={numVoters}
              onChange={(e) => setNumVoters(parseInt(e.target.value))}
              min="1"
              max="1000"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            />
          </div>

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
            <p className="text-xs text-gray-500 mt-1">Votes will be spread randomly across this duration</p>
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
            <li>• Use "Clear All Votes" to reset before testing</li>
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
