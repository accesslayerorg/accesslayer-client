import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TradeDialog from '../TradeDialog';
import { useAllowanceStore } from '@/hooks/useAllowanceStore';
import { useContractPausedStore } from '@/hooks/useContractPausedStore';
import { useHoldingCapStore } from '@/hooks/useHoldingCapStore';

describe('TradeDialog Features Integration (#955, #953, #961)', () => {
	const defaultWallet = '0x1234567890123456789012345678901234567890';
	const creatorId = 'creator-test-id';

	beforeEach(() => {
		useAllowanceStore.setState({
			status: 'idle',
			approvedAddresses: new Set<string>(),
			errorMessage: null,
		});

		useContractPausedStore.setState({
			status: 'inactive',
			lastCheckedAt: null,
			isChecking: false,
			_intervalId: null,
		});

		useHoldingCapStore.setState({
			caps: {},
		});
	});

	// ── #955: Allowance Approval Flow ─────────────────────────────────────
	describe('#955 Allowance Approval Flow', () => {
		it('shows approval step when staking and allowance is insufficient', async () => {
			useAllowanceStore.setState({ status: 'insufficient' });

			render(
				<TradeDialog
					open={true}
					side="stake"
					creatorName="Alice"
					availableHoldings={10}
					walletAddress={defaultWallet}
					onOpenChange={vi.fn()}
					onConfirm={vi.fn()}
				/>
			);

			await waitFor(() => {
				expect(screen.getByText('Approval required')).toBeInTheDocument();
				expect(screen.getByTestId('allowance-approve-btn')).toBeInTheDocument();
			});

			const confirmBtn = screen.getByTestId('trade-dialog-confirm');
			expect(confirmBtn).toBeDisabled();
		});

		it('bypasses approval step when allowance is already sufficient', () => {
			useAllowanceStore.setState({
				status: 'sufficient',
				approvedAddresses: new Set([defaultWallet.toLowerCase()]),
			});

			render(
				<TradeDialog
					open={true}
					side="stake"
					creatorName="Alice"
					availableHoldings={10}
					walletAddress={defaultWallet}
					onOpenChange={vi.fn()}
					onConfirm={vi.fn()}
				/>
			);

			expect(screen.queryByText('Approval required')).not.toBeInTheDocument();
			expect(screen.queryByTestId('allowance-approve-btn')).not.toBeInTheDocument();

			const confirmBtn = screen.getByTestId('trade-dialog-confirm');
			expect(confirmBtn).not.toBeDisabled();
		});

		it('enables confirm button after successful approval submission', async () => {
			useAllowanceStore.setState({ status: 'insufficient' });

			render(
				<TradeDialog
					open={true}
					side="stake"
					creatorName="Alice"
					availableHoldings={10}
					walletAddress={defaultWallet}
					onOpenChange={vi.fn()}
					onConfirm={vi.fn()}
				/>
			);

			const approveBtn = await screen.findByTestId('allowance-approve-btn');
			fireEvent.click(approveBtn);

			await waitFor(() => {
				expect(useAllowanceStore.getState().status).toBe('approved');
			});

			const confirmBtn = screen.getByTestId('trade-dialog-confirm');
			expect(confirmBtn).not.toBeDisabled();
		});
	});

	// ── #953: Contract Paused Behavior ────────────────────────────────────
	describe('#953 Contract Paused Behavior', () => {
		it('displays paused alert and disables confirm button when contract is paused', () => {
			useContractPausedStore.setState({ status: 'active' });

			render(
				<TradeDialog
					open={true}
					side="buy"
					creatorName="Alice"
					availableHoldings={10}
					walletAddress={defaultWallet}
					onOpenChange={vi.fn()}
					onConfirm={vi.fn()}
				/>
			);

			expect(screen.getByTestId('trade-dialog-paused-alert')).toBeInTheDocument();
			expect(
				screen.getByText(/Trading suspended — contract paused/i)
			).toBeInTheDocument();

			const confirmBtn = screen.getByTestId('trade-dialog-confirm');
			expect(confirmBtn).toBeDisabled();
			expect(confirmBtn).toHaveAttribute(
				'title',
				'Trading suspended: contract is paused'
			);
			expect(confirmBtn).toHaveTextContent('Contract paused');
		});
	});

	// ── #961: Maximum Holding Cap Warning & Limiting ──────────────────────
	describe('#961 Maximum Holding Cap Warning and Limiting', () => {
		it('disables buy input and confirm button when wallet is at 100% cap', () => {
			useHoldingCapStore.setState({
				caps: {
					[creatorId]: {
						creatorId,
						currentHolding: 50,
						maxCap: 50,
						isLoading: false,
						error: null,
					},
				},
			});

			render(
				<TradeDialog
					open={true}
					side="buy"
					creatorName="Alice"
					creatorId={creatorId}
					availableHoldings={10}
					walletAddress={defaultWallet}
					onOpenChange={vi.fn()}
					onConfirm={vi.fn()}
				/>
			);

			expect(
				screen.getByText(/Maximum holding cap reached \(50 keys\)/i)
			).toBeInTheDocument();

			const amountInput = screen.getByTestId('trade-dialog-amount');
			expect(amountInput).toBeDisabled();

			const confirmBtn = screen.getByTestId('trade-dialog-confirm');
			expect(confirmBtn).toBeDisabled();
			expect(confirmBtn).toHaveTextContent('Cap reached');
		});

		it('shows remaining capacity and automatically limits buy quantity to remaining capacity', () => {
			// Holds 45 of 50 -> remaining capacity is 5
			useHoldingCapStore.setState({
				caps: {
					[creatorId]: {
						creatorId,
						currentHolding: 45,
						maxCap: 50,
						isLoading: false,
						error: null,
					},
				},
			});

			render(
				<TradeDialog
					open={true}
					side="buy"
					creatorName="Alice"
					creatorId={creatorId}
					availableHoldings={10}
					walletAddress={defaultWallet}
					onOpenChange={vi.fn()}
					onConfirm={vi.fn()}
				/>
			);

			expect(screen.getByText(/Max you can buy:/i)).toBeInTheDocument();
			expect(screen.getByText('5 keys')).toBeInTheDocument();

			const amountInput = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;
			fireEvent.change(amountInput, { target: { value: '6' } });
			fireEvent.blur(amountInput);

			expect(amountInput.value).toBe('5');
			expect(screen.getByTestId('buy-qty-adjustment-note')).toHaveTextContent(
				'Quantity adjusted to the maximum of 5.'
			);
		});

		it('updates holding cap display after successful buy', async () => {
			useHoldingCapStore.setState({
				caps: {
					[creatorId]: {
						creatorId,
						currentHolding: 10,
						maxCap: 50,
						isLoading: false,
						error: null,
					},
				},
			});

			const onConfirm = vi.fn().mockResolvedValue(undefined);

			render(
				<TradeDialog
					open={true}
					side="buy"
					creatorName="Alice"
					creatorId={creatorId}
					availableHoldings={10}
					walletAddress={defaultWallet}
					onOpenChange={vi.fn()}
					onConfirm={onConfirm}
				/>
			);

			const amountInput = screen.getByTestId('trade-dialog-amount');
			fireEvent.change(amountInput, { target: { value: '5' } });

			const confirmBtn = screen.getByTestId('trade-dialog-confirm');
			fireEvent.click(confirmBtn);

			await waitFor(() => {
				expect(onConfirm).toHaveBeenCalledWith(5);
			});

			// incrementHolding should have updated the store from 10 to 15
			expect(useHoldingCapStore.getState().caps[creatorId].currentHolding).toBe(15);
		});
	});
});
