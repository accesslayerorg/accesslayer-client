/**
 * Unit tests for the pending-transaction status banner (#1082).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
	PendingTransactionProvider,
	usePendingTransactions,
} from '@/contexts/PendingTransactionContext';
import PendingTransactionBanner from '../PendingTransactionBanner';

vi.mock('@/lib/stellar/horizonClient', () => ({
	getTransactionStatus: vi.fn().mockResolvedValue({ status: 'pending' }),
}));

function Harness({ hash }: { hash: string }) {
	const { addPendingTransaction } = usePendingTransactions();
	addPendingTransaction(hash);
	return <PendingTransactionBanner />;
}

function renderBanner(hash: string) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<PendingTransactionProvider>
				<Harness hash={hash} />
			</PendingTransactionProvider>
		</QueryClientProvider>
	);
}

describe('PendingTransactionBanner (#1082)', () => {
	it('renders nothing when there are no tracked transactions', () => {
		const queryClient = new QueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<PendingTransactionProvider>
					<PendingTransactionBanner />
				</PendingTransactionProvider>
			</QueryClientProvider>
		);
		expect(
			screen.queryByTestId('pending-transaction-banner')
		).not.toBeInTheDocument();
	});

	it('shows a pending card for a tracked transaction with an explorer link', () => {
		renderBanner('abcd1234');

		expect(
			screen.getByTestId('pending-transaction-pending')
		).toBeInTheDocument();
		const link = screen.getByTestId(
			'pending-transaction-explorer-link'
		) as HTMLAnchorElement;
		expect(link.href).toContain('stellar.expert');
		expect(link.href).toContain('abcd1234');
		expect(link.target).toBe('_blank');
	});
});
