import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnnouncementComposer from '@/components/common/AnnouncementComposer';
import type { ScheduledAnnouncement } from '@/services/announcement.service';

const mockMutate = vi.fn();
vi.mock('@/hooks/useCreatorContractActions', () => ({
	usePostAnnouncementMutation: () => ({
		mutate: mockMutate,
		isPending: false,
	}),
}));

const mockSchedule = vi.fn();
const mockUpdate = vi.fn();
vi.mock('@/hooks/useScheduledAnnouncements', () => ({
	useScheduledAnnouncements: () => ({
		scheduleAnnouncement: mockSchedule,
		updateAnnouncement: mockUpdate,
		isScheduling: false,
		isUpdating: false,
		announcements: [],
	}),
}));

function renderComposer(props: {
	creatorId?: string;
	initialAnnouncement?: ScheduledAnnouncement | null;
	onSuccess?: () => void;
	onCancelEdit?: () => void;
} = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>
			<AnnouncementComposer creatorId="creator-1" {...props} />
		</QueryClientProvider>
	);
}

describe('AnnouncementComposer (#1380)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders with "Publish now" selected by default and picker hidden', () => {
		renderComposer();

		const nowRadio = screen.getByTestId('publish-mode-now');
		const scheduleRadio = screen.getByTestId('publish-mode-schedule');

		expect(nowRadio).toBeChecked();
		expect(scheduleRadio).not.toBeChecked();
		expect(screen.queryByTestId('announcement-schedule-input')).not.toBeInTheDocument();
		expect(screen.getByTestId('announcement-submit')).toHaveTextContent('Publish announcement');
	});

	it('shows the datetime picker when "Schedule" is selected and hides when "Publish now" is selected', async () => {
		const user = userEvent.setup();
		renderComposer();

		await user.click(screen.getByTestId('publish-mode-schedule'));

		expect(screen.getByTestId('publish-mode-schedule')).toBeChecked();
		expect(screen.getByTestId('announcement-schedule-input')).toBeInTheDocument();

		await user.click(screen.getByTestId('publish-mode-now'));

		expect(screen.getByTestId('publish-mode-now')).toBeChecked();
		expect(screen.queryByTestId('announcement-schedule-input')).not.toBeInTheDocument();
	});

	it('keeps "Publish now" behavior unchanged when submitting immediately', async () => {
		const user = userEvent.setup();
		renderComposer();

		await user.type(screen.getByTestId('announcement-title-input'), 'Immediate Announcement');
		await user.type(screen.getByTestId('announcement-content-input'), 'Content for holders');

		await user.click(screen.getByTestId('announcement-submit'));

		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(mockMutate).toHaveBeenCalledWith(
			{
				title: 'Immediate Announcement',
				category: 'update',
				content: 'Content for holders',
			},
			expect.any(Object)
		);
		expect(mockSchedule).not.toHaveBeenCalled();
	});

	it('displays inline validation errors and blocks submit when scheduled time is invalid', async () => {
		const user = userEvent.setup();
		renderComposer();

		await user.type(screen.getByTestId('announcement-title-input'), 'Scheduled Title');
		await user.type(screen.getByTestId('announcement-content-input'), 'Scheduled Content');

		// Switch to Schedule
		await user.click(screen.getByTestId('publish-mode-schedule'));

		// Missing/empty time blocks submit
		const submitBtn = screen.getByTestId('announcement-submit');
		expect(submitBtn).toBeDisabled();

		// Set a time only 2 minutes in the future (less than 5 minutes)
		const twoMinutesAhead = new Date(Date.now() + 2 * 60 * 1000);
		const pad = (n: number) => String(n).padStart(2, '0');
		const localStr = `${twoMinutesAhead.getFullYear()}-${pad(twoMinutesAhead.getMonth() + 1)}-${pad(twoMinutesAhead.getDate())}T${pad(twoMinutesAhead.getHours())}:${pad(twoMinutesAhead.getMinutes())}`;

		fireEvent.change(screen.getByTestId('announcement-schedule-input'), {
			target: { value: localStr },
		});

		expect(screen.getByTestId('announcement-schedule-error')).toHaveTextContent(
			'Pick a time at least 5 minutes from now'
		);
		expect(submitBtn).toBeDisabled();
	});

	it('converts local input time to UTC ISO string on schedule submit', async () => {
		const user = userEvent.setup();
		renderComposer();

		await user.type(screen.getByTestId('announcement-title-input'), 'Future Message');
		await user.type(screen.getByTestId('announcement-content-input'), 'Going live soon');

		await user.click(screen.getByTestId('publish-mode-schedule'));

		// 2 hours ahead
		const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
		const pad = (n: number) => String(n).padStart(2, '0');
		const localStr = `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}T${pad(futureDate.getHours())}:${pad(futureDate.getMinutes())}`;

		fireEvent.change(screen.getByTestId('announcement-schedule-input'), {
			target: { value: localStr },
		});

		expect(screen.queryByTestId('announcement-schedule-error')).not.toBeInTheDocument();
		const submitBtn = screen.getByTestId('announcement-submit');
		expect(submitBtn).not.toBeDisabled();

		await user.click(submitBtn);

		expect(mockSchedule).toHaveBeenCalledTimes(1);
		const callArg = mockSchedule.mock.calls[0][0];
		expect(callArg.title).toBe('Future Message');
		expect(callArg.keyId).toBe('creator-1');
		expect(callArg.content).toBe('Going live soon');
		// Must be a valid UTC ISO 8601 string ending in Z
		expect(callArg.scheduledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		expect(new Date(callArg.scheduledAt).getTime()).toBeCloseTo(new Date(localStr).getTime(), -3);
	});

	it('supports editing an existing scheduled item through the composer and keeps status until saved', async () => {
		const initial: ScheduledAnnouncement = {
			id: 'sched-existing',
			keyId: 'creator-1',
			title: 'Existing Scheduled Message',
			category: 'event',
			content: 'Original body',
			scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			status: 'scheduled',
			createdAt: new Date().toISOString(),
		};

		const user = userEvent.setup();
		const onCancel = vi.fn();
		const onSuccess = vi.fn();

		renderComposer({
			initialAnnouncement: initial,
			onCancelEdit: onCancel,
			onSuccess,
		});

		// In edit mode: Title, content, and category prefilled
		expect(screen.getByTestId('announcement-title-input')).toHaveValue('Existing Scheduled Message');
		expect(screen.getByTestId('announcement-content-input')).toHaveValue('Original body');
		expect(screen.getByTestId('announcement-category-select')).toHaveValue('event');
		expect(screen.getByTestId('announcement-submit')).toHaveTextContent('Save changes');

		// Modify title and submit
		await user.clear(screen.getByTestId('announcement-title-input'));
		await user.type(screen.getByTestId('announcement-title-input'), 'Updated Scheduled Message');

		await user.click(screen.getByTestId('announcement-submit'));

		expect(mockUpdate).toHaveBeenCalledTimes(1);
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'sched-existing',
				input: expect.objectContaining({
					title: 'Updated Scheduled Message',
				}),
			})
		);
		expect(onSuccess).toHaveBeenCalled();
	});
});
