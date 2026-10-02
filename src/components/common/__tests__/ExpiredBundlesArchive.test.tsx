import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpiredBundlesArchive from '@/components/common/ExpiredBundlesArchive';
import type { KeyBundle } from '@/services/bundle.service';

const NOW_MS = Date.parse('2026-01-01T00:00:00.000Z');
const DAY_MS = 86_400_000;

function makeBundle(overrides: Partial<KeyBundle> = {}): KeyBundle {
	return {
		id: 'bundle-1',
		creatorId: 'creator-1',
		items: [{ keyId: 'key-a', quantity: 2 }],
		listPriceXlm: 25,
		discountPriceXlm: 20,
		expiresAt: new Date(NOW_MS - 2 * DAY_MS).toISOString(),
		createdAt: new Date(NOW_MS - 30 * DAY_MS).toISOString(),
		purchaseCount: 7,
		cancelledAt: null,
		...overrides,
	};
}

function setup(
	props: Partial<React.ComponentProps<typeof ExpiredBundlesArchive>> = {}
) {
	render(<ExpiredBundlesArchive bundles={[makeBundle()]} nowMs={NOW_MS} {...props} />);
}

describe('ExpiredBundlesArchive', () => {
	it('archives a lapsed bundle with its totals and purchase count', () => {
		setup();

		const row = screen.getByTestId('expired-bundle-row');
		expect(row).toHaveTextContent('bundle-1');
		expect(screen.getByTestId('expired-bundle-keys')).toHaveTextContent('2');
		expect(screen.getByTestId('expired-bundle-purchases')).toHaveTextContent('7');
		expect(screen.getByTestId('expired-bundle-list-price')).toHaveTextContent(
			'25.00 XLM'
		);
		expect(screen.getByTestId('expired-bundle-discount-price')).toHaveTextContent(
			'20.00 XLM'
		);
	});

	it('labels a lapsed bundle as Expired', () => {
		setup();
		expect(screen.getByTestId('expired-bundle-end-reason')).toHaveTextContent(
			'Expired'
		);
	});

	it('labels a creator-cancelled bundle distinctly', () => {
		setup({
			bundles: [
				makeBundle({
					id: 'bundle-cancelled',
					cancelledAt: new Date(NOW_MS - DAY_MS).toISOString(),
				}),
			],
		});
		expect(screen.getByTestId('expired-bundle-end-reason')).toHaveTextContent(
			'Cancelled by creator'
		);
	});

	it('shows an empty state before anything has lapsed', () => {
		setup({ bundles: [] });
		expect(screen.getByTestId('expired-bundles-empty')).toBeInTheDocument();
		expect(screen.queryByTestId('expired-bundle-row')).not.toBeInTheDocument();
	});

	it('renders a skeleton while loading and an error message on failure', () => {
		const { unmount } = render(
			<ExpiredBundlesArchive bundles={[]} nowMs={NOW_MS} isLoading />
		);
		expect(screen.getByTestId('expired-bundles-skeleton')).toBeInTheDocument();
		unmount();

		setup({ isError: true });
		expect(screen.getByTestId('expired-bundles-error')).toBeInTheDocument();
	});
});
