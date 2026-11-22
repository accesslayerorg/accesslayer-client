import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BatchBuyModal from '@/components/common/BatchBuyModal';

const mutateAsync = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
  useBatchBuyMutation: () => ({ mutateAsync }),
}));

vi.mock('@/utils/toast.util', () => ({
  default: {
    loading: vi.fn(),
    error: vi.fn(),
    transactionSuccess: vi.fn(),
  },
}));

const validAddress = (character: string) => `G${character.repeat(55)}`;

const renderModal = (liquidBalance = 3) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BatchBuyModal open onOpenChange={vi.fn()} liquidBalance={liquidBalance} />
    </QueryClientProvider>
  );
};

describe('BatchBuyModal (#832)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue({ success: true });
  });

  const addRecipient = (address: string) => {
    fireEvent.change(screen.getByRole('textbox', { name: /recipient address/i }), {
      target: { value: address },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  };

  it('allows a single recipient quantity equal to liquidBalance', () => {
    renderModal(3);
    addRecipient(validAddress('A'));

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });

    expect(screen.queryByTestId('batch-buy-validation-error')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('blocks submission when combined quantities exceed liquidBalance', () => {
    renderModal(3);
    addRecipient(validAddress('A'));
    addRecipient(validAddress('B'));

    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '2' } });

    expect(screen.getByTestId('batch-buy-validation-error')).toHaveTextContent(
      'Total quantity cannot exceed your liquid balance of 3 keys.'
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('re-evaluates the balance after removing a row', () => {
    renderModal(3);
    addRecipient(validAddress('A'));
    addRecipient(validAddress('B'));
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '2' } });

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1]);

    expect(screen.queryByTestId('batch-buy-validation-error')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('blocks submission when any recipient address is invalid', () => {
    renderModal(3);
    addRecipient('not-a-stellar-address');

    expect(screen.getByTestId('batch-buy-validation-error')).toHaveTextContent(
      'Enter valid Stellar addresses for every recipient.'
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('submits the valid recipient address and quantity pairs', async () => {
    renderModal(5);
    const firstAddress = validAddress('A');
    const secondAddress = validAddress('B');
    addRecipient(firstAddress);
    addRecipient(secondAddress);
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        orders: [
          { address: firstAddress, quantity: 2 },
          { address: secondAddress, quantity: 1 },
        ],
      })
    );
  });
});
