import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BundleCartDrawer from '../BundleCartDrawer';
import { useBundleCartStore } from '@/hooks/useBundleCartStore';
import { useBundleBuyMutation } from '@/hooks/useBundleBuy';

const mockMutate = vi.fn();

vi.mock('@/hooks/useBundleBuy', () => ({
	useBundleBuyMutation: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		message: vi.fn(),
	},
}));

const alphaItem = {
	keyId: 'key-1',
	keyName: 'Alpha Key',
	priceStroops: 1_000_000,
	quantity: 1,
	currentSupply: 100,
};

const betaItem = {
	keyId: 'key-2',
	keyName: 'Beta Key',
	priceStroops: 2_000_000,
	quantity: 2,
	currentSupply: null,
};

describe('BundleCartDrawer (#1118)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		useBundleCartStore.setState({ items: [] });
		mockMutate.mockReset();
		vi.mocked(useBundleBuyMutation).mockReturnValue({
			mutate: mockMutate,
			isPending: false,
		} as unknown as ReturnType<typeof useBundleBuyMutation>);
	});

	it('shows an empty state when the cart has no items', () => {
		render(<BundleCartDrawer open onClose={vi.fn()} />);

		expect(screen.getByText('Your bundle cart is empty.')).toBeInTheDocument();
		expect(screen.getByTestId('bundle-submit')).toBeDisabled();
	});

	it('lists every queued item with its estimated cost', () => {
		useBundleCartStore.setState({ items: [alphaItem, betaItem] });

		render(<BundleCartDrawer open onClose={vi.fn()} />);

		expect(screen.getByTestId('bundle-item-name')).toHaveTextContent(
			'Alpha Key'
		);
		const names = screen.getAllByTestId('bundle-item-name');
		expect(names.map(node => node.textContent)).toEqual([
			'Alpha Key',
			'Beta Key',
		]);

		// Per-item estimated cost: 0.1 XLM × 1 and 0.2 XLM × 2.
		const costs = screen.getAllByTestId('bundle-item-cost');
		expect(costs[0]).toHaveTextContent('0.1 XLM');
		expect(costs[1]).toHaveTextContent('0.4 XLM');
	});

	it('updates the per-item cost and total when the amount changes', () => {
		useBundleCartStore.setState({ items: [alphaItem] });

		render(<BundleCartDrawer open onClose={vi.fn()} />);

		expect(screen.getByTestId('bundle-total-cost')).toHaveTextContent(
			'0.1 XLM'
		);

		fireEvent.change(screen.getByTestId('bundle-item-amount'), {
			target: { value: '5' },
		});

		expect(useBundleCartStore.getState().items[0].quantity).toBe(5);
		expect(screen.getByTestId('bundle-item-cost')).toHaveTextContent(
			'0.5 XLM'
		);
		expect(screen.getByTestId('bundle-total-cost')).toHaveTextContent(
			'0.5 XLM'
		);
	});

	it('shows the price impact summary when supply data is available', () => {
		useBundleCartStore.setState({ items: [alphaItem] });

		render(<BundleCartDrawer open onClose={vi.fn()} />);

		const impact = screen.getByTestId('bundle-price-impact');
		expect(impact).toHaveTextContent('Estimated price impact');
		// Bonding-curve impact is positive for buys.
		expect(impact.textContent).toMatch(/\+\d/);
	});

	it('hides the price impact summary when no item carries supply data', () => {
		useBundleCartStore.setState({
			items: [{ ...alphaItem, currentSupply: null }],
		});

		render(<BundleCartDrawer open onClose={vi.fn()} />);

		expect(
			screen.queryByTestId('bundle-price-impact')
		).not.toBeInTheDocument();
	});

	it('removes an item from the cart', async () => {
		const user = userEvent.setup();
		useBundleCartStore.setState({ items: [alphaItem, betaItem] });

		render(<BundleCartDrawer open onClose={vi.fn()} />);

		await user.click(
			screen.getByRole('button', { name: /Remove Alpha Key from bundle/i })
		);

		expect(useBundleCartStore.getState().items).toEqual([betaItem]);
	});

	it('submits the bundle and closes the drawer', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		useBundleCartStore.setState({ items: [alphaItem, betaItem] });

		render(<BundleCartDrawer open onClose={onClose} />);

		await user.click(screen.getByTestId('bundle-submit'));

		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalled();
	});

	it('does not submit when the cart is empty', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(<BundleCartDrawer open onClose={onClose} />);

		// The button is disabled, so no submit and no close.
		await user.click(screen.getByTestId('bundle-submit'));

		expect(mockMutate).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});
});
