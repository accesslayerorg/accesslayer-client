import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import PortfolioHoldingRow from '../PortfolioHoldingRow';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

const basePosition: HeldKeyPosition = {
	creatorId: 'creator-1',
	quantity: 10,
	liquidQuantity: 10,
	frozenQuantity: 0,
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

const renderComponent = (
	props?: Partial<React.ComponentProps<typeof PortfolioHoldingRow>>
) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<PortfolioHoldingRow
				position={basePosition}
				creator={creator}
				{...props}
			/>
		</QueryClientProvider>
	);
};

describe('PortfolioHoldingRow — Gift', () => {
	it('does not render the gift option when onGift is not supplied', () => {
		renderComponent();

		expect(
			screen.queryByTestId('holding-gift-button')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('holding-action-menu-trigger')
		).not.toBeInTheDocument();
	});

	it('offers a gift button for a holding with a positive balance', async () => {
		const user = userEvent.setup();
		const onGift = vi.fn();
		renderComponent({ onGift });

		await user.click(screen.getByTestId('holding-expand-button'));

		const giftButton = screen.getByTestId('holding-gift-button');
		expect(giftButton).toBeEnabled();

		await user.click(giftButton);
		expect(onGift).toHaveBeenCalledWith(basePosition);
		expect(screen.getByTestId('gift-key-modal')).toBeInTheDocument();
	});

	it('disables the gift button when the liquid balance is 0', async () => {
		const user = userEvent.setup();
		renderComponent({
			position: {
				...basePosition,
				liquidQuantity: 0,
				quantity: 5,
				frozenQuantity: 5,
			},
			onGift: vi.fn(),
		});

		await user.click(screen.getByTestId('holding-expand-button'));

		expect(screen.getByTestId('holding-gift-button')).toBeDisabled();
	});
});
