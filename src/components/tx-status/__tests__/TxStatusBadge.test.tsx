import React from 'react';
import { render, screen } from '@testing-library/react';
import { TxStatusBadge } from '../TxStatusBadge';

describe('TxStatusBadge', () => {
  it.each([
    ['pending', 'Pending'],
    ['processing', 'Processing'],
    ['success', 'Success'],
    ['failed', 'Failed'],
  ] as const)('renders %s badge with correct label', (status, expectedLabel) => {
    render(<TxStatusBadge status={status} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('has accessible aria-label', () => {
    render(<TxStatusBadge status="success" />);
    expect(screen.getByLabelText('Transaction status: Success')).toBeInTheDocument();
  });

  it('renders all four status variants without error', () => {
    const { rerender } = render(<TxStatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();

    rerender(<TxStatusBadge status="processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();

    rerender(<TxStatusBadge status="success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();

    rerender(<TxStatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});