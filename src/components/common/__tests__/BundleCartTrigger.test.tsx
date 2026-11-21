import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BundleCartTrigger from '../BundleCartTrigger';
import { useBundleCartStore } from '@/hooks/useBundleCartStore';

describe('BundleCartTrigger (#1118)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		useBundleCartStore.setState({ items: [] });
	});

	it('reports an empty cart and invokes onClick', async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<BundleCartTrigger onClick={onClick} />);

		expect(screen.getByTestId('bundle-cart-trigger')).toHaveAccessibleName(
			'Open bundle cart (0 items)'
		);
		expect(
			screen.queryByTestId('bundle-cart-count')
		).not.toBeInTheDocument();

		await user.click(screen.getByTestId('bundle-cart-trigger'));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('shows the queued item count', () => {
		useBundleCartStore.setState({
			items: [
				{
					keyId: 'a',
					keyName: 'Alpha',
					priceStroops: 1_000_000,
					quantity: 1,
				},
			],
		});

		render(<BundleCartTrigger onClick={vi.fn()} />);

		expect(screen.getByTestId('bundle-cart-count')).toHaveTextContent('1');
	});
});
