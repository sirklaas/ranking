'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PocketBase from 'pocketbase';
import { Barlow_Semi_Condensed } from 'next/font/google';

const barlowSemiCondensed = Barlow_Semi_Condensed({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const pb = new PocketBase('https://pinkmilk.pockethost.io');
pb.autoCancellation(false);

const SESSION_ID = 'default_session';

interface VoteImage {
  id: number;
  url: string;
  title: string;
}

interface Player {
  name: string;
}

interface VotingState {
  appState: 'IDLE' | 'VOTING' | 'RESULTS' | 'REVEAL';
  round: number;
  timer: number;
  votes: { [key: number]: number }; // imageId -> vote count
  eliminated: number[]; // array of eliminated image IDs
  timerActive: boolean;
  countdown: number;
}

// MEPRESENTER - Control Panel Component
function MePresenterView() {
  const [state, setState] = useState<VotingState>({
    appState: 'IDLE',
    round: 1,
    timer: 20,
    votes: {},
    eliminated: [],
    timerActive: false,
    countdown: 20
  });
  const [images, setImages] = useState<VoteImage[]>([
    { id: 1, url: '', title: 'Ariel' },
    { id: 2, url: '', title: 'Sage' },
    { id: 3, url: '', title: '' },
    { id: 4, url: '', title: '' },
  ]);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!state.timerActive) return;
    if (state.countdown <= 0) {
      // Stop timer but stay in VOTING state - wait for manual "Show results" click
      const newState = { ...state, timerActive: false };
      setState(newState);
      updatePocketBase(newState);
      return;
    }
    const timer = setTimeout(() => {
      const newState = { ...state, countdown: state.countdown - 1 };
      setState(newState);
      updatePocketBase(newState);
    }, 1000);
    return () => clearTimeout(timer);
  }, [state.countdown, state.timerActive]);

  async function loadImages() {
    try {
      const response = await fetch('https://www.pinkmilk.eu/ME/get-vote-images.php');
      const data = await response.json();
      console.log('MEPRESENTER - Images loaded:', data);
      if (data.success && data.images) {
        // Extract filename from URL as title and clean it up
        const updatedImages = data.images.map((img: { url?: string; id?: number }, idx: number) => {
          let filename = img.url ? img.url.split('/').pop()?.split('.')[0] || `Image ${idx + 1}` : images[idx]?.title || `Image ${idx + 1}`;
          // Remove number prefix (e.g., "1_Ariel" -> "Ariel")
          filename = filename.replace(/^\d+_/, '');
          return {
            id: img.id || idx + 1,
            url: img.url || '',
            title: filename
          };
        });
        setImages(updatedImages);
        console.log('MEPRESENTER - Images with filenames:', updatedImages);
      }
    } catch (error) {
      console.error('MEPRESENTER - Failed to load images:', error);
    }
  }

  async function updatePocketBase(newState: VotingState) {
    try {
      const data = {
        session_id: SESSION_ID,
        app_state: newState.appState,
        round: newState.round,
        timer: newState.timer,
        timer_active: newState.timerActive,
        countdown: newState.countdown,
        votes: newState.votes,
        eliminated: newState.eliminated
      };
      
      console.log('PRESENTER - Updating PocketBase with:', data);
      
      // Try to find existing session
      const existing = await pb.collection('voting_session').getFirstListItem(`session_id="${SESSION_ID}"`).catch(() => null);
      
      if (existing) {
        console.log('PRESENTER - Updating existing record:', existing.id);
        await pb.collection('voting_session').update(existing.id, data);
      } else {
        console.log('PRESENTER - Creating new record');
        await pb.collection('voting_session').create(data);
      }
      console.log('PRESENTER - PocketBase update successful');
    } catch (error) {
      console.error('PRESENTER - Failed to update PocketBase:', error);
    }
  }

  function handleStartVoting() {
    const newState = { ...state, appState: 'VOTING' as const, timerActive: true, countdown: state.timer, votes: {} };
    setState(newState);
    updatePocketBase(newState);
  }

  async function handleShowResults() {
    try {
      // Count votes from PocketBase
      console.log('PRESENTER - Counting votes for round', state.round);
      const filter = `session_id="${SESSION_ID}" && round=${state.round}`;
      const allVotes = await pb.collection('votes').getFullList({ filter });
      
      console.log('PRESENTER - Found votes:', allVotes);
      
      // Count votes per image
      const voteCounts: Record<number, number> = {};
      allVotes.forEach((vote) => {
        const imageId = (vote as unknown as { image_id: number }).image_id;
        voteCounts[imageId] = (voteCounts[imageId] || 0) + 1;
      });
      
      console.log('PRESENTER - Vote counts:', voteCounts);
      const totalVotesFound = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
      console.log('PRESENTER - Total votes found:', totalVotesFound);
      
      if (totalVotesFound === 0) {
        console.warn('PRESENTER - No votes found! Check if votes were submitted correctly.');
      }
      
      const newState = { ...state, appState: 'RESULTS' as const, timerActive: false, votes: voteCounts };
      setState(newState);
      console.log('PRESENTER - New state with votes:', newState);
      console.log('PRESENTER - Updating PocketBase with votes:', voteCounts);
      await updatePocketBase(newState);
      console.log('PRESENTER - PocketBase updated successfully');
    } catch (error) {
      console.error('PRESENTER - Failed to count votes:', error);
      // Still show results even if counting fails
      const newState = { ...state, appState: 'RESULTS' as const, timerActive: false };
      setState(newState);
      updatePocketBase(newState);
    }
  }

  function handleReveal() {
    const newState = { ...state, appState: 'REVEAL' as const };
    setState(newState);
    updatePocketBase(newState);
  }

  function handleNextRound() {
    // Find character with highest votes and eliminate them
    const voteEntries = Object.entries(state.votes).map(([id, count]) => ({ id: parseInt(id), count }));
    const winner = voteEntries.sort((a, b) => b.count - a.count)[0];
    const newEliminated = winner ? [...state.eliminated, winner.id] : state.eliminated;
    
    const newState = { 
      ...state, 
      appState: 'IDLE' as const, 
      round: state.round + 1,
      eliminated: newEliminated,
      votes: {},
      countdown: state.timer
    };
    setState(newState);
    updatePocketBase(newState);
  }

  async function handleReset() {
    // Delete all votes for this session from PocketBase
    try {
      const allVotes = await pb.collection('votes').getFullList({ filter: `session_id="${SESSION_ID}"` });
      for (const vote of allVotes) {
        await pb.collection('votes').delete(vote.id);
      }
      console.log('PRESENTER - Deleted', allVotes.length, 'old votes');
    } catch (error) {
      console.error('PRESENTER - Failed to delete old votes:', error);
    }
    
    const newState = { appState: 'IDLE' as const, round: 1, timer: 20, votes: {}, eliminated: [], timerActive: false, countdown: 20 };
    setState(newState);
    updatePocketBase(newState);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if it's an Excel file
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // For Excel files, we need a proper parser
      // For now, show a message that Excel parsing requires SheetJS
      alert('Excel file detected. Please use a .txt or .csv file with one name per line, or implement SheetJS library for Excel parsing.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        // Simple CSV/text parsing - split by newlines
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => {
          const trimmed = line.trim();
          // Filter out binary/garbage data
          return trimmed && /^[\x20-\x7E\u00A0-\uFFFF]+$/.test(trimmed);
        });
        const newPlayers = lines.map(line => ({ name: line.trim() }));
        setPlayers(newPlayers);
      } catch (error) {
        console.error('Failed to parse file:', error);
      }
    };
    reader.readAsText(file);
  }

  function updateImageTitle(id: number, title: string) {
    setImages(images.map(img => img.id === id ? { ...img, title } : img));
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-4 ${barlowSemiCondensed.className}`} style={{ fontWeight: 400 }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-3xl font-normal text-blue-400 mb-1">Presenter Control Panel</h1>
          <p className="text-gray-400 text-xs">Pas namen aan, importeer spelers en bestuur de rondes.</p>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2">
            <div className="text-xs text-gray-400 mb-1">Display view</div>
            <a href={`${baseUrl}/mevotes?view=medisplay`} className="text-blue-400 text-xs hover:underline break-all">
              {baseUrl}/mevotes?view=medisplay
            </a>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2">
            <div className="text-xs text-gray-400 mb-1">Voter link</div>
            <a href={`${baseUrl}/mevotes?view=mephone&session=default_session`} className="text-blue-400 text-xs hover:underline break-all">
              {baseUrl}/mevotes?view=mephone&session=default_session
            </a>
          </div>
        </div>

        {/* Control Bar */}
        <div className="bg-gray-800/70 border-2 border-blue-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Timer Setting */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Timer (sec)</label>
              <input
                type="number"
                value={state.timer}
                onChange={(e) => setState({ ...state, timer: parseInt(e.target.value) || 20 })}
                className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center"
                disabled={state.timerActive}
              />
              {state.timerActive && (
                <div className="text-2xl font-bold text-yellow-400 ml-2">{state.countdown}s</div>
              )}
            </div>
            
            {/* Center: Round Display */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">Ronde {state.round}</div>
              <div className="text-xs text-gray-400">
                Status: {
                  state.appState === 'IDLE' ? 'Klaar' : 
                  state.appState === 'VOTING' ? 'Bezig' : 
                  state.appState === 'RESULTS' ? 'Resultaten' : 
                  'Ontmaskeren'
                }
              </div>
            </div>
            
            {/* Right: Action Buttons - Sequential Flow */}
            <div className="flex gap-2">
              {state.appState === 'IDLE' && (
                <button
                  onClick={handleStartVoting}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  Start voting
                </button>
              )}
              {state.appState === 'VOTING' && (
                <button
                  onClick={handleShowResults}
                  disabled={state.countdown > 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  {state.countdown > 0 ? `Wait ${state.countdown}s` : 'Show results'}
                </button>
              )}
              {state.appState === 'RESULTS' && (
                <button
                  onClick={handleReveal}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  Reveal
                </button>
              )}
              {state.appState === 'REVEAL' && (
                <button
                  onClick={handleNextRound}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  Next round
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Left: Import Players */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
            <h2 className="text-lg font-normal text-blue-400 mb-2">Importeer spelers</h2>
            <p className="text-xs text-gray-400 mb-2">Excel (.xlsx) met namen in kolom A</p>
            
            <label className="block mb-2">
              <div className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg cursor-pointer text-center font-normal text-sm">
                Choose File
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            <div className="text-xs text-gray-500 mb-2">
              {players.length > 0 ? `${players.length} spelers` : 'no file selected'}
            </div>

            {players.length > 0 && (
              <div className="bg-gray-900/50 rounded p-2 max-h-48 overflow-y-auto mb-3">
                <div className="text-xs font-normal mb-1">{players.length} spelers</div>
                <ul className="text-xs space-y-0.5">
                  {players.slice(0, 10).map((player, idx) => (
                    <li key={idx} className="text-gray-300">• {player.name}</li>
                  ))}
                  {players.length > 10 && (
                    <li className="text-gray-500 italic">... en {players.length - 10} meer</li>
                  )}
                </ul>
              </div>
            )}
            
            {/* Reset Game Button */}
            <button
              onClick={handleReset}
              className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg font-normal transition-colors text-sm"
            >
              Reset game
            </button>
          </div>

          {/* Right: Configure Options (2 columns) */}
          <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg p-3">
            <h2 className="text-lg font-normal text-blue-400 mb-3">Configureer opties</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {images.map((image) => (
                <div key={image.id} className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <div className="aspect-video bg-gray-800 flex items-center justify-center">
                    {image.url ? (
                      <img src={image.url} alt={image.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-600">Optie {image.id}</div>
                    )}
                  </div>
                  <div className="p-3">
                    <input
                      type="text"
                      value={image.title}
                      onChange={(e) => updateImageTitle(image.id, e.target.value)}
                      placeholder={`${image.id} ...`}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Timer Dots */}
        {state.timerActive && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-900/90 px-6 py-3 rounded-full">
            {Array.from({ length: state.timer }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i < state.countdown ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// MEPHONE - Voter Component
function MePhoneView() {
  const [images, setImages] = useState<VoteImage[]>([]);
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [voterId] = useState(() => `voter_${Math.random().toString(36).substring(2, 15)}`);
  const [votingState, setVotingState] = useState<{ 
    appState: string; 
    round: number; 
    timer: number; 
    timerActive: boolean; 
    countdown: number;
    eliminated: number[];
  }>({ 
    appState: 'IDLE', 
    round: 1, 
    timer: 20, 
    timerActive: false, 
    countdown: 20,
    eliminated: []
  });

  useEffect(() => {
    loadImages();
    
    // Subscribe to voting session state
    console.log('PHONE - Setting up PocketBase subscription');
    pb.collection('voting_session').subscribe('*', (e) => {
      if (e.record.session_id === SESSION_ID) {
        console.log('PHONE - Received state update:', e.record.app_state, 'Round:', e.record.round);
        setVotingState({ 
          appState: e.record.app_state || 'IDLE',
          round: e.record.round || 1,
          timer: e.record.timer || 20,
          timerActive: e.record.timer_active || false,
          countdown: e.record.countdown || 20,
          eliminated: e.record.eliminated || []
        });
        // Reset vote when new round starts
        if (e.record.app_state === 'IDLE') {
          setSelectedVote(null);
        }
      }
    }).catch((error) => {
      console.error('PHONE - Subscription failed:', error);
    });
    
    return () => {
      try {
        pb.collection('voting_session').unsubscribe('*');
      } catch {
        // Ignore
      }
    };
  }, []);

  async function loadImages() {
    try {
      const response = await fetch('https://www.pinkmilk.eu/ME/get-vote-images.php');
      const data = await response.json();
      console.log('PHONE - Images loaded:', data);
      if (data.success && data.images) {
        // Extract filename from URL as title and clean it up
        const updatedImages = data.images.map((img: { url?: string }, idx: number) => {
          let filename = img.url ? img.url.split('/').pop()?.split('.')[0] || `Character ${idx + 1}` : `Character ${idx + 1}`;
          // Remove number prefix (e.g., "1_Ariel" -> "Ariel")
          filename = filename.replace(/^\d+_/, '');
          return {
            id: idx + 1,
            url: img.url || '',
            title: filename
          };
        });
        setImages(updatedImages);
        console.log('PHONE - Images with filenames:', updatedImages);
      } else {
        setImages([
          { id: 1, url: 'https://via.placeholder.com/400?text=Character+1', title: 'Ariel' },
          { id: 2, url: 'https://via.placeholder.com/400?text=Character+2', title: 'Sage' },
          { id: 3, url: 'https://via.placeholder.com/400?text=Character+3', title: 'Character 3' },
          { id: 4, url: 'https://via.placeholder.com/400?text=Character+4', title: 'Character 4' },
        ]);
      }
    } catch (error) {
      console.error('PHONE - Failed to load images:', error);
    }
  }

  async function handleVote(imageId: number) {
    if (selectedVote) return;
    
    try {
      console.log('PHONE - Submitting vote:', { imageId, voterId, round: votingState.round });
      
      // Submit vote to PocketBase
      const voteData = {
        session_id: SESSION_ID,
        round: votingState.round,
        voter_id: voterId,
        image_id: imageId
      };
      
      console.log('PHONE - Vote data:', voteData);
      const result = await pb.collection('votes').create(voteData);
      console.log('PHONE - Vote created:', result);
      
      setSelectedVote(imageId);
      console.log('PHONE - Vote submitted successfully');
    } catch (error) {
      const err = error as { response?: { message?: string }; message?: string };
      console.error('PHONE - Failed to submit vote:', error);
      console.error('PHONE - Error details:', err.response || err.message);
      alert(`Stem mislukt: ${err.response?.message || err.message || 'Probeer opnieuw'}`);
    }
  }

  // Subheadings matching display view
  const subheadings = {
    'IDLE': 'We gaan zo stemmen wie we gaan ontmaskeren',
    'VOTING': 'Je kan nu stemmen op je telefoon',
    'RESULTS': 'Hier komen de resultaten',
    'REVEAL': 'Deze gaan we ontmaskeren!'
  };

  // Filter out eliminated characters
  const activeImages = images.filter(img => !votingState.eliminated.includes(img.id));

  // Round title matching display view
  const getRoundTitle = () => {
    if (votingState.round === 1) return 'Eerste ronde';
    if (votingState.round === 2) return 'Tweede ronde';
    if (votingState.round === 3) return 'Derde ronde';
    if (votingState.round === 4) return 'Vierde ronde';
    return `Ronde ${votingState.round}`;
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 text-white flex flex-col items-center justify-center p-6 ${barlowSemiCondensed.className}`}>
      <div className="w-full max-w-md">
        {/* Title */}
        <h1 className="text-4xl font-normal text-center mb-2 tracking-wide">{getRoundTitle()}</h1>
        
        {/* Subheading */}
        <p className="text-lg text-center text-blue-300 mb-4 font-normal">
          {subheadings[votingState.appState as keyof typeof subheadings] || subheadings.IDLE}
        </p>

        {/* Debug Info */}
        <div className="text-center mb-2 text-xs text-gray-500">
          State: {votingState.appState} | Timer: {votingState.timerActive ? 'ON' : 'OFF'} | Countdown: {votingState.countdown}
        </div>

        {/* Timer Dots - Only show during active voting with countdown > 0 */}
        <div className="h-8 flex justify-center items-center gap-2 mb-6">
          {votingState.appState === 'VOTING' && votingState.timerActive && votingState.countdown > 0 ? (
            Array.from({ length: votingState.timer }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  i < votingState.countdown ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-gray-700'
                }`}
              />
            ))
          ) : null}
        </div>
        
        {/* Voting Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {activeImages.map((image) => (
            <button
              key={image.id}
              onClick={() => handleVote(image.id)}
              disabled={!!selectedVote || votingState.appState !== 'VOTING'}
              className={`relative rounded-xl overflow-hidden ${
                selectedVote === image.id ? 'ring-4 ring-blue-400' : ''
              } ${votingState.appState !== 'VOTING' ? 'opacity-50 cursor-not-allowed' : ''} transition-all`}
            >
              <div className="aspect-square bg-gray-800">
                <img src={image.url} alt={image.title} className="w-full h-full object-cover" />
              </div>
              <div className="bg-gray-800/90 py-2 text-center">
                <span className="text-sm font-semibold">{image.title}</span>
              </div>
            </button>
          ))}
        </div>

        {selectedVote && (
          <div className="text-center text-green-400 text-lg font-semibold animate-pulse">
            ✓ Stem verzonden!
          </div>
        )}
      </div>
    </div>
  );
}

// MEDISPLAY - Display Component
function MeDisplayView() {
  const [images, setImages] = useState<VoteImage[]>([
    { id: 1, url: 'https://via.placeholder.com/800x450/1e3a8a/ffffff?text=Ariel', title: 'Ariel' },
    { id: 2, url: 'https://via.placeholder.com/800x450/1e3a8a/ffffff?text=Sage', title: 'Sage' },
    { id: 3, url: 'https://via.placeholder.com/800x450/1e3a8a/ffffff?text=Character+3', title: 'Character 3' },
    { id: 4, url: 'https://via.placeholder.com/800x450/1e3a8a/ffffff?text=Character+4', title: 'Character 4' },
  ]);
  const [state, setState] = useState<VotingState>({
    appState: 'IDLE',
    round: 1,
    timer: 20,
    votes: {},
    eliminated: [],
    timerActive: false,
    countdown: 20
  });
  const [animatedPercentages, setAnimatedPercentages] = useState<Record<number, number>>({});
  const [revealPhase, setRevealPhase] = useState<'shrinking' | 'winner' | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);

  useEffect(() => {
    loadImages();
    // Subscribe to state changes from presenter
    console.log('DISPLAY - Setting up PocketBase subscription for session:', SESSION_ID);
    pb.collection('voting_session').subscribe('*', (e) => {
      console.log('DISPLAY - Received PocketBase update:', e.record);
      if (e.record.session_id === SESSION_ID) {
        const newState: VotingState = {
          appState: e.record.app_state || 'IDLE',
          round: e.record.round || 1,
          timer: e.record.timer || 20,
          votes: e.record.votes || {},
          eliminated: e.record.eliminated || [],
          timerActive: e.record.timer_active || false,
          countdown: e.record.countdown || 20
        };
        console.log('DISPLAY - Updating state to:', newState);
        setState(newState);
      } else {
        console.log('DISPLAY - Ignoring update for different session:', e.record.session_id);
      }
    }).catch((error) => {
      console.error('DISPLAY - Subscription failed:', error);
    });
    
    return () => {
      try {
        pb.collection('voting_session').unsubscribe('*');
      } catch {
        // Ignore unsubscribe errors
      }
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!state.timerActive) return;
    if (state.countdown <= 0) return;
    const timer = setTimeout(() => setState(prev => ({ ...prev, countdown: prev.countdown - 1 })), 1000);
    return () => clearTimeout(timer);
  }, [state.countdown, state.timerActive]);

  // Handle REVEAL phase animation
  useEffect(() => {
    if (state.appState === 'REVEAL') {
      // Find the winner (highest votes)
      const voteEntries = Object.entries(state.votes).map(([id, count]) => ({ id: parseInt(id), count }));
      const winner = voteEntries.sort((a, b) => b.count - a.count)[0];
      if (winner) {
        setWinnerId(winner.id);
        setRevealPhase('shrinking');
        // After shrinking animation, show winner fullscreen
        setTimeout(() => {
          setRevealPhase('winner');
        }, 1500);
      }
    } else {
      setRevealPhase(null);
      setWinnerId(null);
    }
  }, [state.appState, state.votes]);

  // Animate percentages when entering RESULTS state
  useEffect(() => {
    if (state.appState !== 'RESULTS') {
      setAnimatedPercentages({});
      return;
    }

    // Calculate actual percentages from votes
    console.log('DISPLAY - Animating percentages, state.votes:', state.votes);
    const totalVotes = Object.values(state.votes).reduce((sum, count) => sum + count, 0);
    console.log('DISPLAY - Total votes:', totalVotes);
    const targetPercentages: Record<number, number> = {};
    
    images.forEach(img => {
      const voteCount = state.votes[img.id] || 0;
      targetPercentages[img.id] = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    });
    console.log('DISPLAY - Target percentages:', targetPercentages);

    // Animate from 0 to target percentage
    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      const newPercentages: Record<number, number> = {};
      images.forEach(img => {
        const target = targetPercentages[img.id] || 0;
        newPercentages[img.id] = Math.round(target * progress);
      });
      
      setAnimatedPercentages(newPercentages);

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedPercentages(targetPercentages);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [state.appState, state.votes, images]);

  async function loadImages() {
    try {
      const response = await fetch('https://www.pinkmilk.eu/ME/get-vote-images.php');
      const data = await response.json();
      console.log('MEDISPLAY - Images loaded:', data);
      if (data.success && data.images && data.images.length > 0) {
        // Extract filename from URL as title and clean it up
        const updatedImages = data.images.map((img: { url?: string }, idx: number) => {
          let filename = img.url ? img.url.split('/').pop()?.split('.')[0] || `Image ${idx + 1}` : `Image ${idx + 1}`;
          // Remove number prefix (e.g., "1_Ariel" -> "Ariel")
          filename = filename.replace(/^\d+_/, '');
          return {
            id: idx + 1,
            url: img.url || '',
            title: filename
          };
        });
        setImages(updatedImages);
        console.log('MEDISPLAY - Images with filenames:', updatedImages);
      }
    } catch (error) {
      console.error('MEDISPLAY - Failed to load images:', error);
    }
  }

  // Filter out eliminated characters
  const activeImages = images.filter(img => !state.eliminated.includes(img.id));

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = `${baseUrl}/mevotes?view=mephone&session=${SESSION_ID}`;

  // Subheadings for each stage
  const subheadings = {
    'IDLE': 'We gaan zo stemmen wie we gaan ontmaskeren',
    'VOTING': 'Je kan nu stemmen op je telefoon',
    'RESULTS': 'Hier komen de resultaten',
    'REVEAL': 'Deze gaan we ontmaskeren!'
  };

  // TEST MODE: Add keyboard shortcuts to test different states
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '1') setState(prev => ({ ...prev, appState: 'IDLE', timerActive: false }));
      if (e.key === '2') {
        setState(prev => ({ ...prev, appState: 'VOTING', timerActive: true, countdown: prev.timer }));
      }
      if (e.key === '3') setState(prev => ({ ...prev, appState: 'RESULTS', timerActive: false }));
      if (e.key === '4') setState(prev => ({ ...prev, appState: 'REVEAL', timerActive: false }));
      if (e.key === 'f' || e.key === 'F') {
        // Request fullscreen
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  return (
    <div className={`h-screen w-screen bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 text-white overflow-hidden flex flex-col ${barlowSemiCondensed.className}`} style={{ fontWeight: 400 }}>
      {/* QR Code - Top Right (1.5x bigger) */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-xl z-10">
        <div className="w-44 h-44 bg-white flex items-center justify-center">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
            alt="QR Code"
            className="w-full h-full"
          />
        </div>
        <div className="text-sm text-center text-gray-800 mt-2 font-normal">Scan om te stemmen</div>
      </div>

      <div className="container mx-auto h-full flex flex-col justify-center px-4 py-4">
        {/* Debug Info */}
        <div className="text-center mb-1 text-xs text-gray-500">
          State: {state.appState} | Timer: {state.timerActive ? 'ON' : 'OFF'} | Countdown: {state.countdown} | Votes: {JSON.stringify(state.votes)} | Press 1=IDLE, 2=VOTING, 3=RESULTS, 4=REVEAL | Press F for fullscreen
        </div>

        {/* Title */}
        <h1 className="text-5xl font-normal text-center mb-2 tracking-wide">
          {state.round === 1 ? 'Eerste ronde' : 
           state.round === 2 ? 'Tweede ronde' : 
           state.round === 3 ? 'Derde ronde' : 
           state.round === 4 ? 'Vierde ronde' : 
           `Ronde ${state.round}`}
        </h1>
        
        {/* Subheading */}
        <p className="text-xl text-center text-blue-300 mb-4 font-normal">
          {subheadings[state.appState as keyof typeof subheadings] || subheadings.IDLE}
        </p>
        
        {/* Timer Dots - Only show during active voting with countdown > 0 */}
        <div className="h-8 flex justify-center items-center gap-2 mb-4">
          {state.appState === 'VOTING' && state.timerActive && state.countdown > 0 ? (
            Array.from({ length: state.timer }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  i < state.countdown ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-gray-700'
                }`}
              />
            ))
          ) : null}
        </div>
        
        {/* REVEAL STATE - Winner takes over screen */}
        {state.appState === 'REVEAL' && winnerId && (
          <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 transition-all duration-500">
            {/* Other characters fading out */}
            {revealPhase === 'shrinking' && (
              <div className="grid grid-cols-2 gap-6 w-full h-full p-8">
                {activeImages.map((image) => {
                  const isWinner = image.id === winnerId;
                  return (
                    <div 
                      key={image.id} 
                      className={`relative transition-all duration-1000 ease-in-out ${
                        isWinner 
                          ? 'scale-110 opacity-100 z-10 ring-4 ring-yellow-400 rounded-2xl' 
                          : 'scale-75 opacity-30 blur-sm grayscale'
                      }`}
                    >
                      <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700/50">
                        {image.url ? (
                          <img src={image.url} alt={image.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-gray-900 flex items-center justify-center text-gray-400">
                            {image.title}
                          </div>
                        )}
                      </div>
                      {/* Show name under winner during shrinking phase */}
                      {isWinner && (
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
                          <span className="text-3xl font-bold text-yellow-300 drop-shadow-lg">{image.title}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Winner fullscreen with celebration */}
            {revealPhase === 'winner' && (
              <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-black">
                {/* Animated background particles */}
                <div className="absolute inset-0 overflow-hidden">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full bg-white/20 animate-ping"
                      style={{
                        width: `${Math.random() * 20 + 10}px`,
                        height: `${Math.random() * 20 + 10}px`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${Math.random() * 2 + 1}s`
                      }}
                    />
                  ))}
                </div>
                
                {/* Spotlight glow effect */}
                <div className="absolute inset-0">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vh] bg-gradient-radial from-blue-500/30 via-purple-500/10 to-transparent animate-pulse" />
                </div>
                
                {/* Winner content */}
                <div className="relative z-10 text-center">
                  {/* Winner image - large and centered */}
                  <div className="relative mb-8 animate-[scaleIn_0.8s_ease-out]">
                    {images.find(img => img.id === winnerId)?.url ? (
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-600/50 to-transparent rounded-3xl blur-2xl scale-110" />
                        <img 
                          src={images.find(img => img.id === winnerId)?.url} 
                          alt="Winner" 
                          className="w-[70vw] max-w-3xl h-auto rounded-3xl shadow-[0_0_100px_rgba(147,51,234,0.5)] border-4 border-white/30"
                        />
                        {/* Glowing border effect */}
                        <div className="absolute inset-0 rounded-3xl border-4 border-white/50 animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-[70vw] max-w-3xl aspect-video bg-gradient-to-br from-purple-900 to-blue-900 rounded-3xl flex items-center justify-center">
                        <span className="text-6xl text-white/50">🎭</span>
                      </div>
                    )}
                  </div>
                  
                  {/* "ONTMASKERD!" text with glow */}
                  <div className="relative">
                    <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-white to-yellow-300 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] animate-pulse mb-4">
                      Deze gaan we ontmaskeren!
                    </h1>
                    {/* Winner name */}
                    <h2 className="text-6xl font-bold text-white drop-shadow-[0_0_20px_rgba(147,51,234,0.8)]">
                      {images.find(img => img.id === winnerId)?.title}
                    </h2>
                    {/* Vote count */}
                    <p className="text-3xl text-blue-300 mt-4 font-light">
                      {state.votes[winnerId] || 0} stemmen
                    </p>
                  </div>
                </div>
                
                {/* Confetti-like elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div
                      key={`confetti-${i}`}
                      className="absolute w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: ['#FFD700', '#FF69B4', '#00BFFF', '#32CD32', '#FF6347', '#9370DB'][i % 6],
                        left: `${Math.random() * 100}%`,
                        top: '-10%',
                        animation: `confettiFall ${Math.random() * 3 + 2}s linear infinite`,
                        animationDelay: `${Math.random() * 3}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 2x2 Grid - Full Width (Hidden during REVEAL) */}
        {state.appState !== 'REVEAL' && (
          <div className={`grid gap-6 w-full flex-1 ${activeImages.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {activeImages.map((image) => (
              <div key={image.id} className="relative">
                {/* Name Label - Top Center */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 px-4 py-2 rounded-lg z-10">
                  <span className="text-2xl font-normal">{image.title}</span>
                </div>
                
                {/* Image Container */}
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700/50 bg-gradient-to-br from-blue-900 to-gray-900 relative">
                  {image.url ? (
                    <img src={image.url} alt={image.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-gray-900 flex items-center justify-center text-gray-400">
                      {image.title}
                    </div>
                  )}
                  
                  {/* Percentage Overlay - Only show in RESULTS state */}
                  {state.appState === 'RESULTS' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="text-center">
                        <div className="text-9xl font-bold text-white mb-2 drop-shadow-2xl animate-pulse">
                          {animatedPercentages[image.id] || 0}%
                        </div>
                        <div className="text-2xl text-blue-300 font-semibold">
                          {state.votes[image.id] || 0} {(state.votes[image.id] || 0) === 1 ? 'stem' : 'stemmen'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add keyframes for confetti animation */}
      <style jsx global>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes scaleIn {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Main Router Component
function MeVotesRouter() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'mephone';

  if (view === 'mepresenter') {
    return <MePresenterView />;
  }
  
  if (view === 'medisplay') {
    return <MeDisplayView />;
  }
  
  return <MePhoneView />;
}

export default function MeVotesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-gray-900 to-blue-900 flex items-center justify-center text-white">Loading...</div>}>
      <MeVotesRouter />
    </Suspense>
  );
}
