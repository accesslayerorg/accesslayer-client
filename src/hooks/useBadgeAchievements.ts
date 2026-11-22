import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useWalletBadges } from '@/hooks/useWallet';
import {
	badgeEventSocket,
	type BadgeMintedEvent,
} from '@/services/badgeEvents.service';
import { showBadgeEarnedToast } from '@/utils/badgeAchievementToast';
import type {
	WalletBadge,
	WalletBadgeType,
} from '@/utils/walletBadges.utils';

export interface UseBadgeAchievementsOptions {
	/** Invoked when the user taps "View Badges" in the achievement toast. */
	onViewBadges?: (profilePath: string) => void;
}

export interface UseBadgeAchievementsResult {
	/** Badge types celebrated during this session, in the order they arrived. */
	announced: WalletBadgeType[];
}

/** Path to a wallet's badge showcase on the profile page. */
export function badgeShowcasePath(wallet: string): string {
	return `/profile/${encodeURIComponent(wallet)}#wallet-badges`;
}

interface BadgeTracker {
	/** Wallet this tracker follows. */
	wallet: string;
	/**
	 * Badge types already accounted for — earned before the session started
	 * or already celebrated. Used to keep every badge to a single toast.
	 */
	known: Set<WalletBadgeType>;
	/** Badge types that actually got celebrated. */
	celebrated: Set<WalletBadgeType>;
	/** Whether the first badges payload for this wallet has been seen. */
	seeded: boolean;
}

/**
 * Watches a wallet for newly earned badges and celebrates them (#1222).
 *
 * Two detection paths feed the same announcement:
 *
 * 1. The realtime feed pushes a `BadgeMinted` event for the connected wallet.
 * 2. The badges endpoint is polled, so a badge minted while the realtime feed
 *    is unavailable is still picked up on the next poll.
 *
 * Announcing a badge refreshes the badge showcase and the badge progress
 * meters, so the profile updates without a page reload. Badges that were
 * already earned when the wallet was first seen are never celebrated.
 */
export function useBadgeAchievements(
	wallet: string | undefined,
	options: UseBadgeAchievementsOptions = {}
): UseBadgeAchievementsResult {
	const queryClient = useQueryClient();
	const { data: badges } = useWalletBadges(wallet ?? '');

	const trackerRef = useRef<BadgeTracker | null>(null);
	const [announced, setAnnounced] = useState<WalletBadgeType[]>([]);
	const onViewBadgesRef = useRef(options.onViewBadges);

	useEffect(() => {
		onViewBadgesRef.current = options.onViewBadges;
	}, [options.onViewBadges]);

	const getTracker = useCallback((address: string): BadgeTracker => {
		const current = trackerRef.current;
		if (current && current.wallet === address) return current;

		const tracker: BadgeTracker = {
			wallet: address,
			known: new Set<WalletBadgeType>(),
			celebrated: new Set<WalletBadgeType>(),
			seeded: false,
		};
		trackerRef.current = tracker;
		return tracker;
	}, []);

	const announce = useCallback(
		(badgeType: WalletBadgeType, earnedAt?: string) => {
			if (!wallet) return;

			const tracker = getTracker(wallet);

			// A badge is only ever celebrated once.
			if (tracker.known.has(badgeType)) return;
			tracker.known.add(badgeType);
			tracker.celebrated.add(badgeType);
			setAnnounced([...tracker.celebrated]);

			if (earnedAt) {
				// Put the badge in the cached book straight away so the
				// showcase shows it immediately, then let the refetch below
				// confirm it against the server.
				queryClient.setQueryData<WalletBadge[]>(
					queryKeys.wallet.badges(wallet),
					current => {
						const badges = current ?? [];
						if (badges.some(badge => badge.type === badgeType)) {
							return current;
						}
						return [...badges, { type: badgeType, earnedAt }];
					}
				);
			}

			// Refresh the showcase and progress meters so the new badge shows
			// up straight away, without a page reload.
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.badges(wallet),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.badgeMetrics(wallet),
			});

			const profilePath = badgeShowcasePath(wallet);
			showBadgeEarnedToast({
				badgeType,
				profilePath,
				onViewBadges: path => onViewBadgesRef.current?.(path),
			});
		},
		[getTracker, queryClient, wallet]
	);

	// Polled detection: a badge that appears after the first payload is new.
	useEffect(() => {
		if (!wallet || !badges) return;

		const tracker = getTracker(wallet);

		if (!tracker.seeded) {
			// First payload for this wallet: everything already earned counts
			// as known, so only genuinely new badges are celebrated.
			tracker.seeded = true;
			for (const badge of badges) {
				tracker.known.add(badge.type);
			}
			return;
		}

		for (const badge of badges) {
			if (!tracker.known.has(badge.type)) {
				announce(badge.type);
			}
		}
	}, [wallet, badges, announce, getTracker]);

	// Realtime detection: the backend pushes a BadgeMinted event.
	useEffect(() => {
		if (!wallet) return;

		return badgeEventSocket.subscribe(
			wallet,
			(event: BadgeMintedEvent) => {
				if (event.wallet.toLowerCase() !== wallet.toLowerCase()) return;
				announce(event.badgeType, event.earnedAt);
			}
		);
	}, [wallet, announce]);

	return { announced };
}

export default useBadgeAchievements;
