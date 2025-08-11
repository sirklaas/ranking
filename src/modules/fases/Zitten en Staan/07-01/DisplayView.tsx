"use client";
import React from 'react';
import Image from 'next/image';
import type { FaseCommonProps } from '@/types/fases';
import { useHeading, useMediaUrl } from '@/lib/fases/hooks';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey }) => {
  const { data } = useHeading(faseKey);
  const mediaUrl = useMediaUrl(data?.image);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      <div className="text-4xl font-light mb-4">{data?.heading || 'Zitten en Staan'}</div>
      {mediaUrl ? (
        <div className="w-full max-w-3xl aspect-video bg-black rounded overflow-hidden relative">
          <Image src={mediaUrl} alt={data?.heading || ''} fill className="object-cover" />
        </div>
      ) : (
        <div className="text-sm opacity-70">Geen media</div>
      )}
    </div>
  );
};

export default DisplayView;
