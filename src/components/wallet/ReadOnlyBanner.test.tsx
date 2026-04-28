import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { useWallet } from '../../hooks/useWallet';

vi.mock('../../hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

describe('ReadOnlyBanner', () => {
  const mockConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when wallet is disconnected', () => {
    vi.mocked(useWallet).mockReturnValue({
      status: 'disconnected',
      connect: mockConnect,
    } as any);

    render(<ReadOnlyBanner />);
    expect(screen.getByText('You are browsing in read-only mode')).toBeInTheDocument();
    expect(screen.getByText(/Connect your wallet to buy keys/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeInTheDocument();
  });

  it('does not render when wallet is connected', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'connected', connect: mockConnect } as any);
    const { container } = render(<ReadOnlyBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when wallet is connecting', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'connecting', connect: mockConnect } as any);
    const { container } = render(<ReadOnlyBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when wallet is reconnecting', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'reconnecting', connect: mockConnect } as any);
    const { container } = render(<ReadOnlyBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when wallet is disconnecting', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'disconnecting', connect: mockConnect } as any);
    const { container } = render(<ReadOnlyBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when wallet has error', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'error', connect: mockConnect } as any);
    const { container } = render(<ReadOnlyBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('calls connect when Connect Wallet button is clicked', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'disconnected', connect: mockConnect } as any);
    render(<ReadOnlyBanner />);
    fireEvent.click(screen.getByRole('button', { name: /Connect Wallet/i }));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('has correct ARIA attributes', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'disconnected', connect: mockConnect } as any);
    render(<ReadOnlyBanner />);
    expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Read-only mode notification');
  });
});