import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PortfolioPerformanceCard } from '@/components/common/PortfolioPerformanceCard';
import type { HeldKeyPosition, PnLSummary } from '@/utils/portfolioValue.utils';
import type { Course } from '@/services/course.service';

const mockCreators: Course[] = [
	{
		id: 'creator-1',
		title: 'Alpha Key',
		description: 'Alpha description',
		price: 10,
		priceStroops: 100_000_000, // 10 XLM
		instructorId: 'creator-1',
		category: 'Art',
		level: 'BEGINNER',
		socialHandle: '@alpha_art',
	},
	{
		id: 'creator-2',
		title: 'Beta Key',
		description: 'Beta description',
		price: 5,
		priceStroops: 50_000_000, // 5 XLM
		instructorId: 'creator-2',
		category: 'Music',
		level: 'INTERMEDIATE',
		socialHandle: 'beta_music',
	},
	{
		id: 'creator-3',
		title: 'Gamma Key',
		description: 'Gamma description',
		price: 2,
		priceStroops: 20_000_000, // 2 XLM
		instructorId: 'creator-3',
		category: 'Tech',
		level: 'ADVANCED',
	},
	{
		id: 'creator-4',
		title: 'Delta Key',
		description: 'Delta description',
		price: 1,
		priceStroops: 10_000_000, // 1 XLM
		instructorId: 'creator-4',
		category: 'Gaming',
		level: 'BEGINNER',
	},
];

const mockPositions: HeldKeyPosition[] = [
	{
		creatorId: 'creator-1',
		quantity: 2, // 2 * 10 = 20 XLM (200,000,000 stroops)
		priceStroops: 100_000_000,
	},
	{
		creatorId: 'creator-2',
		quantity: 10, // 10 * 5 = 50 XLM (500,000,000 stroops) -> Highest value!
		priceStroops: 50_000_000,
	},
	{
		creatorId: 'creator-3',
		quantity: 5, // 5 * 2 = 10 XLM (100,000,000 stroops) -> 3rd highest
		priceStroops: 20_000_000,
	},
	{
		creatorId: 'creator-4',
		quantity: 1, // 1 * 1 = 1 XLM (10,000,000 stroops) -> 4th, should be excluded from top 3
		priceStroops: 10_000_000,
	},
];

const mockPnL: PnLSummary = {
	totalInvested: 600_000_000, // 60 XLM
	currentValue: 810_000_000, // 81 XLM
	unrealisedPnL: 210_000_000, // +21 XLM
	pnlPercentage: 35.0,
	status: 'ready',
};

const TEST_WALLET = 'GDEMOWALLET0000000000000000000000000000000000000000000000001';

describe('PortfolioPerformanceCard (#881)', () => {
	it('renders AccessLayer logo and branding', () => {
		render(
			<PortfolioPerformanceCard
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		expect(screen.getByText('AccessLayer')).toBeInTheDocument();
		expect(screen.getByText('Creator Key Performance')).toBeInTheDocument();
		expect(screen.getByText('accesslayer.org')).toBeInTheDocument();
	});

	it('truncates wallet address correctly in the image card', () => {
		render(
			<PortfolioPerformanceCard
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		const walletBadge = screen.getByTestId('performance-card-wallet');
		// 56 char address truncated to first 4 + ... + last 4: 'GDEM...0001'
		expect(walletBadge).toHaveTextContent('GDEM...0001');
	});

	it('renders total value, unrealised PnL, and percentage return with positive styling', () => {
		render(
			<PortfolioPerformanceCard
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		const totalValue = screen.getByTestId('performance-card-total-value');
		expect(totalValue).toHaveTextContent('+81.00 XLM');

		const pnlElement = screen.getByTestId('performance-card-unrealised-pnl');
		expect(pnlElement).toHaveTextContent('+21.00 XLM');
		expect(pnlElement).toHaveClass('text-emerald-400');

		const pctElement = screen.getByTestId('performance-card-pnl-percentage');
		expect(pctElement).toHaveTextContent('+35.0% return');
	});

	it('renders negative unrealised PnL with red styling for losses', () => {
		const lossPnL: PnLSummary = {
			totalInvested: 500_000_000,
			currentValue: 350_000_000,
			unrealisedPnL: -150_000_000,
			pnlPercentage: -30.0,
			status: 'ready',
		};

		render(
			<PortfolioPerformanceCard
				pnlSummary={lossPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		const pnlElement = screen.getByTestId('performance-card-unrealised-pnl');
		expect(pnlElement).toHaveTextContent('-15.00 XLM');
		expect(pnlElement).toHaveClass('text-red-400');

		const pctElement = screen.getByTestId('performance-card-pnl-percentage');
		expect(pctElement).toHaveTextContent('-30.0% return');
	});

	it('sorts and displays top 3 holdings by value, excluding lower-ranked holdings', () => {
		render(
			<PortfolioPerformanceCard
				pnlSummary={mockPnL}
				walletAddress={TEST_WALLET}
				heldPositions={mockPositions}
				creators={mockCreators}
			/>
		);

		// #1 should be Beta Key (10 keys @ 5 = 50 XLM)
		const holding1 = screen.getByTestId('top-holding-0');
		expect(holding1).toHaveTextContent('Beta Key');
		expect(holding1).toHaveTextContent('#1');
		expect(holding1).toHaveTextContent('10 keys');
		expect(holding1).toHaveTextContent('50 XLM');

		// #2 should be Alpha Key (2 keys @ 10 = 20 XLM)
		const holding2 = screen.getByTestId('top-holding-1');
		expect(holding2).toHaveTextContent('Alpha Key');
		expect(holding2).toHaveTextContent('#2');
		expect(holding2).toHaveTextContent('2 keys');
		expect(holding2).toHaveTextContent('20 XLM');

		// #3 should be Gamma Key (5 keys @ 2 = 10 XLM)
		const holding3 = screen.getByTestId('top-holding-2');
		expect(holding3).toHaveTextContent('Gamma Key');
		expect(holding3).toHaveTextContent('#3');
		expect(holding3).toHaveTextContent('5 keys');
		expect(holding3).toHaveTextContent('10 XLM');

		// Delta Key (4th position) should NOT be displayed
		expect(screen.queryByTestId('top-holding-3')).not.toBeInTheDocument();
		expect(screen.queryByText('Delta Key')).not.toBeInTheDocument();
	});

	it('handles zero or empty holdings cleanly', () => {
		render(
			<PortfolioPerformanceCard
				pnlSummary={{
					totalInvested: 0,
					currentValue: 0,
					unrealisedPnL: 0,
					pnlPercentage: 0,
					status: 'ready',
				}}
				walletAddress={TEST_WALLET}
				heldPositions={[]}
				creators={mockCreators}
			/>
		);

		expect(screen.getByText('No held creator keys')).toBeInTheDocument();
	});
});
