import { beforeEach, describe, expect, it } from 'vitest';
import {
	CREATOR_FOLLOWS_STORAGE_KEY,
	normalizeCreatorAddress,
	useCreatorFollows,
} from '../useCreatorFollows';

function readPersistedFollows(): Record<string, number> {
	const raw = window.localStorage.getItem(CREATOR_FOLLOWS_STORAGE_KEY);
	if (!raw) return {};
	return JSON.parse(raw).state.followedCreators;
}

describe('useCreatorFollows (#1054)', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useCreatorFollows.setState({ followedCreators: {} });
	});

	it('follows and unfollows a creator', () => {
		const { follow, unfollow, isFollowing } = useCreatorFollows.getState();

		follow('GADDRESS');
		expect(isFollowing('GADDRESS')).toBe(true);

		unfollow('GADDRESS');
		expect(isFollowing('GADDRESS')).toBe(false);
	});

	it('treats addresses case-insensitively', () => {
		useCreatorFollows.getState().follow('GaDdReSs');

		expect(useCreatorFollows.getState().isFollowing('GADDRESS')).toBe(true);
		expect(readPersistedFollows()).toEqual({ gaddress: expect.any(Number) });
	});

	it('ignores blank addresses', () => {
		useCreatorFollows.getState().follow('   ');

		expect(useCreatorFollows.getState().getFollowedAddresses()).toEqual([]);
	});

	it('toggleFollow reports the resulting state', () => {
		expect(useCreatorFollows.getState().toggleFollow('GADDRESS')).toBe(true);
		expect(useCreatorFollows.getState().toggleFollow('GADDRESS')).toBe(false);
	});

	it('persists follows to localStorage so the button survives a refresh', () => {
		useCreatorFollows.getState().follow('GADDRESS');

		expect(readPersistedFollows()).toEqual({ gaddress: expect.any(Number) });
	});

	it('restores the follow state from persisted storage', () => {
		window.localStorage.setItem(
			CREATOR_FOLLOWS_STORAGE_KEY,
			JSON.stringify({
				state: { followedCreators: { gpersisted: 1_700_000_000_000 } },
				version: 0,
			})
		);

		useCreatorFollows.persist.rehydrate();

		expect(useCreatorFollows.getState().isFollowing('GPERSISTED')).toBe(true);
		expect(useCreatorFollows.getState().getFollowedAddresses()).toEqual([
			'gpersisted',
		]);
	});

	it('lists followed addresses oldest first', () => {
		useCreatorFollows.setState({
			followedCreators: { second: 2, first: 1 },
		});

		expect(useCreatorFollows.getState().getFollowedAddresses()).toEqual([
			'first',
			'second',
		]);
	});

	it('normalizes addresses by trimming and lowercasing', () => {
		expect(normalizeCreatorAddress('  GABC ')).toBe('gabc');
		expect(normalizeCreatorAddress(null)).toBe('');
	});
});
