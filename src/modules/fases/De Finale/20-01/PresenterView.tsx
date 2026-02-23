"use client";
import React, { useState } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { useHeading } from '@/lib/fases/hooks';

const PresenterView: React.FC<FaseCommonProps> = ({ faseKey }) => {
    const { data, loading, error } = useHeading(faseKey);
    const [redirected, setRedirected] = useState(false);

    // The Display will automatically redirect to the end.pinkmilk.eu/display.html when the video finishes.
    // The presenter can click the button below to redirect their own screen.
    const handleRedirect = () => {
        setRedirected(true);
        window.location.href = 'https://www.end.pinkmilk.eu';
    };

    return (
        <div className="w-full h-full flex flex-col text-white" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            <div className="text-xs uppercase tracking-wide opacity-70 mb-2">Presenter · De Finale</div>
            {loading && <div className="text-sm">Loading…</div>}
            {error && <div className="text-sm text-red-400">{error}</div>}
            {data && (
                <div className="flex-1 rounded border border-gray-700 p-4 bg-black/40 flex flex-col items-center justify-center">
                    <div className="text-2xl font-light mb-6 text-center">
                        {data.heading || 'Bedankt voor het spelen!'}
                    </div>

                    <p className="text-sm opacity-80 mb-6 max-w-sm text-center">
                        De display speelt nu de end.m4v trailer af. Zodra deze klaar is, springt de display automatisch over naar de eindscherm applicatie.
                    </p>

                    <button
                        onClick={handleRedirect}
                        disabled={redirected}
                        className={`px-8 py-4 rounded-xl text-xl font-bold shadow-lg transition-all ${redirected
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-500 hover:scale-105'
                            }`}
                    >
                        {redirected ? 'Redirecting...' : 'Ga naar Presenter Eindscherm'}
                    </button>

                    <div className="text-xs opacity-50 mt-8">Fase: {faseKey}</div>
                </div>
            )}
        </div>
    );
};

export default PresenterView;
