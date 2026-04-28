import React, { useCallback, useEffect, useRef } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { cn } from '../../lib/utils';
import { Zap, Keyboard } from 'lucide-react';

export interface CreatorCardProps {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  keyPrice: string;
  keysSold: number;
  className?: string;
  onBuy?: (creatorId: string) => void;
  onViewProfile?: (creatorId: string) => void;
}

export const CreatorCard: React.FC<CreatorCardProps> = ({
  id, name, handle, avatarUrl, keyPrice, keysSold, className, onBuy, onViewProfile,
}) => {
  const { status } = useWallet();
  const cardRef = useRef<HTMLDivElement>(null);
  const isConnected = status === 'connected';

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!cardRef.current?.contains(document.activeElement)) return;
    if (event.key === 'b' || event.key === 'B') {
      event.preventDefault();
      if (isConnected && onBuy) onBuy(id);
    }
    if (event.key === 'Enter' && onViewProfile) {
      event.preventDefault();
      onViewProfile(id);
    }
  }, [id, isConnected, onBuy, onViewProfile]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div ref={cardRef} className={cn(
      'group relative bg-white rounded-xl border border-slate-200 overflow-hidden',
      'hover:shadow-md hover:border-slate-300 transition-all duration-200',
      'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
      className
    )} tabIndex={0} role="article" aria-label={`Creator card for ${name}`}>
      <div className="p-4 cursor-pointer" onClick={() => onViewProfile?.(id)}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : <span className="text-lg font-semibold text-slate-400">{name.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{name}</h3>
            <p className="text-sm text-slate-500">@{handle}</p>
          </div>
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600"><span className="font-medium text-slate-900">{keyPrice}</span> XLM</span>
          <span className="text-slate-500">{keysSold.toLocaleString()} sold</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button onClick={() => onBuy?.(id)} disabled={!isConnected} className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
          isConnected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        )}>
          <Zap className="w-4 h-4" aria-hidden="true" />
          {isConnected ? 'Quick Buy' : 'Connect to Buy'}
        </button>
      </div>
      {isConnected && (
        <div className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200" aria-hidden="true">
          <Keyboard className="w-3 h-3" />
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-medium text-slate-600">B</kbd>
          <span>to quick buy</span>
        </div>
      )}
    </div>
  );
};

export default CreatorCard;