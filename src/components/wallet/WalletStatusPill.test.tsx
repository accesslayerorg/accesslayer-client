import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletStatusPill } from './WalletStatusPill';
import { useWallet } from '../../hooks/useWallet';

vi.mock('../../hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

describe('WalletStatusPill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders disconnected status', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'disconnected' } as any);
    render(<WalletStatusPill />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('renders connecting status', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'connecting' } as any);
    render(<WalletStatusPill />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('renders connected status', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'connected' } as any);
    render(<WalletStatusPill />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders reconnecting status', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'reconnecting' } as any);
    render(<WalletStatusPill />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });

  it('renders disconnecting status', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'disconnecting' } as any);
    render(<WalletStatusPill />);
    expect(screen.getByText('Disconnecting...')).toBeInTheDocument();
  });

  it('renders error status', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'error' } as any);
    render(<WalletStatusPill />);
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });
});