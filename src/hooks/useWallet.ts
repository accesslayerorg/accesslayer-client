import { useState, useCallback, useEffect, useRef } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  ISupportedWallet,
  FREIGHTER_ID,
  FreighterModule,
  xBullModule,
  AlbedoModule,
} from '@creit.tech/stellar-wallets-kit';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'disconnecting' | 'error';

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  walletId: string | null;
  error: Error | null;
  kit: StellarWalletsKit | null;
}

export interface WalletActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
}

let kitInstance: StellarWalletsKit | null = null;

function getKitInstance(): StellarWalletsKit {
  if (!kitInstance) {
    kitInstance = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [new FreighterModule(), new xBullModule(), new AlbedoModule()],
    });
  }
  return kitInstance;
}

export function useWallet(): WalletState & WalletActions {
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [kit, setKit] = useState<StellarWalletsKit | null>(null);
  
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize kit on mount
  useEffect(() => {
    const instance = getKitInstance();
    setKit(instance);
    
    // Check for existing session
    const checkExistingSession = async () => {
      try {
        const storedWalletId = localStorage.getItem('walletId');
        const storedAddress = localStorage.getItem('walletAddress');
        
        if (storedWalletId && storedAddress) {
          setStatus('reconnecting');
          instance.setWallet(storedWalletId);
          
          // Verify connection is still valid
          try {
            const { address: currentAddress } = await instance.getAddress();
            if (currentAddress === storedAddress) {
              setAddress(currentAddress);
              setWalletId(storedWalletId);
              setStatus('connected');
              reconnectAttempts.current = 0;
            } else {
              // Address mismatch, clear session
              localStorage.removeItem('walletId');
              localStorage.removeItem('walletAddress');
              setStatus('disconnected');
            }
          } catch {
            // Connection lost, attempt reconnect
            if (reconnectAttempts.current < maxReconnectAttempts) {
              reconnectAttempts.current += 1;
              reconnectTimeoutRef.current = setTimeout(() => {
                checkExistingSession();
              }, 2000 * reconnectAttempts.current);
            } else {
              setStatus('error');
              setError(new Error('Failed to reconnect wallet after multiple attempts'));
              localStorage.removeItem('walletId');
              localStorage.removeItem('walletAddress');
            }
          }
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err : new Error('Unknown error during session check'));
      }
    };

    checkExistingSession();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    if (!kit) return;
    
    setStatus('connecting');
    setError(null);
    
    try {
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          kit.setWallet(option.id);
          
          try {
            const { address: walletAddress } = await kit.getAddress();
            setAddress(walletAddress);
            setWalletId(option.id);
            setStatus('connected');
            reconnectAttempts.current = 0;
            
            // Persist session
            localStorage.setItem('walletId', option.id);
            localStorage.setItem('walletAddress', walletAddress);
          } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err : new Error('Failed to get wallet address'));
          }
        },
        onClosed: () => {
          // Only reset to disconnected if it weren't already connected
          setStatus((current) => (current === 'connecting' ? 'disconnected' : current));
        },
      });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err : new Error('Failed to open wallet modal'));
    }
  }, [kit]);

  const disconnect = useCallback(async () => {
    if (!kit) return;
    
    setStatus('disconnecting');
    
    try {
      // Clear persisted session
      localStorage.removeItem('walletId');
      localStorage.removeItem('walletAddress');
      
      // Reset kit state
      kit.disconnect();
      
      setAddress(null);
      setWalletId(null);
      setError(null);
      reconnectAttempts.current = 0;
      setStatus('disconnected');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err : new Error('Failed to disconnect wallet'));
    }
  }, [kit]);

  const reconnect = useCallback(async () => {
    if (!kit || !walletId) return;
    
    setStatus('reconnecting');
    setError(null);
    
    try {
      kit.setWallet(walletId);
      const { address: walletAddress } = await kit.getAddress();
      setAddress(walletAddress);
      setStatus('connected');
      reconnectAttempts.current = 0;
      
      localStorage.setItem('walletAddress', walletAddress);
    } catch (err) {
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setStatus('error');
        setError(err instanceof Error ? err : new Error('Reconnection failed after maximum attempts'));
        localStorage.removeItem('walletId');
        localStorage.removeItem('walletAddress');
      } else {
        setStatus('disconnected');
      }
    }
  }, [kit, walletId]);

  // Listen for wallet extension disconnect events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'connected') {
        // Verify connection is still active when tab becomes visible
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, reconnect]);

  return {
    status,
    address,
    walletId,
    error,
    kit,
    connect,
    disconnect,
    reconnect,
  };
}