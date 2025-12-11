'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pinkmilk.pockethost.io');

interface Player {
  id: string;
  collectionId: string;
  character_name: string;
  image: string;
}

function getImageUrl(player: Player): string {
  return `https://pinkmilk.pockethost.io/api/files/${player.collectionId}/${player.id}/${player.image}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Image frame component with 16:9 ratio and white border
function ImageFrame({ 
  src, 
  name, 
  className = '',
  fadeState = 'visible'
}: { 
  src: string; 
  name: string; 
  className?: string;
  fadeState?: 'visible' | 'fading-out' | 'fading-in';
}) {
  return (
    <div 
      className={`relative aspect-video rounded-2xl overflow-hidden border-4 border-white/90 shadow-2xl transition-opacity duration-[1500ms] ease-in-out ${className}`}
      style={{
        opacity: fadeState === 'visible' ? 1 : 0,
      }}
    >
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-0 right-0 flex justify-center" style={{ margin: '0 30px' }}>
        <span 
          className="rounded-full text-white font-semibold text-lg shadow-lg"
          style={{ 
            fontFamily: 'Barlow Semi Condensed, sans-serif',
            backgroundColor: '#0A1752',
            padding: '6px 24px',
            border: '2px solid white',
          }}
        >
          {name}
        </span>
      </div>
    </div>
  );
}

// Part 1: 9 images grid with random changes
function Part1({ players, onComplete }: { players: Player[]; onComplete: () => void }) {
  const [displayedImages, setDisplayedImages] = useState<Player[]>([]);
  const [fadeStates, setFadeStates] = useState<('visible' | 'fading-out')[]>(Array(9).fill('visible'));
  const availableRef = useRef<Player[]>([]);
  const usedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Initialize with 9 random images
    const shuffled = shuffleArray(players);
    const initial = shuffled.slice(0, 9);
    setDisplayedImages(initial);
    initial.forEach(p => usedRef.current.add(p.id));
    availableRef.current = shuffled.slice(9);

    // Change random image every 3 seconds
    const interval = setInterval(() => {
      if (availableRef.current.length === 0) {
        // Reset available pool
        availableRef.current = shuffleArray(players.filter(p => !displayedImages.some(d => d.id === p.id)));
      }

      const randomIndex = Math.floor(Math.random() * 9);
      
      // Fade out
      setFadeStates(prev => {
        const newStates = [...prev];
        newStates[randomIndex] = 'fading-out';
        return newStates;
      });

      // Swap image while faded out
      setTimeout(() => {
        setDisplayedImages(prev => {
          const newImages = [...prev];
          const nextPlayer = availableRef.current.pop();
          if (nextPlayer) {
            newImages[randomIndex] = nextPlayer;
          }
          return newImages;
        });
        
        // Fade in after a tiny delay
        setTimeout(() => {
          setFadeStates(prev => {
            const newStates = [...prev];
            newStates[randomIndex] = 'visible';
            return newStates;
          });
        }, 50);
      }, 1500);
    }, 3000);

    // Complete after 15 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      onComplete();
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [players, onComplete]);

  // Same visual height as single image: (100vh - 100px margin - 64px padding)
  // Split into 3 rows with 50px gaps (2 gaps = 100px)
  const imageHeight = 'calc((100vh - 100px - 64px - 100px) / 3)';
  
  return (
    <div className="flex flex-wrap justify-center items-center content-center w-full h-full mx-auto" style={{ gap: '50px', padding: '32px' }}>
      {displayedImages.map((player, index) => (
        <div key={`${player.id}-${index}`} style={{ height: imageHeight, aspectRatio: '16/9' }}>
          <ImageFrame
            src={getImageUrl(player)}
            name={player.character_name}
            fadeState={fadeStates[index]}
            className="h-full w-full"
          />
        </div>
      ))}
    </div>
  );
}

// Part 2: Single image sliding to reveal another
function Part2({ players, onComplete }: { players: Player[]; onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [showCurrent, setShowCurrent] = useState(true);
  const [shuffledPlayers] = useState(() => shuffleArray(players));
  const slideCount = useRef(0);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setIsSliding(true);
      
      // After slide completes, switch to next image
      setTimeout(() => {
        setShowCurrent(false);
        setCurrentIndex(prev => (prev + 1) % shuffledPlayers.length);
        setIsSliding(false);
        
        // Small delay then show new image
        setTimeout(() => {
          setShowCurrent(true);
        }, 100);
        
        slideCount.current++;
        
        if (slideCount.current >= 3) {
          clearInterval(slideInterval);
          setTimeout(() => onComplete(), 500);
        }
      }, 1000);
    }, 6000);

    return () => clearInterval(slideInterval);
  }, [shuffledPlayers.length, onComplete]);

  const currentPlayer = shuffledPlayers[currentIndex];

  // Container padding matches other pages (32px = p-8)
  // Image height: 100vh - 100px margin - 64px padding
  const imageHeight = 'calc(100vh - 100px - 64px)';
  
  return (
    <div className="flex items-center justify-center p-8 h-full w-full">
      <div 
        className="relative transition-all duration-1000 ease-in-out"
        style={{ 
          height: imageHeight,
          aspectRatio: '16/9',
          transform: isSliding ? 'translateX(120vw)' : 'translateX(0)',
          opacity: showCurrent ? 1 : 0,
        }}
      >
        <ImageFrame
          src={getImageUrl(currentPlayer)}
          name={currentPlayer.character_name}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

// Part 3: 4 images with random changes
function Part3({ players, onComplete }: { players: Player[]; onComplete: () => void }) {
  const [displayedImages, setDisplayedImages] = useState<Player[]>([]);
  const [fadeStates, setFadeStates] = useState<('visible' | 'fading-out')[]>(Array(4).fill('visible'));
  const availableRef = useRef<Player[]>([]);

  useEffect(() => {
    const shuffled = shuffleArray(players);
    const initial = shuffled.slice(0, 4);
    setDisplayedImages(initial);
    availableRef.current = shuffled.slice(4);

    const interval = setInterval(() => {
      if (availableRef.current.length === 0) {
        availableRef.current = shuffleArray(players.filter(p => !displayedImages.some(d => d.id === p.id)));
      }

      const randomIndex = Math.floor(Math.random() * 4);
      
      // Fade out
      setFadeStates(prev => {
        const newStates = [...prev];
        newStates[randomIndex] = 'fading-out';
        return newStates;
      });

      // Swap image while faded out
      setTimeout(() => {
        setDisplayedImages(prev => {
          const newImages = [...prev];
          const nextPlayer = availableRef.current.pop();
          if (nextPlayer) {
            newImages[randomIndex] = nextPlayer;
          }
          return newImages;
        });
        
        // Fade in after a tiny delay
        setTimeout(() => {
          setFadeStates(prev => {
            const newStates = [...prev];
            newStates[randomIndex] = 'visible';
            return newStates;
          });
        }, 50);
      }, 1500);
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      onComplete();
    }, 12000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [players, onComplete]);

  // Same visual height as single image: (100vh - 100px margin - 64px padding)
  // Split into 2 rows with 50px gap (1 gap = 50px)
  const imageHeight = 'calc((100vh - 100px - 64px - 50px) / 2)';
  
  return (
    <div className="flex flex-wrap justify-center items-center content-center w-full h-full mx-auto" style={{ gap: '50px', padding: '32px' }}>
      {displayedImages.map((player, index) => (
        <div key={`${player.id}-${index}`} style={{ height: imageHeight, aspectRatio: '16/9' }}>
          <ImageFrame
            src={getImageUrl(player)}
            name={player.character_name}
            fadeState={fadeStates[index]}
            className="h-full w-full"
          />
        </div>
      ))}
    </div>
  );
}

export default function PresentationPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPart, setCurrentPart] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen with 'f' key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    async function loadPlayers() {
      try {
        const records = await pb.collection('MEQuestions').getFullList({
          sort: 'character_name',
        });
        const playersWithImages = records.filter(r => r.image && r.character_name) as unknown as Player[];
        setPlayers(playersWithImages);
      } catch (error) {
        console.error('Failed to load players:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPlayers();
  }, []);

  const transitionToPart = useCallback((nextPart: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPart(nextPart);
      setIsTransitioning(false);
    }, 1000);
  }, []);

  const handlePart1Complete = useCallback(() => transitionToPart(2), [transitionToPart]);
  const handlePart2Complete = useCallback(() => transitionToPart(3), [transitionToPart]);
  const handlePart3Complete = useCallback(() => transitionToPart(1), [transitionToPart]);

  if (loading) {
    return (
      <>
        <style jsx global>{`
          .animated-gradient {
            background: linear-gradient(-45deg, #1a1a4e, #2d1b69, #0f3460, #16213e, #4a1942, #8B0000, #FF4500, #2d1b69, #1a1a4e);
            background-size: 600% 600%;
            animation: gradientFlow 20s ease infinite;
          }
          @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        <div className="min-h-screen flex items-center justify-center animated-gradient">
          <div className="text-white text-2xl font-semibold animate-pulse">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;600&display=swap');
        
        .animated-gradient {
          background: linear-gradient(-45deg, #1a1a4e, #2d1b69, #0f3460, #16213e, #4a1942, #8B0000, #FF4500, #2d1b69, #1a1a4e);
          background-size: 600% 600%;
          animation: gradientFlow 20s ease infinite;
        }
        
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          20% { background-position: 25% 75%; }
          40% { background-position: 50% 100%; }
          60% { background-position: 75% 50%; }
          80% { background-position: 50% 25%; }
          100% { background-position: 0% 50%; }
        }

        .fade-transition {
          transition: opacity 1s ease-in-out;
        }
        
        .presentation-container {
          height: 100vh;
          padding-top: 50px;
          padding-bottom: 50px;
          box-sizing: border-box;
        }
      `}</style>
      
      <div ref={containerRef} className="animated-gradient overflow-hidden presentation-container">
        <div 
          className={`h-full flex items-center justify-center fade-transition ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
        >
          {currentPart === 1 && <Part1 players={players} onComplete={handlePart1Complete} />}
          {currentPart === 2 && <Part2 players={players} onComplete={handlePart2Complete} />}
          {currentPart === 3 && <Part3 players={players} onComplete={handlePart3Complete} />}
        </div>
      </div>
    </>
  );
}
