  'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import RankingSessionForm from '@/components/game/RankingSessionForm';
import RankingSessionList from '@/components/game/RankingSessionList';
import { RankingSession } from '@/types';
import { teamService, faseService, rankingService, motherfileService, MotherfileFases } from '@/lib/pocketbase';
import '@/modules/fases/auto-register';

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
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [mediaList, setMediaList] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Upload a single media file and assign it to a specific fase's Picture field
  const handleUploadPictureForFase = async (fase: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setIsUploading(true);
      const file = files[0];
      const form = new FormData();
      form.append('media', file);
      const res = await fetch('/api/pb-motherfile', { method: 'POST', body: form });
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        throw new Error('Upload response was not JSON');
      }
      const isOk = typeof json === 'object' && json !== null && (json as { success?: boolean }).success === true;
    if (!isOk) {
      const errMsg = (typeof json === 'object' && json && (json as { error?: string }).error) || `Upload failed (${res.status})`;
      throw new Error(errMsg as string);
    }

      // After upload, refresh motherfile to cache recordId and media list
      try {
        const resAfter = await fetch('/api/pb-motherfile', { cache: 'no-store' });
        const jsonAfter = await resAfter.json();
        const rid = jsonAfter?.meta?.recordId as string | undefined;
        if (rid) motherfileService.setRecordId(rid);
        const media = jsonAfter?.data?.media || [];
        setMediaList(Array.isArray(media) ? media : (media ? [media] : []));
      } catch {}

      // Set the fase image to the uploaded file name (URL built via motherfileService.fileUrl at render time)
      setEditingHeadings(prev => ({
        ...prev,
        [fase]: { heading: prev[fase]?.heading || '', image: file.name }
      }));

      // Refresh media list quietly
      try {
        const resList = await fetch('/api/pb-motherfile', { cache: 'no-store' });
        const jsonList = await resList.json();
        const rid = jsonList?.meta?.recordId as string | undefined;
        if (rid) motherfileService.setRecordId(rid);
        const media = jsonList?.data?.media || [];
        setMediaList(Array.isArray(media) ? media : (media ? [media] : []));
      } catch {}

      setSaveBanner('Picture uploaded and linked to this fase');
      setTimeout(() => setSaveBanner(null), 3000);
    } catch (err) {
      console.error('Upload failed:', err);
      setSaveBanner('Failed to upload picture');
      setTimeout(() => setSaveBanner(null), 4000);
    } finally {
      setIsUploading(false);
    }
  };

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

  // Load motherfile media list when entering manage view
  useEffect(() => {
    const loadMedia = async () => {
      try {
        const res = await fetch('/api/pb-motherfile', { cache: 'no-store' });
        const json = await res.json();
        if (json?.success) {
          const media = json.data?.media || [];
          setMediaList(Array.isArray(media) ? media : (media ? [media] : []));
        } else {
          console.warn('Could not load Motherfile media list', json?.error);
        }
      } catch (err) {
        console.warn('Could not load Motherfile media list', err);
      }
    };
    if (currentView === 'manage') loadMedia();
  }, [currentView]);

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
      const record = await motherfileService.get();
      const masterTemplate: MotherfileFases = record.fases || {};
      return masterTemplate;
    } catch (error) {
      console.log('Could not load master template from PocketBase, using defaults', error);
      return null;
    }
  };

  // Upload media to Motherfile
  const handleUploadMedia = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setIsUploading(true);
      const arr = Array.from(files);
      const form = new FormData();
      for (const f of arr) form.append('media', f);
      const res = await fetch('/api/pb-motherfile', { method: 'POST', body: form });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || 'Upload failed');
      // Reload list
      try {
        const resList = await fetch('/api/pb-motherfile', { cache: 'no-store' });
        const jsonList = await resList.json();
        const media = jsonList?.data?.media || [];
        setMediaList(Array.isArray(media) ? media : (media ? [media] : []));
      } catch {}
      setSaveBanner('Media uploaded to Motherfile');
      setTimeout(() => setSaveBanner(null), 3000);
    } catch (err) {
      console.error('Upload failed:', err);
      setSaveBanner('Failed to upload media');
      setTimeout(() => setSaveBanner(null), 4000);
    } finally {
      setIsUploading(false);
    }
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


  const getCurrentDisplay = () => {
    if (!selectedSession) return 'No session selected';
    const headings = faseService.parseHeadings(selectedSession.headings || '{}');
    return headings[currentFase]?.heading || `Fase ${currentFase}`;
  };

  // Removed unused getNextDisplay

  const getNextMedia = () => {
    if (!selectedSession) {
      console.log('No selected session');
      return null;
    }
    
    // Use currently edited headings as source of truth (falls back to session JSON)
    const headings = Object.keys(editingHeadings).length
      ? editingHeadings
      : faseService.parseHeadings(selectedSession.headings || '{}');
    
    // If headings are empty, use fallback data for testing
    if (Object.keys(headings).length === 0) {
      const fallbackHeadings = {
        '01/01': { heading: 'Welkom', image: '' },
        '01/02': { heading: 'In welk team zit je?', image: '' },
        '01/03': { heading: 'Wat is jouw naam?', image: '' },
        '01/04': { heading: 'Wat wordt jullie Teamnaam?', image: 'RankingNaam.mp4' }
      };
      
      // Find the next fase with a non-empty image/Picture field
      const currentFaseIndex = Object.keys(fallbackHeadings).indexOf(currentFase);
      const faseKeys = Object.keys(fallbackHeadings).slice(currentFaseIndex + 1);
      
      for (const faseKey of faseKeys) {
        const faseData = fallbackHeadings[faseKey as keyof typeof fallbackHeadings];
        if (faseData?.image && faseData.image.trim() !== '') {
          // Determine file type
          const fileName = faseData.image;
          const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi');
          const path = fileName.startsWith('/') ? fileName : `/githublocal/pcs/${fileName}`;
          
          return {
            type: isVideo ? 'video' as const : 'image' as const,
            path: path,
            name: fileName,
            heading: faseData.heading || `Fase ${faseKey}`,
            fase: faseKey
          };
        }
      }
    }
    
    // Find the next fase with a non-empty image/Picture field
    const currentFaseIndex = Object.keys(headings).indexOf(currentFase);
    const faseKeys = Object.keys(headings).slice(currentFaseIndex + 1);
    
    for (const faseKey of faseKeys) {
      const faseData = headings[faseKey];
      if (faseData?.image && faseData.image.trim() !== '') {
        // Determine file type
        const fileName = faseData.image;
        const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi');
        const path = motherfileService.fileUrl(fileName);
        
        return {
          type: isVideo ? 'video' as const : 'image' as const,
          path: path,
          name: fileName,
          heading: faseData.heading || `Fase ${faseKey}`,
          fase: faseKey
        };
      }
    }
    return null;
  };

  const renderMediaPreview = (media: { type: 'video' | 'image', path: string, name: string, heading?: string, fase?: string } | null) => {
    if (!media) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-lg font-bold mb-2">No Next Media</div>
          <div className="text-sm opacity-80">No upcoming media found</div>
        </div>
      );
    }
    if (media.type === 'video') {
      return (
        <div className="w-full h-full flex flex-col">
          {/* Heading above video */}
          {media.heading && (
            <div className="text-center py-2 px-4 bg-black/20 rounded-t text-white">
              <div style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300, fontSize: '24px', lineHeight: 1.2 }}>
                {media.heading}
              </div>
              {media.fase && (
                <div className="text-xs opacity-70">Fase {media.fase}</div>
              )}
            </div>
          )}
          {/* Video thumbnail/preview */}
          <div className="flex-1 bg-black rounded flex items-center justify-center relative overflow-hidden">
            <video 
              src={media.path} 
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              poster=""
              onLoadedMetadata={(e) => {
                // Seek to first frame to show thumbnail
                const video = e.currentTarget;
                video.currentTime = 0.1;
              }}
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
        
          {/* Motherfile Media Upload & List */}
          <div className="mt-8 border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Motherfile Media
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleUploadMedia(e.target.files)}
                className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0A1752] file:text-white hover:file:bg-[#0A1752]/90"
              />
              {isUploading && (
                <span className="text-sm text-gray-600">Uploading...</span>
              )}
            </div>
            {mediaList.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {mediaList.map((file) => (
                  <div key={file} className="bg-white border rounded p-2">
                    <div className="text-xs break-all mb-2" title={file}>{file}</div>
                    <div className="relative w-full aspect-video bg-black/5 overflow-hidden rounded">
                      {/* Use img to avoid next/image domain config; URLs come from PocketBase */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={motherfileService.fileUrl(file)} alt={file} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No media uploaded yet.</div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex flex-col">
          {/* Heading above image */}
          {media.heading && (
            <div className="text-center py-2 px-4 bg-black/20 rounded-t text-white">
              <div style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300, fontSize: '24px', lineHeight: 1.2 }}>
                {media.heading}
              </div>
              {media.fase && (
                <div className="text-xs opacity-70">Fase {media.fase}</div>
              )}
            </div>
          )}
          {/* Image preview */}
          <div className="flex-1 bg-black rounded flex items-center justify-center relative overflow-hidden">
            <Image
              src={media.path}
              alt={media.name}
              fill
              className="object-cover"
            />
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
      const res = await fetch('/api/pb-motherfile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fases: headings })
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || 'Unknown error');
      return { success: true, message: 'Motherfile updated in PocketBase' };
    } catch (error) {
      console.error('Error updating PocketBase motherfile:', error);
      return { success: false, message: 'Failed to update PocketBase motherfile' };
    }
  };

  const saveHeadings = async (options?: { updateMotherfile?: boolean }) => {
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
      
      // Optionally update the motherfile (global defaults)
      if (options?.updateMotherfile) {
        const masterResult = await updateMasterTemplate(editingHeadings);
        if (!masterResult.success) {
          console.warn('Motherfile update warning:', masterResult.message);
        }
      }

      // Show subtle inline banner instead of alerts
      setSaveBanner(options?.updateMotherfile
        ? 'Saved. Global defaults updated.'
        : 'Saved. This show only.');
      setTimeout(() => setSaveBanner(null), 3500);
    } catch (error) {
      console.error('Error saving headings:', error);
      setSaveBanner('Failed to save. See console for details.');
      setTimeout(() => setSaveBanner(null), 5000);
    }
  };

  // Removed unused loadNewStructure

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSession(null);
  };

  // State for real display data
  // (Removed unused displayData and loadDisplayData to satisfy lint)
  // const [displayData, setDisplayData] = useState<{playersByTeam: Record<number, string[]>, gameCode: string} | null>(null);
  // const loadDisplayData = useCallback(async () => {
  //   if (!selectedSession) return;
  //   try {
  //     // Get the same team assignments as the Display page
  //     const playerNames = teamService.parsePlayerNames(selectedSession.playernames || '');
  //     const teamAssignments = teamService.generateTeamAssignments(playerNames, selectedSession.nr_teams || 1);
  //     const gameCode = Math.floor(1000 + Math.random() * 9000).toString();
  //     
  //     setDisplayData({
  //       playersByTeam: teamAssignments,
  //       gameCode: gameCode
  //     });
  //   } catch (error) {
  //     console.error('Error loading display data:', error);
  //   }
  // }, [selectedSession]);

  // ---------- Group flags ----------
  const isGroup07 = currentFase.startsWith('07/');
  const isGroup01 = currentFase.startsWith('01/');

  const getHeadingsSource = useCallback(() => {
    if (!selectedSession) return {} as Record<string, { heading: string; image?: string }>;
    const parsed = faseService.parseHeadings(selectedSession.headings || '{}');
    return Object.keys(editingHeadings).length ? editingHeadings : parsed;
  }, [selectedSession, editingHeadings]);

  const getOrderedFasesForGroup = useCallback((prefix: string) => {
    const headings = getHeadingsSource();
    return Object.keys(headings)
      .filter(k => k.startsWith(prefix + '/'))
      .sort((a, b) => {
        const pa = parseInt(a.split('/')[1] || '0', 10);
        const pb = parseInt(b.split('/')[1] || '0', 10);
        return pa - pb;
      });
  }, [getHeadingsSource]);

  const getMediaForFase = useCallback((faseKey: string) => {
    const headings = getHeadingsSource();
    const item = headings[faseKey];
    if (!item?.image || item.image.trim() === '') return null;
    const fileName = item.image;
    const isVideo = /\.(mp4|mov|avi)$/i.test(fileName);
    return {
      type: isVideo ? 'video' as const : 'image' as const,
      path: motherfileService.fileUrl(fileName),
      name: fileName,
      heading: (item.heading || `Fase ${faseKey}`),
      fase: faseKey,
    };
  }, [getHeadingsSource]);

  const getNextFaseInGroup = useCallback((faseKey: string, prefix: string) => {
    const ordered = getOrderedFasesForGroup(prefix);
    const idx = ordered.indexOf(faseKey);
    if (idx === -1) return ordered[0] || faseKey;
    return ordered[idx + 1] || ordered[idx] || faseKey;
  }, [getOrderedFasesForGroup]);

  const getPrevFaseInGroup = useCallback((faseKey: string, prefix: string) => {
    const ordered = getOrderedFasesForGroup(prefix);
    const idx = ordered.indexOf(faseKey);
    if (idx === -1) return ordered[0] || faseKey;
    return ordered[idx - 1] || ordered[idx] || faseKey;
  }, [getOrderedFasesForGroup]);

  const currentVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying07, setIsPlaying07] = useState(false);

  const formatHeading = (text?: string) => {
    if (!text) return '';
    // Replace '/n' tokens with new lines
    return text.replaceAll('/n', '\n');
  };

  // ArrowRight behavior for fase 07
  useEffect(() => {
    if (!isGroup07 || currentView !== 'game') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        // First press -> start video
        if (!isPlaying07) {
          const v = currentVideoRef.current;
          if (v) {
            // Ensure muted for autoplay policies
            v.muted = true;
            v.currentTime = 0;
            void v.play();
            setIsPlaying07(true);
          }
          return;
        }
        // Second press -> advance to next fase (auto play)
        const next07 = getNextFaseInGroup(currentFase, '07');
        setCurrentFase(next07);
        // Persist selection
        if (selectedSession) {
          rankingService.updateSession(selectedSession.id, { current_fase: next07 }).catch(() => {});
        }
        setTimeout(() => {
          const v = currentVideoRef.current;
          if (v) void v.play();
        }, 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isGroup07, currentView, isPlaying07, currentFase, selectedSession, getNextFaseInGroup]);

  // Arrow navigation for group 01 (Phase 01 current/next flow)
  useEffect(() => {
    if (!isGroup01 || currentView !== 'game') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = getNextFaseInGroup(currentFase, '01');
        setCurrentFase(next);
        if (selectedSession) {
          rankingService.updateSession(selectedSession.id, { current_fase: next }).catch(() => {});
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = getPrevFaseInGroup(currentFase, '01');
        setCurrentFase(prev);
        if (selectedSession) {
          rankingService.updateSession(selectedSession.id, { current_fase: prev }).catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isGroup01, currentView, currentFase, selectedSession, getNextFaseInGroup, getPrevFaseInGroup]);

  // Reset playing flag when fase changes
  useEffect(() => {
    setIsPlaying07(false);
  }, [currentFase]);

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

    const nextMedia = getNextMedia();

    return (
      <div className="h-screen bg-gray-100" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        <div style={{ margin: '0 2%' }}>
        {/* Header with game info - with 2% side margins */}
        <div className="bg-white shadow-md p-6">
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

        {/* Main content grid: 2% | 43% | 43% | 8% | 2% */}
        <div
          className="grid mt-4"
          style={{ gridTemplateColumns: '2% 43% 43% 8% 2%', height: 'calc(100vh - 200px)' }}
        >
          {/* Left spacer (2%) */}
          <div></div>

          {/* Current Display (43%) */}
          <div className="flex flex-col">
            {/* Current Display - Left screen (16:9) */}
            <div>
                <div className="relative w-full aspect-[16/9] bg-black overflow-hidden">
                  {isGroup07 ? (
                    (() => {
                      const media = getMediaForFase(currentFase);
                      const isTrailer = /\/01$/.test(currentFase);
                      const bg = isTrailer ? '#e5e5e5' : '#F5B800';
                      return (
                        <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: bg }}>
                          {media?.type === 'video' && media.path ? (
                            <video
                              ref={currentVideoRef}
                              src={media.path}
                              className="absolute inset-0 w-full h-full object-contain"
                              preload="auto"
                              muted
                              playsInline
                              onLoadedMetadata={(e) => {
                                // ready to play quickly
                                const v = e.currentTarget;
                                v.currentTime = 0.01;
                              }}
                              onEnded={() => setIsPlaying07(false)}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center px-6 text-center" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>
                              <div className="text-black text-3xl whitespace-pre-line">
                                {formatHeading(getHeadingsSource()[currentFase]?.heading || `Fase ${currentFase}`)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : isGroup01 ? (
                    (() => {
                      const media = getMediaForFase(currentFase);
                      const bg = '#F5B800';
                      const ordered01 = getOrderedFasesForGroup('01');
                      const idx01 = Math.max(0, ordered01.indexOf(currentFase));
                      const nn = (idx01 + 1).toString().padStart(2, '0');
                      const tt = ordered01.length.toString().padStart(2, '0');
                      return (
                        <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: bg }}>
                          {/* Centered filename (heading should be filename-only for Phase 01) */}
                          <div className="absolute top-2 left-3 text-black text-sm" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>Fase {currentFase}</div>
                          {/* NN/TT indicator */}
                          <div className="absolute top-2 right-3 text-black text-sm" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>{nn}/{tt}</div>
                          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                            <div className="text-black text-3xl break-words" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>
                              {media?.name || '—'}
                            </div>
                          </div>
                          {/* Preview media without autoplay */}
                          {media?.type === 'video' && media.path ? (
                            <video src={media.path} preload="metadata" muted playsInline className="hidden" />
                          ) : null}
                        </div>
                      );
                    })()
                  ) : (
                    // Fallback to existing simulated current display
                    <div className="absolute inset-0 w-full h-full flex flex-col">
                      <div className="bg-blue-900 text-white px-2 py-1 text-xs flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-yellow-300">★★★</div>
                          <span>Quizmaster Klaas presenteert</span>
                        </div>
                        <div className="bg-white text-black px-2 py-1 rounded text-xs">Code: {'8075'}</div>
                      </div>
                      <div className="flex-1 p-2">
                        <div className="text-center text-white mb-2">
                          <div className="text-lg font-bold">{getCurrentDisplay()}</div>
                          <div className="text-sm opacity-90">De teams van vandaag zijn:</div>
                        </div>
                        <div className="flex justify-center gap-2 mb-2">
                          {Array.from({ length: selectedSession?.nr_teams || 4 }, (_, index) => {
                            const teamNumber = index + 1;
                            const teamPlayers: string[] = [];
                            return (
                              <div key={teamNumber} className="flex flex-col items-center">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold border-2 border-black">
                                  {teamNumber}
                                </div>
                                <div className="mt-1 space-y-1">
                                  {teamPlayers.slice(0, 2).map((player: string, idx: number) => (
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
                          Total Players: {0} | Teams: {selectedSession?.nr_teams || 4} | Location: {selectedSession?.city || 'jb'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <h3 className="text-xl mt-2 text-gray-900 text-center uppercase tracking-wide" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>Current</h3>
              </div>
            </div>

          {/* Next Display (43%) */}
          <div className="flex flex-col">
            <div>
              <div className="relative w-full aspect-[16/9] bg-black overflow-hidden rounded">
                {renderMediaPreview(nextMedia)}
              </div>
              <h3 className="text-xl mt-2 text-gray-900 text-center uppercase tracking-wide" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>Next</h3>
            </div>
          </div>

          {/* Fases (8%) */}
          <div className="space-y-3 flex flex-col">
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
          {/* Right spacer (2%) */}
          <div></div>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveHeadings({ updateMotherfile: false })}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                title="Save only to this show (PocketBase)"
              >
                Save This Show Only
              </button>
              <button
                onClick={() => saveHeadings({ updateMotherfile: true })}
                className="bg-[#0A1752] text-white px-4 py-2 rounded-lg hover:bg-[#0A1752]/90 transition-colors"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                title="Save to this show and update global motherfile"
              >
                Save Global (Motherfile)
              </button>
            </div>
          </div>

          {saveBanner && (
            <div className="mb-3 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              {saveBanner}
            </div>
          )}
          
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
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingHeadings[fase]?.image || ''}
                        onChange={(e) => handleHeadingUpdate(fase, editingHeadings[fase]?.heading || '', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#0A1752] focus:border-[#0A1752] text-sm text-gray-900"
                        style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', color: '#111827' }}
                        placeholder="image.jpg"
                      />
                      <label className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded bg-[#0A1752] text-white text-sm cursor-pointer hover:bg-[#0A1752]/90" title="Upload and set picture">
                        Upload
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => handleUploadPictureForFase(fase, e.target.files)}
                        />
                      </label>
                    </div>
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
    <div className="min-h-screen bg-gray-100 p-0" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      <div className="w-full">
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
