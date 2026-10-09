import { describe, expect, it } from 'vitest';
import type { Course } from '@/services/course.service';
import {
	aggregateCreatorProfileStats,
	filterKeysByCreator,
	formatMemberSince,
	isSameCreatorAddress,
	resolveCreatorKeyStatus,
	resolveCreatorSocialLinks,
	toCreatorKeySummary,
} from '../creatorProfile.utils';

function makeKey(overrides: Partial<Course> = {}): Course {
	return {
		id: 'key-1',
		title: 'Alpha Key',
		description: 'First key',
		price: 0.5,
		priceStroops: 5_000_000,
		instructorId: 'GCREATOR',
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

describe('creatorProfile.utils – isSameCreatorAddress', () => {
	it('matches addresses case-insensitively', () => {
		expect(isSameCreatorAddress('GABC', 'gabc')).toBe(true);
	});

	it('never matches blank addresses', () => {
		expect(isSameCreatorAddress('', '')).toBe(false);
		expect(isSameCreatorAddress(null, 'gabc')).toBe(false);
		expect(isSameCreatorAddress('gabc', '   ')).toBe(false);
	});
});

describe('creatorProfile.utils – filterKeysByCreator', () => {
	it('keeps only the keys deployed by the creator', () => {
		const keys = filterKeysByCreator(
			[
				makeKey({ id: 'a', instructorId: 'gcreator' }),
				makeKey({ id: 'b', instructorId: 'GOTHER' }),
				makeKey({ id: 'c', instructorId: 'GCREATOR' }),
			],
			'gcreator'
		);

		expect(keys.map(key => key.id)).toEqual(['a', 'c']);
	});

	it('returns an empty list for a blank address', () => {
		expect(filterKeysByCreator([makeKey()], '  ')).toEqual([]);
	});
});

describe('creatorProfile.utils – aggregateCreatorProfileStats (#1054)', () => {
	it('sums volume and holders across every creator key', () => {
		const stats = aggregateCreatorProfileStats([
			makeKey({ id: 'a', totalVolume: 2_000_000, holderCount: 10 }),
			makeKey({ id: 'b', totalVolume: 6_000_000, holderCount: 20 }),
		]);

		expect(stats.keyCount).toBe(2);
		expect(stats.totalVolumeStroops).toBe(8_000_000);
		expect(stats.totalHolders).toBe(30);
	});

	it('prefers all-time totalVolume over the rolling 24h figure', () => {
		const stats = aggregateCreatorProfileStats([
			makeKey({ id: 'a', totalVolume: 9_000_000, volume24h: 1_000 }),
			makeKey({ id: 'b', volume24h: 500_000 }),
		]);

		expect(stats.totalVolumeStroops).toBe(9_500_000);
	});

	it('falls back to the alternate holder-count fields', () => {
		const stats = aggregateCreatorProfileStats([
			makeKey({ id: 'a', holdersCount: 4, holderCount: undefined }),
			makeKey({ id: 'b', holders: 6, holderCount: undefined }),
		]);

		expect(stats.totalHolders).toBe(10);
	});

	it('averages ratings across rated keys only', () => {
		const ratings = new Map<string, number>([
			['a', 4],
			['b', 5],
		]);

		const stats = aggregateCreatorProfileStats(
			[makeKey({ id: 'a' }), makeKey({ id: 'b' }), makeKey({ id: 'c' })],
			ratings
		);

		expect(stats.averageRating).toBe(4.5);
		expect(stats.ratedKeyCount).toBe(2);
	});

	it('ignores unrated and zero-rated keys when averaging', () => {
		const stats = aggregateCreatorProfileStats(
			[makeKey({ id: 'a' }), makeKey({ id: 'b' })],
			new Map([['a', 0]])
		);

		expect(stats.averageRating).toBeNull();
		expect(stats.ratedKeyCount).toBe(0);
	});

	it('returns neutral stats for a creator with no keys', () => {
		expect(aggregateCreatorProfileStats([])).toEqual({
			keyCount: 0,
			totalVolumeStroops: 0,
			totalHolders: 0,
			averageRating: null,
			ratedKeyCount: 0,
		});
	});
});

describe('creatorProfile.utils – resolveCreatorKeyStatus', () => {
	const now = Date.parse('2026-01-01T00:00:00.000Z');

	it('marks deprecated keys as deprecated', () => {
		expect(resolveCreatorKeyStatus(makeKey({ deprecated: true }), now)).toBe(
			'deprecated'
		);
	});

	it('marks keys with a future drop as scheduled', () => {
		expect(
			resolveCreatorKeyStatus(
				makeKey({ nextDropAt: '2026-02-01T00:00:00.000Z' }),
				now
			)
		).toBe('scheduled');
	});

	it('marks keys whose drop has passed as live', () => {
		expect(
			resolveCreatorKeyStatus(
				makeKey({ nextDropAt: '2025-12-01T00:00:00.000Z' }),
				now
			)
		).toBe('live');
	});

	it('defaults to live', () => {
		expect(resolveCreatorKeyStatus(makeKey(), now)).toBe('live');
	});
});

describe('creatorProfile.utils – resolveCreatorSocialLinks (#1054)', () => {
	it('renders no links when the creator set none', () => {
		expect(
			resolveCreatorSocialLinks([makeKey({ socialHandle: undefined })])
		).toEqual([]);
	});

	it('uses the creator handle as the X link', () => {
		const links = resolveCreatorSocialLinks([
			makeKey({ socialHandle: '@arivers' }),
		]);

		expect(links).toEqual([
			{ platform: 'twitter', label: 'X', url: 'https://x.com/arivers' },
		]);
	});

	it('renders each published link with an absolute url', () => {
		const links = resolveCreatorSocialLinks([
			makeKey({
				socialHandle: undefined,
				socialLinks: {
					twitter: 'arivers',
					website: 'arivers.dev',
					discord: 'https://discord.gg/abc123',
				},
			}),
		]);

		expect(links).toEqual([
			{ platform: 'twitter', label: 'X', url: 'https://x.com/arivers' },
			{ platform: 'website', label: 'Website', url: 'https://arivers.dev' },
			{
				platform: 'discord',
				label: 'Discord',
				url: 'https://discord.gg/abc123',
			},
		]);
	});

	it('skips blank values and deduplicates platforms across keys', () => {
		const links = resolveCreatorSocialLinks([
			makeKey({ socialHandle: undefined, socialLinks: { twitter: '  ' } }),
			makeKey({
				socialHandle: undefined,
				socialLinks: { twitter: 'arivers' },
			}),
			makeKey({
				socialHandle: undefined,
				socialLinks: { twitter: 'other' },
			}),
		]);

		expect(links).toEqual([
			{ platform: 'twitter', label: 'X', url: 'https://x.com/arivers' },
		]);
	});
});

describe('creatorProfile.utils – toCreatorKeySummary', () => {
	it('maps a key onto the profile grid shape', () => {
		const summary = toCreatorKeySummary(
			makeKey({
				title: '  Alpha   Key ',
				name: 'Alex Rivers',
				socialHandle: '@ARivers',
				thumbnail: 'https://cdn.example/a.png',
				category: 'Music',
				totalVolume: 3_000_000,
				holderCount: 7,
			}),
			4.2
		);

		expect(summary).toEqual({
			id: 'key-1',
			title: 'Alpha Key',
			handle: '@arivers',
			avatarUrl: 'https://cdn.example/a.png',
			category: 'Music',
			priceStroops: 5_000_000,
			status: 'live',
			holderCount: 7,
			volumeStroops: 3_000_000,
			rating: 4.2,
		});
	});
});

describe('creatorProfile.utils – formatMemberSince', () => {
	it('formats a valid join date as month + year', () => {
		expect(formatMemberSince('2024-03-15T12:00:00.000Z')).toBe('Mar 2024');
	});

	it('returns null for missing or invalid dates', () => {
		expect(formatMemberSince(null)).toBeNull();
		expect(formatMemberSince('not-a-date')).toBeNull();
	});
});
