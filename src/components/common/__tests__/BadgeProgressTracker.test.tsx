import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BadgeProgressTracker from '@/components/common/BadgeProgressTracker';
import {
	useWalletBadgeMetrics,
	useWalletBadges,
	useWalletHoldings,
} from '@/hooks/useWallet';
import {
	BADGE_CATALOG,
	type WalletBadge,
	type WalletBadgeMetrics,
} from '@/utils/walletBadges.utils';

vi.mock('@/hooks/useWallet', () => ({
	useWalletBadges: vi.fn(),
	useWalletBadgeMetrics: vi.fn(),
	useWalletHoldings: vi.fn(),
}));

const WALLET = '0x1111111111111111111111111111111111111111';
const refetchBadges = vi.fn();
const refetchMetrics = vi.fn();

function mockQueries({
	badges = [],
	metrics = {},
	holdingsUpdatedAt = 1,
	isLoading = false,
	isError = false,
}: {
	badges?: WalletBadge[];
	metrics?: Partial<WalletBadgeMetrics>;
	holdingsUpdatedAt?: number;
	isLoading?: boolean;
	isError?: boolean;
}) {
	vi.mocked(useWalletBadges).mockReturnValue({
		data: isLoading ? undefined : badges,
		isLoading,
		isError,
		refetch: refetchBadges,
	} as unknown as ReturnType<typeof useWalletBadges>);
	vi.mocked(useWalletBadgeMetrics).mockReturnValue({
		data: isLoading ? undefined : metrics,
		isLoading,
		isError: false,
		refetch: refetchMetrics,
	} as unknown as ReturnType<typeof useWalletBadgeMetrics>);
	vi.mocked(useWalletHoldings).mockReturnValue({
		dataUpdatedAt: holdingsUpdatedAt,
	} as unknown as ReturnType<typeof useWalletHoldings>);
}

describe('BadgeProgressTracker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders unearned badges with criteria and accurate progress', () => {
		mockQueries({ metrics: { tradeVolumeXlm: 2500, tradeCount: 40 } });
		render(<BadgeProgressTracker wallet={WALLET} />);

		const whale = screen.getByTestId('badge-progress-whale');
		expect(whale).toHaveTextContent('Whale');
		expect(whale).toHaveTextContent('Trade 10,000 XLM in creator key volume');
		expect(screen.getByTestId('badge-progress-whale-value')).toHaveTextContent(
			'2,500 / 10,000 XLM'
		);
		expect(screen.getByTestId('badge-progress-whale-bar')).toHaveAttribute(
			'aria-valuenow',
			'25'
		);
		expect(screen.getByTestId('badge-progress-top-trader-bar')).toHaveAttribute(
			'aria-valuenow',
			'40'
		);
	});

	it('shows earned badges with a check and earn date', () => {
		mockQueries({
			badges: [{ type: 'first-key', earnedAt: '2026-09-01T12:00:00Z' }],
		});
		render(<BadgeProgressTracker wallet={WALLET} />);

		const earned = screen.getByTestId('badge-progress-earned-first-key');
		expect(earned).toHaveTextContent('First Key');
		expect(earned).toHaveTextContent('Earned Sep 1, 2026');
		expect(screen.getByLabelText('Earned')).toBeInTheDocument();
		expect(screen.queryByTestId('badge-progress-first-key')).not.toBeInTheDocument();
	});

	it('hides the section when every badge is earned', () => {
		mockQueries({
			badges: BADGE_CATALOG.map(b => ({ type: b.id, earnedAt: '2026-09-01T00:00:00Z' })),
		});
		const { container } = render(<BadgeProgressTracker wallet={WALLET} />);
		expect(container).toBeEmptyDOMElement();
	});

	it('shows a loading skeleton while data loads', () => {
		mockQueries({ isLoading: true });
		render(<BadgeProgressTracker wallet={WALLET} />);
		expect(screen.getByTestId('badge-progress-loading')).toBeInTheDocument();
	});

	it('refetches progress when holdings change after a trade', () => {
		mockQueries({ holdingsUpdatedAt: 1000 });
		const { rerender } = render(<BadgeProgressTracker wallet={WALLET} />);
		expect(refetchBadges).not.toHaveBeenCalled();
		expect(refetchMetrics).not.toHaveBeenCalled();

		mockQueries({ holdingsUpdatedAt: 2000 });
		rerender(<BadgeProgressTracker wallet={WALLET} />);
		expect(refetchBadges).toHaveBeenCalledTimes(1);
		expect(refetchMetrics).toHaveBeenCalledTimes(1);
	});
});
