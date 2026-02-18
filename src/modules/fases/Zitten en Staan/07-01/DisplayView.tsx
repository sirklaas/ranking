"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { useHeading, useMediaUrl } from '@/lib/fases/hooks';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey }) => {
  const { data } = useHeading(faseKey);
  const mediaUrl = useMediaUrl(data?.image);
  const isVideo = data?.image && /\.(mp4|mov|avi|m4v|webm)$/i.test(data.image);
  const headingText = data?.heading || 'Zitten en Staan';

  return (
    <div className="fixed inset-0 w-full h-full bg-black" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Full-screen media */}
      {mediaUrl && isVideo ? (
        <video
          key={mediaUrl}
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-contain"
          autoPlay
          muted={false}
          playsInline
        />
      ) : mediaUrl ? (
        <img src={mediaUrl} alt={headingText} className="absolute inset-0 w-full h-full object-contain" />
      ) : null}

      {/* Heading overlay in top 1/3 */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center px-8 text-center z-10"
        style={{ height: '33%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}
      >
        <h1
          className="text-white text-5xl font-light whitespace-pre-line"
          style={{ textShadow: '0 3px 16px rgba(0,0,0,0.8)', fontWeight: 300 }}
        >
          {headingText}
        </h1>
      </div>
    </div>
  );
};

export default DisplayView;
