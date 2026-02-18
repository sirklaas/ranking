"use client";
import React from 'react';
import Image from 'next/image';
import type { FaseCommonProps } from '@/types/fases';
import { useHeading, useMediaUrl } from '@/lib/fases/hooks';

const PlayerView: React.FC<FaseCommonProps> = ({ faseKey, heading }) => {
  const { data } = useHeading(faseKey);
  const mediaUrl = useMediaUrl(data?.image);
  const isVideo = data?.image && /\.(mp4|mov|avi|m4v|webm)$/i.test(data.image);
  const headingText = heading || data?.heading || 'Zitten en Staan';

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
    >
      {/* Full-screen media background */}
      {mediaUrl && isVideo ? (
        <video
          key={mediaUrl}
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
      ) : mediaUrl ? (
        <img src={mediaUrl} alt={headingText} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)' }}
        />
      )}

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content on top */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Logo band */}
        <div
          className="relative bg-cover bg-center bg-no-repeat shrink-0"
          style={{
            backgroundImage: 'url(/assets/band.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '14vh',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/assets/ranking_logo.webp"
              alt="Ranking Logo"
              width={256}
              height={128}
              className="h-full max-h-28 w-auto object-contain p-2"
              priority
            />
          </div>
        </div>

        {/* Heading in top area */}
        <div className="text-center px-6 pt-6 pb-2">
          <h1
            className="text-white text-2xl font-bold leading-snug"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          >
            {headingText}
          </h1>
        </div>
      </div>
    </div>
  );
};

export default PlayerView;
