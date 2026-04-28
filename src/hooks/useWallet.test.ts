import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from './useWallet';

const mockOpenModal = vi.fn();
const mockGetAddress = vi.fn();
const mockSetWallet = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('@creit.tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: vi.fn().mockImplementation(() => ({
    openModal: mockOpenModal,
    getAddress: mockGetAddress,
    setWallet: mockSetWallet,
    disconnect: mockDisconnect,
  })),
  WalletNetwork: { TESTNET: 'TESTNET' },
  FREIGHTER_ID: 'freighter',
  FreighterModule: vi.fn(),
  xBullModule: vi.fn(),
  AlbedoModule: vi.fn(),
}));

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with disconnected status', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.address).toBeNull();
  });

  it('transitions to connected after successful connection', async () => {
    mockOpenModal.mockImplementation(({ onWalletSelected }) => {
      onWalletSelected({ id: 'freighter' });
    });
    mockGetAddress.mockResolvedValue({ address: 'GABC123...' });

    const { result } = renderHook(() => useWallet());
    
    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.address).toBe('GABC123...');
    expect(localStorage.getItem('walletId')).toBe('freighter');
  });

  it('transitions to disconnected after disconnect', async () => {
    mockOpenModal.mockImplementation(({ onWalletSelected }) => {
      onWalletSelected({ id: 'freighter' });
    });
    mockGetAddress.mockResolvedValue({ address: 'GABC123...' });

    const { result } = renderHook(() => useWallet());
    
    await act(async () => {
      await result.current.connect();
    });
    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.status).toBe('disconnected');
    expect(localStorage.getItem('walletId')).toBeNull();
  });
});