import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { WalletStatusPill } from './WalletStatusPill';
import { cn } from '../../lib/utils';

interface WalletButtonProps {
  className?: string;
  showStatusPill?: boolean;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ 
  className,
  showStatusPill = true 
}) => {
  const { status, address, connect, disconnect } = useWallet();

  const isConnected = status === 'connected';
  const isLoading = status === 'connecting' || status === 'reconnecting' || status === 'disconnecting';

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showStatusPill && <WalletStatusPill />}
      
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          isConnected
            ? 'bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
          isLoading && 'opacity-70 cursor-not-allowed',
          'disabled:opacity-50'
        )}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {status === 'connecting' && 'Connecting...'}
            {status === 'reconnecting' && 'Reconnecting...'}
            {status === 'disconnecting' && 'Disconnecting...'}
          </span>
        ) : isConnected ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            {formatAddress(address)}
          </span>
        ) : (
          'Connect Wallet'
        )}
      </button>
    </div>
  );
};

export default WalletButton;