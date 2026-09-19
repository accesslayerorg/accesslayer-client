import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SharePortfolioModal from '@/components/common/SharePortfolioModal';
import { truncateWallet } from '@/utils/wallet.utils';


describe('SharePortfolioModal (#881)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('truncateWallet helper', () => {
		it('returns empty string for empty input', () => {
			expect(truncateWallet('')).toBe('');
		});

		it('returns short address as is', () => {
			expect(truncateWallet('GBXYZ')).toBe('GBXYZ');
		});

		it('truncates standard 56-char Stellar address correctly', () => {
			const address = 'GBZXN7PIRZGNMHGA728RGRFZAPPWN9G83281XALXZK1234567890ABCD';
			const truncated = truncateWallet(address);
			expect(truncated).toBe('GBZXN7...ABCD');
			expect(truncated.length).toBe(13);
		});
	});

	describe('Modal component rendering', () => {
		const mockHoldings = [
			{ name: 'Creator Alpha', handle: 'alpha', quantity: 10, valueStroops: 50_000_000 },
			{ name: 'Creator Beta', handle: 'beta', quantity: 5, valueStroops: 25_000_000 },
			{ name: 'Creator Gamma', handle: 'gamma', quantity: 2, valueStroops: 10_000_000 },
		];

		it('renders modal dialog when open is true', () => {
			render(
				<SharePortfolioModal
					open={true}
					onOpenChange={vi.fn()}
					walletAddress="GBZXN7PIRZGNMHGA728RGRFZAPPWN9G83281XALXZK1234567890ABCD"
					totalInvested={85_000_000}
					currentValue={85_000_000}
					unrealisedPnL={0}
					pnlPercentage={0}
					topHoldings={mockHoldings}
				/>
			);

			expect(screen.getByText(/Share Portfolio Performance/i)).toBeInTheDocument();
			expect(screen.getByText(/Client-side generated social card preview/i)).toBeInTheDocument();
			expect(screen.getByTestId('copy-image-button')).toBeInTheDocument();
			expect(screen.getByTestId('download-png-button')).toBeInTheDocument();
		});

		it('calls onOpenChange(false) when Close button is clicked', () => {
			const onOpenChange = vi.fn();
			render(
				<SharePortfolioModal
					open={true}
					onOpenChange={onOpenChange}
					walletAddress="GBZXN7PIRZGNMHGA728RGRFZAPPWN9G83281XALXZK1234567890ABCD"
					totalInvested={85_000_000}
					currentValue={85_000_000}
					unrealisedPnL={0}
					pnlPercentage={0}
					topHoldings={mockHoldings}
				/>
			);

			fireEvent.click(screen.getByTestId('share-modal-close-button'));
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
