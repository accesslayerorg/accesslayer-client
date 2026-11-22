import { describe, expect, it } from 'vitest';
import {
	isCoCreatorAction,
	normalizeActorRole,
	toActionAttribution,
} from '@/utils/actionAttribution.utils';

const WALLET = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

describe('normalizeActorRole', () => {
	it('matches co-creator roles case-insensitively', () => {
		expect(normalizeActorRole('admin')).toBe('Admin');
		expect(normalizeActorRole(' REVENUE ')).toBe('Revenue');
		expect(normalizeActorRole('Content')).toBe('Content');
	});

	it('falls back to creator for unknown or missing roles', () => {
		expect(normalizeActorRole('creator')).toBe('creator');
		expect(normalizeActorRole('owner')).toBe('creator');
		expect(normalizeActorRole(undefined)).toBe('creator');
	});
});

describe('toActionAttribution', () => {
	it('reads nested actor and postedBy objects', () => {
		expect(toActionAttribution({ actor: { wallet: WALLET, role: 'Admin' } })).toEqual({
			wallet: WALLET,
			role: 'Admin',
		});
		expect(
			toActionAttribution({ postedBy: { wallet: WALLET, role: 'content' } })
		).toEqual({ wallet: WALLET, role: 'Content' });
	});

	it('reads flattened camelCase and snake_case fields', () => {
		expect(toActionAttribution({ actorWallet: WALLET, actorRole: 'Revenue' })).toEqual({
			wallet: WALLET,
			role: 'Revenue',
		});
		expect(toActionAttribution({ actor_wallet: WALLET })).toEqual({
			wallet: WALLET,
			role: 'creator',
		});
	});

	it('returns null when no acting wallet is present', () => {
		expect(toActionAttribution(undefined)).toBeNull();
		expect(toActionAttribution({})).toBeNull();
		expect(toActionAttribution({ actor: { wallet: '  ', role: 'Admin' } })).toBeNull();
	});
});

describe('isCoCreatorAction', () => {
	it('is false only for the primary creator', () => {
		expect(isCoCreatorAction({ wallet: WALLET, role: 'creator' })).toBe(false);
		expect(isCoCreatorAction({ wallet: WALLET, role: 'Admin' })).toBe(true);
	});
});
