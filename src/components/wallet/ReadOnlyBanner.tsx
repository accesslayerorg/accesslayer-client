import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { cn } from '../../lib/utils';
import { Eye, Wallet } from 'lucide-react';

interface ReadOnlyBannerProps {
  className?: string;
}

export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({ className }) => {
  const { status, connect } = useWallet();

  // Only show when wallet is disconnected
  if (status !== 'disconnected') {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full bg-amber-50 border-b border-amber-200 px-4 py-3',
        className
      )}
      role="banner"
      aria-label="Read-only mode notification"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Eye className="w-4 h-4 text-amber-700" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-amber-900">
              You are browsing in read-only mode
            </span>
            <span className="text-xs text-amber-700">
              Connect your wallet to buy keys, unlock perks, and interact with creators.
            </span>
          </div>
        </div>

        <button
          onClick={connect}
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg',
            'text-sm font-medium text-white bg-amber-600 hover:bg-amber-700',
            'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
            'transition-colors duration-200'
          )}
        >
          <Wallet className="w-4 h-4" aria-hidden="true" />
          Connect Wallet
        </button>
      </div>
    </div>
  );
};

export default ReadOnlyBanner;