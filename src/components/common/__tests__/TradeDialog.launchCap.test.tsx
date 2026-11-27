import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TradeDialog from '../TradeDialog';
import { launchCapService } from '@/services/launchCap.service';
import type { LaunchCapConfig } from '@/types/launchCap';

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('TradeDialog launch window purchase cap integration (#1385)', () => {
	const now = Date.now();
	const baseConfig: LaunchCapConfig = {
		enabled: true,
		windowStart: now - 60_000,
		windowEnd: now + 3_600_000,
		creatorAddress: 'GC_CREATOR_ALICE',
		allowlist: ['GC_ALLOWLIST_BOB'],
		steps: [
			{ timestamp: now - 60_000, cap: 5, label: 'Tier 1' },
			{ timestamp: now + 1_800_000, cap: 20, label: 'Tier 2' },
		],
	};

	beforeEach(() => {
		launchCapService.reset();
	});

	function renderDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				creatorId="creator-alice"
				walletAddress="GC_BUYER_1"
				availableHoldings={0}
				availableSupply={100}
				keyPriceStroops={1_000_000}
				launchCapConfig={baseConfig}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>,
			{ wrapper: createWrapper() }
		);
	}

	it('renders LaunchCapMeter on the buy panel showing remaining allowance and cap', () => {
		renderDialog();

		expect(screen.getByTestId('launch-cap-meter')).toBeInTheDocument();
		expect(screen.getByTestId('launch-cap-remaining-allowance')).toHaveTextContent(
			'Remaining allowance: 5 keys'
		);
		expect(screen.getByTestId('launch-cap-ramp-chart')).toBeInTheDocument();
	});

	it('shows the maximum remaining launch allowance in the helper text', () => {
		renderDialog();

		const helper = screen.getByTestId('buy-max-helper-text');
		expect(helper).toBeInTheDocument();
		expect(helper).toHaveTextContent('Max you can buy: 5 keys (launch allowance)');
	});

	it('caps buy quantity input at remaining allowance on blur', () => {
		renderDialog();

		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '10' } });
		fireEvent.blur(input);

		expect(input).toHaveValue('5');
		expect(screen.getByTestId('buy-qty-adjustment-note')).toHaveTextContent(
			'Quantity adjusted to the maximum of 5.'
		);
	});

	it('sets input to remaining allowance when clicking the MAX button', () => {
		renderDialog();

		const maxButton = screen.getByTestId('trade-dialog-max-button');
		fireEvent.click(maxButton);

		const input = screen.getByTestId('trade-dialog-amount');
		expect(input).toHaveValue('5');
	});

	it('shows validation error when quantity exceeds remaining allowance', () => {
		renderDialog();

		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '8' } });

		expect(screen.getByTestId('trade-dialog-amount-error')).toHaveTextContent(
			'Quantity exceeds your remaining launch allowance of 5 keys.'
		);
	});

	it('disables input, MAX button and confirm button when cap is reached', () => {
		launchCapService.recordPurchase('creator-alice', 'GC_BUYER_1', 5);

		renderDialog();

		const input = screen.getByTestId('trade-dialog-amount');
		expect(input).toBeDisabled();

		const maxButton = screen.getByTestId('trade-dialog-max-button');
		expect(maxButton).toBeDisabled();

		const confirmBtn = screen.getByRole('button', { name: /Cap reached/i });
		expect(confirmBtn).toBeDisabled();
	});

	it('shows exempt notice and removes launch allowance limit for creator wallet', () => {
		renderDialog({ walletAddress: 'GC_CREATOR_ALICE' });

		expect(screen.getByTestId('launch-cap-exempt-notice')).toBeInTheDocument();
		expect(screen.queryByTestId('launch-cap-meter')).not.toBeInTheDocument();

		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '15' } });
		fireEvent.blur(input);

		expect(input).toHaveValue('15');
		expect(screen.queryByTestId('trade-dialog-amount-error')).not.toBeInTheDocument();
	});

	it('shows exempt notice and removes launch allowance limit for allowlisted wallet', () => {
		renderDialog({ walletAddress: 'GC_ALLOWLIST_BOB' });

		expect(screen.getByTestId('launch-cap-exempt-notice')).toBeInTheDocument();
		expect(screen.queryByTestId('launch-cap-meter')).not.toBeInTheDocument();

		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '25' } });
		fireEvent.blur(input);

		expect(input).toHaveValue('25');
		expect(screen.queryByTestId('trade-dialog-amount-error')).not.toBeInTheDocument();
	});

	it('hides meter and removes limits when the launch window has ended', () => {
		const endedConfig: LaunchCapConfig = {
			...baseConfig,
			windowEnd: now - 5000,
		};

		renderDialog({ launchCapConfig: endedConfig });

		expect(screen.queryByTestId('launch-cap-meter')).not.toBeInTheDocument();
		expect(screen.queryByTestId('launch-cap-exempt-notice')).not.toBeInTheDocument();

		const input = screen.getByTestId('trade-dialog-amount');
		fireEvent.change(input, { target: { value: '20' } });
		fireEvent.blur(input);

		expect(input).toHaveValue('20');
		expect(screen.queryByTestId('trade-dialog-amount-error')).not.toBeInTheDocument();
	});
});
