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

describe('PortfolioHoldingRow — Batch Transfer', () => {
	it('does not render batch transfer option when onBatchTransfer is not supplied', () => {
		renderComponent();

		expect(
			screen.queryByTestId('holding-batch-transfer-button')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('holding-action-menu-trigger')
		).not.toBeInTheDocument();
	});

	it('renders batch transfer button when row is expanded and onBatchTransfer is supplied', async () => {
		const user = userEvent.setup();
		renderComponent({ onBatchTransfer: vi.fn() });

		// Expand the row
		await user.click(screen.getByTestId('holding-expand-button'));

		const batchTransferBtn = screen.getByTestId(
			'holding-batch-transfer-button'
		);
		expect(batchTransferBtn).toBeInTheDocument();
		expect(batchTransferBtn).toHaveTextContent('Batch Transfer');
		expect(batchTransferBtn).toBeEnabled();
	});

	it('renders action menu trigger and batch transfer menu item when onBatchTransfer is supplied', async () => {
		const user = userEvent.setup();
		renderComponent({ onBatchTransfer: vi.fn() });

		const menuTrigger = screen.getByTestId('holding-action-menu-trigger');
		expect(menuTrigger).toBeInTheDocument();

		await user.click(menuTrigger);

		const batchTransferItem = screen.getByTestId(
			'holding-action-batch-transfer'
		);
		expect(batchTransferItem).toBeInTheDocument();
		expect(batchTransferItem).toHaveTextContent('Batch Transfer');
	});

	it('disables batch transfer option when liquid balance is 0', async () => {
		const user = userEvent.setup();
		renderComponent({
			position: {
				...basePosition,
				liquidQuantity: 0,
				quantity: 5,
				frozenQuantity: 5,
			},
			onBatchTransfer: vi.fn(),
		});

		// Check expanded button
		await user.click(screen.getByTestId('holding-expand-button'));
		expect(
			screen.getByTestId('holding-batch-transfer-button')
		).toBeDisabled();

		// Check action menu item
		await user.click(screen.getByTestId('holding-action-menu-trigger'));
		expect(
			screen.getByTestId('holding-action-batch-transfer')
		).toHaveAttribute('aria-disabled', 'true');
	});

	it('disables batch transfer option when isSubmitting is true', async () => {
		const user = userEvent.setup();
		renderComponent({
			onBatchTransfer: vi.fn(),
			isSubmitting: true,
		});

		await user.click(screen.getByTestId('holding-expand-button'));
		expect(
			screen.getByTestId('holding-batch-transfer-button')
		).toBeDisabled();
		expect(screen.getByTestId('holding-action-menu-trigger')).toBeDisabled();
	});

	it('opens BatchTransferModal and calls onBatchTransfer when clicked from expanded button', async () => {
		const user = userEvent.setup();
		const onBatchTransfer = vi.fn();
		renderComponent({ onBatchTransfer });

		await user.click(screen.getByTestId('holding-expand-button'));
		await user.click(screen.getByTestId('holding-batch-transfer-button'));

		expect(onBatchTransfer).toHaveBeenCalledWith(basePosition);
		expect(screen.getByTestId('batch-transfer-modal')).toBeInTheDocument();
		expect(screen.getByText('Batch Transfer Keys')).toBeInTheDocument();
	});

	it('opens BatchTransferModal and calls onBatchTransfer when clicked from action menu', async () => {
		const user = userEvent.setup();
		const onBatchTransfer = vi.fn();
		renderComponent({ onBatchTransfer });

		await user.click(screen.getByTestId('holding-action-menu-trigger'));
		await user.click(screen.getByTestId('holding-action-batch-transfer'));

		expect(onBatchTransfer).toHaveBeenCalledWith(basePosition);
		expect(screen.getByTestId('batch-transfer-modal')).toBeInTheDocument();
	});
});
