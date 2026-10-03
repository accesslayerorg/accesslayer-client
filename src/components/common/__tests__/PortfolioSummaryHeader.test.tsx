import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PortfolioSummaryHeader from '@/components/common/PortfolioSummaryHeader';
import type { PnLSummary } from '@/utils/portfolioValue.utils';

const readyPnL: PnLSummary = {
	totalInvested: 10_000_000,
	currentValue: 12_000_000,
	unrealisedPnL: 2_000_000,
	pnlPercentage: 20,
	status: 'ready',
};

function renderHeader(overrides: Record<string, unknown> = {}) {
	return render(
		<PortfolioSummaryHeader
			heldValueStroops={10_000_000}
			stakedValueStroops={5_000_000}
			heldPositionCount={2}
			stakedPositionCount={1}
			pnl={readyPnL}
			isOwnProfile={true}
			onShareProfile={vi.fn()}
			isShareCopied={false}
			{...overrides}
		/>
	);
}

describe('PortfolioSummaryHeader (#921)', () => {
	it('sums held keys and staking positions into the portfolio total', () => {
		renderHeader();

		// 10_000_000 stroops (1 XLM) held + 5_000_000 (0.5 XLM) staked = 1.5 XLM
		expect(screen.getByTestId('portfolio-summary-total')).toHaveTextContent(
			'1.5 XLM'
		);
	});

	it('shows the held and staked segment counts and values', () => {
		renderHeader();

		expect(
			screen.getByTestId('portfolio-summary-held-count')
		).toHaveTextContent('2');
		expect(
			screen.getByTestId('portfolio-summary-held-value')
		).toHaveTextContent('1 XLM');

		expect(
			screen.getByTestId('portfolio-summary-staked-count')
		).toHaveTextContent('1');
		expect(
			screen.getByTestId('portfolio-summary-staked-value')
		).toHaveTextContent('0.5 XLM');
	});

	it('renders the unrealised PnL band when the summary is ready', () => {
		renderHeader();

		const pnl = screen.getByTestId('portfolio-summary-pnl');
		expect(pnl).toHaveTextContent('Unrealised PnL');
		expect(pnl).toHaveTextContent('+0.20 XLM');
		expect(pnl).toHaveTextContent('+20.0%');
	});

	it('calls onShareProfile when the owner clicks share and flips the label to Copied', () => {
		const onShareProfile = vi.fn();
		const { rerender } = renderHeader({ onShareProfile });

		fireEvent.click(screen.getByTestId('share-profile-button'));
		expect(onShareProfile).toHaveBeenCalledTimes(1);

		rerender(
			<PortfolioSummaryHeader
				heldValueStroops={10_000_000}
				stakedValueStroops={5_000_000}
				heldPositionCount={2}
				stakedPositionCount={1}
				pnl={readyPnL}
				isOwnProfile={true}
				onShareProfile={onShareProfile}
				isShareCopied={true}
			/>
		);

		expect(
			screen.getByRole('button', { name: 'Copied!' })
		).toBeInTheDocument();
	});

	it('withholds the total when either segment is unavailable', () => {
		renderHeader({ stakedValueStroops: null });

		expect(screen.getByTestId('portfolio-summary-total')).toHaveTextContent(
			'Unavailable'
		);
	});

	it('keeps the share action available when there is no PnL band', () => {
		renderHeader({
			pnl: {
				totalInvested: 0,
				currentValue: 0,
				unrealisedPnL: 0,
				pnlPercentage: 0,
				status: 'ready',
			},
		});

		expect(
			screen.queryByTestId('portfolio-summary-pnl')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('share-profile-button')).toBeInTheDocument();
	});

	it('hides the share button for public profile views', () => {
		renderHeader({ isOwnProfile: false });

		expect(
			screen.queryByTestId('share-profile-button')
		).not.toBeInTheDocument();
	});

	it('shows a loading placeholder while prices are still loading', () => {
		renderHeader({ isPriceLoading: true });

		expect(screen.getByTestId('portfolio-summary-total')).toHaveTextContent(
			'Loading prices…'
		);
	});
});
