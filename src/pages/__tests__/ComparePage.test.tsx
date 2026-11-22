import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ComparePage from '../ComparePage';
import { useKeyComparisonStore } from '@/hooks/useKeyComparison';

vi.mock('recharts', async importOriginal => {
	const actual = await importOriginal<typeof import('recharts')>();
	return {
		...actual,
		ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
			<div style={{ width: 400, height: 300 }}>{children}</div>
		),
	};
});

vi.mock('@/services/course.service', async importOriginal => {
	const actual = await importOriginal<typeof import('@/services/course.service')>();
	return {
		...actual,
		courseService: {
			getCourse: vi.fn(async (id: string) => ({
				id,
				title: `Creator ${id}`,
				description: '',
				price: 1,
				priceStroops: 10_000_000 * Number(id),
				change24h: id === '1' ? 5 : -2,
				holderCount: 100 * Number(id),
				creatorShareSupply: 1000,
				instructorId: 'x',
				category: 'c',
				level: 'BEGINNER',
			})),
			getKeyStats: vi.fn(async () => ({
				supply: 1000,
				holderCount: 100,
				volume24h: 50_000_000,
				totalVolume: null,
				twap1h: null,
				twap24h: null,
			})),
			getPriceHistory: vi.fn(async () => [
				{ timestamp: '2026-01-01T00:00:00Z', price: 10_000_000 },
				{ timestamp: '2026-01-01T01:00:00Z', price: 12_000_000 },
			]),
		},
	};
});

function renderAt(url: string) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<MemoryRouter initialEntries={[url]}>
				<ComparePage />
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('ComparePage (#1247)', () => {
	beforeEach(() => {
		useKeyComparisonStore.setState({ selectedKeys: [] });
	});

	it('shows empty state with no keys', () => {
		renderAt('/compare');
		expect(screen.getByTestId('compare-empty')).toBeInTheDocument();
	});

	it('renders metrics for each key and the overlaid chart', async () => {
		renderAt('/compare?keys=1,2');
		expect(await screen.findByText('Creator 1')).toBeInTheDocument();
		expect(await screen.findByText('Creator 2')).toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByTestId('compare-holders-1')).toHaveTextContent('100')
		);
		expect(screen.getByTestId('compare-24h-change-1')).toHaveTextContent('+5%');
		expect(screen.getByTestId('compare-24h-change-2')).toHaveTextContent('-2%');
		expect(await screen.findByTestId('compare-chart')).toBeInTheDocument();
	});

	it('caps at 3 keys from the URL', async () => {
		renderAt('/compare?keys=1,2,3,4');
		await screen.findByText('Creator 3');
		expect(screen.queryByText('Creator 4')).not.toBeInTheDocument();
	});

	it('removes a single key and clears all', async () => {
		renderAt('/compare?keys=1,2');
		await screen.findByText('Creator 1');
		fireEvent.click(screen.getByLabelText('Remove Creator 1 from comparison'));
		await waitFor(() =>
			expect(screen.queryByText('Creator 1')).not.toBeInTheDocument()
		);
		expect(screen.getByText('Creator 2')).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('compare-clear-all'));
		expect(await screen.findByTestId('compare-empty')).toBeInTheDocument();
	});
});
