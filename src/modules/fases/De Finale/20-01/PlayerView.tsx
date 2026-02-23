"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { FaseCommonProps } from '@/types/fases';

const DELAY_MS = 3000;

const PlayerView: React.FC<FaseCommonProps> = ({ heading }) => {
    const [headingReady, setHeadingReady] = useState(false);
    const headingText = heading || 'De Finale';

    useEffect(() => {
        const headingTimer = setTimeout(() => setHeadingReady(true), DELAY_MS);
        return () => clearTimeout(headingTimer);
    }, []);

    return (
        <div
            className="min-h-screen relative overflow-hidden flex flex-col"
            style={{
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                background: 'linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)', // Gold/orange ranking colors
            }}
        >
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

            {/* Heading */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <h1
                    className="text-white text-4xl leading-snug text-center mb-8 transition-opacity duration-1000"
                    style={{ opacity: headingReady ? 1 : 0, fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 600, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
                >
                    {headingText}
                </h1>

                <div
                    className="text-white/80 text-2xl text-center"
                    style={{
                        opacity: headingReady ? 1 : 0,
                        transitionDelay: '1000ms',
                        transitionProperty: 'opacity',
                        transitionDuration: '1000ms',
                        textShadow: '0 1px 6px rgba(0,0,0,0.4)',
                    }}
                >
                    Kijk naar het scherm!
                </div>
            </div>
        </div>
    );
};

export default PlayerView;
