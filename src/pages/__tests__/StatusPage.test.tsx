import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StatusPage from '@/pages/StatusPage';
import { ApiError } from '@/services/api.service';
import {
	statusService,
	type PlatformStatus,
	type ServiceUptimeDay,
} from '@/services/status.service';
import { formatAbsoluteDateTime } from '@/utils/time.utils';

vi.mock('@/services/status.service', () => ({
	statusService: {
		getPlatformStatus: vi.fn(),
		subscribeToStatusUpdates: vi.fn(),
	},
}));

const mockGetPlatformStatus = vi.mocked(statusService.getPlatformStatus);
const mockSubscribeToStatusUpdates = vi.mocked(
	statusService.subscribeToStatusUpdates
);

function dayKey(daysAgo: number): string {
	const date = new Date();
	date.setDate(date.getDate() - daysAgo);
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/** 30 days of uptime history, defaulting to 100% with per-day overrides. */
function uptimeDays(overrides: Record<number, number> = {}): ServiceUptimeDay[] {
	return Array.from({ length: 30 }, (_, daysAgo) => ({
		date: dayKey(daysAgo),
		uptimePercentage: overrides[daysAgo] ?? 100,
	}));
}

const startedAt = '2026-09-20T10:00:00.000Z';
const resolvedAt = '2026-09-20T12:30:00.000Z';
const ongoingStartedAt = '2026-09-27T08:00:00.000Z';

function buildStatusPayload(): PlatformStatus {
	return {
		services: [
			{
				id: 'contract-rpc',
				name: 'Contract RPC',
				description: 'Soroban RPC endpoint.',
				status: 'operational',
				uptimePercentage: 99.5,
				dailyUptime: uptimeDays({ 1: 96.5 }),
			},
			{
				id: 'indexer',
				name: 'Indexer',
				status: 'degraded',
				dailyUptime: uptimeDays({ 0: 80 }),
			},
			{
				id: 'api',
				name: 'API',
				status: 'down',
				uptimePercentage: 97.25,
			},
			{
				id: 'ipfs',
				name: 'IPFS',
				status: 'operational',
			},
		],
		incidents: [
			{
				id: 'inc-1',
				title: 'Indexer lag',
				status: 'resolved',
				affectedServiceIds: ['indexer'],
				startedAt,
				resolvedAt,
			},
			{
				id: 'inc-2',
				title: 'Elevated RPC latency',
				status: 'investigating',
				affectedServiceIds: ['contract-rpc', 'indexer'],
				startedAt: ongoingStartedAt,
				resolvedAt: null,
				summary: 'Trade submissions are slower than usual.',
			},
		],
		updatedAt: new Date().toISOString(),
	};
}

function renderStatusPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<StatusPage />
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('StatusPage platform health (#1051)', () => {
	beforeEach(() => {
		mockGetPlatformStatus.mockReset();
		mockSubscribeToStatusUpdates.mockReset();
		mockGetPlatformStatus.mockResolvedValue(buildStatusPayload());
		mockSubscribeToStatusUpdates.mockResolvedValue('Subscribed');
	});

	afterEach(cleanup);

	it('shows the current status and 30-day uptime for all four services', async () => {
		renderStatusPage();

		await waitFor(() =>
			expect(screen.getByTestId('service-status-contract-rpc')).toBeVisible()
		);

		expect(screen.getByTestId('service-status-contract-rpc')).toHaveTextContent(
			'Operational'
		);
		expect(screen.getByTestId('service-status-indexer')).toHaveTextContent(
			'Degraded'
		);
		expect(screen.getByTestId('service-status-api')).toHaveTextContent('Down');
		expect(screen.getByTestId('service-status-ipfs')).toHaveTextContent(
			'Operational'
		);

		// 30-day window is averaged from the daily buckets, not the API value.
		expect(screen.getByTestId('service-uptime-contract-rpc')).toHaveTextContent(
			'99.88%'
		);
		expect(screen.getByTestId('service-uptime-indexer')).toHaveTextContent(
			'99.33%'
		);
		// No buckets reported — the API value is used as-is.
		expect(screen.getByTestId('service-uptime-api')).toHaveTextContent('97.25%');
		expect(screen.getByTestId('service-uptime-ipfs')).toHaveTextContent('—');

		// Worst service state drives the overall banner.
		expect(screen.getByText('Major outage')).toBeInTheDocument();
		expect(screen.getByText('1 active incident')).toBeInTheDocument();
		expect(screen.getByTestId('status-refresh-badge')).toHaveTextContent(
			'Refreshes every 60s'
		);
	});

	it('lists every incident with affected services and start/resolution times', async () => {
		renderStatusPage();

		await waitFor(() =>
			expect(screen.getByTestId('incident-log')).toBeVisible()
		);

		const log = screen.getByTestId('incident-log');
		const titles = within(log)
			.getAllByRole('heading', { level: 3 })
			.map(node => node.textContent);

		// Newest incident first.
		expect(titles).toEqual(['Elevated RPC latency', 'Indexer lag']);

		const ongoingIncident = screen.getByTestId('incident-inc-2');
		expect(ongoingIncident).toHaveTextContent('Elevated RPC latency');
		expect(ongoingIncident).toHaveTextContent('Investigating');
		expect(ongoingIncident).toHaveTextContent('Contract RPC');
		expect(ongoingIncident).toHaveTextContent('Indexer');
		expect(ongoingIncident).toHaveTextContent(
			formatAbsoluteDateTime(ongoingStartedAt) as string
		);
		expect(ongoingIncident).toHaveTextContent('Ongoing');

		const resolvedIncident = screen.getByTestId('incident-inc-1');
		expect(resolvedIncident).toHaveTextContent('Resolved');
		expect(resolvedIncident).toHaveTextContent(
			formatAbsoluteDateTime(resolvedAt) as string
		);
		expect(resolvedIncident).toHaveTextContent('2h 30m');
	});

	it('posts the email to the status notification endpoint', async () => {
		const user = userEvent.setup();
		renderStatusPage();

		await user.type(screen.getByLabelText('Email address'), 'fan@example.com');
		await user.click(screen.getByRole('button', { name: 'Subscribe' }));

		await waitFor(() =>
			expect(mockSubscribeToStatusUpdates).toHaveBeenCalledWith(
				'fan@example.com'
			)
		);

		const success = await screen.findByTestId('status-subscribe-success');
		expect(success).toHaveTextContent('fan@example.com is subscribed');
	});

	it('blocks a malformed email before posting', async () => {
		const user = userEvent.setup();
		renderStatusPage();

		await user.type(screen.getByLabelText('Email address'), 'not-an-email');
		await user.click(screen.getByRole('button', { name: 'Subscribe' }));

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Enter a valid email address.'
		);
		expect(mockSubscribeToStatusUpdates).not.toHaveBeenCalled();
	});

	it('explains when the status feed cannot be reached', async () => {
		mockGetPlatformStatus.mockRejectedValue(
			new ApiError('Status feed unavailable', 503)
		);

		renderStatusPage();

		const unavailable = await screen.findByTestId('status-feed-unavailable');
		expect(unavailable).toHaveTextContent('Live status is unavailable');
		expect(unavailable).toHaveTextContent('Status feed unavailable');
		expect(screen.queryByTestId('incident-log')).not.toBeInTheDocument();
	});
});
