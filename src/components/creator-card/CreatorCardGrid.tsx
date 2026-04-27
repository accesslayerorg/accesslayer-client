import React from 'react';
import { Creator } from '@/types/creator';
import { CreatorCard } from './CreatorCard';

interface CreatorCardGridProps {
  creators: Creator[];
  onQuickBuy: (creatorId: string) => void;
}

export function CreatorCardGrid({ creators, onQuickBuy }: CreatorCardGridProps): JSX.Element {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="list"
      aria-label="Creator list"
    >
      {creators.map((creator) => (
        <CreatorCard key={creator.id} creator={creator} onQuickBuy={onQuickBuy} />
      ))}
    </div>
  );
}