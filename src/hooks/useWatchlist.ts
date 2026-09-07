import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Course } from '@/services/course.service';

/**
 * localStorage key used by the persisted watchlist store. The store keeps a
 * separate list of bookmarked creator keys per wallet address, so the whole
 * record is persisted under this single key (the wallet address scopes the
 * list within it).
 */
export const WATCHLIST_STORAGE_KEY = 'accesslayer.watchlist';

/**
 * Fallback key used when no wallet is connected. Bookmarked keys are still
 * persisted in localStorage but scoped under this shared guest key rather
 * than a specific wallet address.
 */
export const GUEST_WATCHLIST_KEY = 'guest';

/**
 * Resolves the scoping key for a wallet address. Addresses are normalised to
 * lowercase so mixed-case Stellar / EVM addresses share the same list.
 */
export function resolveWatchlistWalletKey(
	address?: string | null
): string {
	if (!address || !address.trim()) return GUEST_WATCHLIST_KEY;
	return address.trim().toLowerCase();
}

interface WatchlistState {
	/** Bookmarked creator keys keyed by resolved wallet key. */
	bookmarksByWallet: Record<string, Course[]>;
	/** Toggle a creator key in the given wallet's watchlist. */
	toggleBookmark: (wallet: string | null | undefined, creator: Course) => void;
	/** Remove a creator key from the given wallet's watchlist by id. */
	removeBookmark: (
		wallet: string | null | undefined,
		creatorId: string
	) => void;
	/** Return the bookmarked creator keys for the given wallet. */
	getWatchlist: (wallet: string | null | undefined) => Course[];
	/** Whether a creator is bookmarked for the given wallet. */
	isBookmarked: (
		wallet: string | null | undefined,
		creatorId: string
	) => boolean;
	/** Number of bookmarked creator keys for the given wallet. */
	getWatchlistCount: (wallet: string | null | undefined) => number;
	/** Remove every bookmark for the given wallet. */
	clearWalletBookmarks: (wallet: string | null | undefined) => void;
}

const EMPTY_COURSE_LIST: Course[] = [];

/**
 * Tracks the currently connected wallet key for the active session, so that
 * watchlist-aware components (the bookmark button, navbar badge, detail page,
 * etc.) can scope their lookups without each one having to call wagmi's
 * `useAccount` directly. It is kept as a lightweight, non-persisted store that
 * is seeded from the wallet address where the app already reads it safely, and
 * falls back to the guest key when no wallet is connected.
 */
interface ConnectedWalletState {
	walletKey: string;
	setWalletKey: (address?: string | null) => void;
}

export const useConnectedWallet = create<ConnectedWalletState>(set => ({
	walletKey: GUEST_WATCHLIST_KEY,
	setWalletKey: address =>
		set({ walletKey: resolveWatchlistWalletKey(address) }),
}));


export const useWatchlist = create<WatchlistState>()(
	persist(
		(set, get) => ({
			bookmarksByWallet: {},

			toggleBookmark: (wallet, creator) => {
				const key = resolveWatchlistWalletKey(wallet);
				const current = get().bookmarksByWallet[key] ?? [];
				const alreadyBookmarked = current.some(c => c.id === creator.id);

				const next = alreadyBookmarked
					? current.filter(c => c.id !== creator.id)
					: [...current, creator];

				set(state => ({
					bookmarksByWallet: {
						...state.bookmarksByWallet,
						[key]: next,
					},
				}));
			},

			removeBookmark: (wallet, creatorId) => {
				const key = resolveWatchlistWalletKey(wallet);
				const current = get().bookmarksByWallet[key] ?? [];
				const next = current.filter(c => c.id !== creatorId);

				set(state => ({
					bookmarksByWallet: {
						...state.bookmarksByWallet,
						[key]: next,
					},
				}));
			},

			getWatchlist: wallet => {
				const key = resolveWatchlistWalletKey(wallet);
				return get().bookmarksByWallet[key] ?? EMPTY_COURSE_LIST;
			},

			isBookmarked: (wallet, creatorId) => {
				const key = resolveWatchlistWalletKey(wallet);
				return Boolean(
					(get().bookmarksByWallet[key] ?? []).some(
						c => c.id === creatorId
					)
				);
			},

			getWatchlistCount: wallet => {
				const key = resolveWatchlistWalletKey(wallet);
				return (get().bookmarksByWallet[key] ?? []).length;
			},

			clearWalletBookmarks: wallet => {
				const key = resolveWatchlistWalletKey(wallet);
				set(state => {
					const next = { ...state.bookmarksByWallet };
					delete next[key];
					return { bookmarksByWallet: next };
				});
			},
		}),
		{
			name: WATCHLIST_STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: state => ({ bookmarksByWallet: state.bookmarksByWallet }),
		}
	)
);
