import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateEvent, useRedeemPass } from '@/hooks/useEvents';
import {
	closeEvent,
	createEvent,
	getEvent,
	getEventStatus,
	getRedemptionEligibility,
	getWalletRedemption,
	listEvents,
	redeemPass,
	resetEventStore,
} from '@/services/events.service';

const CREATOR = 'GEVENT_CREATOR';
const HOLDER = 'GHOLDER_1';

const { showToastSuccess, showToastError } = vi.hoisted(() => ({
	showToastSuccess: vi.fn(),
	showToastError: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: showToastSuccess, error: showToastError },
}));

describe('creator events (#1443)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		resetEventStore();
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('lists open events with remaining supply and auto-closes expired ones', () => {
		const open = getEvent('event-1')!;
		expect(getEventStatus(open).status).toBe('open');
		expect(getEventStatus(open).remaining).toBe(88);

		const expired = getEvent('event-3')!;
		expect(getEventStatus(expired, Date.now()).status).toBe('closed');
		expect(getEventStatus(expired, Date.now()).closeReason).toBe('expired');
		expect(listEvents().length).toBe(3);
	});

	it('checks holder eligibility before redemption', () => {
		expect(getRedemptionEligibility('event-1', HOLDER, []).eligible).toBe(
			false
		);
		const eligible = getRedemptionEligibility('event-1', HOLDER, [
			'creator-alpha',
		]);
		expect(eligible.eligible).toBe(true);
		expect(eligible.redeemedByWallet).toBe(1);
	});

	it('enforces the per-wallet cap', () => {
		const held = ['creator-alpha'];
		redeemPass('event-1', HOLDER, held);
		expect(getWalletRedemption('event-1', HOLDER)?.passes).toBe(2);
		expect(getRedemptionEligibility('event-1', HOLDER, held).eligible).toBe(
			false
		);

		expect(() => redeemPass('event-1', HOLDER, held)).toThrowError(
			/per-wallet redemption cap/i
		);
		expect(getEvent('event-1')?.redeemed).toBe(13);
	});

	it('closes an event automatically when supply is exhausted', () => {
		const event = createEvent({
			creator: CREATOR,
			keyId: 'creator-alpha',
			keyName: 'Alpha Key',
			title: 'Limited drop',
			description: 'One pass total.',
			startsAt: new Date(Date.now() - 60_000).toISOString(),
			endsAt: new Date(Date.now() + 3_600_000).toISOString(),
			passSupply: 1,
			perWalletCap: 1,
		});

		redeemPass(event.id, 'GHOLDER_2', ['creator-alpha']);
		expect(getEventStatus(getEvent(event.id)!).status).toBe('closed');
		expect(getEvent(event.id)?.closeReason).toBe('exhausted');
		expect(() =>
			redeemPass(event.id, 'GHOLDER_3', ['creator-alpha'])
		).toThrowError(/redeemed/i);
	});

	it('lets only the creator close an event manually', () => {
		expect(() => closeEvent('event-1', HOLDER)).toThrowError(
			/Only the event creator/
		);
		const closed = closeEvent('event-1', CREATOR);
		expect(closed.closeReason).toBe('manual');
		expect(getEventStatus(getEvent('event-1')!).status).toBe('closed');
	});

	it('creates events through the mutation hook', async () => {
		const { result } = renderHook(() => useCreateEvent(), { wrapper });
		let createdId = '';
		await act(async () => {
			const created = await result.current.mutateAsync({
				creator: CREATOR,
				keyId: 'creator-alpha',
				keyName: 'Alpha Key',
				title: 'Hook-created event',
				description: 'Created via React Query.',
				startsAt: new Date(Date.now() - 60_000).toISOString(),
				endsAt: new Date(Date.now() + 3_600_000).toISOString(),
				passSupply: 10,
				perWalletCap: 2,
			});
			createdId = created.id;
		});
		expect(getEvent(createdId)?.title).toBe('Hook-created event');
	});

	it('redeems through the mutation hook', async () => {
		const { result } = renderHook(() => useRedeemPass(), { wrapper });
		await act(async () => {
			await result.current.mutateAsync({
				eventId: 'event-1',
				wallet: HOLDER,
				heldKeyIds: ['creator-alpha'],
			});
		});
		expect(getWalletRedemption('event-1', HOLDER)?.passes).toBe(2);
		expect(getEvent('event-1')?.redeemed).toBe(13);
	});
});
