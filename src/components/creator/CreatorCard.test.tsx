import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreatorCard } from './CreatorCard';
import { useWallet } from '../../hooks/useWallet';

vi.mock('../../hooks/useWallet', () => ({ useWallet: vi.fn() }));

describe('CreatorCard', () => {
  const mockOnBuy = vi.fn(), mockOnViewProfile = vi.fn();
  const props = { id: 'c1', name: 'Alice', handle: 'alice', keyPrice: '50', keysSold: 100, onBuy: mockOnBuy, onViewProfile: mockOnViewProfile };
  beforeEach(() => vi.clearAllMocks());

  it('renders creator info', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'connected' } as any);
    render(<CreatorCard {...props} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });

  it('shows hint when connected', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'connected' } as any);
    render(<CreatorCard {...props} />);
    expect(screen.getByText(/to quick buy/i)).toBeInTheDocument();
  });

  it('hides hint when disconnected', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'disconnected' } as any);
    render(<CreatorCard {...props} />);
    expect(screen.queryByText(/to quick buy/i)).not.toBeInTheDocument();
  });

  it('quick buys on B key when focused', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'connected' } as any);
    render(<CreatorCard {...props} />);
    screen.getByRole('article').focus();
    fireEvent.keyDown(document, { key: 'B' });
    expect(mockOnBuy).toHaveBeenCalledWith('c1');
  });

  it('does not quick buy when not focused', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'connected' } as any);
    render(<CreatorCard {...props} />);
    fireEvent.keyDown(document, { key: 'B' });
    expect(mockOnBuy).not.toHaveBeenCalled();
  });

  it('does not quick buy when disconnected', () => {
    vi.mocked(useWallet).mockReturnValue({ status: 'disconnected' } as any);
    render(<CreatorCard {...props} />);
    screen.getByRole('article').focus();
    fireEvent.keyDown(document, { key: 'B' });
    expect(mockOnBuy).not.toHaveBeenCalled();
  });
});