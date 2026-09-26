import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import TradeHistoryTable from '@/components/common/TradeHistoryTable';
import type { Trade } from '@/services/tradeHistory.service';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

vi.mock('@/utils/clipboard.utils', () => ({
	copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}));

const mockCopyTextToClipboard = vi.mocked(copyTextToClipboard);

const WALLET_ADDRESS = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const baseTrade: Trade = {
	id: 'trade-1',
	keyName: 'Alpha Key',
	tradeType: 'Buy',
	quantity: 2,
	pricePerKey: 1.5,
	timestamp: Date.now(),
	transactionHash:
		'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
};

const mockUseTradeHistory = vi.fn();

vi.mock('@/hooks/useWallet', () => ({
	useTradeHistory: (...args: unknown[]) => mockUseTradeHistory(...args),
}));

function mockTradeHistoryResult(trades: Trade[]) {
	mockUseTradeHistory.mockReturnValue({
		data: { pages: [{ trades, nextCursor: null }] },
		fetchNextPage: vi.fn(),
		hasNextPage: false,
		isFetchingNextPage: false,
		isLoading: false,
		isError: false,
	});
}

describe('TradeHistoryTable — copy transaction hash (#879)', () => {
	afterEach(() => {
		mockUseTradeHistory.mockReset();
		vi.restoreAllMocks();
	});

	it('copies the transaction hash to the clipboard and shows a "Copied!" tooltip for 2s', async () => {
		mockTradeHistoryResult([baseTrade]);

		const user = userEvent.setup();
		render(<TradeHistoryTable walletAddress={WALLET_ADDRESS} />);

		const copyButton = screen.getByTestId('trade-row-copy-hash');
		await user.click(copyButton);

		expect(mockCopyTextToClipboard).toHaveBeenCalledWith(
			baseTrade.transactionHash
		);
		expect(screen.getByTestId('trade-row-copy-tooltip')).toHaveTextContent(
			'Copied!'
		);

		await waitFor(
			() =>
				expect(
					screen.queryByTestId('trade-row-copy-tooltip')
				).not.toBeInTheDocument(),
			{ timeout: 3000 }
		);
	});

	it('opens the Stellar Expert explorer URL for the transaction in a new tab', () => {
		mockTradeHistoryResult([baseTrade]);
		render(<TradeHistoryTable walletAddress={WALLET_ADDRESS} />);

		const link = screen.getByTestId(
			'trade-row-explorer-link'
		) as HTMLAnchorElement;

		expect(link.href).toContain(`/tx/${baseTrade.transactionHash}`);
		expect(link.href).toMatch(/^https:\/\/stellar\.expert\/explorer\//);
		expect(link.target).toBe('_blank');
		expect(link.rel).toContain('noopener');
	});

	it('disables both buttons and shows "N/A" when transactionHash is null', () => {
		mockTradeHistoryResult([{ ...baseTrade, transactionHash: null }]);
		render(<TradeHistoryTable walletAddress={WALLET_ADDRESS} />);

		const row = screen.getByTestId('trade-row-buy');
		expect(within(row).getByText('N/A')).toBeInTheDocument();

		expect(
			screen.queryByTestId('trade-row-copy-hash')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('trade-row-explorer-link')
		).not.toBeInTheDocument();

		const disabledButtons = within(row)
			.getAllByRole('button')
			.filter(button => button.hasAttribute('disabled'));
		expect(disabledButtons.length).toBeGreaterThanOrEqual(2);
	});
});
