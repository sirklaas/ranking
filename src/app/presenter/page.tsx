'use client';

import React, { useState } from 'react';
import RankingSessionForm from '@/components/game/RankingSessionForm';
import RankingSessionList from '@/components/game/RankingSessionList';
import { RankingSession } from '@/types';
import { teamService, faseService, rankingService } from '@/lib/pocketbase';

export default function PresenterPage() {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'manage'>('list');
  const [selectedSession, setSelectedSession] = useState<RankingSession | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingHeadings, setEditingHeadings] = useState<Record<string, { heading: string; image?: string }>>({});
  const [currentFase, setCurrentFase] = useState('01/00');

  const handleSessionCreated = (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSessionSelect = (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
    // Load existing headings
    const headings = faseService.parseHeadings(session.headings || '{}');
    setEditingHeadings(headings);
    setCurrentFase(session.current_fase || '01/00');
  };

  const handleHeadingUpdate = (fase: string, heading: string, image?: string) => {
    setEditingHeadings(prev => ({
      ...prev,
      [fase]: { heading, image }
    }));
  };

  const saveHeadings = async () => {
    if (!selectedSession) return;
    
    try {
      const headingsJson = JSON.stringify(editingHeadings);
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
      
      alert('Headings saved successfully!');
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

  const renderSessionDetails = () => {
    if (!selectedSession) return null;

    const playerNames = teamService.parsePlayerNames(selectedSession.playernames);

    return (
      <div className="bg-white rounded-lg shadow-md p-6" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.showname}</h2>
            <p className="text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.city}</p>
          </div>
          <button
            onClick={handleBackToList}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
          >
            ← Back to List
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.nr_players}</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Players</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.nr_teams}</div>
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



        {/* Session Controls */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Session Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Start Ranking Game
            </button>
            <button className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-semibold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              View Live Results
            </button>
            <button className="bg-pink-600 text-white py-3 px-6 rounded-lg hover:bg-pink-700 transition-colors font-semibold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Export Data
            </button>
          </div>
        </div>

        {/* JSON Heading Editor */}
        <div className="mb-6 bg-gray-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>JSON Heading Dashboard</h3>
            <div className="flex gap-2">
              <button
                onClick={loadNewStructure}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                Load New Structure to PB
              </button>
              <button
                onClick={saveHeadings}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                Save Headings
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Current Fase:
            </label>
            <input
              type="text"
              value={currentFase}
              onChange={(e) => setCurrentFase(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              placeholder="01/00"
            />
          </div>

          <div className="space-y-4">
            {Object.keys({
              '01/01': 'In welk team zit je?',
              '01/02': 'Heb je \'n PhotoCircle account?',
              '01/03': 'Wat is jouw naam?',
              '01/04': 'Wat wordt jullie Teamnaam?',
              '01/05': 'Wat wordt jullie Teamyell? /n Kort maar Krachtig',
              '01/06': 'Maak een Selfie Video /n en upload die naar PhotoCircle',
              '01/07': 'Wie is jullie Teamleider?',
              '04/01': 'Iedereen wordt wel een heel erg blij /n van iets dat niet algemeen als top beschouwd /n Wat is jouw Guilty Pleasure',
              '04/02': 'Vul nu jouw "Guilty Pleasure" in',
              '07/01': 'Blijf staan als je het met de stelling eens bent',
              '07/05': 'Superfoods /n Ik zweer erbij',
              '07/06': 'Ik flirt soms /n Om iets te krijgen',
              '07/07': 'Houseparty /n Niks leukers dan',
              '07/08': 'Socials checken /n Het eerste wat ik doe',
              '07/09': 'Kleding /n Mijn hele salaris gaat op aan',
              '07/10': 'In een \'all-in\' /n Ik zweer bij een vakantie',
              '07/11': 'Sauna /n Ik vindt dat zo vies',
              '07/12': 'Met een collega /n Heb ik weleens wat gehad',
              '07/13': 'Billen /n Ik val echt op',
              '07/14': 'Gat in mijn hand /n Ik heb een enorm',
              '07/15': 'Teveel /n Ik drink nooit',
              '10/01': 'Kies iemand uit een van de andere teams!',
              '10/05': 'Wie wordt er echt heel erg snel verliefd',
              '10/06': 'Wie is de ideale schoon- zoon of zus?',
              '10/07': 'Je vliegtuig stort neer in de Andes. /n Wie eet je als eerste op ?',
              '10/08': 'Wie zou je absoluut niet op je kinderen laten passen?',
              '10/09': 'Wie heeft de meeste crypto\'s',
              '10/10': 'Wie is de grootste aansteller op het werk?',
              '10/11': 'Wie zou er als eerste een account aanmaken /n op OnlyFans?',
              '10/12': 'Wie vertrouw je diepste geheimen toe?',
              '10/13': 'Wie zou je meenemen naar een parenclub?',
              '13/01': 'Krakende Karakters',
              '13/02': 'Hoe kom je hier doorheen?',
              '13/03': 'Goede Geinige Eigenschappen',
              '13/06': 'Misschien iets Minder goede Eigenschappen',
              '17/01': 'De Top 10',
              '17/02': 'Kies iemand uit een ander team!',
              '17/05': 'Een pijnlijke pukkel op je bil waar je niet bij kan. /n Wie mag hem voor je uitknijpen?',
              '17/06': 'Wie denkt dat ie altijd gelijk heeft?',
              '17/07': 'Wie zou meedoen [tegen betaling uiteraard] /n aan de naakte fotoshoot van het Perfecte Plaatje?',
              '17/08': 'Wie kan er 40 dagen zonder sexs?',
              '17/09': 'Wie kan absoluut niet tegen zijn/haar verlies?',
              '17/10': 'Wie laat weleens een wind?',
              '17/11': 'Wie maakt de allerlelijkste Selfies ?',
              '17/12': 'Wie is het meest verslaafd aan Social Media?',
              '17/13': 'Wie krijgt de meeste bekeuringen?',
              '17/14': 'Jullie doen mee met Temptation Island. /n Wie heeft als eerste iemand tusen de lakens?',
              '20/01': 'De Finale'
            }).map((fase) => (
              <div key={fase} className="bg-white rounded-lg p-4 border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                      Fase {fase}
                    </label>
                    <div className="text-xs text-gray-500" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                      Heading: {editingHeadings[fase]?.heading || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                      Heading Text (use /n for line breaks):
                    </label>
                    <input
                      type="text"
                      value={editingHeadings[fase]?.heading || ''}
                      onChange={(e) => handleHeadingUpdate(fase, e.target.value, editingHeadings[fase]?.image)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                      placeholder="Enter heading text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                      Picture Link:
                    </label>
                    <input
                      type="text"
                      value={editingHeadings[fase]?.image || ''}
                      onChange={(e) => handleHeadingUpdate(fase, editingHeadings[fase]?.heading || '', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                      placeholder="path/to/image.jpg"
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            Ranking Gameshow - Presenter Dashboard
          </h1>
          {currentView === 'list' && (
            <button
              onClick={() => setCurrentView('create')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
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
