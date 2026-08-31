import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PortfolioHoldingRow from '../PortfolioHoldingRow';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

const basePosition: HeldKeyPosition = {
	creatorId: 'creator-1',
	quantity: 5,
	priceStroops: 5_000_000,
	last_buy_timestamp: null,
};

const creator = {
	id: 'creator-1',
	title: 'Alex Rivers',
	description: 'Artist',
	price: 0.5,
	instructorId: 'inst-1',
	category: 'Art',
	level: 'BEGINNER' as const,
};

describe('PortfolioHoldingRow — dividend reinvest', () => {
	it('shows an unclaimed dividend badge only when unclaimedDividend is greater than zero', () => {
		const { rerender } = render(
			<PortfolioHoldingRow
				position={{ ...basePosition, unclaimedDividend: 1.25 }}
				creator={creator}
				onReinvest={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('unclaimed-dividend-badge')
		).toBeInTheDocument();
		expect(screen.getByTestId('holding-reinvest-button')).toBeInTheDocument();

		rerender(
			<PortfolioHoldingRow
				position={{ ...basePosition, unclaimedDividend: 0 }}
				creator={creator}
				onReinvest={vi.fn()}
			/>
		);

		expect(
			screen.queryByTestId('unclaimed-dividend-badge')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('holding-reinvest-button')
		).not.toBeInTheDocument();
	});

	it('does not render a reinvest button when no onReinvest handler is supplied', () => {
		render(
			<PortfolioHoldingRow
				position={{ ...basePosition, unclaimedDividend: 1.25 }}
				creator={creator}
			/>
		);

		expect(
			screen.getByTestId('unclaimed-dividend-badge')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('holding-reinvest-button')
		).not.toBeInTheDocument();
	});

	it('opens the confirmation modal with the estimated keys and remainder', () => {
		render(
			<PortfolioHoldingRow
				position={{ ...basePosition, unclaimedDividend: 1.25 }}
				creator={creator}
				onReinvest={vi.fn()}
			/>
		);

		fireEvent.click(screen.getByTestId('holding-reinvest-button'));

		expect(screen.getByTestId('reinvest-dialog-confirm')).toBeInTheDocument();
		// 1.25 XLM at 0.5 XLM/key => 2 whole keys; remainder 0.25 XLM
		expect(screen.getByText(/2 keys/)).toBeInTheDocument();
		expect(screen.getByText(/Unclaimed dividends/i)).toBeInTheDocument();
	});

	it('calls onReinvest with the creator key id on confirm', async () => {
		const onReinvest = vi.fn().mockResolvedValue(undefined);

		render(
			<PortfolioHoldingRow
				position={{ ...basePosition, unclaimedDividend: 1.25 }}
				creator={creator}
				onReinvest={onReinvest}
			/>
		);

		fireEvent.click(screen.getByTestId('holding-reinvest-button'));

		const confirmButton = screen.getByTestId('reinvest-dialog-confirm');
		expect(confirmButton).not.toBeDisabled();

		fireEvent.click(confirmButton);

		expect(onReinvest).toHaveBeenCalledWith('creator-1');
	});

	it('disables the confirm button when the dividend cannot buy a whole key', () => {
		render(
			<PortfolioHoldingRow
				position={{ ...basePosition, unclaimedDividend: 0.1 }}
				creator={creator}
				onReinvest={vi.fn()}
			/>
		);

		fireEvent.click(screen.getByTestId('holding-reinvest-button'));

		const confirmButton = screen.getByTestId('reinvest-dialog-confirm');
		// 0.1 XLM at 0.5 XLM/key < 1 key => disabled
		expect(confirmButton).toBeDisabled();
	});
});
