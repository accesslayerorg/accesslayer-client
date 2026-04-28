import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionStatusBadge } from './TransactionStatusBadge';

describe('TransactionStatusBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders all statuses', () => {
    const { rerender } = render(<TransactionStatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    rerender(<TransactionStatusBadge status="success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
    rerender(<TransactionStatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    rerender(<TransactionStatusBadge status="processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('opens and closes tooltip', () => {
    render(<TransactionStatusBadge status="pending" />);
    fireEvent.click(screen.getByRole('button', { name: /Transaction status legend/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close legend/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<TransactionStatusBadge status="pending" />);
    fireEvent.click(screen.getByRole('button', { name: /Transaction status legend/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on click outside', () => {
    render(<div><TransactionStatusBadge status="pending" /><div data-testid="outside">Outside</div></div>);
    fireEvent.click(screen.getByRole('button', { name: /Transaction status legend/i }));
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides legend when showLegend is false', () => {
    render(<TransactionStatusBadge status="pending" showLegend={false} />);
    expect(screen.queryByRole('button', { name: /Transaction status legend/i })).not.toBeInTheDocument();
  });

  it('focuses close button when opened', async () => {
    render(<TransactionStatusBadge status="pending" />);
    fireEvent.click(screen.getByRole('button', { name: /Transaction status legend/i }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /Close legend/i })));
  });

  it('has correct ARIA attributes', () => {
    render(<TransactionStatusBadge status="pending" />);
    const trigger = screen.getByRole('button', { name: /Transaction status legend/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'tx-status-legend');
  });
});