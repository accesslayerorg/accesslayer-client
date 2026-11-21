import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	sessionService,
	type Session,
	type SessionsResponse,
} from '@/services/session.service';
import showToast from '@/utils/toast.util';

export interface UseSessionsResult {
	sessions: Session[];
	isLoading: boolean;
	isError: boolean;
	isRevoking: boolean;
	/** Revoke a single non-current session. */
	revokeSession: (sessionId: string) => void;
	/** Revoke every session except the current one. */
	revokeAllOtherSessions: () => void;
}

/**
 * Fetches the current user's active sessions and exposes revoke helpers.
 *
 * The fetch fn is injectable so tests can supply a stub without module-level
 * patching (matches the pattern used in `useNotifications`).
 */
export function useSessions(
	userId: string,
	fetchSessions: (id: string) => Promise<SessionsResponse> = id =>
		sessionService.getSessions(id)
): UseSessionsResult {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.sessions.list(userId);

	const { data, isLoading, isError } = useQuery({
		queryKey,
		queryFn: () => fetchSessions(userId),
		enabled: !!userId,
	});

	const invalidate = () => {
		void queryClient.invalidateQueries({ queryKey });
	};

	const { mutate: revokeSession, isPending: isRevokingOne } = useMutation({
		mutationFn: (sessionId: string) =>
			sessionService.revokeSession(sessionId),
		onSuccess: () => {
			showToast.success('Session revoked');
			invalidate();
		},
		onError: () => {
			showToast.error('Could not revoke that session. Try again.');
		},
	});

	const { mutate: revokeAllOtherSessions, isPending: isRevokingAll } =
		useMutation({
			mutationFn: () => sessionService.revokeAllOtherSessions(),
			onSuccess: () => {
				showToast.success('All other sessions revoked');
				invalidate();
			},
			onError: () => {
				showToast.error('Could not revoke other sessions. Try again.');
			},
		});

	return {
		sessions: data?.sessions ?? [],
		isLoading,
		isError,
		isRevoking: isRevokingOne || isRevokingAll,
		revokeSession,
		revokeAllOtherSessions,
	};
}
