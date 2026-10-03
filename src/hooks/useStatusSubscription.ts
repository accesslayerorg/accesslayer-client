import { useMutation } from '@tanstack/react-query';
import { statusService } from '@/services/status.service';

/**
 * Posts an email address to the status notification endpoint
 * (`POST /status/subscribe`) so the subscriber is emailed when an incident
 * opens or resolves (#1051).
 *
 * The form that renders this owns the success and error copy, so the
 * mutation stays free of toasts.
 */
export function useStatusSubscription() {
	return useMutation({
		mutationFn: (email: string) =>
			statusService.subscribeToStatusUpdates(email),
	});
}
