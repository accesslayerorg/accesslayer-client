import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PortfolioHoldingRow from '../PortfolioHoldingRow';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

const basePosition: HeldKeyPosition = {
	creatorId: 'creator-1',
	quantity: 5,
	priceStroops: 1_000_000,
	last_buy_timestamp: null,
};

const activeCreator = {
	id: 'creator-1',
	title: 'Alex Rivers',
	description: 'Artist',
	price: 0.1,
	instructorId: 'inst-1',
	category: 'Art',
	level: 'BEGINNER' as const,
};

const deprecatedCreator = {
	...activeCreator,
	deprecated: true,
	deprecationReason: 'Creator left the platform',
};

describe('PortfolioHoldingRow — deprecation notice & redeem (#871)', () => {
	it('shows no deprecation notice for an active (non-deprecated) key', () => {
		render(
			<PortfolioHoldingRow position={basePosition} creator={activeCreator} />
		);

		expect(screen.queryByTestId('deprecation-notice')).not.toBeInTheDocument();
	});

	it('shows the deprecation notice for a deprecated key', () => {
		render(
			<PortfolioHoldingRow position={basePosition} creator={deprecatedCreator} />
		);

		expect(screen.getByTestId('deprecation-notice')).toBeInTheDocument();
	});

	it('hides Buy/Sell and shows a Redeem button for a deprecated key', () => {
		render(
			<PortfolioHoldingRow
				position={basePosition}
				creator={deprecatedCreator}
				onBuy={vi.fn()}
				onSell={vi.fn()}
				onRedeem={vi.fn()}
			/>
		);

		expect(screen.queryByTestId('holding-buy-button')).not.toBeInTheDocument();
		expect(screen.queryByTestId('holding-sell-button')).not.toBeInTheDocument();
		expect(screen.getByTestId('holding-redeem-button')).toBeInTheDocument();
	});

	it('shows Buy/Sell (not Redeem) for an active key', () => {
		render(
			<PortfolioHoldingRow
				position={basePosition}
				creator={activeCreator}
				onBuy={vi.fn()}
				onSell={vi.fn()}
				onRedeem={vi.fn()}
			/>
		);

		expect(screen.getByTestId('holding-buy-button')).toBeInTheDocument();
		expect(screen.getByTestId('holding-sell-button')).toBeInTheDocument();
		expect(screen.queryByTestId('holding-redeem-button')).not.toBeInTheDocument();
	});

	it('does not render a redeem button when no onRedeem handler is supplied', () => {
		render(
			<PortfolioHoldingRow position={basePosition} creator={deprecatedCreator} />
		);

		expect(screen.queryByTestId('holding-redeem-button')).not.toBeInTheDocument();
	});

	it('opens the redeem confirmation dialog showing the redemption value', () => {
		render(
			<PortfolioHoldingRow
				position={basePosition}
				creator={deprecatedCreator}
				onRedeem={vi.fn()}
			/>
		);

		fireEvent.click(screen.getByTestId('holding-redeem-button'));

		expect(screen.getByTestId('redeem-dialog-confirm')).toBeInTheDocument();
		// 5 keys * 1_000_000 stroops = 5_000_000 stroops = 0.50 XLM
		expect(screen.getByText('0.50 XLM')).toBeInTheDocument();
	});

	it('calls onRedeem with the creator key id on confirm', () => {
		const onRedeem = vi.fn().mockResolvedValue(undefined);

		render(
			<PortfolioHoldingRow
				position={basePosition}
				creator={deprecatedCreator}
				onRedeem={onRedeem}
			/>
		);

		fireEvent.click(screen.getByTestId('holding-redeem-button'));
		fireEvent.click(screen.getByTestId('redeem-dialog-confirm'));

		expect(onRedeem).toHaveBeenCalledWith('creator-1');
	});

	it('does not render the sell lockup countdown for a deprecated key', () => {
		const lockedPosition: HeldKeyPosition = {
			...basePosition,
			last_buy_timestamp: Math.floor(Date.now() / 1000),
		};

		render(
			<PortfolioHoldingRow position={lockedPosition} creator={deprecatedCreator} />
		);

		expect(screen.queryByTestId('lockup-countdown')).not.toBeInTheDocument();
	});
});
