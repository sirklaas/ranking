'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { TitleCardConfig } from './titlecards';

// ---------------------------------------------------------------------------
// Visual constants, measured from the original 1920x1080 videos.
// ---------------------------------------------------------------------------
const W = 1920;
const H = 1080;
const BG = '#FFBE17';
const PURPLE = '#7630D2';
const WHITE = '#FFFFFF';
/** Font family used for both lines. Swap the @font-face in globals.css to change it (e.g. to Druk Medium). */
const FONT = 'RankingTitle';

const TITLE_CAP = { top: 182, bottom: 555 }; // cap height 373px (Druk Medium 500pt)
const SUB_CAP = { top: 626, bottom: 820 }; // cap height 194px
const MAX_WIDTH = 1800;
const CURSOR = { width: 13, top: 150, bottom: 647, gapAfterText: 9, startOffset: -24 };
const SUB_SCALE_FROM = 0.7; // Keynote "Scale amount 70"

// Core Animation's EaseInEaseOut = cubic-bezier(0.42, 0, 0.58, 1)
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = sx(t) - x;
      if (Math.abs(d) < 1e-5) break;
      const ds = dsx(t);
      if (Math.abs(ds) < 1e-6) break;
      t -= d / ds;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const easeInOut = cubicBezier(0.42, 0, 0.58, 1);

type Layout = {
  titleSize: number;
  titleBaseline: number;
  titleX: number; // left edge of the (final, centred) title line
  titleCapTop: number;
  titleCapBottom: number;
  charRight: number[]; // right edge (x) after each typed char
  subSize: number;
  subBaseline: number;
};

/** Measure cap height ratio of the font via canvas. */
function capRatio(): number {
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = `100px ${FONT}`;
  const m = c.measureText('H');
  return (m.actualBoundingBoxAscent || 72) / 100;
}

export type RankingTitleCardHandle = {
  /** Start playback (with audio) from `from` seconds. */
  play: (from?: number) => Promise<void>;
  pause: () => void;
  /** Render a single frame at time t (no audio). */
  seek: (t: number) => void;
  getTime: () => number;
};

type Props = {
  config: TitleCardConfig;
  autoPlay?: boolean;
  muted?: boolean;
  onEnded?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

const RankingTitleCard = forwardRef<RankingTitleCardHandle, Props>(function RankingTitleCard(
  { config, autoPlay = false, muted = false, onEnded, className, style },
  ref,
) {
  const titleTextRef = useRef<SVGTextElement>(null);
  const subGroupRef = useRef<SVGGElement>(null);
  const shineStopRefs = useRef<(SVGStopElement | null)[]>([]);
  const cursorRef = useRef<SVGRectElement>(null);
  const charRefs = useRef<(SVGTSpanElement | null)[]>([]);

  const [layout, setLayout] = useState<Layout | null>(null);
  const layoutRef = useRef<Layout | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const rafRef = useRef<number>(0);
  const clockRef = useRef<{ t0: number; playing: boolean; t: number }>({ t0: 0, playing: false, t: 0 });
  const endedRef = useRef(false);

  // ---------------------------------------------------------------- layout
  useLayoutEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await document.fonts.load(`100px ${FONT}`, config.title + config.subtitle);
      } catch {}
      if (cancelled) return;
      const ratio = capRatio();
      const svgNS = 'http://www.w3.org/2000/svg';
      const probeSvg = titleTextRef.current?.ownerSVGElement;
      if (!probeSvg) return;

      const measure = (text: string, size: number) => {
        const t = document.createElementNS(svgNS, 'text');
        t.setAttribute('font-family', FONT);
        t.setAttribute('font-size', String(size));
        t.setAttribute('style', 'white-space:pre');
        t.textContent = text;
        probeSvg.appendChild(t);
        const total = t.getComputedTextLength();
        const sub = (n: number) => (n === 0 ? 0 : t.getSubStringLength(0, n));
        const rights = Array.from(text, (_, i) => sub(i + 1));
        probeSvg.removeChild(t);
        return { total, rights };
      };

      // Title: target cap height 373px, shrink to fit if wider than MAX_WIDTH
      const titleCapH = TITLE_CAP.bottom - TITLE_CAP.top;
      let titleSize = titleCapH / ratio;
      let tm = measure(config.title, titleSize);
      if (tm.total > MAX_WIDTH) {
        titleSize *= MAX_WIDTH / tm.total;
        tm = measure(config.title, titleSize);
      }
      const tCap = titleSize * ratio;
      const tCentre = (TITLE_CAP.top + TITLE_CAP.bottom) / 2;
      const titleBaseline = tCentre + tCap / 2;
      const titleX = (W - tm.total) / 2;

      const subCapH = SUB_CAP.bottom - SUB_CAP.top;
      let subSize = subCapH / ratio;
      const sm = measure(config.subtitle, subSize);
      if (sm.total > MAX_WIDTH) subSize *= MAX_WIDTH / sm.total;
      const sCap = subSize * ratio;
      const sCentre = (SUB_CAP.top + SUB_CAP.bottom) / 2;

      const l: Layout = {
        titleSize,
        titleBaseline,
        titleX,
        titleCapTop: titleBaseline - tCap,
        titleCapBottom: titleBaseline,
        charRight: tm.rights.map((r) => titleX + r),
        subSize,
        subBaseline: sCentre + sCap / 2,
      };
      layoutRef.current = l;
      setLayout(l);
    })();
    return () => {
      cancelled = true;
    };
  }, [config.title, config.subtitle]);

  // ---------------------------------------------------------------- render(t)
  const render = useCallback(
    (t: number) => {
      const l = layoutRef.current;
      if (!l) return;

      // Subtitle: From Darkness (opacity 0→1, scale 0.7→1, shine sweep)
      const sd = config.subtitleDuration ?? 2.5;
      const p = Math.min(1, Math.max(0, (t - config.subtitleStart) / sd));
      const e = easeInOut(p);
      const g = subGroupRef.current;
      if (g) {
        const s = SUB_SCALE_FROM + (1 - SUB_SCALE_FROM) * e;
        const cx = W / 2;
        const cy = (SUB_CAP.top + SUB_CAP.bottom) / 2;
        g.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
        g.setAttribute('opacity', String(e));
      }
      // Shine: a soft light band sweeping top → bottom, fading out as the build completes
      const band = -0.3 + 1.6 * e;
      const strength = p > 0 && p < 1 ? 0.55 * Math.sin(Math.PI * p) : 0;
      const stops = shineStopRefs.current;
      if (stops.length === 3) {
        stops[0]?.setAttribute('offset', String(band - 0.25));
        stops[1]?.setAttribute('offset', String(band));
        stops[1]?.setAttribute('stop-opacity', String(strength));
        stops[2]?.setAttribute('offset', String(band + 0.25));
      }

      // Title: keyboard build — characters appear at their measured times
      let typed = 0;
      config.typeTimes.forEach((ct, i) => {
        const on = t >= ct;
        if (on) typed = i + 1;
        const el = charRefs.current[i];
        if (el) el.setAttribute('fill-opacity', on ? '1' : '0');
      });

      // Cursor
      const c = cursorRef.current;
      if (c) {
        const visible = config.cursorOn.some(([a, b]) => t >= a && t < b);
        const x = typed === 0 ? l.titleX + CURSOR.startOffset * (l.titleSize / 500) : l.charRight[typed - 1] + CURSOR.gapAfterText;
        c.setAttribute('x', String(x));
        c.setAttribute('visibility', visible ? 'visible' : 'hidden');
      }
    },
    [config],
  );

  useEffect(() => {
    if (layout) render(clockRef.current.t);
  }, [layout, render]);

  // ---------------------------------------------------------------- audio
  const ensureAudio = useCallback(async () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    await Promise.all(
      config.sfx.map(async ({ src }) => {
        if (buffersRef.current.has(src)) return;
        const buf = await fetch(src).then((r) => r.arrayBuffer());
        buffersRef.current.set(src, await ctx.decodeAudioData(buf));
      }),
    );
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }, [config.sfx]);

  const stopAudio = () => {
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    sourcesRef.current = [];
  };

  const loop = useCallback(() => {
    const ctx = audioCtxRef.current;
    const clk = clockRef.current;
    if (!clk.playing) return;
    const now = ctx ? ctx.currentTime : performance.now() / 1000;
    clk.t = Math.max(0, now - clk.t0);
    render(clk.t);
    if (clk.t >= config.duration) {
      clk.playing = false;
      if (!endedRef.current) {
        endedRef.current = true;
        onEnded?.();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [config.duration, onEnded, render]);

  const play = useCallback(
    async (from = 0) => {
      cancelAnimationFrame(rafRef.current);
      stopAudio();
      endedRef.current = false;
      const ctx = await ensureAudio();
      const startAt = ctx.currentTime + 0.05;
      if (!muted) {
        for (const cue of config.sfx) {
          const buf = buffersRef.current.get(cue.src);
          if (!buf) continue;
          const rel = cue.at - from;
          if (rel + buf.duration <= 0) continue;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const gain = ctx.createGain();
          gain.gain.value = cue.gain ?? 1;
          src.connect(gain).connect(ctx.destination);
          if (rel >= 0) src.start(startAt + rel);
          else src.start(startAt, -rel);
          sourcesRef.current.push(src);
        }
      }
      clockRef.current = { t0: startAt - from, playing: true, t: from };
      rafRef.current = requestAnimationFrame(loop);
    },
    [config.sfx, ensureAudio, loop, muted],
  );

  const pause = useCallback(() => {
    clockRef.current.playing = false;
    cancelAnimationFrame(rafRef.current);
    stopAudio();
  }, []);

  const seek = useCallback(
    (t: number) => {
      pause();
      clockRef.current.t = t;
      render(t);
    },
    [pause, render],
  );

  useImperativeHandle(ref, () => ({ play, pause, seek, getTime: () => clockRef.current.t }), [play, pause, seek]);

  useEffect(() => {
    if (autoPlay && layout) play(0).catch(() => {});
  }, [autoPlay, layout, play]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      stopAudio();
      audioCtxRef.current?.close().catch(() => {});
    },
    [],
  );

  // ---------------------------------------------------------------- markup
  const cursorScale = layout ? (layout.titleCapBottom - layout.titleCapTop) / (TITLE_CAP.bottom - TITLE_CAP.top) : 1;
  const cursorTop = layout ? layout.titleCapTop - (TITLE_CAP.top - CURSOR.top) * cursorScale : CURSOR.top;
  const cursorH = (CURSOR.bottom - CURSOR.top) * cursorScale;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', background: BG, ...style }}
    >
      <defs>
        <linearGradient id={`shine-${config.id}`} gradientUnits="objectBoundingBox" x1="0" y1="0" x2="0" y2="1">
          <stop ref={(el) => { shineStopRefs.current[0] = el; }} offset="0" stopColor="#fff" stopOpacity="0" />
          <stop ref={(el) => { shineStopRefs.current[1] = el; }} offset="0" stopColor="#fff" stopOpacity="0" />
          <stop ref={(el) => { shineStopRefs.current[2] = el; }} offset="0" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={BG} />

      {/* Purple subtitle — From Darkness */}
      <g ref={subGroupRef} opacity={0} style={{ visibility: layout ? 'visible' : 'hidden' }}>
        <text
          x={W / 2}
          y={layout?.subBaseline ?? SUB_CAP.bottom}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={layout?.subSize ?? 260}
          fill={PURPLE}
          style={{ whiteSpace: 'pre' }}
        >
          {config.subtitle}
        </text>
        <text
          x={W / 2}
          y={layout?.subBaseline ?? SUB_CAP.bottom}
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={layout?.subSize ?? 260}
          fill={`url(#shine-${config.id})`}
          style={{ whiteSpace: 'pre' }}
        >
          {config.subtitle}
        </text>
      </g>

      {/* White title — keyboard build */}
      <text
        ref={titleTextRef}
        x={layout?.titleX ?? 0}
        y={layout?.titleBaseline ?? TITLE_CAP.bottom}
        fontFamily={FONT}
        fontSize={layout?.titleSize ?? 500}
        fill={WHITE}
        style={{ whiteSpace: 'pre', visibility: layout ? 'visible' : 'hidden' }}
      >
        {Array.from(config.title).map((ch, i) => (
          <tspan key={i} ref={(el) => { charRefs.current[i] = el; }} fillOpacity={0}>
            {ch}
          </tspan>
        ))}
      </text>

      <rect ref={cursorRef} y={cursorTop} width={CURSOR.width} height={cursorH} fill={WHITE} visibility="hidden" />
    </svg>
  );
});

export default RankingTitleCard;
