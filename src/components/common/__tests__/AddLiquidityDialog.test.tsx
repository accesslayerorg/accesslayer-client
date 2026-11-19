import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { LpPosition } from '@/services/lpPositions.service';

const hooks = vi.hoisted(() => ({
	useSpendableXlmBalance: vi.fn(),
	useLpPool: vi.fn(),
}));

vi.mock('@/hooks/useLpPositions', () => ({
	useSpendableXlmBalance: hooks.useSpendableXlmBalance,
	useLpPool: hooks.useLpPool,
}));

import AddLiquidityDialog from '../AddLiquidityDialog';

const XLM = 10_000_000n;
const WALLET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const position: LpPosition = {
	lpId: '1',
	keyId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
	keyName: 'Alpha Key',
	creatorId: 'alpha',
	contributionStroops: 100n * XLM,
	shareBps: 5000,
	poolTotalLiquidityStroops: 200n * XLM,
	pendingRewardsStroops: 0n,
	claimedRewardsStroops: 0n,
	lock: { kind: 'none' },
};

function renderDialog(
	props: Partial<React.ComponentProps<typeof AddLiquidityDialog>> = {}
) {
	const onSubmit = vi.fn();
	render(
		<AddLiquidityDialog
			position={position}
			wallet={WALLET}
			onClose={vi.fn()}
			onSubmit={onSubmit}
			isSubmitting={false}
			{...props}
		/>
	);
	return { onSubmit };
}

const amountInput = () => screen.getByLabelText('Amount (XLM)');
const submit = () => screen.getByTestId('add-liquidity-submit');

describe('AddLiquidityDialog (#1030)', () => {
	beforeEach(() => {
		hooks.useSpendableXlmBalance.mockReturnValue({
			data: 50n * XLM,
			isLoading: false,
			isError: false,
		});
		hooks.useLpPool.mockReturnValue({
			data: {
				keyId: position.keyId,
				totalLiquidityStroops: 150n * XLM,
				aprBps: 1250,
			},
			isLoading: false,
		});
	});

	it('shows the pool context, available balance, and APR estimate', () => {
		renderDialog();
		expect(screen.getByRole('dialog')).toHaveTextContent('Alpha Key');
		expect(screen.getByTestId('add-liquidity-available')).toHaveTextContent(
			'50.0000000 XLM'
		);
		expect(screen.getByTestId('add-liquidity-apr')).toHaveTextContent(
			'12.5%'
		);
		expect(hooks.useSpendableXlmBalance).toHaveBeenCalledWith(WALLET, true);
		expect(hooks.useLpPool).toHaveBeenCalledWith(position.keyId, true);
	});

	it('submits a valid amount and previews the share it would receive', () => {
		const { onSubmit } = renderDialog();
		fireEvent.change(amountInput(), { target: { value: '50' } });
		// 50 / (150 + 50) with the contract's add_liquidity formula
		expect(
			screen.getByTestId('add-liquidity-projected-share')
		).toHaveTextContent('25.00%');
		expect(submit()).toBeEnabled();
		fireEvent.click(submit());
		expect(onSubmit).toHaveBeenCalledWith('50');
	});

	it.each([
		['0', 'Amount must be greater than zero.'],
		['abc', 'Enter a valid number, e.g. 25 or 12.5.'],
		['1.12345678', 'XLM supports at most 7 decimal places.'],
		[
			'50.0000001',
			'Amount exceeds your available balance of 50.0000000 XLM.',
		],
	])('rejects %j and never submits', (value, message) => {
		const { onSubmit } = renderDialog();
		fireEvent.change(amountInput(), { target: { value } });
		expect(screen.getByTestId('add-liquidity-error')).toHaveTextContent(
			message
		);
		expect(amountInput()).toHaveAttribute('aria-invalid', 'true');
		expect(submit()).toBeDisabled();
		fireEvent.submit(amountInput().closest('form')!);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('fills the full spendable balance with Max', () => {
		renderDialog();
		fireEvent.click(screen.getByRole('button', { name: 'Max' }));
		expect(amountInput()).toHaveValue('50');
		expect(submit()).toBeEnabled();
	});

	it('blocks submission when the balance cannot be read', () => {
		hooks.useSpendableXlmBalance.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});
		const { onSubmit } = renderDialog();
		expect(screen.getByTestId('add-liquidity-available')).toHaveTextContent(
			'Unavailable'
		);
		fireEvent.change(amountInput(), { target: { value: '1' } });
		expect(submit()).toBeDisabled();
		fireEvent.submit(amountInput().closest('form')!);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('reports an unavailable reward rate instead of inventing one', () => {
		hooks.useLpPool.mockReturnValue({
			data: {
				keyId: position.keyId,
				totalLiquidityStroops: null,
				aprBps: null,
			},
			isLoading: false,
		});
		renderDialog();
		expect(screen.getByTestId('add-liquidity-apr')).toHaveTextContent(
			'Unavailable'
		);
	});

	it('shows the pending state and the last submission error', () => {
		renderDialog({
			isSubmitting: true,
			submitError: 'Transaction cancelled in your wallet.',
		});
		expect(submit()).toHaveTextContent('Confirm in wallet…');
		expect(submit()).toBeDisabled();
		expect(
			screen.getByTestId('add-liquidity-submit-error')
		).toHaveTextContent('Transaction cancelled in your wallet.');
	});
});
