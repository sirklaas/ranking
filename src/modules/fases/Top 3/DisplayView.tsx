"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import Top3Display from '@/components/top3/Top3Display';

const DisplayView: React.FC<FaseCommonProps> = ({ moduleStateJson, heading, mediaUrl, faseKey }) => {
  if (!moduleStateJson) return null;

  const state: Top3State = JSON.parse(moduleStateJson);
  return <Top3Display state={state} heading={heading} mediaUrl={mediaUrl} faseKey={faseKey} />;
};

export default DisplayView;
