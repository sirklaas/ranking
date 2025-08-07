'use client';

import React, { useState, useEffect, useCallback } from 'react';
import RankingSessionForm from '@/components/game/RankingSessionForm';
import RankingSessionList from '@/components/game/RankingSessionList';
import { RankingSession } from '@/types';
import { teamService, faseService, rankingService } from '@/lib/pocketbase';

export default function PresenterPage() {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'manage' | 'game'>('list');
  const [selectedSession, setSelectedSession] = useState<RankingSession | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingHeadings, setEditingHeadings] = useState<Record<string, { heading: string; image?: string }>>({});
  const [currentFase, setCurrentFase] = useState('01/01');
  const [, setGameStarted] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [gameTime, setGameTime] = useState('00:00');
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side state to prevent hydration errors
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
  }, []);

  // Load Google Font
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (gameStartTime) {
        const elapsed = Math.floor((Date.now() - gameStartTime.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setGameTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStartTime]);

  // Define fase groups
  const faseGroups = {
    '1': { name: 'Intro', fases: ['01/01', '01/02', '01/03', '01/04', '01/05', '01/06', '01/07'] },
    '4': { name: 'Guilty Pleasures', fases: ['04/01', '04/02'] },
    '7': { name: 'Zitten en Staan', fases: ['07/01', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10', '07/11', '07/12', '07/13', '07/14', '07/15'] },
    '10': { name: 'De Top 3', fases: ['10/01', '10/05', '10/06', '10/07', '10/08', '10/09', '10/10', '10/11', '10/12', '10/13'] },
    '13': { name: 'Krakende Karakters', fases: ['13/01', '13/02', '13/03', '13/06'] },
    '17': { name: 'Top 10', fases: ['17/01', '17/02', '17/05', '17/06', '17/07', '17/08', '17/09', '17/10', '17/11', '17/12', '17/13', '17/14'] },
    '20': { name: 'De Finale', fases: ['20/01'] }
  };

  // Get current fase group
  const getCurrentFaseGroup = () => {
    for (const [groupKey, group] of Object.entries(faseGroups)) {
      if (group.fases.includes(currentFase)) {
        return groupKey;
      }
    }
    return '1';
  };

  // Get filtered fases based on current selection
  const getFilteredFases = () => {
    const currentGroup = getCurrentFaseGroup();
    return faseGroups[currentGroup as keyof typeof faseGroups]?.fases || [];
  };

  const handleSessionCreated = (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
    setRefreshTrigger(prev => prev + 1);
  };

  const loadMasterTemplate = async () => {
    try {
      const response = await fetch('/assets/fases.json');
      if (response.ok) {
        const masterTemplate = await response.json();
        return masterTemplate;
      }
    } catch (error) {
      console.log('Could not load master template, using defaults');
    }
    return null;
  };

  const handleStartRankingGame = () => {
    console.log('Start Ranking Game clicked!', { selectedSession, currentView });
    if (!selectedSession) {
      console.log('No selected session - returning');
      return;
    }
    

    console.log('Setting game started and changing view to game');
    setGameStarted(true);
    setGameStartTime(new Date());
    setCurrentView('game');
    setCurrentFase('01/01');
    console.log('State updated - should show game interface now');
  };

  const handlePhaseNavigation = (fase: string) => {
    setCurrentFase(fase);
    // Update the session's current fase in the database
    if (selectedSession) {
      rankingService.updateSession(selectedSession.id, { current_fase: fase });
    }
  };

  const getNextFase = () => {
    const allFases = Object.values(faseGroups).flatMap(group => group.fases);
    const currentIndex = allFases.indexOf(currentFase);
    return currentIndex < allFases.length - 1 ? allFases[currentIndex + 1] : currentFase;
  };

  const getCurrentDisplay = () => {
    if (!selectedSession) return 'No session selected';
    const headings = faseService.parseHeadings(selectedSession.headings || '{}');
    return headings[currentFase]?.heading || `Fase ${currentFase}`;
  };

  const getNextDisplay = () => {
    if (!selectedSession) return 'No session selected';
    const nextFase = getNextFase();
    const headings = faseService.parseHeadings(selectedSession.headings || '{}');
    return headings[nextFase]?.heading || `Fase ${nextFase}`;
  };

  const getNextMedia = () => {
    // Logic to determine next media based on current fase
    // This can be expanded to read from session data or a media mapping
    const mediaMap: Record<string, { type: 'video' | 'image', path: string, name: string }> = {
      '01/01': { type: 'video', path: '/githublocal/pcs/RankingNaam.mp4', name: 'RankingNaam.mp4' },
      '01/02': { type: 'image', path: '/assets/images/photocircle.webp', name: 'PhotoCircle.webp' },
      '01/03': { type: 'image', path: '/assets/images/teamselection.webp', name: 'TeamSelection.webp' },
      // Add more mappings as needed
    };
    
    const nextFase = getNextFase();
    return mediaMap[nextFase] || { type: 'video', path: '/githublocal/pcs/RankingNaam.mp4', name: 'RankingNaam.mp4' };
  };

  const renderMediaPreview = (media: { type: 'video' | 'image', path: string, name: string }) => {
    if (media.type === 'video') {
      return (
        <div className="w-full h-full flex flex-col">
          {/* Video thumbnail/preview */}
          <div className="flex-1 bg-black rounded flex items-center justify-center relative overflow-hidden">
            <video 
              src={media.path} 
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              onError={() => {
                // Fallback if video can't load
                console.log('Video preview failed to load:', media.path);
              }}
            />
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              🎬 VIDEO
            </div>
          </div>
          <div className="p-2 text-center">
            <div className="text-sm font-bold">{media.name}</div>
            <div className="text-xs opacity-60">{media.path}</div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex flex-col">
          {/* Image preview */}
          <div className="flex-1 bg-black rounded flex items-center justify-center relative overflow-hidden">
            <img 
              src={media.path} 
              alt={media.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image can't load
                e.currentTarget.style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-4xl mb-2">🖼️</div>
                <div className="text-sm">Image Preview</div>
                <div className="text-xs opacity-60">{media.name}</div>
              </div>
            </div>
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              🖼️ IMAGE
            </div>
          </div>
          <div className="p-2 text-center">
            <div className="text-sm font-bold">{media.name}</div>
            <div className="text-xs opacity-60">{media.path}</div>
          </div>
        </div>
      );
    }
  };

  const handleSessionSelect = async (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
    // Load existing headings or import master template if empty
    let headings = faseService.parseHeadings(session.headings || '{}');
    
    // If no headings exist, load from master template
    if (Object.keys(headings).length === 0) {
      // Try to load from master template first
      const masterTemplate = await loadMasterTemplate();
      if (masterTemplate) {
        headings = masterTemplate;
      } else {
        // Fallback to default structure
        headings = {
          '01/01': { heading: 'In welk team zit je?', image: '' },
          '01/02': { heading: 'Heb je \'n PhotoCircle account?', image: '' },
          '01/03': { heading: 'Wat is jouw naam?', image: '' },
          '01/04': { heading: 'Wat wordt jullie Teamnaam?', image: 'teamnaam' },
          '01/05': { heading: 'Wat wordt jullie Teamyell? Kort maar Krachtig', image: 'teamyell' },
          '01/06': { heading: 'Maak een Selfie Video en upload die naar PhotoCircle', image: 'selfie' },
          '01/07': { heading: 'Wie is jullie Teamleider?', image: '' },
          '04/01': { heading: 'Iedereen wordt wel een heel erg blij van iets dat niet algemeen als top beschouwd Wat is jouw Guilty Pleasure', image: 'trailerguilty' },
          '04/02': { heading: 'Vul nu jouw "Guilty Pleasure" in', image: '' },
          '07/01': { heading: 'Blijf staan als je het met de stelling eens bent', image: 'trailerzit' },
          '07/05': { heading: 'Superfoods Ik zweer erbij', image: 'Super' },
          '07/06': { heading: 'Ik flirt soms Om iets te krijgen', image: 'Flirt' },
          '07/07': { heading: 'Houseparty Niks leukers dan', image: 'Houseparty' },
          '07/08': { heading: 'Socials checken Het eerste wat ik doe', image: 'Socials' },
          '07/09': { heading: 'Kleding Mijn hele salaris gaat op aan', image: 'Kleding' },
          '07/10': { heading: 'In een \'all-in\' Ik zweer bij een vakantie', image: 'All-in' },
          '07/11': { heading: 'Sauna Ik vindt dat zo vies', image: 'Sauna' },
          '07/12': { heading: 'Met een collega Heb ik weleens wat gehad', image: 'Collega' },
          '07/13': { heading: 'Billen Ik val echt op', image: 'Billen' },
          '07/14': { heading: 'Gat in mijn hand Ik heb een enorm', image: 'Gat' },
          '07/15': { heading: 'Teveel Ik drink nooit', image: 'Teveel' },
          '10/01': { heading: 'Kies iemand uit een van de andere teams!', image: 'trailertop3' },
          '10/05': { heading: 'Wie wordt er echt heel erg snel verliefd', image: '' },
          '10/06': { heading: 'Wie is de ideale schoon- zoon of zus?', image: '' },
          '10/07': { heading: 'Je vliegtuig stort neer in de Andes. Wie eet je als eerste op ?', image: '' },
          '10/08': { heading: 'Wie zou je absoluut niet op je kinderen laten passen?', image: '' },
          '10/09': { heading: 'Wie heeft de meeste crypto\'s', image: '' },
          '10/10': { heading: 'Wie is de grootste aansteller op het werk?', image: '' },
          '10/11': { heading: 'Wie zou er als eerste een account aanmaken op OnlyFans?', image: '' },
          '10/12': { heading: 'Wie vertrouw je diepste geheimen toe?', image: '' },
          '10/13': { heading: 'Wie zou je meenemen naar een parenclub?', image: '' },
          '13/01': { heading: 'Krakende Karakters', image: 'trailerkrakende' },
          '13/02': { heading: 'Hoe kom je hier doorheen?', image: '' },
          '13/03': { heading: 'Goede Geinige Eigenschappen', image: '' },
          '13/06': { heading: 'Misschien iets Minder goede Eigenschappen', image: '' },
          '17/01': { heading: 'De Top 10', image: 'trailertop10' },
          '17/02': { heading: 'Kies iemand uit een ander team!', image: '' },
          '17/05': { heading: 'Een pijnlijke pukkel op je bil waar je niet bij kan. Wie mag hem voor je uitknijpen?', image: '' },
          '17/06': { heading: 'Wie denkt dat ie altijd gelijk heeft?', image: '' },
          '17/07': { heading: 'Wie zou meedoen [tegen betaling uiteraard] aan de naakte fotoshoot van het Perfecte Plaatje?', image: '' },
          '17/08': { heading: 'Wie kan er 40 dagen zonder sexs?', image: '' },
          '17/09': { heading: 'Wie kan absoluut niet tegen zijn/haar verlies?', image: '' },
          '17/10': { heading: 'Wie laat weleens een wind?', image: '' },
          '17/11': { heading: 'Wie maakt de allerlelijkste Selfies ?', image: '' },
          '17/12': { heading: 'Wie is het meest verslaafd aan Social Media?', image: '' },
          '17/13': { heading: 'Wie krijgt de meeste bekeuringen?', image: '' },
          '17/14': { heading: 'Jullie doen mee met Temptation Island. Wie heeft als eerste iemand tusen de lakens?', image: '' },
          '20/01': { heading: 'De Finale', image: 'trailerfinale' }
        };
      }
      
      // Auto-save the default structure to PocketBase
      const headingsJson = JSON.stringify(headings);
      rankingService.updateSession(session.id, {
        headings: headingsJson
      }).catch(error => console.error('Error auto-saving headings:', error));
    }
    
    setEditingHeadings(headings);
    setCurrentFase(session.current_fase || '01/01');
  };

  const handleHeadingUpdate = (fase: string, heading: string, image?: string) => {
    setEditingHeadings(prev => ({
      ...prev,
      [fase]: { heading, image }
    }));
  };

  const updateMasterTemplate = async (headings: Record<string, { heading: string; image?: string }>) => {
    try {
      // Send request to API endpoint to update the master template file
      const response = await fetch('/api/update-master-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(headings)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('API Error:', result);
        return { success: false, message: result.error || 'Failed to update master template' };
      }
      
      return { success: true, message: result.message, data: result.data };
    } catch (error) {
      console.error('Error updating master template:', error);
      return { success: false, message: 'Network error occurred' };
    }
  };

  const saveHeadings = async () => {
    if (!selectedSession) return;
    
    try {
      const headingsJson = JSON.stringify(editingHeadings);
      
      // Save to current session
      await rankingService.updateSession(selectedSession.id, {
        headings: headingsJson,
        current_fase: currentFase
      });
      
      // Update local session
      setSelectedSession(prev => prev ? {
        ...prev,
        headings: headingsJson,
        current_fase: currentFase
      } : null);
      
      // Also update the master template
      const masterResult = await updateMasterTemplate(editingHeadings);
      
      if (masterResult.success) {
        if (masterResult.data) {
          // Serverless environment - provide instructions
          alert(`Headings saved to session successfully! ✅\n\nNote: You're on the live server (ranking.pinkmilk.eu) where file updates aren't allowed.\n\n✅ Your headings ARE saved in PocketBase (you'll see them work)\n❌ The master template (fases.json) can't be auto-updated on live server\n\n💡 To update defaults for new games: Run locally and save, then commit to Git.`);
        } else {
          // Local development - file updated
          alert('Headings saved successfully! Master template updated - commit and deploy to make these the default for new games.');
        }
      } else {
        alert(`Headings saved to session successfully!\n\nWarning: ${masterResult.message}`);
      }
    } catch (error) {
      console.error('Error saving headings:', error);
      alert('Failed to save headings');
    }
  };

  const loadNewStructure = async () => {
    if (!selectedSession) return;
    
    try {
      // Load the new comprehensive JSON structure
      const newStructure = {
        '01/01': { heading: 'In welk team zit je?', image: '' },
        '01/02': { heading: 'Heb je \'n PhotoCircle account?', image: '' },
        '01/03': { heading: 'Wat is jouw naam?', image: '' },
        '01/04': { heading: 'Wat wordt jullie Teamnaam?', image: 'teamnaam' },
        '01/05': { heading: 'Wat wordt jullie Teamyell? /n Kort maar Krachtig', image: 'teamyell' },
        '01/06': { heading: 'Maak een Selfie Video /n en upload die naar PhotoCircle', image: 'selfie' },
        '01/07': { heading: 'Wie is jullie Teamleider?', image: '' },
        '04/01': { heading: 'Iedereen wordt wel een heel erg blij /n van iets dat niet algemeen als top beschouwd /n Wat is jouw Guilty Pleasure', image: 'trailerguilty' },
        '04/02': { heading: 'Vul nu jouw "Guilty Pleasure" in', image: '' },
        '07/01': { heading: 'Blijf staan als je het met de stelling eens bent', image: 'trailerzit' },
        '07/05': { heading: 'Superfoods /n Ik zweer erbij', image: 'Super' },
        '07/06': { heading: 'Ik flirt soms /n Om iets te krijgen', image: 'Flirt' },
        '07/07': { heading: 'Houseparty /n Niks leukers dan', image: 'Houseparty' },
        '07/08': { heading: 'Socials checken /n Het eerste wat ik doe', image: 'Socials' },
        '07/09': { heading: 'Kleding /n Mijn hele salaris gaat op aan', image: 'Kleding' },
        '07/10': { heading: 'In een \'all-in\' /n Ik zweer bij een vakantie', image: 'All-in' },
        '07/11': { heading: 'Sauna /n Ik vindt dat zo vies', image: 'Sauna' },
        '07/12': { heading: 'Met een collega /n Heb ik weleens wat gehad', image: 'Collega' },
        '07/13': { heading: 'Billen /n Ik val echt op', image: 'Billen' },
        '07/14': { heading: 'Gat in mijn hand /n Ik heb een enorm', image: 'Gat' },
        '07/15': { heading: 'Teveel /n Ik drink nooit', image: 'Teveel' },
        '10/01': { heading: 'Kies iemand uit een van de andere teams!', image: 'trailertop3' },
        '10/05': { heading: 'Wie wordt er echt heel erg snel verliefd', image: '' },
        '10/06': { heading: 'Wie is de ideale schoon- zoon of zus?', image: '' },
        '10/07': { heading: 'Je vliegtuig stort neer in de Andes. /n Wie eet je als eerste op ?', image: '' },
        '10/08': { heading: 'Wie zou je absoluut niet op je kinderen laten passen?', image: '' },
        '10/09': { heading: 'Wie heeft de meeste crypto\'s', image: '' },
        '10/10': { heading: 'Wie is de grootste aansteller op het werk?', image: '' },
        '10/11': { heading: 'Wie zou er als eerste een account aanmaken /n op OnlyFans?', image: '' },
        '10/12': { heading: 'Wie vertrouw je diepste geheimen toe?', image: '' },
        '10/13': { heading: 'Wie zou je meenemen naar een parenclub?', image: '' },
        '13/01': { heading: 'Krakende Karakters', image: 'trailerkrakende' },
        '13/02': { heading: 'Hoe kom je hier doorheen?', image: '' },
        '13/03': { heading: 'Goede Geinige Eigenschappen', image: '' },
        '13/06': { heading: 'Misschien iets Minder goede Eigenschappen', image: '' },
        '17/01': { heading: 'De Top 10', image: 'trailertop10' },
        '17/02': { heading: 'Kies iemand uit een ander team!', image: '' },
        '17/05': { heading: 'Een pijnlijke pukkel op je bil waar je niet bij kan. /n Wie mag hem voor je uitknijpen?', image: '' },
        '17/06': { heading: 'Wie denkt dat ie altijd gelijk heeft?', image: '' },
        '17/07': { heading: 'Wie zou meedoen [tegen betaling uiteraard] /n aan de naakte fotoshoot van het Perfecte Plaatje?', image: '' },
        '17/08': { heading: 'Wie kan er 40 dagen zonder sexs?', image: '' },
        '17/09': { heading: 'Wie kan absoluut niet tegen zijn/haar verlies?', image: '' },
        '17/10': { heading: 'Wie laat weleens een wind?', image: '' },
        '17/11': { heading: 'Wie maakt de allerlelijkste Selfies ?', image: '' },
        '17/12': { heading: 'Wie is het meest verslaafd aan Social Media?', image: '' },
        '17/13': { heading: 'Wie krijgt de meeste bekeuringen?', image: '' },
        '17/14': { heading: 'Jullie doen mee met Temptation Island. /n Wie heeft als eerste iemand tusen de lakens?', image: '' },
        '20/01': { heading: 'De Finale', image: 'trailerfinale' }
      };
      
      const headingsJson = JSON.stringify(newStructure);
      await rankingService.updateSession(selectedSession.id, {
        headings: headingsJson,
        current_fase: '01/01'
      });
      
      // Update local state
      setEditingHeadings(newStructure);
      setCurrentFase('01/01');
      setSelectedSession(prev => prev ? {
        ...prev,
        headings: headingsJson,
        current_fase: '01/01'
      } : null);
      
      alert('New JSON structure loaded and saved to PocketBase successfully!');
    } catch (error) {
      console.error('Error loading new structure:', error);
      alert('Failed to load new structure');
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSession(null);
  };

  // State for real display data
  const [displayData, setDisplayData] = useState<{playersByTeam: Record<number, string[]>, gameCode: string} | null>(null);
  
  // Load real display data
  const loadDisplayData = useCallback(async () => {
    if (!selectedSession) return;
    
    try {
      // Get the same team assignments as the Display page
      const playerNames = teamService.parsePlayerNames(selectedSession.playernames || '');
      const teamAssignments = teamService.generateTeamAssignments(playerNames, selectedSession.nr_teams || 1);
      const gameCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      setDisplayData({
        playersByTeam: teamAssignments,
        gameCode: gameCode
      });
    } catch (error) {
      console.error('Error loading display data:', error);
    }
  }, [selectedSession]);
  
  // Load display data when session changes
  useEffect(() => {
    loadDisplayData();
  }, [loadDisplayData]);

  const renderGameInterface = () => {
    console.log('renderGameInterface called', { selectedSession, currentView });
    if (!selectedSession) {
      console.log('renderGameInterface: No selected session');
      return null;
    }

    const phaseButtons = [
      { label: '1', name: 'Intro', fases: faseGroups['1'].fases },
      { label: '2', name: 'Guilty Pleasures', fases: faseGroups['4'].fases },
      { label: '3', name: 'Zitten en Staan', fases: faseGroups['7'].fases },
      { label: '4', name: 'De Top 3', fases: faseGroups['10'].fases },
      { label: '5', name: 'Krakende Karakters', fases: faseGroups['13'].fases },
      { label: '6', name: 'Top 10', fases: faseGroups['17'].fases },
      { label: '7', name: 'De Finale', fases: faseGroups['20'].fases }
    ];

    return (
      <div className="h-screen bg-gray-100 p-6" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        {/* Header with game info - Full width layout */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-md">
          <div className="flex justify-between items-center">
            {/* Left side - Game info in one line */}
            <div className="flex items-center gap-8">
              <h1 className="text-3xl text-gray-900" style={{ fontWeight: 300 }}>{selectedSession.showname || 'Game Title'}</h1>
              <span className="text-xl font-semibold text-gray-700">{currentTime ? currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '--:--'} [time]</span>
              <span className="text-xl font-semibold text-gray-700">{gameTime} [game time]</span>
            </div>
            <button
              onClick={() => setCurrentView('manage')}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              ← Back to Setup
            </button>
          </div>
        </div>

        {/* Main content - Full width with phases on far right */}
        <div className="flex gap-4 h-[calc(100vh-200px)] relative">
          {/* Left side - Two screens side by side and Show Results button */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Two screens side by side - Much larger */}
            <div className="flex gap-4 flex-1">
              {/* Current Display - Left screen */}
              <div className="flex-1 bg-white rounded-lg p-3 shadow-md">
                <div className="bg-gradient-to-br from-orange-400 to-pink-600 rounded-lg p-4 text-white h-[400px] flex items-center justify-center border-4 border-gray-200 relative overflow-hidden">
                  {/* Real display content */}
                  <div className="w-full h-full bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded flex flex-col">
                    {/* Header */}
                    <div className="bg-blue-900 text-white p-2 text-xs flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="text-yellow-300">★★★</div>
                        <span>Quizmaster Klaas presenteert</span>
                      </div>
                      <div className="bg-white text-black px-2 py-1 rounded text-xs">Code: {displayData?.gameCode || '8075'}</div>
                    </div>
                    
                    {/* Main content */}
                    <div className="flex-1 p-2">
                      <div className="text-center text-white mb-2">
                        <div className="text-lg font-bold">{getCurrentDisplay()}</div>
                        <div className="text-sm opacity-90">De teams van vandaag zijn:</div>
                      </div>
                      
                      {/* Real team data */}
                      <div className="flex justify-center gap-2 mb-2">
                        {Array.from({ length: selectedSession?.nr_teams || 4 }, (_, index) => {
                          const teamNumber = index + 1;
                          const teamPlayers = displayData?.playersByTeam[teamNumber] || [];
                          return (
                            <div key={teamNumber} className="flex flex-col items-center">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold border-2 border-black">
                                {teamNumber}
                              </div>
                              <div className="mt-1 space-y-1">
                                {teamPlayers.slice(0, 2).map((player, idx) => (
                                  <div key={idx} className="bg-pink-200 text-black text-xs px-1 py-1 rounded">
                                    {player.length > 8 ? player.substring(0, 8) + '...' : player}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="text-center text-white text-xs mt-2">
                        Total Players: {displayData ? Object.values(displayData.playersByTeam).flat().length : 0} | Teams: {selectedSession?.nr_teams || 4} | Location: {selectedSession?.city || 'jb'}
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold mt-3 text-gray-800 text-center">Current</h3>
              </div>

              {/* Next Display - Right screen */}
              <div className="flex-1 bg-white rounded-lg p-3 shadow-md">
                <div className="bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg p-4 text-white h-[400px] flex items-center justify-center border-4 border-gray-200 relative overflow-hidden">
                  {/* Show next media preview */}
                  <div className="w-full h-full bg-black rounded flex items-center justify-center">
                    {renderMediaPreview(getNextMedia())}
                  </div>
                </div>
                <h3 className="text-xl font-bold mt-3 text-gray-800 text-center">Next</h3>
              </div>
            </div>

            {/* Show Results Button - Below screens */}
            <div className="w-full">
              <button className="w-full bg-purple-600 text-white py-6 rounded-lg text-2xl font-bold hover:bg-purple-700 transition-colors shadow-lg">
                Show results
              </button>
            </div>
          </div>

          {/* Right side - Phase Navigation - All the way to the right */}
          <div className="w-48 space-y-3 flex flex-col">
            {phaseButtons.map((phase) => (
              <button
                key={phase.label}
                onClick={() => handlePhaseNavigation(phase.fases[0])}
                className={`w-full h-24 rounded-lg text-3xl font-bold text-white transition-colors flex flex-col items-center justify-center ${
                  phase.fases.includes(currentFase)
                    ? 'bg-orange-600 shadow-lg'
                    : 'bg-orange-400 hover:bg-orange-500'
                }`}
              >
                <div>{phase.label}</div>
                <div className="text-sm font-normal opacity-90">[{phase.name}]</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSessionDetails = () => {
    if (!selectedSession) return null;

    const playerNames = teamService.parsePlayerNames(selectedSession.playernames);

    return (
      <div className="bg-white rounded-lg shadow-md p-6" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-medium text-gray-900" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>{selectedSession.showname || 'Game Session'} - {selectedSession.city || 'City'}</h2>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleStartRankingGame}
              className="bg-[#0A1752] text-white px-6 py-3 rounded-lg hover:bg-[#0A1752]/90 transition-colors font-bold text-lg"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              Start Ranking game
            </button>
            <button
              onClick={handleBackToList}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              ← Back to List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0A1752]/10 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-[#0A1752]" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.nr_players}</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Players</div>
          </div>
          <div className="bg-[#0A1752]/10 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-[#0A1752]" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.nr_teams}</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Teams</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{playerNames.length}</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Named Players</div>
          </div>
          <div className="bg-pink-50 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-pink-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Active</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Status</div>
          </div>
        </div>

        {selectedSession.teamname && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Team Name</h3>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-3" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.teamname}</p>
          </div>
        )}





        {/* JSON Heading Editor */}
        <div className="mb-6 bg-gray-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>JSON Heading Dashboard</h3>
            <button
              onClick={saveHeadings}
              className="bg-[#0A1752] text-white px-4 py-2 rounded-lg hover:bg-[#0A1752]/90 transition-colors"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              Save Headings
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Current Fase Group:
            </label>
            <select
              value={getCurrentFaseGroup()}
              onChange={(e) => {
                const selectedGroup = e.target.value;
                const firstFase = faseGroups[selectedGroup as keyof typeof faseGroups]?.fases[0] || '01/01';
                setCurrentFase(firstFase);
              }}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1752] focus:border-[#0A1752] text-gray-900"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', color: '#111827' }}
            >
              {Object.entries(faseGroups).map(([key, group]) => (
                <option key={key} value={key}>
                  Fase {key} - {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {getFilteredFases().map((fase) => (
              <div key={fase} className="bg-white rounded-lg p-3 border">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                      {fase} - Heading Text:
                    </label>
                    <input
                      type="text"
                      value={editingHeadings[fase]?.heading || ''}
                      onChange={(e) => handleHeadingUpdate(fase, e.target.value, editingHeadings[fase]?.image)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#0A1752] focus:border-[#0A1752] text-sm text-gray-900"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', color: '#111827' }}
                      placeholder="Enter heading text"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                      Picture:
                    </label>
                    <input
                      type="text"
                      value={editingHeadings[fase]?.image || ''}
                      onChange={(e) => handleHeadingUpdate(fase, editingHeadings[fase]?.heading || '', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#0A1752] focus:border-[#0A1752] text-sm text-gray-900"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', color: '#111827' }}
                      placeholder="image.jpg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      <div className="max-w-6xl mx-auto">
        {currentView === 'list' && (
          <div className="flex justify-end mb-8">
            <button
              onClick={() => setCurrentView('create')}
              className="bg-[#0A1752] text-white px-6 py-3 rounded-lg hover:bg-[#0A1752]/90 transition-colors font-semibold"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              + Create New Session
            </button>
          </div>
        )}

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
        
        {currentView === 'game' && isClient && renderGameInterface()}
      </div>
    </div>
  );
}
