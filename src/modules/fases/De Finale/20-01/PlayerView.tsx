"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import TrailerTitleCard from '@/components/common/TrailerTitleCard';

const PlayerView: React.FC<FaseCommonProps> = () => {
    return <TrailerTitleCard title="De Finale" fase="20/01" />;
};

export default PlayerView;
