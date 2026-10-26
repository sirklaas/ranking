'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EndgameCard } from '@/modules/fases/De Finale/20-01/endgameData';

interface CodedEndgameRevealProps {
  card: EndgameCard;
  playbackState: 'paused' | 'playing' | 'finished';
  onFinished?: () => void;
  onClose?: () => void;
  isMuted?: boolean;
}

export default function CodedEndgameReveal({
  card,
  playbackState,
  onFinished,
  onClose,
  isMuted = false,
}: CodedEndgameRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const shatterCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const starGroupRef = useRef<SVGGElement>(null);
  const wipeRectRef = useRef<SVGRectElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardImgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  // Preload card image for Voronoi shard texturing
  useEffect(() => {
    if (typeof window !== 'undefined' && card.image) {
      const img = new Image();
      img.src = card.image;
      cardImgRef.current = img;
    }
  }, [card.image]);

  // Audio references
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxRefs = useRef<Record<string, HTMLAudioElement>>({});
  const sfxTriggeredRef = useRef<{ glass: boolean; star: boolean; chime: boolean }>({
    glass: false,
    star: false,
    chime: false,
  });

  // Responsive scaling
  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const targetScale = Math.min(vw / 1920, vh / 1080);
      setScale(targetScale > 0 ? targetScale : 1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Preload SFX
  useEffect(() => {
    try {
      bgAudioRef.current = new Audio('/endgame/endcard_audio.mp3');
      sfxRefs.current = {
        glass: new Audio('/endgame/sfx/glass_shatter.mp3'),
        impact: new Audio('/endgame/sfx/sub_bass_impact.mp3'),
        star: new Audio('/endgame/sfx/star_buildup.mp3'),
        chime: new Audio('/endgame/sfx/sparkle_chime.mp3'),
      };
      Object.values(sfxRefs.current).forEach((audio) => {
        audio.preload = 'auto';
      });
    } catch {
      // Audio preloading fallback
    }

    return () => {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        bgAudioRef.current = null;
      }
      Object.values(sfxRefs.current).forEach((audio) => audio.pause());
    };
  }, []);

  const playSFX = useCallback(
    (key: string, vol = 1.0) => {
      if (isMuted) return;
      try {
        const audio = sfxRefs.current[key];
        if (audio) {
          audio.currentTime = 0;
          audio.volume = vol;
          audio.play().catch(() => {});
        }
      } catch {}
    },
    [isMuted]
  );

  // 110 Space stars
  const starsRef = useRef<
    Array<{ x: number; y: number; r: number; alpha: number; speed: number; dx: number; dy: number }>
  >([]);

  useEffect(() => {
    starsRef.current = [];
    for (let i = 0; i < 110; i++) {
      starsRef.current.push({
        x: Math.random() * 1920,
        y: Math.random() * 840 + 80,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 2 + 1,
        dx: (Math.random() - 0.5) * 6,
        dy: (Math.random() - 0.5) * 4,
      });
    }
  }, []);

  // 128 Voronoi glass shards
  const shardsRef = useRef<
    Array<{
      origCX: number;
      origCY: number;
      pts: Array<{ x: number; y: number }>;
      vx: number;
      vy: number;
      vz: number;
      rotX: number;
      rotY: number;
      rotZ: number;
    }>
  >([]);

  const buildShards = useCallback(() => {
    const cols = 8;
    const rows = 8;
    const cellW = 600 / cols;
    const cellH = 600 / rows;
    const points: Array<Array<{ x: number; y: number }>> = [];

    for (let r = 0; r <= rows; r++) {
      points[r] = [];
      for (let c = 0; c <= cols; c++) {
        const jitterX = c === 0 || c === cols ? 0 : (Math.random() - 0.5) * cellW * 0.75;
        const jitterY = r === 0 || r === rows ? 0 : (Math.random() - 0.5) * cellH * 0.75;
        points[r][c] = { x: c * cellW + jitterX, y: r * cellH + jitterY };
      }
    }

    const shards: typeof shardsRef.current = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p1 = points[r][c];
        const p2 = points[r][c + 1];
        const p3 = points[r + 1][c];
        const p4 = points[r + 1][c + 1];

        const addTri = (pts: Array<{ x: number; y: number }>) => {
          const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
          const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
          const dx = cx - 300;
          const dy = cy - 300;
          const angle = Math.atan2(dy, dx);
          const relPts = pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
          const speed = 400 + Math.random() * 650;
          shards.push({
            origCX: cx,
            origCY: cy,
            pts: relPts,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 160,
            vy: Math.sin(angle) * speed - 160 + (Math.random() - 0.5) * 120,
            vz: 350 + Math.random() * 700,
            rotX: (Math.random() - 0.5) * 8,
            rotY: (Math.random() - 0.5) * 9,
            rotZ: (Math.random() - 0.5) * 6,
          });
        };

        if (Math.random() > 0.5) {
          addTri([p1, p2, p3]);
          addTri([p2, p4, p3]);
        } else {
          addTri([p1, p2, p4]);
          addTri([p1, p4, p3]);
        }
      }
    }
    shardsRef.current = shards;
  }, []);

  // Particles
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      maxLife: number;
      life: number;
      color: string;
      isStar: boolean;
    }>
  >([]);

  const spawnShatterBurst = useCallback(() => {
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 600 + 180;
      particlesRef.current.push({
        x: 960,
        y: 540,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        size: Math.random() * 8 + 2.5,
        maxLife: Math.random() * 0.9 + 0.4,
        life: 0,
        color: Math.random() > 0.35 ? '#ff7518' : '#ffffff',
        isStar: Math.random() > 0.45,
      });
    }
  }, []);

  const spawnSparkleSweep = useCallback((progress: number) => {
    const stageWipeX = 622 + progress * 676;
    for (let i = 0; i < 5; i++) {
      const y = 360 + Math.random() * 360;
      const angle = (Math.random() - 0.5) * Math.PI * 2;
      const speed = Math.random() * 220 + 40;
      particlesRef.current.push({
        x: stageWipeX + (Math.random() - 0.5) * 20,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 8 + 3,
        maxLife: Math.random() * 0.8 + 0.4,
        life: 0,
        color: Math.random() > 0.3 ? '#ffffff' : Math.random() > 0.5 ? '#facc15' : '#ff7518',
        isStar: Math.random() > 0.4,
      });
    }
  }, []);

  // Animation timeline loop
  useEffect(() => {
    buildShards();
    sfxTriggeredRef.current = { glass: false, star: false, chime: false };
    startTimeRef.current = performance.now();
    let isFinishedNotified = false;

    if (playbackState === 'playing' && bgAudioRef.current && !isMuted) {
      bgAudioRef.current.currentTime = 0;
      bgAudioRef.current.volume = 1;
      bgAudioRef.current.play().catch(() => {});
    }

    const loop = (now: number) => {
      if (playbackState === 'paused') {
        const cardEl = cardContainerRef.current;
        if (cardEl) {
          cardEl.style.display = 'flex';
          cardEl.style.left = '50%';
          cardEl.style.top = '50%';
          cardEl.style.transform = 'translate(-50%, -50%) scale(1)';
          cardEl.style.opacity = '1';
        }
        const ticketEl = ticketRef.current;
        if (ticketEl) {
          ticketEl.style.left = '50%';
          ticketEl.style.top = '50%';
          ticketEl.style.opacity = '0';
          ticketEl.style.transform = 'translate(-50%, -50%) scale(0.2)';
        }
        const wipeEl = wipeRectRef.current;
        if (wipeEl) {
          wipeEl.setAttribute('width', '0');
        }
        const shCanvas = shatterCanvasRef.current;
        if (shCanvas) {
          shCanvas.style.display = 'none';
        }
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const t = (now - startTimeRef.current) / 1000;
      elapsedRef.current = t;

      const T_SHATTER_START = 3.2;
      const T_SHATTER_END = 4.8;
      const T_TICKET_START = 3.8;
      const T_WIPE_START = 4.8;
      const T_WIPE_END = 7.0;

      // 1. Audio triggers
      if (t >= 3.2 && !sfxTriggeredRef.current.glass) {
        sfxTriggeredRef.current.glass = true;
        playSFX('glass', 0.95);
        playSFX('impact', 0.85);
        spawnShatterBurst();
      }
      if (t >= 3.8 && !sfxTriggeredRef.current.star) {
        sfxTriggeredRef.current.star = true;
        playSFX('star', 0.9);
      }
      if (t >= 7.0 && !sfxTriggeredRef.current.chime) {
        sfxTriggeredRef.current.chime = true;
        playSFX('chime', 0.85);
      }

      // Notify completion
      if (t >= 14.0 && !isFinishedNotified) {
        isFinishedNotified = true;
        if (onFinished) onFinished();
      }

      // 2. Render Space Drift
      const sCanvas = spaceCanvasRef.current;
      if (sCanvas) {
        const sCtx = sCanvas.getContext('2d');
        if (sCtx) {
          sCtx.clearRect(0, 0, 1920, 1080);
          for (const s of starsRef.current) {
            const a = s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed));
            const px = (s.x + s.dx * t) % 1920;
            const py = (s.y + s.dy * t) % 1080;
            sCtx.fillStyle = `rgba(255, 255, 255, ${a})`;
            sCtx.beginPath();
            sCtx.arc(px < 0 ? px + 1920 : px, py < 0 ? py + 1080 : py, s.r, 0, Math.PI * 2);
            sCtx.fill();
          }
        }
      }

      // 3. Card Container & Shatter
      const cardEl = cardContainerRef.current;
      const shCanvas = shatterCanvasRef.current;

      if (t < T_SHATTER_START) {
        if (cardEl) {
          cardEl.style.display = 'flex';
          cardEl.style.left = '50%';
          cardEl.style.top = '50%';
          const breathe = 1.0 + 0.02 * Math.sin(t * 1.5);
          cardEl.style.transform = `translate(-50%, -50%) scale(${breathe})`;
          cardEl.style.opacity = '1';
        }
        if (shCanvas) shCanvas.style.display = 'none';
      } else if (t >= T_SHATTER_START && t <= T_SHATTER_END) {
        if (cardEl) cardEl.style.display = 'none';
        if (shCanvas) {
          shCanvas.style.display = 'block';
          const shCtx = shCanvas.getContext('2d');
          if (shCtx) {
            shCtx.clearRect(0, 0, 1920, 1080);
            const shatterT = t - T_SHATTER_START;
            const progress = shatterT / (T_SHATTER_END - T_SHATTER_START);
            const alpha = Math.max(0, 1.0 - Math.pow(progress, 1.6));

            shCtx.save();
            shCtx.translate(960, 540);
            for (const shard of shardsRef.current) {
              const x = shard.origCX - 300 + shard.vx * shatterT;
              const y = shard.origCY - 300 + shard.vy * shatterT + 400 * shatterT * shatterT;
              const scaleSh = 1 + (shard.vz * shatterT) / 500;

              shCtx.save();
              shCtx.translate(x, y);
              shCtx.scale(scaleSh, scaleSh);
              shCtx.rotate(shard.rotZ * shatterT);

              shCtx.beginPath();
              shCtx.moveTo(shard.pts[0].x, shard.pts[0].y);
              shCtx.lineTo(shard.pts[1].x, shard.pts[1].y);
              shCtx.lineTo(shard.pts[2].x, shard.pts[2].y);
              shCtx.closePath();

              if (cardImgRef.current && cardImgRef.current.complete) {
                shCtx.save();
                shCtx.clip();
                shCtx.drawImage(cardImgRef.current, -shard.origCX, -shard.origCY, 600, 600);
                shCtx.restore();
              } else {
                shCtx.fillStyle = `rgba(255, 117, 24, ${alpha * 0.85})`;
                shCtx.fill();
              }

              shCtx.strokeStyle = `rgba(255, 230, 160, ${alpha * 0.8})`;
              shCtx.lineWidth = 1.5;
              shCtx.stroke();
              shCtx.restore();
            }
            shCtx.restore();
          }
        }
      } else {
        if (cardEl) cardEl.style.display = 'none';
        if (shCanvas) shCanvas.style.display = 'none';
      }

      // 4. Ticket Reveal & Star Spin (Centered Horizontally & Vertically)
      const ticketEl = ticketRef.current;
      const starEl = starGroupRef.current;
      const wipeEl = wipeRectRef.current;

      if (ticketEl) {
        ticketEl.style.left = '50%';
        ticketEl.style.top = '50%';
        if (t < T_TICKET_START) {
          ticketEl.style.opacity = '0';
          ticketEl.style.transform = 'translate(-50%, -50%) scale(0.2)';
        } else if (t >= T_TICKET_START && t < T_WIPE_START) {
          const ticketProgress = (t - T_TICKET_START) / (T_WIPE_START - T_TICKET_START);
          const c1 = 1.70158;
          const c3 = c1 + 1;
          const p = Math.min(1, ticketProgress);
          const easeOut = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
          const scaleTicket = 0.2 + 0.8 * easeOut;
          const fastFade = Math.min(1.0, ticketProgress * 3);
          ticketEl.style.opacity = fastFade.toFixed(3);
          ticketEl.style.transform = `translate(-50%, -50%) scale(${scaleTicket.toFixed(3)})`;
        } else {
          ticketEl.style.opacity = '1';
          ticketEl.style.transform = 'translate(-50%, -50%) scale(1)';
        }
      }

      // Star spin rotation (fast spin at t=3.8s, smoothly decelerates upright at t=5.8s)
      if (starEl) {
        if (t < T_TICKET_START) {
          starEl.setAttribute('transform', 'translate(483, 410) rotate(0)');
        } else if (t >= T_TICKET_START && t < 5.8) {
          const spinProgress = (t - T_TICKET_START) / (5.8 - T_TICKET_START);
          const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
          const currentRot = easeOutCubic(spinProgress) * 1080;
          starEl.setAttribute('transform', `translate(483, 410) rotate(${currentRot})`);
        } else {
          starEl.setAttribute('transform', 'translate(483, 410) rotate(1080)');
        }
      }

      // Text wipe reveal clip-path
      if (wipeEl) {
        if (t < T_WIPE_START) {
          wipeEl.setAttribute('width', '0');
        } else if (t >= T_WIPE_START && t < T_WIPE_END) {
          const wipeP = (t - T_WIPE_START) / (T_WIPE_END - T_WIPE_START);
          const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
          const w = easeInOut(wipeP) * 676;
          wipeEl.setAttribute('width', String(w));
          spawnSparkleSweep(wipeP);
        } else {
          wipeEl.setAttribute('width', '676');
        }
      }

      // 5. Render Particle Sparkles
      const pCanvas = particleCanvasRef.current;
      if (pCanvas) {
        const pCtx = pCanvas.getContext('2d');
        if (pCtx) {
          pCtx.clearRect(0, 0, 1920, 1080);
          pCtx.save();
          pCtx.globalCompositeOperation = 'lighter';
          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.life += 0.016;
            if (p.life >= p.maxLife) {
              particlesRef.current.splice(i, 1);
              continue;
            }
            p.x += p.vx * 0.016;
            p.y += p.vy * 0.016;
            p.vx *= 0.94;
            p.vy *= 0.94;
            const prog = p.life / p.maxLife;
            const alpha = Math.sin(prog * Math.PI);
            const radius = p.size * (1 - prog * 0.5);

            pCtx.fillStyle = p.color;
            pCtx.globalAlpha = alpha;

            if (p.isStar) {
              pCtx.beginPath();
              pCtx.moveTo(p.x, p.y - radius * 2);
              pCtx.quadraticCurveTo(p.x, p.y, p.x + radius * 2, p.y);
              pCtx.quadraticCurveTo(p.x, p.y, p.x, p.y + radius * 2);
              pCtx.quadraticCurveTo(p.x, p.y, p.x - radius * 2, p.y);
              pCtx.quadraticCurveTo(p.x, p.y, p.x, p.y - radius * 2);
              pCtx.fill();
            } else {
              pCtx.beginPath();
              pCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
              pCtx.fill();
            }
          }
          pCtx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [playbackState, isMuted, playSFX, spawnShatterBurst, spawnSparkleSweep, buildShards, onFinished]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#ffffff] overflow-hidden flex items-center justify-center select-none"
    >
      {/* 1920x1080 Virtual Canvas Scaled to Fit - Seamless White Backdrop */}
      <div
        style={{
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
          backgroundColor: '#ffffff',
          backgroundImage: 'url(/endgame/endgame_bg.webp)',
          backgroundSize: '1920px 1080px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        className="overflow-hidden"
      >
        {/* Space Starfield Canvas */}
        <canvas
          ref={spaceCanvasRef}
          width={1920}
          height={1080}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 2 }}
        />

        {/* Center Card Container (Phase 1 - Centered Horizontally & Vertically) */}
        <div
          ref={cardContainerRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <img
            src={card.image}
            alt={card.name}
            style={{
              width: '600px',
              height: '600px',
              objectFit: 'cover',
              borderRadius: '12px',
              border: '4px solid #8B0000',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 158, 11, 0.35)',
              willChange: 'transform, opacity',
            }}
          />
        </div>

        {/* 3D Voronoi Shatter Canvas (Phase 2 - On Top of Card & Ticket) */}
        <canvas
          ref={shatterCanvasRef}
          width={1920}
          height={1080}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '1920px',
            height: '1080px',
            zIndex: 15,
            pointerEvents: 'none',
          }}
        />

        {/* Ticket Reveal Container (Starts with 0% opacity, grows after explosion - Centered Horizontally & Vertically) */}
        <div
          ref={ticketRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) scale(0.2)',
            width: '966px',
            height: '470px',
            zIndex: 8,
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          {/* Ticket SVG */}
          <div className="absolute inset-0 w-[966px] h-[470px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 966 470"
              width="966"
              height="470"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <mask id="codedTicketMask">
                  <rect width="966" height="470" fill="white" />
                  <circle cx="0" cy="0" r="45" fill="black" />
                  <circle cx="966" cy="0" r="45" fill="black" />
                  <circle cx="0" cy="470" r="45" fill="black" />
                  <circle cx="966" cy="470" r="45" fill="black" />
                  <circle cx="0" cy="98" r="18" fill="black" />
                  <circle cx="0" cy="142" r="18" fill="black" />
                  <circle cx="0" cy="186" r="18" fill="black" />
                  <circle cx="0" cy="235" r="18" fill="black" />
                  <circle cx="0" cy="284" r="18" fill="black" />
                  <circle cx="0" cy="328" r="18" fill="black" />
                  <circle cx="0" cy="372" r="18" fill="black" />
                  <circle cx="966" cy="98" r="18" fill="black" />
                  <circle cx="966" cy="142" r="18" fill="black" />
                  <circle cx="966" cy="186" r="18" fill="black" />
                  <circle cx="966" cy="235" r="18" fill="black" />
                  <circle cx="966" cy="284" r="18" fill="black" />
                  <circle cx="966" cy="328" r="18" fill="black" />
                  <circle cx="966" cy="372" r="18" fill="black" />
                </mask>

                <clipPath id="codedTextWipeClip">
                  <rect ref={wipeRectRef} x="0" y="0" width="0" height="330" />
                </clipPath>
              </defs>

              {/* White Ticket Body */}
              <rect width="966" height="470" rx="16" fill="#FFFFFF" mask="url(#codedTicketMask)" />

              {/* Inner Border Frame */}
              <rect
                x="80"
                y="44"
                width="806"
                height="382"
                rx="30"
                fill="none"
                stroke="#160020"
                strokeWidth="8"
              />

              {/* Divider Slots */}
              <line x1="145" y1="44" x2="145" y2="426" stroke="#160020" strokeWidth="8" />
              <line x1="821" y1="44" x2="821" y2="426" stroke="#160020" strokeWidth="8" />

              {/* Spinning Golden / Purple Star */}
              <g
                ref={starGroupRef}
                transform="translate(483, 410) rotate(0)"
                style={{ overflow: 'visible', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}
              >
                <polygon
                  points="0,-55 14,-15 55,-14 22,10 35,50 0,25 -35,50 -22,10 -55,-14 -14,-15"
                  fill={card.color || '#5B215C'}
                  stroke="#dfa86a"
                  strokeWidth="2.5"
                />
              </g>
            </svg>
          </div>

          {/* Dynamic Outcome Text (Barlow Semi Condensed 400 & 700) */}
          <div
            className="absolute left-[145px] top-[50px] w-[676px] h-[330px] flex flex-col items-center justify-center pointer-events-none"
            style={{ clipPath: 'url(#codedTextWipeClip)' }}
          >
            <div
              className="text-[#5B215C] font-normal uppercase text-center tracking-wider max-w-[660px] whitespace-nowrap"
              style={{
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                fontSize: '68px',
                lineHeight: 1.05,
                letterSpacing: '0.01em',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
              }}
            >
              {card.line1}
            </div>
            <div
              className="text-[#5B215C] font-bold uppercase text-center tracking-wide max-w-[660px]"
              style={{
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                fontSize: '92px',
                lineHeight: 0.92,
                letterSpacing: '0.01em',
                marginTop: '4px',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))',
              }}
              dangerouslySetInnerHTML={{ __html: card.line2 }}
            />
          </div>
        </div>

        {/* Particle Canvas */}
        <canvas
          ref={particleCanvasRef}
          width={1920}
          height={1080}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 20 }}
        />

        {/* Close / Return Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-8 right-8 z-40 bg-black/80 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-full border border-orange-500/50 backdrop-blur shadow-lg transition-all"
          >
            ✕ Terug naar Kaarten
          </button>
        )}
      </div>
    </div>
  );
}
