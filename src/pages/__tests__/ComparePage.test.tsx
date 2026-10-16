import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddToCompareButton from '@/components/common/AddToCompareButton';
import CompareBar from '@/components/common/CompareBar';
import ComparePage from '@/pages/ComparePage';
import {
	COMPARE_LIMIT_REASON,
	COMPARE_STORAGE_KEY,
	MAX_COMPARE_KEYS,
	useCompareStore,
	type CompareKey,
} from '@/hooks/useCompareStore';
import type { KeyMetrics } from '@/services/keyMetrics.service';

function makeKey(id: string, overrides: Partial<CompareKey> = {}): CompareKey {
	return {
		id,
		title: `Creator ${id}`,
		instructorId: `creator${id}`,
		price: Number(id) * 2,
		volume24h: Number(id),
		creatorShareSupply: 100,
		...overrides,
	};
}

function makeMetrics(
	id: string,
	overrides: Partial<KeyMetrics> = {}
): KeyMetrics {
	return {
		creatorId: id,
		price: 10 + Number(id),
		volume24h: 100 * Number(id),
		holders: 50 * Number(id),
		uniqueTraders: 20 * Number(id),
		rating: 4.5,
		curveMilestone: { label: `Tier ${id}`, progressPercent: 40 },
		yieldPercent: 7.25,
		...overrides,
	};
}

const KEYS = ['1', '2', '3', '4'].map(id => makeKey(id));

function CardGrid() {
	return (
		<>
			{KEYS.map(key => (
				<AddToCompareButton key={key.id} compareKey={key} />
			))}
			<CompareBar />
		</>
	);
}

function renderGrid() {
	return render(
		<MemoryRouter>
			<CardGrid />
		</MemoryRouter>
	);
}

beforeEach(() => {
	sessionStorage.clear();
	act(() => useCompareStore.getState().clear());
});

// Multi-step render flows; allow headroom on loaded CI runners.
describe('AddToCompareButton + CompareBar', { timeout: 15_000 }, () => {
	it('disables "add to compare" after three selections and explains why', () => {
		renderGrid();

		for (const key of KEYS.slice(0, MAX_COMPARE_KEYS)) {
			fireEvent.click(
				screen.getByRole('button', { name: `Add ${key.title} to compare` })
			);
		}

		const fourth = screen.getByRole('button', {
			name: 'Add Creator 4 to compare',
		});
		expect(fourth).toHaveAttribute('aria-disabled', 'true');
		// Still focusable so keyboard users can reach the explanation.
		expect(fourth).not.toBeDisabled();
		expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent(
			COMPARE_LIMIT_REASON
		);

		fireEvent.click(fourth);
		expect(useCompareStore.getState().keys.map(k => k.id)).toEqual([
			'1',
			'2',
			'3',
		]);
	});

	it('re-enables adding once a key is removed', () => {
		renderGrid();
		for (const key of KEYS.slice(0, 3)) {
			fireEvent.click(
				screen.getByRole('button', { name: `Add ${key.title} to compare` })
			);
		}

		const bar = screen.getByRole('complementary', { name: 'Key comparison' });
		fireEvent.click(
			within(bar).getByRole('button', {
				name: 'Remove Creator 2 from compare',
			})
		);

		const fourth = screen.getByRole('button', {
			name: 'Add Creator 4 to compare',
		});
		expect(fourth).not.toHaveAttribute('aria-disabled');
		fireEvent.click(fourth);
		expect(useCompareStore.getState().keys.map(k => k.id)).toEqual([
			'1',
			'3',
			'4',
		]);
	});

	it('sticky bar appears, tracks selections, and hides when emptied', () => {
		renderGrid();
		expect(
			screen.queryByRole('complementary', { name: 'Key comparison' })
		).not.toBeInTheDocument();

		fireEvent.click(
			screen.getByRole('button', { name: 'Add Creator 1 to compare' })
		);
		const bar = screen.getByRole('complementary', { name: 'Key comparison' });
		expect(bar).toHaveTextContent('Compare 1/3');
		expect(bar).toHaveTextContent('Creator 1');
		expect(
			within(bar).queryByRole('link', { name: /compare keys/i })
		).toBeNull();

		fireEvent.click(
			screen.getByRole('button', { name: 'Add Creator 2 to compare' })
		);
		expect(bar).toHaveTextContent('Compare 2/3');
		expect(
			within(bar).getByRole('link', { name: /compare keys/i })
		).toHaveAttribute('href', '/compare');

		// Toggling the card button off removes it from the bar too.
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Remove Creator 1 from compare',
				pressed: true,
			})
		);
		expect(bar).not.toHaveTextContent('Creator 1');
		expect(bar).toHaveTextContent('Compare 1/3');

		fireEvent.click(within(bar).getByRole('button', { name: 'Clear all' }));
		expect(
			screen.queryByRole('complementary', { name: 'Key comparison' })
		).not.toBeInTheDocument();
	});

	it('persists the selection to sessionStorage', () => {
		renderGrid();
		fireEvent.click(
			screen.getByRole('button', { name: 'Add Creator 3 to compare' })
		);
		const stored = JSON.parse(sessionStorage.getItem(COMPARE_STORAGE_KEY)!);
		expect(stored.state.keys.map((k: CompareKey) => k.id)).toEqual(['3']);
	});
});

// Multi-step render flows; allow headroom on loaded CI runners.
describe('ComparePage', { timeout: 15_000 }, () => {
	function renderComparePage(
		fetchMetrics = vi.fn(async (id: string) => makeMetrics(id))
	) {
		const router = createMemoryRouter(
			[
				{
					path: '/compare',
					element: <ComparePage fetchMetrics={fetchMetrics} />,
				},
				{ path: '/creator/:id', element: <p>Creator detail page</p> },
			],
			{ initialEntries: ['/compare'] }
		);
		render(<RouterProvider router={router} />);
		return { router, fetchMetrics };
	}

	function selectKeys(...ids: string[]) {
		act(() => {
			for (const id of ids) useCompareStore.getState().add(makeKey(id));
		});
	}

	it('renders every metric for each compared key', async () => {
		selectKeys('1', '2');
		const { fetchMetrics } = renderComparePage();

		await waitFor(() =>
			expect(screen.getByTestId('compare-cell-holders-2')).toHaveTextContent(
				'100'
			)
		);
		expect(fetchMetrics).toHaveBeenCalledWith('1');
		expect(fetchMetrics).toHaveBeenCalledWith('2');

		expect(
			screen.getByRole('columnheader', { name: /Creator 1/ })
		).toBeInTheDocument();
		expect(
			screen.getByRole('columnheader', { name: /Creator 2/ })
		).toBeInTheDocument();

		const expectations: Record<string, [string, string]> = {
			price: ['11 XLM', '12 XLM'],
			volume: ['100 XLM', '200 XLM'],
			holders: ['50', '100'],
			traders: ['20', '40'],
			rating: ['4.5 / 5', '4.5 / 5'],
			milestone: ['Tier 1', 'Tier 2'],
			yield: ['7.25%', '7.25%'],
		};
		for (const [row, [first, second]] of Object.entries(expectations)) {
			expect(screen.getByTestId(`compare-cell-${row}-1`)).toHaveTextContent(
				first
			);
			expect(screen.getByTestId(`compare-cell-${row}-2`)).toHaveTextContent(
				second
			);
		}
		expect(
			within(screen.getByTestId('compare-cell-milestone-1')).getByRole(
				'progressbar'
			)
		).toHaveAttribute('aria-valuenow', '40');
	});

	it('falls back to card data and placeholders when metrics fail', async () => {
		selectKeys('1', '2');
		renderComparePage(
			vi.fn(async (id: string) => {
				if (id === '2') throw new Error('boom');
				return makeMetrics(id, { rating: null, yieldPercent: null });
			})
		);

		expect(
			await screen.findByText(/some live metrics are unavailable/i)
		).toBeInTheDocument();
		// Snapshot price/volume for the failed key.
		expect(screen.getByTestId('compare-cell-price-2')).toHaveTextContent(
			'4 XLM'
		);
		expect(screen.getByTestId('compare-cell-volume-2')).toHaveTextContent(
			'2 XLM'
		);
		expect(screen.getByTestId('compare-cell-holders-2')).toHaveTextContent(
			'—'
		);
		// Null metrics on the healthy key.
		expect(screen.getByTestId('compare-cell-rating-1')).toHaveTextContent(
			'Unrated'
		);
		expect(screen.getByTestId('compare-cell-yield-1')).toHaveTextContent('—');
	});

	it('removing a key drops its column', async () => {
		selectKeys('1', '2', '3');
		renderComparePage();
		await screen.findByTestId('compare-cell-holders-3');

		fireEvent.click(
			screen.getByRole('button', { name: 'Remove Creator 2 from compare' })
		);
		expect(
			screen.queryByTestId('compare-cell-price-2')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('compare-cell-price-3')).toBeInTheDocument();
	});

	it('clear all resets the comparison completely', async () => {
		selectKeys('1', '2', '3');
		renderComparePage();
		await screen.findByTestId('compare-cell-holders-1');

		fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

		expect(screen.getByTestId('compare-empty')).toBeInTheDocument();
		expect(screen.queryByRole('table')).not.toBeInTheDocument();
		expect(useCompareStore.getState().keys).toEqual([]);
		const stored = JSON.parse(sessionStorage.getItem(COMPARE_STORAGE_KEY)!);
		expect(stored.state.keys).toEqual([]);
	});

	it('invest CTA routes to the key detail page', async () => {
		selectKeys('1', '2');
		const { router } = renderComparePage();
		await screen.findByTestId('compare-cell-holders-2');

		const invest = screen.getByRole('link', { name: 'Invest in Creator 2' });
		expect(invest).toHaveAttribute('href', '/creator/2');
		fireEvent.click(invest);

		expect(
			await screen.findByText('Creator detail page')
		).toBeInTheDocument();
		expect(router.state.location.pathname).toBe('/creator/2');
	});
});
