import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	closeEvent,
	createEvent,
	getRedemptionEligibility,
	getWalletRedemption,
	listEvents,
	redeemPass,
	type CreateEventInput,
} from '@/services/events.service';
import showToast from '@/utils/toast.util';

function message(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

export function useEvents(creator?: string) {
	return useQuery({
		queryKey: queryKeys.events.list(creator),
		queryFn: () => listEvents(creator),
		staleTime: 10_000,
	});
}

export function useEventRedemption(
	eventId: string,
	wallet: string | undefined,
	heldKeyIds: string[]
) {
	const query = useQuery({
		queryKey: queryKeys.events.redemption(eventId, wallet ?? ''),
		queryFn: () => getWalletRedemption(eventId, wallet),
		enabled: Boolean(eventId),
		staleTime: 10_000,
	});
	const eligibility = getRedemptionEligibility(eventId, wallet, heldKeyIds);

	return { ...query, eligibility };
}

export function useCreateEvent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ['events', 'create'],
		mutationFn: async (input: CreateEventInput) => createEvent(input),
		onSuccess: () => {
			showToast.success('Event created');
			void queryClient.invalidateQueries({
				queryKey: queryKeys.events.all(),
			});
		},
		onError: error =>
			showToast.error(message(error, 'Could not create event')),
	});
}

export function useRedeemPass() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ['events', 'redeem'],
		mutationFn: async (input: {
			eventId: string;
			wallet: string;
			heldKeyIds: string[];
		}) => redeemPass(input.eventId, input.wallet, input.heldKeyIds),
		onSuccess: () => {
			showToast.success('Pass redeemed');
			void queryClient.invalidateQueries({
				queryKey: queryKeys.events.all(),
			});
		},
		onError: error =>
			showToast.error(message(error, 'Could not redeem pass')),
	});
}

export function useCloseEvent() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: ['events', 'close'],
		mutationFn: async (input: { eventId: string; creator: string }) =>
			closeEvent(input.eventId, input.creator),
		onSuccess: () => {
			showToast.success('Event closed');
			void queryClient.invalidateQueries({
				queryKey: queryKeys.events.all(),
			});
		},
		onError: error =>
			showToast.error(message(error, 'Could not close event')),
	});
}
