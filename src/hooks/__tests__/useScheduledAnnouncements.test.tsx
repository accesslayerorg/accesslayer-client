import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	PUBLISHED_DISPLAY_DURATION_MS,
	useScheduledAnnouncements,
} from '@/hooks/useScheduledAnnouncements';
import {
	announcementService,
	type ScheduledAnnouncement,
} from '@/services/announcement.service';
import showToast from '@/utils/toast.util';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/announcement.service', () => ({
	announcementService: {
		getScheduledAnnouncements: vi.fn(),
		scheduleAnnouncement: vi.fn(),
		updateScheduledAnnouncement: vi.fn(),
		cancelScheduledAnnouncement: vi.fn(),
	},
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

function createWrapper(queryClient?: QueryClient) {
	const client =
		queryClient ??
		new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
}

describe('useScheduledAnnouncements (#1380)', () => {
	const mockGetScheduled = vi.mocked(
		announcementService.getScheduledAnnouncements
	);
	const mockCancelScheduled = vi.mocked(
		announcementService.cancelScheduledAnnouncement
	);
	const mockUpdateScheduled = vi.mocked(
		announcementService.updateScheduledAnnouncement
	);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('lists scheduled and draft announcements for a key', async () => {
		const sampleData: ScheduledAnnouncement[] = [
			{
				id: 'sched-1',
				keyId: 'creator-1',
				title: 'Scheduled Launch',
				category: 'update',
				content: 'Details here',
				scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
				status: 'scheduled',
				createdAt: new Date().toISOString(),
			},
			{
				id: 'draft-1',
				keyId: 'creator-1',
				title: 'Draft Announcement',
				category: 'event',
				content: 'Draft content',
				scheduledAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
				status: 'draft',
				createdAt: new Date().toISOString(),
			},
		];

		mockGetScheduled.mockResolvedValue(sampleData);

		const { result } = renderHook(() => useScheduledAnnouncements('creator-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.announcements).toHaveLength(2));

		expect(result.current.announcements[0].title).toBe('Scheduled Launch');
		expect(result.current.announcements[0].status).toBe('scheduled');
		expect(result.current.announcements[1].title).toBe('Draft Announcement');
		expect(result.current.announcements[1].status).toBe('draft');
	});

	it('cancel removes the item from the list', async () => {
		let sampleData: ScheduledAnnouncement[] = [
			{
				id: 'sched-1',
				keyId: 'creator-1',
				title: 'Cancel Me',
				category: 'update',
				content: 'To be cancelled',
				scheduledAt: new Date(Date.now() + 3600 * 1000).toISOString(),
				status: 'scheduled',
				createdAt: new Date().toISOString(),
			},
		];

		mockGetScheduled.mockImplementation(async () => sampleData);
		mockCancelScheduled.mockImplementation(async (id: string) => {
			sampleData = sampleData.filter(item => item.id !== id);
		});

		const { result } = renderHook(() => useScheduledAnnouncements('creator-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.announcements).toHaveLength(1));

		await act(async () => {
			await result.current.cancelAnnouncement('sched-1');
		});

		expect(mockCancelScheduled).toHaveBeenCalledWith('sched-1');
		expect(showToast.success).toHaveBeenCalledWith('Announcement cancelled');
		await waitFor(() => expect(result.current.announcements).toHaveLength(0));
	});

	it('rolls back cancellation on failure and shows an error', async () => {
		const sampleData: ScheduledAnnouncement[] = [
			{
				id: 'sched-fail',
				keyId: 'creator-1',
				title: 'Keep Me',
				category: 'update',
				content: 'Should rollback',
				scheduledAt: new Date(Date.now() + 3600 * 1000).toISOString(),
				status: 'scheduled',
				createdAt: new Date().toISOString(),
			},
		];

		mockGetScheduled.mockResolvedValue(sampleData);
		mockCancelScheduled.mockRejectedValue(new Error('Network error'));

		const { result } = renderHook(() => useScheduledAnnouncements('creator-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.announcements).toHaveLength(1));

		await act(async () => {
			try {
				await result.current.cancelAnnouncement('sched-fail');
			} catch {
				// Expected rejection
			}
		});

		expect(showToast.error).toHaveBeenCalledWith(
			'Could not cancel scheduled announcement'
		);
		// Rolled back to previous state
		expect(result.current.announcements).toHaveLength(1);
		expect(result.current.announcements[0].id).toBe('sched-fail');
	});

	it('editing keeps the scheduled status until saved', async () => {
		const sampleData: ScheduledAnnouncement[] = [
			{
				id: 'sched-edit',
				keyId: 'creator-1',
				title: 'Original Title',
				category: 'update',
				content: 'Original Content',
				scheduledAt: new Date(Date.now() + 3600 * 1000).toISOString(),
				status: 'scheduled',
				createdAt: new Date().toISOString(),
			},
		];

		mockGetScheduled.mockResolvedValue(sampleData);
		mockUpdateScheduled.mockResolvedValue({
			...sampleData[0],
			title: 'Updated Title',
		});

		const { result } = renderHook(() => useScheduledAnnouncements('creator-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.announcements).toHaveLength(1));

		// While editing (before saving), the item maintains its status
		expect(result.current.announcements[0].status).toBe('scheduled');
		expect(result.current.announcements[0].title).toBe('Original Title');

		// Now save the update
		await act(async () => {
			await result.current.updateAnnouncement({
				id: 'sched-edit',
				input: { title: 'Updated Title' },
			});
		});

		expect(mockUpdateScheduled).toHaveBeenCalledWith('sched-edit', {
			title: 'Updated Title',
		});
		expect(showToast.success).toHaveBeenCalledWith('Announcement updated');
	});

	it('published item transitions to published and leaves the list when time passes', async () => {
		vi.useFakeTimers();

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});

		const scheduledIn500ms = new Date(Date.now() + 500).toISOString();
		const sampleData: ScheduledAnnouncement[] = [
			{
				id: 'auto-pub',
				keyId: 'creator-1',
				title: 'Expiring Soon',
				category: 'milestone',
				content: 'Going live',
				scheduledAt: scheduledIn500ms,
				status: 'scheduled',
				createdAt: new Date().toISOString(),
			},
		];

		// Seed cache directly for synchronous availability with fake timers
		queryClient.setQueryData(
			queryKeys.creators.scheduledAnnouncements('creator-1'),
			sampleData
		);
		mockGetScheduled.mockResolvedValue(sampleData);

		const { result } = renderHook(() => useScheduledAnnouncements('creator-1'), {
			wrapper: createWrapper(queryClient),
		});

		expect(result.current.announcements).toHaveLength(1);
		expect(result.current.announcements[0].status).toBe('scheduled');

		// Advance timer to scheduled time (500ms)
		act(() => {
			vi.advanceTimersByTime(500);
		});

		// Immediately after scheduled time passes, it shows status "published"
		expect(result.current.announcements).toHaveLength(1);
		expect(result.current.announcements[0].status).toBe('published');

		// Advance past transition duration
		act(() => {
			vi.advanceTimersByTime(PUBLISHED_DISPLAY_DURATION_MS + 50);
		});

		// Now the item has left the list automatically without a page reload
		expect(result.current.announcements).toHaveLength(0);
	});
});
