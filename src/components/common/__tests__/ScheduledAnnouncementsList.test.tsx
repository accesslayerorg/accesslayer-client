import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScheduledAnnouncementsList from '@/components/common/ScheduledAnnouncementsList';
import { announcementService, type ScheduledAnnouncement } from '@/services/announcement.service';

vi.mock('@/services/announcement.service', () => ({
	announcementService: {
		getScheduledAnnouncements: vi.fn(),
		cancelScheduledAnnouncement: vi.fn(),
		updateScheduledAnnouncement: vi.fn(),
	},
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

function renderList(props: { keyId?: string; onEdit?: (item: ScheduledAnnouncement) => void } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<ScheduledAnnouncementsList keyId="creator-1" {...props} />
		</QueryClientProvider>
	);
}

describe('ScheduledAnnouncementsList (#1380)', () => {
	const mockGetScheduled = vi.mocked(announcementService.getScheduledAnnouncements);
	const mockCancel = vi.mocked(announcementService.cancelScheduledAnnouncement);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders empty state when no scheduled announcements exist', async () => {
		mockGetScheduled.mockResolvedValue([]);
		renderList();

		await waitFor(() => {
			expect(screen.getByTestId('scheduled-announcements-empty')).toBeInTheDocument();
		});
	});

	it('renders scheduled items with local and UTC times displayed', async () => {
		const targetTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
		const items: ScheduledAnnouncement[] = [
			{
				id: 'sched-1',
				keyId: 'creator-1',
				title: 'Key Launch Roadmap',
				category: 'milestone',
				content: 'Milestone content details',
				scheduledAt: targetTime,
				status: 'scheduled',
				createdAt: new Date().toISOString(),
			},
		];

		mockGetScheduled.mockResolvedValue(items);
		renderList();

		await waitFor(() => {
			expect(screen.getByTestId('scheduled-item-title')).toHaveTextContent('Key Launch Roadmap');
		});

		expect(screen.getByTestId('scheduled-item-status-scheduled')).toHaveTextContent('Scheduled');

		// Local time is displayed
		const localTime = screen.getByTestId('scheduled-item-local-time');
		expect(localTime).toBeInTheDocument();

		// UTC hover title exists on the hover element
		const hoverElement = screen.getByTestId('scheduled-item-time');
		expect(hoverElement).toHaveAttribute('title');
		expect(hoverElement.getAttribute('title')).toContain('UTC');
	});

	it('cancels item through confirmation dialog and removes from list', async () => {
		let items: ScheduledAnnouncement[] = [
			{
				id: 'sched-cancel',
				keyId: 'creator-1',
				title: 'Doomed Announcement',
				category: 'general',
				content: 'Will be cancelled',
				scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
				status: 'scheduled',
				createdAt: new Date().toISOString(),
			},
		];

		mockGetScheduled.mockImplementation(async () => items);
		mockCancel.mockImplementation(async (id: string) => {
			items = items.filter(x => x.id !== id);
		});

		const user = userEvent.setup();
		renderList();

		await waitFor(() => {
			expect(screen.getByTestId('scheduled-item-title')).toHaveTextContent('Doomed Announcement');
		});

		// Click cancel button -> opens confirmation dialog
		await user.click(screen.getByTestId('scheduled-item-cancel-btn'));

		expect(screen.getByTestId('cancel-announcement-dialog')).toBeInTheDocument();
		expect(screen.getByText(/Are you sure you want to cancel/)).toBeInTheDocument();

		// Confirm in dialog
		await user.click(screen.getByTestId('cancel-dialog-confirm'));

		expect(mockCancel).toHaveBeenCalledWith('sched-cancel');
		await waitFor(() => {
			expect(screen.queryByTestId('scheduled-announcement-sched-cancel')).not.toBeInTheDocument();
		});
	});

	it('editing an item calls onEdit and keeps status intact', async () => {
		const items: ScheduledAnnouncement[] = [
			{
				id: 'sched-edit',
				keyId: 'creator-1',
				title: 'Editable Announcement',
				category: 'update',
				content: 'Original content',
				scheduledAt: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
				status: 'scheduled',
				createdAt: new Date().toISOString(),
			},
		];

		mockGetScheduled.mockResolvedValue(items);
		const onEdit = vi.fn();
		const user = userEvent.setup();

		renderList({ onEdit });

		await waitFor(() => {
			expect(screen.getByTestId('scheduled-item-title')).toHaveTextContent('Editable Announcement');
		});

		await user.click(screen.getByTestId('scheduled-item-edit-btn'));

		expect(onEdit).toHaveBeenCalledWith(items[0]);
		// Status remains 'scheduled'
		expect(screen.getByTestId('scheduled-item-status-scheduled')).toHaveTextContent('Scheduled');
	});
});
