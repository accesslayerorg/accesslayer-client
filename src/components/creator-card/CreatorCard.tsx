import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Creator } from '@/types/creator';

interface CreatorCardProps {
  creator: Creator;
  onQuickBuy: (creatorId: string) => void;
}

export function CreatorCard({ creator, onQuickBuy }: CreatorCardProps): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(false);

  // Show hint on hover/focus, hide on leave/blur
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseEnter = () => setShowHint(true);
    const handleMouseLeave = () => setShowHint(false);
    const handleFocusIn = () => setShowHint(true);
    const handleFocusOut = (e: FocusEvent) => {
      if (!card.contains(e.relatedTarget as Node)) {
        setShowHint(false);
      }
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('focusin', handleFocusIn);
    card.addEventListener('focusout', handleFocusOut);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
      card.removeEventListener('focusin', handleFocusIn);
      card.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // 'B' key for quick buy when card is focused
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        onQuickBuy(creator.id);
      }
      // Enter/Space to open creator profile (standard behavior)
      if (e.key === 'Enter' || e.key === ' ') {
        // Let default link/button behavior handle this
      }
    },
    [creator.id, onQuickBuy]
  );

  const handleQuickBuyClick = useCallback(() => {
    onQuickBuy(creator.id);
  }, [creator.id, onQuickBuy]);

  return (
    <div
      ref={cardRef}
      className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Creator card for ${creator.name}`}
    >
      {/* Creator avatar and info */}
      <div className="flex items-center gap-3">
        <img
          src={creator.avatar}
          alt=""
          className="h-12 w-12 rounded-full object-cover"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {creator.name}
          </h3>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            @{creator.handle}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>{creator.subscriberCount.toLocaleString()} subs</span>
        <span>{creator.contentCount} posts</span>
      </div>

      {/* Quick buy button - always visible, keyboard accessible */}
      <button
        onClick={handleQuickBuyClick}
        className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 dark:focus:ring-offset-gray-800"
        aria-label={`Quick buy from ${creator.name}`}
      >
        Quick Buy
      </button>

      {/* Keyboard shortcut hint - desktop only, unobtrusive */}
      <div
        className={`absolute -top-2 right-3 hidden items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-500 shadow-sm transition-opacity dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 md:flex ${
          showHint ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <kbd className="rounded border border-gray-300 bg-gray-100 px-1 py-0.5 font-mono text-[9px] dark:border-gray-500 dark:bg-gray-600">
          B
        </kbd>
        <span>to buy</span>
      </div>

      {/* Screen-reader only shortcut documentation */}
      <span className="sr-only">
        Press B to quick buy from this creator
      </span>
    </div>
  );
}