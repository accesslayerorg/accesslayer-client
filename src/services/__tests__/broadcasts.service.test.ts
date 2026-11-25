import { beforeEach, describe, expect, it } from 'vitest';
import {
	BroadcastError,
	MAX_BROADCASTS_PER_MONTH,
	countAudience,
	createBroadcast,
	dispatchDueBroadcasts,
	getEmailSubscription,
	listBroadcasts,
	recordDeliveryReport,
	remainingAllowance,
	renderBroadcastEmail,
	resetBroadcastStore,
	setEmailOptIn,
	unsubscribeByToken,
} from '@/services/broadcasts.service';

const KEY = 'key-1';
const holders = [
	{ walletAddress: 'GA', keyCount: 1 },
	{ walletAddress: 'GB', keyCount: 5 },
	{ walletAddress: 'GC', keyCount: 10 },
	{ walletAddress: 'GD', keyCount: 20 },
];
const NOW = new Date('2026-11-10T12:00:00Z');
const msg = { keyId: KEY, subject: 'Update', body: 'Hello holders', minBalance: 1 };

beforeEach(() => {
	resetBroadcastStore();
	setEmailOptIn(KEY, 'GA', 'a@example.com', true);
	setEmailOptIn(KEY, 'GC', 'c@example.com', true);
	setEmailOptIn(KEY, 'GD', 'd@example.com', false); // explicitly off
	setEmailOptIn('other-key', 'GB', 'b@example.com', true); // other key only
});

describe('audience counting (#1476)', () => {
	it('counts only opted-in holders of this key', () => {
		const a = countAudience(KEY, holders, 1);
		expect(a.eligibleHolders).toBe(4);
		expect(a.recipients.map(r => r.wallet)).toEqual(['GA', 'GC']);
	});

	it('applies the minimum balance', () => {
		const a = countAudience(KEY, holders, 5);
		expect(a.eligibleHolders).toBe(3);
		expect(a.recipients.map(r => r.wallet)).toEqual(['GC']);
		expect(countAudience(KEY, holders, 50)).toEqual({ eligibleHolders: 0, recipients: [] });
	});

	it('is off by default and needs an email to opt in', () => {
		expect(getEmailSubscription(KEY, 'GB')).toBeNull();
		expect(() => setEmailOptIn(KEY, 'GB', 'nope', true)).toThrow(BroadcastError);
	});

	it('matches wallets case-insensitively and counts each holder once', () => {
		const a = countAudience(KEY, [...holders, { walletAddress: 'ga', keyCount: 3 }], 1);
		expect(a.eligibleHolders).toBe(4);
		expect(a.recipients).toHaveLength(2);
	});

	it('only emails opted-in holders when sending', () => {
		const b = createBroadcast(msg, holders, NOW);
		expect(b.recipients.map(r => r.email)).toEqual(['a@example.com', 'c@example.com']);
	});

	it('refuses to send when nobody opted in', () => {
		expect(() => createBroadcast({ ...msg, minBalance: 50 }, holders, NOW)).toThrow(/No opted-in holders/);
	});
});

describe('monthly limit (#1476)', () => {
	it('blocks a fifth broadcast in the same month with an explanation', () => {
		for (let i = 0; i < MAX_BROADCASTS_PER_MONTH; i++) {
			expect(remainingAllowance(KEY, NOW)).toBe(MAX_BROADCASTS_PER_MONTH - i);
			createBroadcast(msg, holders, NOW);
		}
		expect(remainingAllowance(KEY, NOW)).toBe(0);
		let error: unknown;
		try {
			createBroadcast(msg, holders, NOW);
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(BroadcastError);
		expect((error as BroadcastError).code).toBe('limit');
		expect((error as BroadcastError).message).toMatch(/all 4 broadcasts for November 2026/);
		expect(listBroadcasts(KEY)).toHaveLength(4);
	});

	it('counts per key and resets next month', () => {
		for (let i = 0; i < 4; i++) createBroadcast(msg, holders, NOW);
		expect(remainingAllowance('other-key', NOW)).toBe(4);
		const december = new Date('2026-12-01T00:00:00Z');
		expect(remainingAllowance(KEY, december)).toBe(4);
		expect(() => createBroadcast(msg, holders, december)).not.toThrow();
	});

	it('counts scheduled broadcasts against the month they go out in', () => {
		for (let i = 0; i < 4; i++)
			createBroadcast({ ...msg, scheduledFor: new Date('2026-12-05T09:00:00Z') }, holders, NOW);
		expect(remainingAllowance(KEY, NOW)).toBe(4);
		expect(remainingAllowance(KEY, new Date('2026-12-20T00:00:00Z'))).toBe(0);
		expect(() =>
			createBroadcast({ ...msg, scheduledFor: new Date('2026-12-06T09:00:00Z') }, holders, NOW)
		).toThrow(/December 2026/);
	});
});

describe('unsubscribe (#1476)', () => {
	it('puts an unsubscribe link in every email', () => {
		const b = createBroadcast(msg, holders, NOW);
		for (const r of b.recipients) {
			const email = renderBroadcastEmail(b, r, { origin: 'https://app.example.com', keyName: 'Ada' });
			const link = `https://app.example.com/unsubscribe/${r.unsubscribeToken}?b=${b.id}`;
			expect(email.text).toContain(link);
			expect(email.listUnsubscribe).toBe(`<${link}>`);
		}
	});

	it('takes effect immediately and excludes the holder from later sends', () => {
		const first = createBroadcast(msg, holders, NOW);
		const token = first.recipients.find(r => r.wallet === 'GA')!.unsubscribeToken;
		expect(unsubscribeByToken(token, first.id)?.optedIn).toBe(false);
		expect(countAudience(KEY, holders, 1).recipients.map(r => r.wallet)).toEqual(['GC']);
		const second = createBroadcast(msg, holders, NOW);
		expect(second.recipients.map(r => r.wallet)).toEqual(['GC']);
		expect(listBroadcasts(KEY).find(b => b.id === first.id)!.unsubscribed).toBe(1);
	});

	it('skips holders who unsubscribed after a broadcast was scheduled', () => {
		const scheduled = createBroadcast({ ...msg, scheduledFor: new Date('2026-11-11T09:00:00Z') }, holders, NOW);
		expect(scheduled.recipients).toEqual([]);
		unsubscribeByToken(getEmailSubscription(KEY, 'GC')!.unsubscribeToken);
		expect(dispatchDueBroadcasts(KEY, holders, NOW)).toEqual([]); // not due yet
		const [sent] = dispatchDueBroadcasts(KEY, holders, new Date('2026-11-11T09:00:01Z'));
		expect(sent.status).toBe('sent');
		expect(sent.recipients.map(r => r.wallet)).toEqual(['GA']);
	});

	it('counts an unsubscribe once and ignores unknown tokens', () => {
		const b = createBroadcast(msg, holders, NOW);
		const token = b.recipients[0].unsubscribeToken;
		unsubscribeByToken(token, b.id);
		unsubscribeByToken(token, b.id);
		expect(listBroadcasts(KEY)[0].unsubscribed).toBe(1);
		expect(unsubscribeByToken('missing')).toBeNull();
	});

	it('keeps the same token when opting back in', () => {
		const token = getEmailSubscription(KEY, 'GA')!.unsubscribeToken;
		unsubscribeByToken(token);
		expect(setEmailOptIn(KEY, 'GA', '', true).unsubscribeToken).toBe(token);
	});
});

describe('delivery statistics', () => {
	it('stays unknown until the provider reports, then records it', () => {
		const b = createBroadcast(msg, holders, NOW);
		expect([b.delivered, b.bounced]).toEqual([null, null]);
		const reported = recordDeliveryReport(b.id, { delivered: 1, bounced: 1 });
		expect([reported.delivered, reported.bounced]).toEqual([1, 1]);
	});
});
