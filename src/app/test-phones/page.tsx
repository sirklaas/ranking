'use client';
import React from 'react';

export default function TestPhonesPage() {
    return (
        <div className="min-h-screen bg-gray-900 p-8 flex flex-col items-center">
            <h1 className="text-white text-3xl mb-8 font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                6 Test Phones
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                        <h2 className="text-gray-400 text-sm mb-2 uppercase tracking-widest">Phone {i}</h2>
                        <div
                            className="bg-black rounded-[3rem] p-2 shadow-2xl overflow-hidden border-4 border-gray-700 relative"
                            style={{ width: '375px', height: '812px', transform: 'scale(0.8)', transformOrigin: 'top center' }}
                        >
                            {/* Notch simulation */}
                            <div className="absolute top-0 inset-x-0 h-6 bg-black rounded-b-xl w-40 mx-auto z-10 pointer-events-none"></div>

                            <iframe
                                src={`/player?testName=TestSpeler${i}&testTeam=${i}`}
                                className="w-full h-full rounded-[2.5rem] bg-white"
                                style={{ border: 'none' }}
                                title={`Phone ${i}`}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
