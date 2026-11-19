import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useBadgeAchievements } from '@/hooks/useBadgeAchievements';
import { useWalletBadges } from '@/hooks/useWallet';
import { badgeEventSocket } from '@/services/badgeEvents.service';
import { showBadgeEarnedToast } from '@/utils/badgeAchievementToast';
import { queryKeys } from '@/lib/queryKeys';
import type { WalletBadge, WalletBadgeType } from '@/utils/walletBadges.utils';

vi.mock('@/hooks/useWallet', () => ({
	useWalletBadges: vi.fn(),
}));

vi.mock('@/services/badgeEvents.service', () => ({
	badgeEventSocket: { subscribe: vi.fn() },
}));

vi.mock('@/utils/badgeAchievementToast', () => ({
	showBadgeEarnedToast: vi.fn(),
}));

const WALLET = '0xabc';

type BadgeHandler = (event: {
	wallet: string;
	badgeType: WalletBadgeType;
	earnedAt: string;
}) => void;

let badgeHandler: BadgeHandler | null = null;

function mockBadges(badges: WalletBadge[]) {
	vi.mocked(useWalletBadges).mockReturnValue({
		data: badges,
	} as unknown as ReturnType<typeof useWalletBadges>);
}

describe('useBadgeAchievements (#1222)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		badgeHandler = null;

		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

		vi.mocked(badgeEventSocket.subscribe).mockImplementation(
			((_wallet: string, handler: BadgeHandler) => {
				badgeHandler = handler;
				return () => {};
			}) as unknown as typeof badgeEventSocket.subscribe
		);
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('does not celebrate badges that were already earned', () => {
		mockBadges([{ type: 'first-key', earnedAt: '2026-09-01T00:00:00Z' }]);

		renderHook(() => useBadgeAchievements(WALLET), { wrapper });

		expect(showBadgeEarnedToast).not.toHaveBeenCalled();
	});

	it('does not celebrate pre-existing badges when a mint event arrives first', async () => {
		// The wallet has not loaded its badges yet, so nothing is seeded.
		mockBadges(undefined as unknown as WalletBadge[]);
		const { rerender } = renderHook(() => useBadgeAchievements(WALLET), {
			wrapper,
		});

		await waitFor(() => expect(badgeHandler).not.toBeNull());
		act(() => {
			badgeHandler?.({
				wallet: WALLET,
				badgeType: 'whale',
				earnedAt: '2026-09-02T00:00:00Z',
			});
		});

		await waitFor(() => {
			expect(showBadgeEarnedToast).toHaveBeenCalledTimes(1);
		});

		// The first payload lands afterwards and still contains a badge that
		// was earned before the session — it must not be celebrated.
		mockBadges([
			{ type: 'first-key', earnedAt: '2026-09-01T00:00:00Z' },
			{ type: 'whale', earnedAt: '2026-09-02T00:00:00Z' },
		]);
		rerender();

		expect(showBadgeEarnedToast).toHaveBeenCalledTimes(1);
	});

	it('celebrates a badge that appears on a later poll', async () => {
		mockBadges([]);
		const { rerender } = renderHook(() => useBadgeAchievements(WALLET), {
			wrapper,
		});

		mockBadges([{ type: 'whale', earnedAt: '2026-09-02T00:00:00Z' }]);
		rerender();

		await waitFor(() => {
			expect(showBadgeEarnedToast).toHaveBeenCalledTimes(1);
		});
		expect(showBadgeEarnedToast).toHaveBeenCalledWith(
			expect.objectContaining({
				badgeType: 'whale',
				profilePath: `/profile/${WALLET}#wallet-badges`,
			})
		);
	});

	it('celebrates a badge when the realtime feed reports a mint', async () => {
		mockBadges([]);

		renderHook(() => useBadgeAchievements(WALLET), { wrapper });

		await waitFor(() => expect(badgeHandler).not.toBeNull());

		act(() => {
			badgeHandler?.({
				wallet: WALLET,
				badgeType: 'top-trader',
				earnedAt: '2026-09-03T00:00:00Z',
			});
		});

		await waitFor(() => {
			expect(showBadgeEarnedToast).toHaveBeenCalledTimes(1);
		});
		expect(showBadgeEarnedToast).toHaveBeenCalledWith(
			expect.objectContaining({ badgeType: 'top-trader' })
		);
	});

	it('ignores events addressed to another wallet', async () => {
		mockBadges([]);

		renderHook(() => useBadgeAchievements(WALLET), { wrapper });
		await waitFor(() => expect(badgeHandler).not.toBeNull());

		act(() => {
			badgeHandler?.({
				wallet: '0xsomeone-else',
				badgeType: 'whale',
				earnedAt: '2026-09-03T00:00:00Z',
			});
		});

		expect(showBadgeEarnedToast).not.toHaveBeenCalled();
	});

	it('never celebrates the same badge twice', async () => {
		mockBadges([]);
		const { rerender } = renderHook(() => useBadgeAchievements(WALLET), {
			wrapper,
		});

		mockBadges([{ type: 'whale', earnedAt: '2026-09-02T00:00:00Z' }]);
		rerender();

		await waitFor(() => {
			expect(showBadgeEarnedToast).toHaveBeenCalledTimes(1);
		});

		// The realtime feed repeats the same mint.
		await waitFor(() => expect(badgeHandler).not.toBeNull());
		act(() => {
			badgeHandler?.({
				wallet: WALLET,
				badgeType: 'whale',
				earnedAt: '2026-09-02T00:00:00Z',
			});
		});

		// And the next poll returns the same book.
		mockBadges([{ type: 'whale', earnedAt: '2026-09-02T00:00:00Z' }]);
		rerender();

		expect(showBadgeEarnedToast).toHaveBeenCalledTimes(1);
	});

	it('puts the new badge in the cached book so the showcase updates at once', async () => {
		mockBadges([]);
		queryClient.setQueryData(queryKeys.wallet.badges(WALLET), [
			{ type: 'first-key', earnedAt: '2026-09-01T00:00:00Z' },
		]);

		renderHook(() => useBadgeAchievements(WALLET), { wrapper });
		await waitFor(() => expect(badgeHandler).not.toBeNull());

		act(() => {
			badgeHandler?.({
				wallet: WALLET,
				badgeType: 'whale',
				earnedAt: '2026-09-02T00:00:00Z',
			});
		});

		await waitFor(() => {
			expect(queryClient.getQueryData(queryKeys.wallet.badges(WALLET))).toEqual([
				{ type: 'first-key', earnedAt: '2026-09-01T00:00:00Z' },
				{ type: 'whale', earnedAt: '2026-09-02T00:00:00Z' },
			]);
		});
	});

	it('refreshes the badge showcase and progress meters when a badge is earned', async () => {
		mockBadges([]);
		const { rerender } = renderHook(() => useBadgeAchievements(WALLET), {
			wrapper,
		});

		mockBadges([{ type: 'whale', earnedAt: '2026-09-02T00:00:00Z' }]);
		rerender();

		await waitFor(() => {
			expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: queryKeys.wallet.badges(WALLET),
			});
		});
		expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
			queryKey: queryKeys.wallet.badgeMetrics(WALLET),
		});
	});

	it('does nothing without a connected wallet', () => {
		mockBadges([]);

		renderHook(() => useBadgeAchievements(undefined), { wrapper });

		expect(badgeEventSocket.subscribe).not.toHaveBeenCalled();
		expect(showBadgeEarnedToast).not.toHaveBeenCalled();
	});
});
