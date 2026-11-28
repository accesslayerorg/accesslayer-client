import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/web3/wagmiConfig';
import { useWalletConnectionLogger } from '@/hooks/useWalletConnectionLogger';
import { useCrossTabSync } from '@/hooks/useCrossTabSync';
import { queryClient } from './web3Utils';
import { XlmFiatRateProvider } from '@/components/common/XlmFiatRateProvider';

interface Web3ProviderProps {
	children: ReactNode;
}

/**
 * Mounted once at the Web3 provider boundary so wallet connections are
 * logged exactly once app-wide, regardless of which UI (connect button,
 * reconnect banner, etc.) initiated the connection.
 */
function WalletConnectionLogger() {
	useWalletConnectionLogger();
	return null;
}

function CrossTabSync() {
  useCrossTabSync();
  return null;
}

export default function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletConnectionLogger />
        <CrossTabSync />
        <XlmFiatRateProvider>{children}</XlmFiatRateProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
