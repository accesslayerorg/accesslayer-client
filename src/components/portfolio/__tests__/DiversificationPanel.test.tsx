import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DiversificationPanel from '@/components/portfolio/DiversificationPanel';
import type { KeySnapshot } from '@/services/keySnapshotHistory.service';

const { getSnapshotHistory } = vi.hoisted(() => ({ getSnapshotHistory: vi.fn() }));
vi.mock('@/services/keySnapshotHistory.service', () => ({
	keySnapshotHistoryService: { getSnapshotHistory },
}));

function snapshots(prices: number[]): KeySnapshot[] {
	const t0 = Date.parse('2026-01-01T12:00:00Z');
	return prices.map((priceStroops, i) => ({
		snapshotDate: new Date(t0 + i * 86_400_000).toISOString(),
		priceStroops,
		volumeStroops: 0,
		holderCount: 0,
		marketCapStroops: 0,
	}));
}

const returns = [0.02, -0.01, 0.03, -0.02, 0.01, 0.04, -0.03, 0.02, -0.01, 0.01, 0.05, -0.02, 0.01, -0.04, 0.03, 0.02];
const walk = (rs: number[]) => rs.reduce((acc, r) => [...acc, acc[acc.length - 1] * (1 + r)], [1_000_000]);

const HISTORY: Record<string, KeySnapshot[]> = {
	alpha: snapshots(walk(returns)),
	beta: snapshots(walk(returns.map(r => r * 1.2))), // moves with alpha
	gamma: snapshots(walk(returns.map((r, i) => (i % 2 ? r : -r)))),
	fresh: snapshots(walk(returns.slice(0, 4))), // 5 days of history
};

const positions = [
	{ keyId: 'alpha', name: 'Alpha', valueStroops: 4_000 },
	{ keyId: 'beta', name: 'Beta', valueStroops: 3_000 },
	{ keyId: 'gamma', name: 'Gamma', valueStroops: 3_000 },
	{ keyId: 'fresh', name: 'Fresh', valueStroops: 1_000 },
];

function renderPanel(ps = positions) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<DiversificationPanel positions={ps} />
		</QueryClientProvider>
	);
}

describe('DiversificationPanel (#1474)', () => {
	beforeEach(() => {
		getSnapshotHistory.mockReset();
		getSnapshotHistory.mockImplementation(async (id: string) => HISTORY[id] ?? []);
	});

	it('excludes keys with less than 14 days of history, with a notice', async () => {
		renderPanel();
		const note = await screen.findByRole('note');
		expect(note).toHaveTextContent('less than 14 days of price history: Fresh (5 days)');
	});

	it('highlights pairs above 0.8 and suggests reducing overlap', async () => {
		renderPanel();
		const status = await screen.findByRole('status');
		expect(status).toHaveTextContent('Highly correlated (above 0.8)');
		expect(status).toHaveTextContent(/Alpha and Beta: 1\.00/);
		expect(status).toHaveTextContent(/consider reducing one of them/);
		expect(status).not.toHaveTextContent(/Gamma/);
		const highCells = screen.getByTestId('correlation-heatmap').querySelectorAll('[data-high="true"]');
		expect(highCells).toHaveLength(2); // alpha×beta and beta×alpha
	});

	it('gives screen readers the same values in a table', async () => {
		renderPanel();
		const table = await screen.findByRole('table');
		const rows = within(table).getAllByRole('row');
		expect(rows).toHaveLength(4); // header + alpha, beta, gamma
		const alphaRow = within(table).getByRole('rowheader', { name: 'Alpha' }).closest('tr')!;
		expect(alphaRow).toHaveTextContent('1.00');
		expect(alphaRow).toHaveTextContent('(highly correlated)');
		expect(screen.getByTestId('correlation-heatmap')).toHaveAttribute('aria-hidden', 'true');
	});

	it('shows a score that changes with the holdings', async () => {
		const { unmount } = renderPanel();
		await screen.findByRole('table');
		const spread = Number(screen.getByTestId('diversification-score').firstChild!.textContent);
		unmount();
		renderPanel([
			{ keyId: 'alpha', name: 'Alpha', valueStroops: 9_000 },
			{ keyId: 'gamma', name: 'Gamma', valueStroops: 1_000 },
		]);
		await screen.findByRole('table');
		const lopsided = Number(screen.getByTestId('diversification-score').firstChild!.textContent);
		expect(lopsided).not.toBe(spread);
	});

	it('shows concentration shares on the second tab', async () => {
		const user = userEvent.setup();
		renderPanel();
		await screen.findByRole('table');
		await user.click(screen.getByRole('tab', { name: 'Concentration' }));
		const list = await screen.findByRole('list', { name: 'Share of analysed value' });
		expect(list).toHaveTextContent('Alpha40.0%');
		expect(list).toHaveTextContent('Beta30.0%');
	});

	it('refetches when the range changes', async () => {
		const user = userEvent.setup();
		renderPanel();
		await screen.findByRole('table');
		await user.click(screen.getByRole('button', { name: '30D' }));
		await waitFor(() => expect(getSnapshotHistory).toHaveBeenCalledWith('alpha', '30d'));
	});
});
