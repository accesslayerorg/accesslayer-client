import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	supportTicketService,
	type SupportTicket,
	type SupportTicketDraft,
} from '@/services/supportTicket.service';
import showToast from '@/utils/toast.util';

/** Tickets the authenticated user has submitted (#1250), for the "My Tickets" settings section. */
export function useMySupportTickets() {
	return useQuery<SupportTicket[]>({
		queryKey: queryKeys.supportTickets.mine(),
		queryFn: () => supportTicketService.getMyTickets(),
		retry: false,
	});
}

export function useSubmitSupportTicket() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (draft: SupportTicketDraft) =>
			supportTicketService.submitTicket(draft),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.supportTickets.mine(),
			});
			showToast.success('Ticket submitted');
		},
		onError: () => {
			showToast.error('Failed to submit ticket. Please try again.');
		},
	});
}
