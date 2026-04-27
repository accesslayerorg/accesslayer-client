import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TxStatusLegend } from '../TxStatusLegend';

describe('TxStatusLegend', () => {
  it('renders trigger button', () => {
    render(<TxStatusLegend />);
    expect(screen.getByRole('button', { name: /status legend/i })).toBeInTheDocument();
  });

  it('opens tooltip on click', async () => {
    render(<TxStatusLegend />);
    const trigger = screen.getByRole('button', { name: /status legend/i });

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /status explanations/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Transaction submitted, awaiting confirmation')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('closes tooltip on Escape key', async () => {
    render(<TxStatusLegend />);
    const trigger = screen.getByRole('button', { name: /status legend/i });

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes tooltip on close button click', async () => {
    render(<TxStatusLegend />);
    const trigger = screen.getByRole('button', { name: /status legend/i });

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /close legend/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes tooltip on click outside', async () => {
    render(
      <div>
        <TxStatusLegend />
        <div data-testid="outside">Outside</div>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /status legend/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('toggles tooltip on repeated clicks', async () => {
    render(<TxStatusLegend />);
    const trigger = screen.getByRole('button', { name: /status legend/i });

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('has correct aria-expanded state', () => {
    render(<TxStatusLegend />);
    const trigger = screen.getByRole('button', { name: /status legend/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('has aria-controls pointing to tooltip', () => {
    render(<TxStatusLegend />);
    const trigger = screen.getByRole('button', { name: /status legend/i });

    expect(trigger).toHaveAttribute('aria-controls', 'tx-status-legend');
  });

  it('returns focus to trigger on close', async () => {
    render(<TxStatusLegend />);
    const trigger = screen.getByRole('button', { name: /status legend/i });

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(document.activeElement).toBe(trigger);
  });
});