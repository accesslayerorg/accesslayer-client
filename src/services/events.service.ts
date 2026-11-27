import {
	readLocalCollection,
	resetLocalCollection,
	writeLocalCollection,
} from '@/services/localCollection.service';

const EVENTS_KEY = 'creator-events';

export type EventCloseReason = 'expired' | 'exhausted' | 'manual';

export interface CreatorEvent {
	id: string;
	creator: string;
	keyId: string;
	keyName: string;
	title: string;
	description: string;
	startsAt: string;
	endsAt: string;
	passSupply: number;
	redeemed: number;
	perWalletCap: number;
	closedAt?: string;
	closeReason?: EventCloseReason;
	createdAt: string;
}

export interface EventRedemption {
	id: string;
	eventId: string;
	wallet: string;
	passes: number;
	redeemedAt: string;
}

export interface CreateEventInput {
	creator: string;
	keyId: string;
	keyName: string;
	title: string;
	description: string;
	startsAt: string;
	endsAt: string;
	passSupply: number;
	perWalletCap: number;
}

export interface EventStatusInfo {
	status: 'upcoming' | 'open' | 'closed';
	remaining: number;
	closeReason?: EventCloseReason;
}

export interface RedeemEligibility {
	eligible: boolean;
	reason?: string;
	redeemedByWallet: number;
	remaining: number;
}

const CREATOR = 'GEVENT_CREATOR';
const HOLDER = 'GHOLDER_1';

function iso(offsetMinutes: number): string {
	return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

function seedEvents(): CreatorEvent[] {
	return [
		{
			id: 'event-1',
			creator: CREATOR,
			keyId: 'creator-alpha',
			keyName: 'Alpha Key',
			title: 'Holder meetup — Berlin',
			description: 'Free entry for holders with a valid key.',
			startsAt: iso(-30),
			endsAt: iso(60 * 24),
			passSupply: 100,
			redeemed: 12,
			perWalletCap: 2,
			createdAt: iso(-120),
		},
		{
			id: 'event-2',
			creator: CREATOR,
			keyId: 'creator-beta',
			keyName: 'Beta Key',
			title: 'Community call',
			description: 'Monthly holder call with the creator.',
			startsAt: iso(60),
			endsAt: iso(60 * 48),
			passSupply: 50,
			redeemed: 0,
			perWalletCap: 1,
			createdAt: iso(-60),
		},
		{
			id: 'event-3',
			creator: CREATOR,
			keyId: 'creator-alpha',
			keyName: 'Alpha Key',
			title: 'Past launch party',
			description: 'This event has already ended.',
			startsAt: iso(-60 * 72),
			endsAt: iso(-60 * 48),
			passSupply: 20,
			redeemed: 18,
			perWalletCap: 1,
			createdAt: iso(-60 * 96),
		},
	];
}

function seedRedemptions(): EventRedemption[] {
	return [
		{
			id: 'redemption-seed-1',
			eventId: 'event-1',
			wallet: HOLDER,
			passes: 1,
			redeemedAt: iso(-10),
		},
	];
}

function readEvents(): CreatorEvent[] {
	return readLocalCollection(EVENTS_KEY, seedEvents);
}

function readRedemptions(): EventRedemption[] {
	return readLocalCollection('event-redemptions', seedRedemptions);
}

function writeEvents(events: CreatorEvent[]): void {
	writeLocalCollection(EVENTS_KEY, events);
}

function writeRedemptions(redemptions: EventRedemption[]): void {
	writeLocalCollection('event-redemptions', redemptions);
}

export function getEventStatus(
	event: CreatorEvent,
	now = Date.now()
): EventStatusInfo {
	const remaining = Math.max(0, event.passSupply - event.redeemed);
	if (event.closedAt) {
		return { status: 'closed', remaining, closeReason: event.closeReason };
	}
	if (now >= new Date(event.endsAt).getTime()) {
		return { status: 'closed', remaining, closeReason: 'expired' };
	}
	if (remaining === 0) {
		return { status: 'closed', remaining, closeReason: 'exhausted' };
	}
	if (now < new Date(event.startsAt).getTime()) {
		return { status: 'upcoming', remaining };
	}
	return { status: 'open', remaining };
}

export function listEvents(creator?: string, now = Date.now()): CreatorEvent[] {
	return readEvents()
		.filter(event => !creator || event.creator === creator)
		.sort(
			(a, b) =>
				new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
		)
		.map(event => {
			const info = getEventStatus(event, now);
			return info.status === 'closed' && !event.closedAt
				? {
						...event,
						closedAt: new Date(now).toISOString(),
						closeReason: info.closeReason,
					}
				: event;
		});
}

export function getEvent(eventId: string): CreatorEvent | undefined {
	return listEvents().find(event => event.id === eventId);
}

export function getWalletRedemption(
	eventId: string,
	wallet: string | undefined
): EventRedemption | undefined {
	if (!wallet) return undefined;
	return readRedemptions().find(
		redemption =>
			redemption.eventId === eventId && redemption.wallet === wallet
	);
}

export function getRedemptionEligibility(
	eventId: string,
	wallet: string | undefined,
	heldKeyIds: string[]
): RedeemEligibility {
	const event = getEvent(eventId);
	if (!event) {
		return {
			eligible: false,
			reason: 'This event no longer exists.',
			redeemedByWallet: 0,
			remaining: 0,
		};
	}
	const status = getEventStatus(event);
	const previous = getWalletRedemption(eventId, wallet);
	const redeemedByWallet = previous?.passes ?? 0;

	if (!wallet) {
		return {
			eligible: false,
			reason: 'Connect your wallet to redeem a pass.',
			redeemedByWallet,
			remaining: status.remaining,
		};
	}
	if (status.status === 'closed') {
		return {
			eligible: false,
			reason:
				status.closeReason === 'exhausted'
					? 'All passes have been redeemed.'
					: 'This event is closed.',
			redeemedByWallet,
			remaining: status.remaining,
		};
	}
	if (status.status === 'upcoming') {
		return {
			eligible: false,
			reason: 'This event has not started yet.',
			redeemedByWallet,
			remaining: status.remaining,
		};
	}
	if (!heldKeyIds.includes(event.keyId)) {
		return {
			eligible: false,
			reason: `You need to hold ${event.keyName} to redeem a pass.`,
			redeemedByWallet,
			remaining: status.remaining,
		};
	}
	if (redeemedByWallet >= event.perWalletCap) {
		return {
			eligible: false,
			reason: 'You have reached the per-wallet redemption cap.',
			redeemedByWallet,
			remaining: status.remaining,
		};
	}

	return {
		eligible: true,
		redeemedByWallet,
		remaining: status.remaining,
	};
}

export function createEvent(input: CreateEventInput): CreatorEvent {
	if (!input.title.trim()) throw new Error('Give your event a title.');
	if (!input.keyId.trim()) throw new Error('Select a key for this event.');
	if (!Number.isFinite(input.passSupply) || input.passSupply < 1) {
		throw new Error('Pass supply must be at least one.');
	}
	if (
		!Number.isFinite(input.perWalletCap) ||
		input.perWalletCap < 1 ||
		input.perWalletCap > input.passSupply
	) {
		throw new Error(
			'The per-wallet cap must be between 1 and the pass supply.'
		);
	}
	const start = new Date(input.startsAt).getTime();
	const end = new Date(input.endsAt).getTime();
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
		throw new Error('The event end must be after its start.');
	}

	const event: CreatorEvent = {
		id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		creator: input.creator,
		keyId: input.keyId,
		keyName: input.keyName,
		title: input.title.trim(),
		description: input.description.trim(),
		startsAt: new Date(start).toISOString(),
		endsAt: new Date(end).toISOString(),
		passSupply: Math.floor(input.passSupply),
		redeemed: 0,
		perWalletCap: Math.floor(input.perWalletCap),
		createdAt: new Date().toISOString(),
	};
	writeEvents([event, ...readEvents()]);
	return event;
}

export function redeemPass(
	eventId: string,
	wallet: string,
	heldKeyIds: string[]
): {
	event: CreatorEvent;
	redemption: EventRedemption;
} {
	const eligibility = getRedemptionEligibility(eventId, wallet, heldKeyIds);
	if (!eligibility.eligible) {
		throw new Error(eligibility.reason ?? 'This pass cannot be redeemed.');
	}

	const events = readEvents();
	const redemptions = readRedemptions();
	const event = events.find(candidate => candidate.id === eventId)!;
	const previous = redemptions.find(
		redemption =>
			redemption.eventId === eventId && redemption.wallet === wallet
	);
	const redemption: EventRedemption = previous
		? {
				...previous,
				passes: previous.passes + 1,
				redeemedAt: new Date().toISOString(),
			}
		: {
				id: `redemption-${eventId}-${wallet}-${Date.now()}`,
				eventId,
				wallet,
				passes: 1,
				redeemedAt: new Date().toISOString(),
			};
	const updated: CreatorEvent = { ...event, redeemed: event.redeemed + 1 };
	const exhausted = updated.redeemed >= updated.passSupply;
	if (exhausted) {
		updated.closedAt = updated.closedAt ?? new Date().toISOString();
		updated.closeReason = 'exhausted';
	}

	writeEvents(
		events.map(candidate => (candidate.id === eventId ? updated : candidate))
	);
	writeRedemptions(
		previous
			? redemptions.map(item =>
					item.id === previous.id ? redemption : item
				)
			: [...redemptions, redemption]
	);
	return { event: updated, redemption };
}

export function closeEvent(eventId: string, creator: string): CreatorEvent {
	const events = readEvents();
	const event = events.find(candidate => candidate.id === eventId);
	if (!event) throw new Error('Event not found.');
	if (event.creator !== creator)
		throw new Error('Only the event creator can close this event.');
	if (event.closedAt) return event;

	const closed: CreatorEvent = {
		...event,
		closedAt: new Date().toISOString(),
		closeReason: 'manual',
	};
	writeEvents(
		events.map(candidate => (candidate.id === eventId ? closed : candidate))
	);
	return closed;
}

export function resetEventStore(): void {
	resetLocalCollection(EVENTS_KEY);
	resetLocalCollection('event-redemptions');
}
