import {
	readLocalCollection,
	resetLocalCollection,
	writeLocalCollection,
} from '@/services/localCollection.service';

/**
 * Opt-in creator email broadcasts (#1476).
 *
 * Holders opt in per key (off by default) with an email address. A creator
 * broadcast goes only to holders who are opted in *at send time* and hold at
 * least the chosen minimum balance. Every email carries a per-subscription
 * unsubscribe link that takes effect immediately, so later sends skip that
 * holder. Each key may send at most MAX_BROADCASTS_PER_MONTH broadcasts per
 * calendar month (UTC); scheduled broadcasts count against the month they are
 * scheduled for.
 *
 * Stored through the shared local collection like the other creator tools.
 * Actual email delivery needs a backend; delivered and bounced counts stay
 * null until a delivery report is recorded for the broadcast.
 */

const SUBSCRIPTIONS_KEY = 'creator-email-subscriptions';
const BROADCASTS_KEY = 'creator-email-broadcasts';

export const MAX_BROADCASTS_PER_MONTH = 4;
export const MAX_SUBJECT_LENGTH = 120;
export const MAX_BODY_LENGTH = 5_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailSubscription {
	keyId: string;
	wallet: string;
	email: string;
	optedIn: boolean;
	/** Secret used in the unsubscribe link; stable for the subscription. */
	unsubscribeToken: string;
	updatedAt: string;
}

export interface BroadcastRecipient {
	wallet: string;
	email: string;
	unsubscribeToken: string;
}

export type BroadcastStatus = 'scheduled' | 'sent';

export interface Broadcast {
	id: string;
	keyId: string;
	subject: string;
	body: string;
	minBalance: number;
	status: BroadcastStatus;
	createdAt: string;
	/** When it is (or was) due to go out; the month it counts against. */
	sendAt: string;
	sentAt: string | null;
	/** Snapshot of who it was sent to, taken at send time. */
	recipients: BroadcastRecipient[];
	/** From the email provider's delivery report; null until reported. */
	delivered: number | null;
	bounced: number | null;
	/** Recipients who used this broadcast's unsubscribe link. */
	unsubscribed: number;
}

export interface AudienceHolder {
	walletAddress: string;
	keyCount: number;
}

export interface Audience {
	/** Holders at or above the minimum balance, opted in or not. */
	eligibleHolders: number;
	/** The opted-in subset that would receive the email. */
	recipients: BroadcastRecipient[];
}

export class BroadcastError extends Error {
	readonly code: 'limit' | 'invalid' | 'no-audience' | 'not-found';

	constructor(code: BroadcastError['code'], message: string) {
		super(message);
		this.name = 'BroadcastError';
		this.code = code;
	}
}

const readSubs = () => readLocalCollection<EmailSubscription>(SUBSCRIPTIONS_KEY, () => []);
const readBroadcasts = () => readLocalCollection<Broadcast>(BROADCASTS_KEY, () => []);
const sameWallet = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function newToken(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export function getEmailSubscription(keyId: string, wallet: string): EmailSubscription | null {
	return readSubs().find(s => s.keyId === keyId && sameWallet(s.wallet, wallet)) ?? null;
}

export function listEmailSubscriptions(wallet: string): EmailSubscription[] {
	return readSubs().filter(s => sameWallet(s.wallet, wallet));
}

/** Opts a holder in or out of a key's emails. Opting in requires a valid email. */
export function setEmailOptIn(
	keyId: string,
	wallet: string,
	email: string,
	optedIn: boolean,
	now: Date = new Date()
): EmailSubscription {
	const all = readSubs();
	const existing = all.find(s => s.keyId === keyId && sameWallet(s.wallet, wallet));
	const address = email.trim() || existing?.email || '';
	if (optedIn && !EMAIL_RE.test(address))
		throw new BroadcastError('invalid', 'Enter a valid email address to opt in.');
	const next: EmailSubscription = {
		keyId,
		wallet,
		email: address,
		optedIn,
		unsubscribeToken: existing?.unsubscribeToken ?? newToken(),
		updatedAt: now.toISOString(),
	};
	writeLocalCollection(SUBSCRIPTIONS_KEY, [...all.filter(s => s !== existing), next]);
	return next;
}

/**
 * One-click unsubscribe from an email link. Takes effect immediately; when the
 * link came from a broadcast, that broadcast's unsubscribed count goes up once.
 * Returns the subscription, or null for an unknown token.
 */
export function unsubscribeByToken(
	token: string,
	broadcastId?: string | null,
	now: Date = new Date()
): EmailSubscription | null {
	const all = readSubs();
	const sub = all.find(s => s.unsubscribeToken === token);
	if (!sub) return null;
	if (!sub.optedIn) return sub;
	const updated = { ...sub, optedIn: false, updatedAt: now.toISOString() };
	writeLocalCollection(SUBSCRIPTIONS_KEY, all.map(s => (s === sub ? updated : s)));
	if (broadcastId) {
		const broadcasts = readBroadcasts();
		const b = broadcasts.find(x => x.id === broadcastId && x.keyId === sub.keyId);
		if (b && b.recipients.some(r => r.unsubscribeToken === token))
			writeLocalCollection(
				BROADCASTS_KEY,
				broadcasts.map(x => (x === b ? { ...b, unsubscribed: b.unsubscribed + 1 } : x))
			);
	}
	return updated;
}

// ── Audience ─────────────────────────────────────────────────────────────────

/** Who a broadcast to `keyId` would reach right now. */
export function countAudience(
	keyId: string,
	holders: readonly AudienceHolder[],
	minBalance: number
): Audience {
	const min = Math.max(1, Math.floor(minBalance) || 1);
	const optedIn = new Map(
		readSubs()
			.filter(s => s.keyId === keyId && s.optedIn && s.email)
			.map(s => [s.wallet.toLowerCase(), s])
	);
	const seen = new Set<string>();
	let eligibleHolders = 0;
	const recipients: BroadcastRecipient[] = [];
	for (const h of holders) {
		const wallet = h.walletAddress.toLowerCase();
		if (seen.has(wallet) || h.keyCount < min) continue;
		seen.add(wallet);
		eligibleHolders++;
		const sub = optedIn.get(wallet);
		if (sub) recipients.push({ wallet: sub.wallet, email: sub.email, unsubscribeToken: sub.unsubscribeToken });
	}
	return { eligibleHolders, recipients };
}

// ── Monthly limit ────────────────────────────────────────────────────────────

const monthOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export function broadcastsInMonth(keyId: string, at: Date): Broadcast[] {
	const month = monthOf(at);
	return readBroadcasts().filter(b => b.keyId === keyId && monthOf(new Date(b.sendAt)) === month);
}

export function remainingAllowance(keyId: string, at: Date = new Date()): number {
	return Math.max(0, MAX_BROADCASTS_PER_MONTH - broadcastsInMonth(keyId, at).length);
}

export function limitMessage(at: Date): string {
	const month = at.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
	return `You have used all ${MAX_BROADCASTS_PER_MONTH} broadcasts for ${month}. Each key can send ${MAX_BROADCASTS_PER_MONTH} per calendar month so holders are not flooded; the allowance resets on the 1st (UTC).`;
}

// ── Sending ──────────────────────────────────────────────────────────────────

export interface BroadcastInput {
	keyId: string;
	subject: string;
	body: string;
	minBalance: number;
	/** Omit to send now. */
	scheduledFor?: Date | null;
}

function validate(input: BroadcastInput, now: Date): { sendAt: Date } {
	if (!input.subject.trim()) throw new BroadcastError('invalid', 'Add a subject.');
	if (input.subject.trim().length > MAX_SUBJECT_LENGTH)
		throw new BroadcastError('invalid', `Keep the subject to ${MAX_SUBJECT_LENGTH} characters.`);
	if (!input.body.trim()) throw new BroadcastError('invalid', 'Write a message.');
	if (input.body.length > MAX_BODY_LENGTH)
		throw new BroadcastError('invalid', `Keep the message to ${MAX_BODY_LENGTH} characters.`);
	if (!Number.isFinite(input.minBalance) || input.minBalance < 1)
		throw new BroadcastError('invalid', 'The minimum balance must be at least 1 key.');
	const sendAt = input.scheduledFor ?? now;
	if (input.scheduledFor && input.scheduledFor.getTime() <= now.getTime())
		throw new BroadcastError('invalid', 'Pick a time in the future to schedule.');
	if (remainingAllowance(input.keyId, sendAt) === 0)
		throw new BroadcastError('limit', limitMessage(sendAt));
	return { sendAt };
}

/** Sends now (scheduledFor omitted) or schedules a broadcast. */
export function createBroadcast(
	input: BroadcastInput,
	holders: readonly AudienceHolder[],
	now: Date = new Date()
): Broadcast {
	const { sendAt } = validate(input, now);
	const scheduled = Boolean(input.scheduledFor);
	const recipients = scheduled ? [] : countAudience(input.keyId, holders, input.minBalance).recipients;
	if (!scheduled && recipients.length === 0)
		throw new BroadcastError(
			'no-audience',
			'No opted-in holders match this audience yet, so there is no one to email.'
		);
	const broadcast: Broadcast = {
		id: newToken(),
		keyId: input.keyId,
		subject: input.subject.trim(),
		body: input.body,
		minBalance: Math.floor(input.minBalance),
		status: scheduled ? 'scheduled' : 'sent',
		createdAt: now.toISOString(),
		sendAt: sendAt.toISOString(),
		sentAt: scheduled ? null : now.toISOString(),
		recipients,
		delivered: null,
		bounced: null,
		unsubscribed: 0,
	};
	writeLocalCollection(BROADCASTS_KEY, [...readBroadcasts(), broadcast]);
	return broadcast;
}

/**
 * Sends scheduled broadcasts that are due. The audience is taken at dispatch
 * time, so anyone who unsubscribed after scheduling is skipped.
 */
export function dispatchDueBroadcasts(
	keyId: string,
	holders: readonly AudienceHolder[],
	now: Date = new Date()
): Broadcast[] {
	const all = readBroadcasts();
	const sent: Broadcast[] = [];
	const next = all.map(b => {
		if (b.keyId !== keyId || b.status !== 'scheduled' || Date.parse(b.sendAt) > now.getTime()) return b;
		const updated: Broadcast = {
			...b,
			status: 'sent',
			sentAt: now.toISOString(),
			recipients: countAudience(keyId, holders, b.minBalance).recipients,
		};
		sent.push(updated);
		return updated;
	});
	if (sent.length) writeLocalCollection(BROADCASTS_KEY, next);
	return sent;
}

export function cancelScheduledBroadcast(id: string): void {
	const all = readBroadcasts();
	const b = all.find(x => x.id === id);
	if (!b || b.status !== 'scheduled') throw new BroadcastError('not-found', 'Only scheduled broadcasts can be cancelled.');
	writeLocalCollection(BROADCASTS_KEY, all.filter(x => x !== b));
}

/** Records the email provider's delivery report for a sent broadcast. */
export function recordDeliveryReport(id: string, report: { delivered: number; bounced: number }): Broadcast {
	const all = readBroadcasts();
	const b = all.find(x => x.id === id);
	if (!b || b.status !== 'sent') throw new BroadcastError('not-found', 'No sent broadcast with that id.');
	const updated = { ...b, delivered: report.delivered, bounced: report.bounced };
	writeLocalCollection(BROADCASTS_KEY, all.map(x => (x === b ? updated : x)));
	return updated;
}

/** Newest first. */
export function listBroadcasts(keyId: string): Broadcast[] {
	return readBroadcasts()
		.filter(b => b.keyId === keyId)
		.sort((a, b) => Date.parse(b.sendAt) - Date.parse(a.sendAt));
}

// ── Email content ────────────────────────────────────────────────────────────

export function unsubscribeUrl(origin: string, token: string, broadcastId?: string): string {
	const base = `${origin.replace(/\/$/, '')}/unsubscribe/${encodeURIComponent(token)}`;
	return broadcastId ? `${base}?b=${encodeURIComponent(broadcastId)}` : base;
}

/** The plain-text email for one recipient; the unsubscribe link is always appended. */
export function renderBroadcastEmail(
	broadcast: Pick<Broadcast, 'id' | 'subject' | 'body'>,
	recipient: Pick<BroadcastRecipient, 'unsubscribeToken'>,
	opts: { origin: string; keyName: string }
): { subject: string; text: string; listUnsubscribe: string } {
	const link = unsubscribeUrl(opts.origin, recipient.unsubscribeToken, broadcast.id);
	return {
		subject: broadcast.subject,
		text: `${broadcast.body.trim()}\n\n—\nYou are receiving this because you opted in to emails from ${opts.keyName} on AccessLayer.\nUnsubscribe instantly: ${link}`,
		listUnsubscribe: `<${link}>`,
	};
}

export function resetBroadcastStore(): void {
	resetLocalCollection(SUBSCRIPTIONS_KEY);
	resetLocalCollection(BROADCASTS_KEY);
}
