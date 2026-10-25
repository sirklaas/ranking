'use client';

import { useEffect, useRef, useState } from 'react';
import RankingTitleCard, { type RankingTitleCardHandle } from '@/components/titlecard/RankingTitleCard';
import { TITLE_CARDS } from '@/components/titlecard/titlecards';

const ORIGINALS: Record<string, string> = {
  flirt: '/pics/RankingFlirt.m4v',
};

type Mode = 'side' | 'overlay' | 'difference';

export default function TitleCardTestPage() {
  const [id] = useState('flirt');
  const config = TITLE_CARDS[id];
  const cardRef = useRef<RankingTitleCardHandle>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<Mode>('side');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [t, setT] = useState(0);
  const [audioFrom, setAudioFrom] = useState<'code' | 'video'>('code');

  // keep slider in sync during playback
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (cardRef.current) setT(cardRef.current.getTime());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const playBoth = async () => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.muted = audioFrom !== 'video';
    }
    await Promise.all([cardRef.current?.play(0), v?.play()]);
  };

  const pauseBoth = () => {
    cardRef.current?.pause();
    videoRef.current?.pause();
  };

  const seekBoth = (time: number) => {
    setT(time);
    cardRef.current?.seek(time);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = time;
    }
  };

  // ?solo=1&t=5.5 → render only the card, full-window, frozen at t (used for frame-diff screenshots)
  const [solo, setSolo] = useState<number | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('solo')) setSolo(parseFloat(q.get('t') ?? '0'));
  }, []);
  useEffect(() => {
    if (solo === null) return;
    const id = setInterval(() => cardRef.current?.seek(solo), 100);
    return () => clearInterval(id);
  }, [solo]);
  if (solo !== null) {
    return (
      <div style={{ position: 'fixed', inset: 0 }}>
        <RankingTitleCard ref={cardRef} config={config} muted />
      </div>
    );
  }

  const video = (
    <video ref={videoRef} src={ORIGINALS[id]} playsInline muted preload="auto" className="w-full h-full block" />
  );

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6 space-y-4" style={{ fontFamily: 'system-ui' }}>
      <h1 className="text-xl font-bold">Title card test — {config.title} / {config.subtitle}</h1>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button onClick={playBoth} className="px-4 py-2 rounded bg-green-600 hover:bg-green-500">▶ Play both</button>
        <button onClick={pauseBoth} className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">❚❚ Pause</button>
        <label className="flex items-center gap-2">
          Audio from:
          <select value={audioFrom} onChange={(e) => setAudioFrom(e.target.value as 'code' | 'video')} className="bg-neutral-800 rounded px-2 py-1">
            <option value="code">code version</option>
            <option value="video">original video</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          View:
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="bg-neutral-800 rounded px-2 py-1">
            <option value="side">side by side</option>
            <option value="overlay">overlay (opacity)</option>
            <option value="difference">difference (black = identical)</option>
          </select>
        </label>
        {mode === 'overlay' && (
          <input type="range" min={0} max={1} step={0.01} value={overlayOpacity} onChange={(e) => setOverlayOpacity(+e.target.value)} />
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <input
          type="range"
          min={0}
          max={config.duration}
          step={1 / 24}
          value={t}
          onChange={(e) => seekBoth(+e.target.value)}
          className="flex-1"
        />
        <span className="tabular-nums w-28">{t.toFixed(2)}s · f{Math.round(t * 24)}</span>
      </div>

      {mode === 'side' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs mb-1 opacity-70">Original video (RankingFlirt.m4v, 961 KB)</div>
            <div className="aspect-video bg-black">{video}</div>
          </div>
          <div>
            <div className="text-xs mb-1 opacity-70">Code version (shared SFX 183 KB + font)</div>
            <div className="aspect-video">
              <RankingTitleCard ref={cardRef} config={config} muted={audioFrom === 'video'} />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative aspect-video max-w-[1280px] bg-black" style={{ isolation: 'isolate' }}>
          <div className="absolute inset-0">
            <RankingTitleCard ref={cardRef} config={config} muted={audioFrom === 'video'} />
          </div>
          <div
            className="absolute inset-0"
            style={mode === 'overlay' ? { opacity: overlayOpacity } : { mixBlendMode: 'difference' }}
          >
            {video}
          </div>
        </div>
      )}
    </div>
  );
}
