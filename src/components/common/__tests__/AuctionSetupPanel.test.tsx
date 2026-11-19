import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AuctionSetupPanel from '@/components/common/AuctionSetupPanel';

function setup(props: Partial<React.ComponentProps<typeof AuctionSetupPanel>> = {}) {
	const onConfigure = vi.fn();
	const onCancel = vi.fn();
	render(
		<AuctionSetupPanel
			onConfigure={onConfigure}
			onCancel={onCancel}
			{...props}
		/>
	);
	return { onConfigure, onCancel };
}

describe('AuctionSetupPanel (#816)', () => {
	it('shows "Not configured" with no auction data', () => {
		setup();
		expect(screen.getByTestId('auction-state')).toHaveTextContent('Not configured');
		expect(screen.queryByTestId('auction-cancel')).not.toBeInTheDocument();
	});

	it('shows "Active (X of Y sold)" for a live auction', () => {
		setup({ auctionPrice: 5, auctionSupply: 100, auctionSold: 30 });
		expect(screen.getByTestId('auction-state')).toHaveTextContent(
			'Active (30 of 100 sold)'
		);
	});

	it('shows "Completed" for a sold-out auction', () => {
		setup({ auctionPrice: 5, auctionSupply: 100, auctionSold: 100 });
		expect(screen.getByTestId('auction-state')).toHaveTextContent('Completed');
	});

	it('pre-fills price and supply inputs when configured', () => {
		setup({ auctionPrice: 7.5, auctionSupply: 250, auctionSold: 0 });
		expect((screen.getByTestId('auction-price-input') as HTMLInputElement).value).toBe(
			'7.5'
		);
		expect((screen.getByTestId('auction-supply-input') as HTMLInputElement).value).toBe(
			'250'
		);
	});

	it('validates inputs before submitting and shows errors', () => {
		const { onConfigure } = setup();

		fireEvent.change(screen.getByTestId('auction-price-input'), {
			target: { value: '0' },
		});
		fireEvent.change(screen.getByTestId('auction-supply-input'), {
			target: { value: '10.5' },
		});
		fireEvent.click(screen.getByTestId('auction-submit'));

		expect(onConfigure).not.toHaveBeenCalled();
		expect(screen.getByTestId('auction-price-error')).toBeInTheDocument();
		expect(screen.getByTestId('auction-supply-error')).toBeInTheDocument();
	});

	it('submits configure_auction with parsed numbers when valid', () => {
		const { onConfigure } = setup();

		fireEvent.change(screen.getByTestId('auction-price-input'), {
			target: { value: '12.5' },
		});
		fireEvent.change(screen.getByTestId('auction-supply-input'), {
			target: { value: '250' },
		});
		fireEvent.click(screen.getByTestId('auction-submit'));

		expect(onConfigure).toHaveBeenCalledWith({ price: 12.5, supply: 250 });
	});

	it('shows Cancel Auction only while nothing has sold and calls onCancel', () => {
		const { onCancel } = setup({
			auctionPrice: 5,
			auctionSupply: 100,
			auctionSold: 0,
		});

		const cancel = screen.getByTestId('auction-cancel');
		fireEvent.click(cancel);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('hides Cancel Auction once a key has sold', () => {
		setup({ auctionPrice: 5, auctionSupply: 100, auctionSold: 1 });
		expect(screen.queryByTestId('auction-cancel')).not.toBeInTheDocument();
	});
});
