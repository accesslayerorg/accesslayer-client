import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GovernanceFeedPage from '../GovernanceFeedPage';
import {
	governanceService,
	type GetGovernanceEventsParams,
} from '@/services/governance.service';
import type {
	GovernanceAdminState,
	GovernanceEvent,
	GovernanceEventsPage,
} from '@/types/governance';

vi.mock('@/services/governance.service', () => ({
	GOVERNANCE_EVENTS_PAGE_SIZE: 20,
	governanceService: {
		getGovernanceEvents: vi.fn(),
		getGovernanceAdmin: vi.fn(),
	},
}));

const getEvents = vi.mocked(governanceService.getGovernanceEvents);
const getAdmin = vi.mocked(governanceService.getGovernanceAdmin);

const NOW = new Date('2026-11-22T12:00:00.000Z').getTime();
const ADMIN = 'GADMINCURRENTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXA';
const NEXT_ADMIN = 'GADMINPENDINGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXB';

function makeEvent(
	id: string,
	type: GovernanceEvent['type'],
	overrides: Partial<GovernanceEvent> = {}
): GovernanceEvent {
	return {
		id,
		type,
		actor: ADMIN,
		target: NEXT_ADMIN,
		timestamp: new Date(NOW - 60 * 60 * 1000).toISOString(),
		txHash: `tx${id}abcdef0123456789`,
		details: null,
		...overrides,
	};
}

const ALL_EVENTS: GovernanceEvent[] = [
	makeEvent('1', 'admin_transfer_proposed'),
	makeEvent('2', 'config_change', {
		target: 'fee_bps',
		details: 'fee_bps: 100 → 150',
	}),
	makeEvent('3', 'pause', { target: null }),
	makeEvent('4', 'config_change', { target: 'max_supply' }),
];

/** Fake API honouring the type filter and a numeric cursor. */
function fakeEventsApi(events: GovernanceEvent[], pageSize = 50) {
	return async ({
		type,
		cursor,
	}: GetGovernanceEventsParams = {}): Promise<GovernanceEventsPage> => {
		const matching = events.filter(e => !type || e.type === type);
		const start = cursor ? Number(cursor) : 0;
		const end = start + pageSize;
		return {
			items: matching.slice(start, end),
			nextCursor: end < matching.length ? String(end) : null,
		};
	};
}

const NO_PENDING: GovernanceAdminState = {
	currentAdmin: ADMIN,
	pendingAdmin: null,
	pendingExpiresAt: null,
};

function renderPage(initialPath = '/governance/activity') {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<QueryClientProvider client={queryClient}>
				<GovernanceFeedPage />
			</QueryClientProvider>
		</MemoryRouter>
	);
}

function renderedEventIds() {
	const list = screen.getByTestId('governance-feed-list');
	return within(list)
		.getAllByRole('listitem')
		.map(li =>
			li.getAttribute('data-testid')?.replace('governance-event-', '')
		);
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	getEvents.mockImplementation(fakeEventsApi(ALL_EVENTS));
	getAdmin.mockResolvedValue(NO_PENDING);
});

afterEach(() => {
	vi.useRealTimers();
	vi.clearAllMocks();
});

describe('GovernanceFeedPage', { timeout: 15_000 }, () => {
	it('renders without a wallet connection or wagmi provider', async () => {
		renderPage();

		expect(
			screen.getByRole('heading', { level: 1, name: 'Governance activity' })
		).toBeInTheDocument();
		await screen.findByTestId('governance-feed-list');
		const card = screen.getByTestId('current-admin-card');
		expect(
			await within(card).findByText('GADMIN…XXXXXA')
		).toBeInTheDocument();
	});

	it('renders each event with its icon, actor, target and explorer link', async () => {
		renderPage();
		const row = await screen.findByTestId('governance-event-2');

		expect(
			within(row).getByTestId('governance-event-icon-config_change')
		).toBeInTheDocument();
		expect(row).toHaveTextContent('Config change');
		expect(row).toHaveTextContent('fee_bps: 100 → 150');
		expect(row).toHaveTextContent('Actor');
		expect(row).toHaveTextContent('Target');
		expect(
			within(row).getByText('1 hour ago', { exact: false })
		).toBeInTheDocument();

		const link = within(row).getByRole('link', {
			name: /view config change transaction on stellar expert/i,
		});
		expect(link).toHaveAttribute(
			'href',
			'https://stellar.expert/explorer/testnet/tx/tx2abcdef0123456789'
		);
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');

		expect(
			within(row).getByRole('button', { name: 'Copy transaction hash' })
		).toBeInTheDocument();
		expect(
			within(row).getByRole('button', { name: 'Copy actor address' })
		).toBeInTheDocument();
	});

	it('limits the feed to the chosen event type and sends it to the API', async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByTestId('governance-feed-list');
		expect(renderedEventIds()).toEqual(['1', '2', '3', '4']);

		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Event type' }),
			'config_change'
		);

		await waitFor(() => expect(renderedEventIds()).toEqual(['2', '4']));
		expect(getEvents).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: 'config_change', cursor: null })
		);

		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Event type' }),
			'all'
		);
		await waitFor(() =>
			expect(renderedEventIds()).toEqual(['1', '2', '3', '4'])
		);
	});

	it('still filters when the API ignores the type param', async () => {
		getEvents.mockImplementation(async () => ({
			items: ALL_EVENTS,
			nextCursor: null,
		}));
		renderPage('/governance/activity?type=pause');

		await waitFor(() => expect(renderedEventIds()).toEqual(['3']));
		expect(screen.getByRole('combobox', { name: 'Event type' })).toHaveValue(
			'pause'
		);
	});

	it('shows an empty state for a type with no events', async () => {
		renderPage('/governance/activity?type=upgrade');
		expect(
			await screen.findByTestId('governance-feed-empty')
		).toHaveTextContent('No contract upgrade events yet.');
	});

	it('loads the next cursor page when Load more is pressed', async () => {
		const user = userEvent.setup();
		getEvents.mockImplementation(fakeEventsApi(ALL_EVENTS, 2));
		renderPage();

		await screen.findByTestId('governance-feed-list');
		expect(renderedEventIds()).toEqual(['1', '2']);

		await user.click(screen.getByRole('button', { name: 'Load more' }));

		await waitFor(() =>
			expect(renderedEventIds()).toEqual(['1', '2', '3', '4'])
		);
		expect(getEvents).toHaveBeenLastCalledWith(
			expect.objectContaining({ cursor: '2' })
		);
		expect(
			screen.queryByRole('button', { name: 'Load more' })
		).not.toBeInTheDocument();
	});

	it('shows the pending transfer notice with a countdown to expiry', async () => {
		const expiresInMs = ((1 * 24 + 2) * 60 * 60 + 3 * 60 + 4) * 1000;
		getAdmin.mockResolvedValue({
			currentAdmin: ADMIN,
			pendingAdmin: NEXT_ADMIN,
			pendingExpiresAt: new Date(NOW + expiresInMs).toISOString(),
		});
		renderPage();

		const notice = await screen.findByTestId('pending-admin-transfer-notice');
		expect(notice).toHaveAttribute('role', 'alert');
		expect(notice).toHaveTextContent('Admin transfer pending');
		expect(notice).toHaveTextContent('GADMIN…XXXXXB');
		expect(
			within(notice).getByTestId('pending-admin-countdown')
		).toHaveTextContent('Expires in 1d 02h 03m 04s');
		expect(
			within(notice).getByRole('button', {
				name: 'Copy pending admin address',
			})
		).toBeInTheDocument();

		const card = screen.getByTestId('current-admin-card');
		expect(card).toHaveTextContent('Pending admin');
		expect(card).toHaveTextContent('Expires in 1d 02h 03m 04s');
	});

	it('marks a pending transfer as expired once the deadline passes', async () => {
		getAdmin.mockResolvedValue({
			currentAdmin: ADMIN,
			pendingAdmin: NEXT_ADMIN,
			pendingExpiresAt: new Date(NOW - 1000).toISOString(),
		});
		renderPage();

		const notice = await screen.findByTestId('pending-admin-transfer-notice');
		expect(
			within(notice).getByTestId('pending-admin-countdown')
		).toHaveTextContent('Expired');
	});

	it('hides the pending notice when no transfer is pending', async () => {
		renderPage();
		await screen.findByTestId('governance-feed-list');
		await waitFor(() =>
			expect(screen.getByTestId('current-admin-card')).toHaveTextContent(
				'None'
			)
		);
		expect(
			screen.queryByTestId('pending-admin-transfer-notice')
		).not.toBeInTheDocument();
	});
});
