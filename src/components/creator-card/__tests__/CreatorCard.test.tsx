import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatorCard } from '../CreatorCard';

const mockCreator = {
  id: 'creator-123',
  name: 'Alice Creator',
  handle: 'alice',
  avatar: 'https://example.com/avatar.jpg',
  subscriberCount: 15420,
  contentCount: 89,
};

const mockOnQuickBuy = jest.fn();

describe('CreatorCard', () => {
  beforeEach(() => {
    mockOnQuickBuy.mockClear();
  });

  it('renders creator info', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    expect(screen.getByText('Alice Creator')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('15,420 subs')).toBeInTheDocument();
    expect(screen.getByText('89 posts')).toBeInTheDocument();
  });

  it('calls onQuickBuy when Quick Buy button clicked', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    fireEvent.click(screen.getByRole('button', { name: /quick buy/i }));
    expect(mockOnQuickBuy).toHaveBeenCalledWith('creator-123');
  });

  it('calls onQuickBuy when B key pressed while card focused', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    const card = screen.getByRole('article');
    card.focus();

    fireEvent.keyDown(card, { key: 'b' });
    expect(mockOnQuickBuy).toHaveBeenCalledWith('creator-123');
  });

  it('calls onQuickBuy when uppercase B key pressed', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    const card = screen.getByRole('article');
    card.focus();

    fireEvent.keyDown(card, { key: 'B' });
    expect(mockOnQuickBuy).toHaveBeenCalledWith('creator-123');
  });

  it('does not call onQuickBuy for other keys', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    const card = screen.getByRole('article');
    card.focus();

    fireEvent.keyDown(card, { key: 'a' });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(mockOnQuickBuy).not.toHaveBeenCalled();
  });

  it('has screen-reader shortcut documentation', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    expect(screen.getByText('Press B to quick buy from this creator')).toHaveClass('sr-only');
  });

  it('has correct ARIA label', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      'Creator card for Alice Creator'
    );
  });

  it('Quick Buy button has accessible name', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    expect(screen.getByRole('button', { name: 'Quick buy from Alice Creator' })).toBeInTheDocument();
  });

  it('keyboard hint is hidden by default on desktop', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    const hint = screen.getByText('to buy').parentElement;
    expect(hint).toHaveClass('opacity-0');
  });

  it('shows keyboard hint on hover/focus', async () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    const card = screen.getByRole('article');
    fireEvent.mouseEnter(card);

    const hint = screen.getByText('to buy').parentElement;
    await waitFor(() => {
      expect(hint).toHaveClass('opacity-100');
    });
  });

  it('hides keyboard hint on mouse leave', async () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    const card = screen.getByRole('article');
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);

    const hint = screen.getByText('to buy').parentElement;
    await waitFor(() => {
      expect(hint).toHaveClass('opacity-0');
    });
  });

  it('keyboard hint is aria-hidden', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    const hint = screen.getByText('to buy').parentElement;
    expect(hint).toHaveAttribute('aria-hidden', 'true');
  });

  it('keyboard hint uses kbd element for B key', () => {
    render(<CreatorCard creator={mockCreator} onQuickBuy={mockOnQuickBuy} />);

    const kbd = screen.getByText('B');
    expect(kbd.tagName.toLowerCase()).toBe('kbd');
  });
});