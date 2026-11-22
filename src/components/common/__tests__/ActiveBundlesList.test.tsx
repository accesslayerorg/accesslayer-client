import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ActiveBundlesList from '@/components/common/ActiveBundlesList';
import type { KeyBundle } from '@/services/bundle.service';

const NOW_MS = Date.parse('2026-01-01T00:00:00.000Z');
const DAY_MS = 86_400_000;

function makeBundle(overrides: Partial<KeyBundle> = {}): KeyBundle {
	return {
		id: 'bundle-1',
		creatorId: 'creator-1',
		items: [
			{ keyId: 'key-a', quantity: 2 },
			{ keyId: 'key-b', quantity: 1 },
		],
		listPriceXlm: 25,
		discountPriceXlm: 20,
		expiresAt: new Date(NOW_MS + 2 * DAY_MS).toISOString(),
		createdAt: new Date(NOW_MS - DAY_MS).toISOString(),
		purchaseCount: 4,
		cancelledAt: null,
		...overrides,
	};
}

function setup(
	props: Partial<React.ComponentProps<typeof ActiveBundlesList>> = {}
) {
	const onCancelBundle = vi.fn();
	const onLoadMore = vi.fn();
	const view = render(
		<ActiveBundlesList
			bundles={[makeBundle()]}
			nowMs={NOW_MS}
			onCancelBundle={onCancelBundle}
			onLoadMore={onLoadMore}
			{...props}
		/>
	);
	return { onCancelBundle, onLoadMore, rerender: view.rerender };
}

describe('ActiveBundlesList', () => {
	it('lists each active bundle with its key count and purchase count', () => {
		setup();

		const row = screen.getByTestId('active-bundle-row');
		expect(row).toHaveTextContent('bundle-1');
		expect(screen.getByTestId('active-bundle-keys')).toHaveTextContent('3');
		expect(screen.getByTestId('active-bundle-purchases')).toHaveTextContent('4');
		expect(screen.getByTestId('active-bundle-list-price')).toHaveTextContent(
			'25.00 XLM'
		);
		expect(screen.getByTestId('active-bundle-discount-price')).toHaveTextContent(
			'20.00 XLM'
		);
	});

	it('renders a live countdown for a bundle that has not lapsed', () => {
		setup();
		expect(screen.getByTestId('bundle-time-remaining')).toHaveTextContent(
			'2d 0h 0m 0s'
		);
	});

	it('moves the countdown to Expired once the bundle lapses', () => {
		setup({ nowMs: NOW_MS + 3 * DAY_MS });
		expect(screen.getByTestId('bundle-time-remaining')).toHaveTextContent('Expired');
	});

	it('cancels a bundle by id', () => {
		const { onCancelBundle } = setup();

		fireEvent.click(screen.getByTestId('active-bundle-cancel'));

		expect(onCancelBundle).toHaveBeenCalledWith('bundle-1');
	});

	it('marks the row as cancelling and blocks a second cancel', () => {
		setup({ cancellingBundleId: 'bundle-1' });

		const button = screen.getByTestId('active-bundle-cancel');
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');
	});

	it('shows an empty state when there are no active bundles', () => {
		setup({ bundles: [] });
		expect(screen.getByTestId('active-bundles-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('active-bundle-row')).not.toBeInTheDocument();
	});

	it('renders a skeleton while loading and an error message on failure', () => {
		const { unmount } = render(
			<ActiveBundlesList bundles={[]} nowMs={NOW_MS} isLoading />
		);
		expect(screen.getByTestId('active-bundles-skeleton')).toBeInTheDocument();
		unmount();

		setup({ isError: true });
		expect(screen.getByTestId('active-bundles-error')).toBeInTheDocument();
	});

	it('offers a load more control only when another page exists', () => {
		const { onLoadMore, rerender } = setup({ hasNextPage: false });
		expect(screen.queryByTestId('active-bundles-load-more')).not.toBeInTheDocument();

		rerender(
			<ActiveBundlesList
				bundles={[makeBundle()]}
				nowMs={NOW_MS}
				hasNextPage
				onLoadMore={onLoadMore}
			/>
		);
		fireEvent.click(screen.getByTestId('active-bundles-load-more'));
		expect(onLoadMore).toHaveBeenCalledTimes(1);
	});
});
