import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { cn } from '../../lib/utils';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'disconnecting' | 'error';

interface WalletStatusPillProps {
  className?: string;
}

const statusConfig: Record<WalletStatus, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  disconnected: {
    label: 'Disconnected',
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
  connecting: {
    label: 'Connecting...',
    dotColor: 'bg-yellow-400',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
  },
  connected: {
    label: 'Connected',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  reconnecting: {
    label: 'Reconnecting...',
    dotColor: 'bg-amber-400',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  disconnecting: {
    label: 'Disconnecting...',
    dotColor: 'bg-orange-400',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
  },
  error: {
    label: 'Connection Error',
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
};

export const WalletStatusPill: React.FC<WalletStatusPillProps> = ({ className }) => {
  const { status } = useWallet();
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300',
        config.bgColor,
        config.textColor,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Wallet status: ${config.label}`}
    >
      <span
        className={cn(
          'relative flex h-2.5 w-2.5',
          (status === 'connecting' || status === 'reconnecting' || status === 'disconnecting') && 'animate-pulse'
        )}
      >
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            config.dotColor,
            (status === 'connecting' || status === 'reconnecting') && 'animate-ping'
          )}
        />
        <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', config.dotColor)} />
      </span>
      <span>{config.label}</span>
    </div>
  );
};

export default WalletStatusPill;