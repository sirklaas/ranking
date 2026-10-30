'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import SpookyTrailerTitle from '@/components/common/SpookyTrailerTitle';
import { DEFAULT_POSITIVE_TRAITS, DEFAULT_NEGATIVE_TRAITS } from '@/modules/krakende-karakters/defaults';
import { ENDGAME_HALLOWEEN_CARDS, ENDGAME_STANDARD_CARDS, EndgameCard } from '@/modules/fases/De Finale/20-01/endgameData';
import CodedEndgameReveal from '@/components/endgame/CodedEndgameReveal';

const TRAILERS = [
  { fase: '07/01', title: 'Zitten en Staan', desc: 'Ronde 1: Blijf staan als je durft' },
  { fase: '10/01', title: 'De Top 3', desc: 'Ronde 2: Wie is het grootste monster?' },
  { fase: '13/01', title: 'Krakende Karakters', desc: 'Ronde 3: Goede & Duivelse eigenschappen' },
  { fase: '17/01', title: 'De Top 10', desc: 'Ronde 4: Top 10 Halloween dilemma\'s' },
  { fase: '20/01', title: 'De Finale', desc: 'De Grote Ontknoping' },
];

export default function CreepyPreviewPage() {
  const [activeFase, setActiveFase] = useState('07/01');
  const [activeTab, setActiveTab] = useState<'trailers' | 'traits' | 'endgame'>('trailers');
  const [cardSet, setCardSet] = useState<'halloween' | 'standard'>('halloween');
  const [selectedEndgameCard, setSelectedEndgameCard] = useState<EndgameCard | null>(null);
  const [endgamePlaybackState, setEndgamePlaybackState] = useState<'paused' | 'playing' | 'finished'>('paused');
  const [isMuted, setIsMuted] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [delaySec, setDelaySec] = useState(6.0);
  const [fontChoice, setFontChoice] = useState<'BrewHouse-Aged' | 'BrewHouse' | 'BrewHouse-Full' | 'Creepster' | 'Barlow'>('BrewHouse-Aged');
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleSelectFase = (fase: string) => {
    setActiveFase(fase);
    setPlayKey((k) => k + 1);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleReplay = () => {
    setPlayKey((k) => k + 1);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-orange-500/20 bg-black/60 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🎃</span>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-orange-500 uppercase">
              Creepy Ranking Show — Live Preview
            </h1>
            <p className="text-xs text-zinc-400">Halloween Edition · Engine Validation</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab('trailers')}
              className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${
                activeTab === 'trailers'
                  ? 'bg-orange-600 text-white shadow-[0_0_15px_#ea580c]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🎬 Animated Trailers
            </button>
            <button
              onClick={() => setActiveTab('traits')}
              className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${
                activeTab === 'traits'
                  ? 'bg-orange-600 text-white shadow-[0_0_15px_#ea580c]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🧟 48 Krakende Traits
            </button>
            <button
              onClick={() => setActiveTab('endgame')}
              className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${
                activeTab === 'endgame'
                  ? 'bg-orange-600 text-white shadow-[0_0_15px_#ea580c]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🃏 8 Coded Endgame Kaarten
            </button>
          </div>

          <div className="flex items-center space-x-1.5 pl-2 border-l border-zinc-800">
            <Link
              href="/display"
              target="_blank"
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-orange-600 text-white font-bold text-xs border border-zinc-800 hover:border-orange-500 transition-all flex items-center space-x-1.5"
            >
              <span>📺</span>
              <span>Display</span>
            </Link>
            <Link
              href="/presenter"
              target="_blank"
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-orange-600 text-white font-bold text-xs border border-zinc-800 hover:border-orange-500 transition-all flex items-center space-x-1.5"
            >
              <span>🎙️</span>
              <span>Presenter</span>
            </Link>
            <Link
              href="/test-phones"
              target="_blank"
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-orange-600 text-white font-bold text-xs border border-zinc-800 hover:border-orange-500 transition-all flex items-center space-x-1.5"
            >
              <span>📱</span>
              <span>6 Phones</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'trailers' && (
          <div className="space-y-6">
            {/* Trailer Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {TRAILERS.map((t) => {
                const isActive = activeFase === t.fase;
                return (
                  <button
                    key={t.fase}
                    onClick={() => handleSelectFase(t.fase)}
                    className={`p-4 rounded-xl text-left transition-all border ${
                      isActive
                        ? 'bg-gradient-to-br from-orange-950/80 to-zinc-900 border-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.4)]'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="text-xs font-mono text-orange-400 font-bold block mb-1">
                      Fase {t.fase}
                    </span>
                    <span className="font-extrabold text-lg block leading-tight text-white">
                      {t.title}
                    </span>
                    <span className="text-xs text-zinc-400 block mt-1 line-clamp-1">
                      {t.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Video Preview Box with Live Spooky Overlay */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border-2 border-orange-500/40 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              <video
                key={playKey}
                ref={videoRef}
                src="/pics/HalloweenTrailer/trailercreepy.m4v"
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={(e) => e.currentTarget.pause()}
              />

              {/* Injected Spooky Title Overlay with dynamic delay and font choice */}
              <SpookyTrailerTitle
                key={`title-${activeFase}-${playKey}-${delaySec}-${fontChoice}`}
                faseKey={activeFase}
                delayMs={Math.round(delaySec * 1000)}
                fontChoice={fontChoice}
              />

              {/* Replay & Time Badge */}
              <div className="absolute bottom-6 right-6 z-40 flex items-center space-x-3">
                <span className="bg-black/80 backdrop-blur border border-zinc-800 text-orange-400 font-mono text-xs px-3 py-2 rounded-lg">
                  ⏱️ {currentTime.toFixed(1)}s / 24.7s
                </span>
                <button
                  onClick={handleReplay}
                  className="bg-black/80 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-full border border-orange-500/50 backdrop-blur shadow-lg transition-all flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span>Replay</span>
                </button>
              </div>

              <div className="absolute top-6 left-6 z-40 bg-black/70 backdrop-blur border border-zinc-800 px-3 py-1.5 rounded-md text-xs text-zinc-300 font-mono">
                🎬 Playing: trailercreepy.m4v (24.7s · HD 720p 9.7MB) · Title at Top 1/3
              </div>
            </div>

            {/* Interactive Delay & Font Controls */}
            <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[280px]">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-orange-400">
                      ⏱️ Heading Pop-In Delay: <span className="text-white text-base">{delaySec}s</span>
                    </label>
                    <span className="text-xs text-zinc-400">
                      Title animates at {delaySec}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="15.0"
                    step="0.5"
                    value={delaySec}
                    onChange={(e) => {
                      setDelaySec(parseFloat(e.target.value));
                      handleReplay();
                    }}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center space-x-2">
                  {[3.0, 5.0, 6.0, 7.0, 8.0].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        setDelaySec(sec);
                        handleReplay();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        delaySec === sec
                          ? 'bg-orange-600 border-orange-500 text-white shadow-[0_0_10px_#ea580c]'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {sec}s {sec === 6.0 && '⭐'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grungy Font Selector */}
              <div className="border-t border-zinc-800/80 pt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  🎨 Lettertype:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {(['BrewHouse-Aged', 'BrewHouse', 'BrewHouse-Full', 'Creepster', 'Barlow'] as const).map((font) => (
                    <button
                      key={font}
                      onClick={() => {
                        setFontChoice(font);
                        handleReplay();
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        fontChoice === font
                          ? 'bg-orange-600 border-orange-500 text-white shadow-[0_0_12px_#ea580c]'
                          : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {font} {font === 'BrewHouse-Aged' && '⭐'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-zinc-400 text-center">
              💡 The trailer plays the spooky ambient video first, then after 1.4 seconds the animated neon heading smoothly rises and pulses over the holding frame.
            </p>
          </div>
        )}

        {activeTab === 'traits' && (
          <div className="space-y-8">
            {/* Positive Traits Section */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">✨</span>
                <div>
                  <h2 className="text-xl font-black text-orange-400 uppercase tracking-wide">
                    24 Griezelig Goede Eigenschappen (Positief)
                  </h2>
                  <p className="text-xs text-zinc-400">Direct extracted from PDF Page 1</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {DEFAULT_POSITIVE_TRAITS.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-zinc-900/80 border border-orange-500/20 rounded-xl hover:border-orange-500/60 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-orange-400 font-bold block mb-1">
                        #{idx + 1}
                      </span>
                      <span className="font-extrabold text-sm text-white block leading-tight">
                        {t.nl}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 italic mt-2 block border-t border-zinc-800 pt-1">
                      {t.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Negative Traits Section */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">💀</span>
                <div>
                  <h2 className="text-xl font-black text-purple-400 uppercase tracking-wide">
                    24 Minder Goede Eigenschappen (Negatief)
                  </h2>
                  <p className="text-xs text-zinc-400">Direct extracted from PDF Page 2</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {DEFAULT_NEGATIVE_TRAITS.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-zinc-900/80 border border-purple-500/20 rounded-xl hover:border-purple-500/60 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-purple-400 font-bold block mb-1">
                        #{idx + 1}
                      </span>
                      <span className="font-extrabold text-sm text-white block leading-tight">
                        {t.nl}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 italic mt-2 block border-t border-zinc-800 pt-1">
                      {t.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Coded Endgame Kaarten Tab */}
        {activeTab === 'endgame' && (
          <div className="space-y-6">
            {/* Subheader & Set Switcher */}
            <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">✨</span>
                  <h2 className="text-xl font-black text-orange-400 uppercase tracking-wide">
                    Coded Endgame Engine (Munten Editie)
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  100% Coded Voronoi Glass Shatter · Star Particle Engine · SVG Ticket Reveal · Audio Sync
                </p>
              </div>

              {/* Set Switcher */}
              <div className="flex items-center space-x-2 bg-black/50 p-1.5 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setCardSet('halloween')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${
                    cardSet === 'halloween'
                      ? 'bg-orange-600 text-white shadow-[0_0_12px_#ea580c]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🎃 Halloween Kaarten (8)
                </button>
                <button
                  onClick={() => setCardSet('standard')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${
                    cardSet === 'standard'
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_#9333ea]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🔮 Standard Kaarten (8)
                </button>
              </div>
            </div>

            {/* Munten Measure Rules Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-black/40 border border-orange-500/20 p-3 rounded-xl font-mono text-zinc-300">
              <div><span className="text-orange-400 font-bold">1.</span> Jammer jullie halveren</div>
              <div><span className="text-orange-400 font-bold">2.</span> Lekker 5 munten extra</div>
              <div><span className="text-orange-400 font-bold">3.</span> Geef 1 munt aan elk team</div>
              <div><span className="text-orange-400 font-bold">4.</span> Krijg 1 munt van elk team</div>
              <div><span className="text-orange-400 font-bold">5.</span> Lever 3 munten in</div>
              <div><span className="text-orange-400 font-bold">6.</span> Jullie verdubbelen</div>
              <div><span className="text-orange-400 font-bold">7.</span> Lever 7 munten in</div>
              <div><span className="text-orange-400 font-bold">8.</span> Jullie ver3voudigen</div>
            </div>

            {/* 8 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {(cardSet === 'halloween' ? ENDGAME_HALLOWEEN_CARDS : ENDGAME_STANDARD_CARDS).map((card, idx) => (
                <div
                  key={card.id}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl hover:border-orange-500/60 transition-all flex flex-col group"
                >
                  {/* Card Image */}
                  <div className="relative aspect-square overflow-hidden bg-black">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border border-zinc-800 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold text-orange-400">
                      #{idx + 1}
                    </div>
                  </div>

                  {/* Outcome Description */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="bg-black/60 rounded-xl p-3 border border-orange-500/20 text-center">
                      <span className="text-[11px] text-zinc-400 uppercase font-mono tracking-wider block mb-0.5">
                        {card.line1}
                      </span>
                      <span
                        className="text-base font-black text-orange-400 block"
                        dangerouslySetInnerHTML={{ __html: card.line2 }}
                      />
                    </div>

                    {/* Launch Button */}
                    <button
                      onClick={() => {
                        setSelectedEndgameCard(card);
                        setEndgamePlaybackState('playing');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(234,88,12,0.4)] flex items-center justify-center space-x-2"
                    >
                      <span>💥</span>
                      <span>Start Coded Reveal</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Seamless Fullscreen Coded Endgame Reveal (Layout as in Example File) */}
      {selectedEndgameCard && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Top Floating Pill Header (as in example file) */}
          <header className="fixed top-3.5 left-1/2 -translate-x-1/2 z-[60] bg-[#12121a]/90 backdrop-blur-md border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.4)] rounded-full px-4 py-1.5 flex items-center justify-between gap-3 max-w-[96vw]">
            <div className="flex items-center space-x-2">
              <span className="bg-gradient-to-br from-purple-700 to-purple-500 text-white text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-[0_0_10px_rgba(147,51,234,0.4)]">
                {cardSet === 'halloween' ? '🎃 Halloween' : '🔮 Standard'}
              </span>
              <span className="text-white text-xs font-bold uppercase hidden sm:inline">
                {selectedEndgameCard.name}
              </span>
            </div>

            {/* Quick 8-Card Switcher Pills */}
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg border border-white/10 overflow-x-auto max-w-[55vw]">
              {(cardSet === 'halloween' ? ENDGAME_HALLOWEEN_CARDS : ENDGAME_STANDARD_CARDS).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedEndgameCard(c);
                    setEndgamePlaybackState('playing');
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedEndgameCard.id === c.id
                      ? 'bg-purple-600 text-white shadow-[0_0_8px_#9333ea]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedEndgameCard(null)}
              className="bg-white/10 hover:bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 transition-all"
            >
              ✕ Sluiten
            </button>
          </header>

          {/* Bottom Floating Pill Controls Bar (as in example file) */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-[#12121a]/90 backdrop-blur-md border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.4)] rounded-full px-5 py-2 flex items-center space-x-3">
            <button
              onClick={() => setEndgamePlaybackState('playing')}
              className={`px-4 py-1.5 rounded-full font-bold text-xs uppercase transition-all flex items-center space-x-1.5 ${
                endgamePlaybackState === 'playing'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span>▶</span>
              <span>Play</span>
            </button>
            <button
              onClick={() => setEndgamePlaybackState('paused')}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center space-x-1 border border-white/10"
            >
              <span>↺</span>
              <span>Replay</span>
            </button>
            <button
              onClick={() => setIsMuted((m) => !m)}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center space-x-1 border border-white/10"
            >
              <span>{isMuted ? '🔇' : '🔊'}</span>
              <span>{isMuted ? 'Audio Off' : 'Audio On'}</span>
            </button>
          </div>

          {/* Pure Canvas Reveal Engine */}
          <CodedEndgameReveal
            card={selectedEndgameCard}
            playbackState={endgamePlaybackState}
            onFinished={() => setEndgamePlaybackState('finished')}
            onClose={() => setSelectedEndgameCard(null)}
            isMuted={isMuted}
          />
        </div>
      )}
    </div>
  );
}
