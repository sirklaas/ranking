'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  speedY: number;
  speedX: number;
  baseX: number;
  swaySpeed: number;
  swayAngle: number;
  opacity: number;
  maxOpacity: number;
  pulseSpeed: number;
}

export default function EndgameHalloweenQR() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Halloween ember colors
    const colors = [
      'rgba(255, 117, 24, ',  // Halloween orange
      'rgba(245, 158, 11, ',  // Amber flame
      'rgba(234, 88, 12, ',   // Deep orange
      'rgba(168, 85, 247, ',  // Spooky purple
      'rgba(192, 132, 252, ', // Eerie lavender
      'rgba(253, 224, 71, ',  // Golden spark
    ];

    const particleCount = 55;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const baseX = Math.random() * width;
      const maxOpacity = 0.35 + Math.random() * 0.55;
      particles.push({
        x: baseX,
        y: Math.random() * height,
        baseX,
        radius: 1.5 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: 0.4 + Math.random() * 0.9,
        speedX: (Math.random() - 0.5) * 0.3,
        swaySpeed: 0.01 + Math.random() * 0.02,
        swayAngle: Math.random() * Math.PI * 2,
        opacity: Math.random() * maxOpacity,
        maxOpacity,
        pulseSpeed: 0.015 + Math.random() * 0.02,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speedY;
        p.swayAngle += p.swaySpeed;
        p.x = p.baseX + Math.sin(p.swayAngle) * 22;

        p.opacity += Math.sin(p.swayAngle * 2) * 0.01;
        const currentOpacity = Math.max(0.1, Math.min(p.maxOpacity, p.opacity));

        if (p.y < -20) {
          p.y = height + 10;
          p.baseX = Math.random() * width;
          p.x = p.baseX;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${currentOpacity})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = `${p.color}0.9)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-between py-8 px-6 overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 45%, #220b38 0%, #11051f 45%, #060209 100%)',
      }}
    >
      {/* Dynamic Animated Embers Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Atmospheric glowing orbs */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-orange-600/15 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute w-[450px] h-[450px] rounded-full bg-purple-600/20 blur-[100px] top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute w-[450px] h-[450px] rounded-full bg-amber-500/15 blur-[100px] bottom-1/4 right-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 animate-pulse" style={{ animationDuration: '5s' }} />

      {/* Spooky Fog / Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          boxShadow: 'inset 0 0 160px 40px rgba(0, 0, 0, 0.9)',
        }}
      />

      {/* Top Header Card */}
      <div className="relative z-10 flex flex-col items-center text-center mt-2 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl lg:text-4xl animate-bounce" style={{ animationDuration: '2.5s' }}>🎃</span>
          <span
            className="text-orange-400 font-extrabold tracking-[0.3em] text-sm lg:text-base uppercase"
            style={{
              textShadow: '0 0 15px rgba(255, 117, 24, 0.9), 0 0 25px rgba(245, 158, 11, 0.8)',
              fontFamily: '"Barlow Semi Condensed", sans-serif',
            }}
          >
            Creepy Ranking Show · Finale
          </span>
          <span className="text-3xl lg:text-4xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>🎃</span>
        </div>

        <h1
          className="text-white text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-wider leading-tight"
          style={{
            fontFamily: '"BrewHouse-Aged", "BrewHouse", Impact, sans-serif',
            textShadow: '0 0 35px rgba(255, 117, 24, 0.95), 0 0 60px rgba(234, 88, 12, 0.7), 0 4px 15px rgba(0,0,0,0.9)',
          }}
        >
          Vond je het leuk?
        </h1>
      </div>

      {/* Central QR Code Card with Halloween glow and floating animation */}
      <div className="relative z-10 my-auto flex flex-col items-center animate-qr-float">
        <div
          className="relative p-3.5 rounded-[2.5rem] bg-gradient-to-b from-amber-500/80 via-orange-600/70 to-purple-800/80 shadow-[0_0_50px_rgba(255,117,24,0.6),0_0_100px_rgba(168,85,247,0.4)] border-2 border-amber-300/60"
        >
          {/* Subtle inner card glow */}
          <div className="relative rounded-[2.2rem] overflow-hidden bg-white shadow-2xl p-2.5 flex items-center justify-center">
            <img
              src="/pics/End/qr_code_card_clean.png"
              alt="Scan QR code voor een review"
              className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[420px] md:h-[420px] lg:w-[480px] lg:h-[480px] object-contain block select-none"
            />
          </div>

          {/* Spooky corner badges */}
          <div className="absolute -top-3 -left-3 text-2xl drop-shadow-[0_0_10px_rgba(255,117,24,0.8)] select-none">
            🦇
          </div>
          <div className="absolute -top-3 -right-3 text-2xl drop-shadow-[0_0_10px_rgba(255,117,24,0.8)] select-none">
            🦇
          </div>
          <div className="absolute -bottom-3 -left-3 text-2xl drop-shadow-[0_0_10px_rgba(255,117,24,0.8)] select-none">
            🕸️
          </div>
          <div className="absolute -bottom-3 -right-3 text-2xl drop-shadow-[0_0_10px_rgba(255,117,24,0.8)] select-none">
            🕸️
          </div>
        </div>
      </div>

      {/* Bottom Subtitle with Glowing Stars */}
      <div className="relative z-10 flex flex-col items-center text-center mb-3">
        <p
          className="text-white text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-wide"
          style={{
            fontFamily: '"BrewHouse-Aged", "BrewHouse", Impact, sans-serif',
            textShadow: '0 0 25px rgba(253, 224, 71, 0.9), 0 0 45px rgba(245, 158, 11, 0.8), 0 4px 12px rgba(0,0,0,0.9)',
          }}
        >
          Geef ons dan veul sterren!
        </p>

        {/* 5 Shimmering Stars */}
        <div className="flex items-center gap-2 mt-2 text-2xl sm:text-3xl md:text-4xl text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-pulse">
          <span>⭐</span>
          <span>⭐</span>
          <span>⭐</span>
          <span>⭐</span>
          <span>⭐</span>
        </div>

        <p
          className="text-orange-200/90 text-sm sm:text-base font-semibold tracking-wider uppercase mt-2.5 drop-shadow"
          style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}
        >
          Scan de QR-code met je telefoon camera
        </p>
      </div>

      <style jsx>{`
        @keyframes qrFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.01);
          }
        }
        .animate-qr-float {
          animation: qrFloat 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
