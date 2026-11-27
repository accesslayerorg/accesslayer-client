import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	announcementService,
	type ScheduledAnnouncement,
	type ScheduleAnnouncementInput,
	type UpdateScheduledAnnouncementInput,
} from '@/services/announcement.service';
import showToast from '@/utils/toast.util';

export const PUBLISHED_DISPLAY_DURATION_MS = 800;

export interface UseScheduledAnnouncementsResult {
	announcements: ScheduledAnnouncement[];
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
	cancelAnnouncement: (id: string) => Promise<void>;
	isCancelling: boolean;
	updateAnnouncement: (args: {
		id: string;
		input: UpdateScheduledAnnouncementInput;
	}) => Promise<ScheduledAnnouncement>;
	isUpdating: boolean;
	scheduleAnnouncement: (
		input: ScheduleAnnouncementInput
	) => Promise<ScheduledAnnouncement>;
	isScheduling: boolean;
}

/**
 * Hook to manage scheduled and draft announcements for a key (#1380).
 *
 * Features:
 * - Lists scheduled and draft announcements
 * - Automatically transitions items to "published" status when their time passes
 * - Automatically removes published items from the list after a brief transition
 * - Optimistic cancellation with rollback on failure
 * - Reschedule and edit mutations with cache synchronization
 */
export function useScheduledAnnouncements(
	keyId: string | undefined
): UseScheduledAnnouncementsResult {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.creators.scheduledAnnouncements(keyId ?? '');

	const query = useQuery({
		queryKey,
		queryFn: () => announcementService.getScheduledAnnouncements(keyId ?? ''),
		enabled: Boolean(keyId),
	});

	// Track IDs transitioning through the brief "published" state before removal
	const [recentlyPublishedIds, setRecentlyPublishedIds] = useState<
		Record<string, boolean>
	>({});
	// Track IDs that have completed the published transition and left the scheduled list
	const [removedIds, setRemovedIds] = useState<Record<string, boolean>>({});

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const removalTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
		{}
	);

	const rawAnnouncements: ScheduledAnnouncement[] = useMemo(
		() => query.data ?? [],
		[query.data]
	);

	// Filter and map announcements with live status
	const announcements = useMemo(() => {
		const now = Date.now();

		return rawAnnouncements
			.filter(item => {
				// Only show scheduled or draft items
				if (item.status === 'published') return false;
				if (removedIds[item.id]) return false;
				return true;
			})
			.map(item => {
				if (item.status === 'draft') return item;

				const targetTime = new Date(item.scheduledAt).getTime();
				const isPast = targetTime <= now;

				// If time has passed or marked recently published, show 'published' status
				if (isPast || recentlyPublishedIds[item.id]) {
					return {
						...item,
						status: 'published' as const,
					};
				}

				return item;
			});
	}, [rawAnnouncements, recentlyPublishedIds, removedIds]);

	// Schedule a timer for the next upcoming scheduled announcement
	useEffect(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		const now = Date.now();
		const upcoming = rawAnnouncements.filter(item => {
			if (item.status !== 'scheduled') return false;
			if (removedIds[item.id]) return false;
			return new Date(item.scheduledAt).getTime() > now;
		});

		if (upcoming.length === 0) {
			// Check if there are any that have passed and need transition
			const passed = rawAnnouncements.filter(item => {
				if (item.status !== 'scheduled') return false;
				if (removedIds[item.id] || recentlyPublishedIds[item.id]) return false;
				return new Date(item.scheduledAt).getTime() <= now;
			});

			for (const item of passed) {
				setRecentlyPublishedIds(prev => ({ ...prev, [item.id]: true }));
				if (!removalTimersRef.current[item.id]) {
					removalTimersRef.current[item.id] = setTimeout(() => {
						setRemovedIds(prev => ({ ...prev, [item.id]: true }));
						delete removalTimersRef.current[item.id];
						query.refetch();
					}, PUBLISHED_DISPLAY_DURATION_MS);
				}
			}
			return;
		}

		// Sort by scheduled time ascending
		upcoming.sort(
			(a, b) =>
				new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
		);

		const nextItem = upcoming[0];
		const nextTime = new Date(nextItem.scheduledAt).getTime();
		const delay = Math.max(0, nextTime - now);

		timerRef.current = setTimeout(() => {
			setRecentlyPublishedIds(prev => ({ ...prev, [nextItem.id]: true }));

			// Refetch server state to account for server-side publication / clock drift
			query.refetch();

			// Auto-remove item from scheduled list after transition display
			if (!removalTimersRef.current[nextItem.id]) {
				removalTimersRef.current[nextItem.id] = setTimeout(() => {
					setRemovedIds(prev => ({ ...prev, [nextItem.id]: true }));
					delete removalTimersRef.current[nextItem.id];
				}, PUBLISHED_DISPLAY_DURATION_MS);
			}
		}, delay);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [rawAnnouncements, recentlyPublishedIds, removedIds, query]);

	// Clean up all timers on unmount
	useEffect(() => {
		const removalTimers = removalTimersRef.current;
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			for (const timer of Object.values(removalTimers)) {
				clearTimeout(timer);
			}
		};
	}, []);

	// Cancel mutation with optimistic removal and rollback on failure
	const cancelMutation = useMutation({
		mutationFn: (id: string) =>
			announcementService.cancelScheduledAnnouncement(id),
		onMutate: async (id: string) => {
			await queryClient.cancelQueries({ queryKey });
			const previous =
				queryClient.getQueryData<ScheduledAnnouncement[]>(queryKey);

			queryClient.setQueryData<ScheduledAnnouncement[]>(queryKey, old =>
				(old ?? []).filter(item => item.id !== id)
			);

			return { previous };
		},
		onError: (_error, _id, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
			showToast.error('Could not cancel scheduled announcement');
		},
		onSuccess: () => {
			showToast.success('Announcement cancelled');
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	// Reschedule / edit mutation
	const updateMutation = useMutation({
		mutationFn: ({
			id,
			input,
		}: {
			id: string;
			input: UpdateScheduledAnnouncementInput;
		}) => announcementService.updateScheduledAnnouncement(id, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey });
			showToast.success('Announcement updated');
		},
		onError: error => {
			showToast.error(
				error instanceof Error
					? error.message
					: 'Could not update announcement'
			);
		},
	});

	// Schedule mutation
	const scheduleMutation = useMutation({
		mutationFn: (input: ScheduleAnnouncementInput) =>
			announcementService.scheduleAnnouncement(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey });
			showToast.success('Announcement scheduled');
		},
		onError: error => {
			showToast.error(
				error instanceof Error
					? error.message
					: 'Could not schedule announcement'
			);
		},
	});

	return {
		announcements,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: () => query.refetch(),
		cancelAnnouncement: async (id: string) => {
			await cancelMutation.mutateAsync(id);
		},
		isCancelling: cancelMutation.isPending,
		updateAnnouncement: async args => {
			return await updateMutation.mutateAsync(args);
		},
		isUpdating: updateMutation.isPending,
		scheduleAnnouncement: async input => {
			return await scheduleMutation.mutateAsync(input);
		},
		isScheduling: scheduleMutation.isPending,
	};
}
