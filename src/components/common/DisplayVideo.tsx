'use client';

import { useEffect, useRef } from 'react';

interface DisplayVideoProps {
  src: string;
  className?: string;
  freezeBeforeEnd?: number;
  onFrozen?: () => void;
  onError?: () => void;
}

/** Silent audience video. Hold the decoded frame on canvas before pausing. */
export default function DisplayVideo({ src, className, freezeBeforeEnd = 0.2, onFrozen, onError }: DisplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFrozenRef = useRef(onFrozen);
  const onErrorRef = useRef(onError);
  onFrozenRef.current = onFrozen;
  onErrorRef.current = onError;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    let disposed = false;
    let finished = false;
    let pending = false;
    canvas.hidden = true;
    video.style.visibility = 'visible';
    video.defaultMuted = true;
    video.muted = true;
    video.volume = 0;

    const play = () => {
      if (disposed || finished || pending || !video.paused || document.hidden) return;
      pending = true;
      video.play().catch((error: unknown) => {
        if (!disposed) console.warn('[DisplayVideo] Playback failed:', src, error);
      }).finally(() => { pending = false; });
    };
    const freeze = () => {
      if (finished || !video.videoWidth || !video.videoHeight) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
      } catch (error) {
        console.warn('[DisplayVideo] Could not hold frame:', src, error);
        return; // Keep the video visible if capturing fails.
      }
      finished = true;
      canvas.hidden = false;
      video.style.visibility = 'hidden';
      video.pause();
      onFrozenRef.current?.();
    };
    const timeUpdate = () => {
      if (Number.isFinite(video.duration) && video.duration > freezeBeforeEnd &&
          video.currentTime >= video.duration - freezeBeforeEnd) freeze();
    };
    const error = () => {
      console.warn('[DisplayVideo] Media error:', src, video.error);
      onErrorRef.current?.();
    };
    video.addEventListener('canplay', play);
    video.addEventListener('timeupdate', timeUpdate);
    video.addEventListener('ended', freeze);
    video.addEventListener('error', error);
    window.addEventListener('click', play, true);
    window.addEventListener('keydown', play, true);
    document.addEventListener('visibilitychange', play);
    play();
    return () => {
      disposed = true;
      video.removeEventListener('canplay', play);
      video.removeEventListener('timeupdate', timeUpdate);
      video.removeEventListener('ended', freeze);
      video.removeEventListener('error', error);
      window.removeEventListener('click', play, true);
      window.removeEventListener('keydown', play, true);
      document.removeEventListener('visibilitychange', play);
      video.pause();
    };
  }, [src, freezeBeforeEnd]);

  return (
    <div className={className} style={{ pointerEvents: 'none' }}>
      <video ref={videoRef} src={src} muted playsInline controls={false} preload="auto"
        disablePictureInPicture disableRemotePlayback tabIndex={-1}
        className="w-full h-full" style={{ objectFit: 'inherit' }} />
      <canvas ref={canvasRef} hidden aria-hidden="true"
        className="w-full h-full" style={{ objectFit: 'inherit', position: 'absolute', inset: 0 }} />
    </div>
  );
}
