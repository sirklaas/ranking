"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import Top10Display from '@/components/top10/Top10Display';

const DisplayView: React.FC<FaseCommonProps> = ({ moduleStateJson, heading, mediaUrl }) => {
  if (!moduleStateJson) return null;

  const state: Top10State = JSON.parse(moduleStateJson);
  return <Top10Display state={state} heading={heading} mediaUrl={mediaUrl} />;
};

export default DisplayView;
