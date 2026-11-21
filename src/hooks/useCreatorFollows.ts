import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * localStorage key backing the persisted "following creators" preference
 * (#1054). The map of followed addresses is stored under this single key so a
 * page refresh / new tab restores the follow button state.
 */
export const CREATOR_FOLLOWS_STORAGE_KEY = 'accesslayer.following-creators';

/**
 * Normalises a creator address for storage and lookup. Addresses are compared
 * case-insensitively so mixed-case Stellar / EVM addresses share one entry.
 */
export function normalizeCreatorAddress(address?: string | null): string {
	return (address ?? '').trim().toLowerCase();
}

interface CreatorFollowState {
	/** Followed creator addresses mapped to the epoch ms they were followed at. */
	followedCreators: Record<string, number>;
	/** Start following a creator. No-op for blank addresses. */
	follow: (address: string) => void;
	/** Stop following a creator. No-op when the creator is not followed. */
	unfollow: (address: string) => void;
	/** Toggle the follow state; returns the resulting `isFollowing` value. */
	toggleFollow: (address: string) => boolean;
	/** Whether the given creator address is currently followed. */
	isFollowing: (address?: string | null) => boolean;
	/** Followed creator addresses, oldest first. */
	getFollowedAddresses: () => string[];
}

/**
 * Client-side follow preference for creator public profiles (#1054).
 *
 * Follows are intentionally local-only (no account required) and persisted to
 * localStorage via zustand's `persist` middleware, so the state survives page
 * refreshes and is shared across every component that reads the store.
 */
export const useCreatorFollows = create<CreatorFollowState>()(
	persist(
		(set, get) => ({
			followedCreators: {},

			follow: address => {
				const key = normalizeCreatorAddress(address);
				if (!key) return;

				set(state => {
					if (key in state.followedCreators) return state;
					return {
						followedCreators: {
							...state.followedCreators,
							[key]: Date.now(),
						},
					};
				});
			},

			unfollow: address => {
				const key = normalizeCreatorAddress(address);
				if (!key) return;

				set(state => {
					if (!(key in state.followedCreators)) return state;
					const next = { ...state.followedCreators };
					delete next[key];
					return { followedCreators: next };
				});
			},

			toggleFollow: address => {
				if (get().isFollowing(address)) {
					get().unfollow(address);
					return false;
				}
				get().follow(address);
				return true;
			},

			isFollowing: address => {
				const key = normalizeCreatorAddress(address);
				return Boolean(key) && key in get().followedCreators;
			},

			getFollowedAddresses: () =>
				Object.keys(get().followedCreators).sort(
					(left, right) =>
						get().followedCreators[left] - get().followedCreators[right]
				),
		}),
		{
			name: CREATOR_FOLLOWS_STORAGE_KEY,
			storage: createJSONStorage(() => localStorage),
			partialize: state => ({ followedCreators: state.followedCreators }),
		}
	)
);
