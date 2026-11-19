import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Keypair } from '@stellar/stellar-sdk';
import TreasuryPanel from '../TreasuryPanel';

const mocks = vi.hoisted(() => ({
	balance: vi.fn(),
	distributions: vi.fn(),
	fees: vi.fn(),
	mutate: vi.fn(),
}));

vi.mock('@/hooks/useTreasuryAdmin', () => ({
	useTreasuryBalance: mocks.balance,
	useTreasuryDistributions: mocks.distributions,
	useTreasuryFeeEvents: mocks.fees,
	useDistributeTreasuryFees: () => ({ mutate: mocks.mutate, isPending: false }),
}));

const ADMIN = Keypair.random().publicKey();
const RECIPIENT = Keypair.random().publicKey();

function setSuccessfulQueries() {
	mocks.balance.mockReturnValue({
		data: { accumulatedFeesStroops: '10000000', updatedAt: '2026-09-30T10:00:00Z' },
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	});
	mocks.distributions.mockReturnValue({
		data: [{
			id: 'dist-1', epoch: 2, totalDistributedStroops: '2500000',
			recipients: [{ address: RECIPIENT, amountStroops: '2500000' }],
			distributedAt: '2026-09-29T10:00:00Z', transactionHash: 'hash-1',
		}],
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	});
	mocks.fees.mockReturnValue({
		data: [{
			id: 'fee-1', creatorAddress: RECIPIENT, traderAddress: ADMIN,
			amountStroops: '250000', collectedAt: '2026-09-30T09:00:00Z', transactionHash: 'fee-hash',
		}],
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	});
}

describe('TreasuryPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setSuccessfulQueries();
	});

	it('renders the accumulated balance, epoch history, and recent fee events', () => {
		render(<TreasuryPanel adminAddress={ADMIN} />);

		expect(screen.getByTestId('treasury-balance')).toHaveTextContent('1 XLM');
		expect(screen.getByTestId('treasury-distribution-row')).toHaveTextContent('2');
		expect(screen.getByTestId('treasury-distribution-row')).toHaveTextContent('0.25 XLM');
		expect(screen.getByTestId('treasury-fee-row')).toHaveTextContent('0.025 XLM');
	});

	it('requires exact full-balance allocations and submits the admin distribution payload', () => {
		render(<TreasuryPanel adminAddress={ADMIN} />);
		fireEvent.click(screen.getByTestId('treasury-distribute-now'));

		fireEvent.change(screen.getByLabelText('Recipient 1 address'), {
			target: { value: RECIPIENT },
		});
		fireEvent.change(screen.getByLabelText('Amount (XLM)'), {
			target: { value: '0.9' },
		});
		const submit = screen.getByTestId('treasury-distribution-submit');
		expect(submit).toBeDisabled();
		expect(screen.getByTestId('treasury-distribution-validation')).toHaveTextContent('must equal');

		fireEvent.change(screen.getByLabelText('Amount (XLM)'), {
			target: { value: '1' },
		});
		expect(submit).toBeEnabled();
		fireEvent.click(submit);

		expect(mocks.mutate).toHaveBeenCalledWith(
			{
				admin: ADMIN,
				totalAmountStroops: '10000000',
				recipients: [{ address: RECIPIENT, amountStroops: '10000000' }],
			},
			expect.objectContaining({ onSuccess: expect.any(Function) })
		);
	});
});
