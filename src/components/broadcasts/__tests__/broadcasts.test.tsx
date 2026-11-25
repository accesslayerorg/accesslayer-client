import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreatorBroadcastsPanel from '@/components/broadcasts/CreatorBroadcastsPanel';
import CreatorEmailOptIns from '@/components/broadcasts/CreatorEmailOptIns';
import UnsubscribePage from '@/pages/UnsubscribePage';
import {
	createBroadcast,
	getEmailSubscription,
	listBroadcasts,
	recordDeliveryReport,
	resetBroadcastStore,
	setEmailOptIn,
} from '@/services/broadcasts.service';

const { getHoldersPage, getCourses, fetchWalletHoldings } = vi.hoisted(() => ({
	getHoldersPage: vi.fn(),
	getCourses: vi.fn(),
	fetchWalletHoldings: vi.fn(),
}));
vi.mock('@/services/course.service', async importOriginal => {
	const actual = await importOriginal<typeof import('@/services/course.service')>();
	return { ...actual, courseService: { getHoldersPage, getCourses } };
});
vi.mock('@/hooks/useWallet', () => ({
	useWalletHoldings: (address: string) => ({ data: fetchWalletHoldings(address), isLoading: false }),
}));
vi.mock('@/utils/toast.util', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const KEY = 'key-1';
const HOLDERS = [
	{ id: '1', displayName: 'A', walletAddress: 'GA', keyCount: 1 },
	{ id: '2', displayName: 'B', walletAddress: 'GB', keyCount: 5 },
	{ id: '3', displayName: 'C', walletAddress: 'GC', keyCount: 10 },
];

function wrap(ui: ReactNode, path = '/') {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
		</QueryClientProvider>
	);
}

beforeEach(() => {
	resetBroadcastStore();
	getHoldersPage.mockReset();
	// Two pages, to check the cursor is followed.
	getHoldersPage.mockImplementation(async (_k: string, cursor?: string | null) =>
		cursor ? { holders: HOLDERS.slice(2), nextCursor: null } : { holders: HOLDERS.slice(0, 2), nextCursor: 'p2' }
	);
	getCourses.mockResolvedValue([{ id: KEY, title: 'Ada' }, { id: 'key-2', title: 'Grace' }]);
	fetchWalletHoldings.mockReturnValue([
		{ creatorId: KEY, quantity: 2 },
		{ creatorId: 'key-2', quantity: 1 },
	]);
	setEmailOptIn(KEY, 'GA', 'a@example.com', true);
	setEmailOptIn(KEY, 'GC', 'c@example.com', true);
});

describe('BroadcastComposer (#1476)', () => {
	it('shows the audience size before sending and follows the minimum balance', async () => {
		const user = userEvent.setup();
		wrap(<CreatorBroadcastsPanel keyId={KEY} keyName="Ada" />);
		const audience = await screen.findByTestId('broadcast-audience');
		expect(audience).toHaveTextContent('2 opted-in holders will receive this (3 hold 1+ key)');
		const min = screen.getByLabelText('Minimum keys held');
		await user.clear(min);
		await user.type(min, '5');
		expect(audience).toHaveTextContent('1 opted-in holder will receive this (2 hold 5+ keys)');
		expect(getHoldersPage).toHaveBeenCalledWith(KEY, 'p2');
	});

	it('previews the email with its unsubscribe link', async () => {
		const user = userEvent.setup();
		wrap(<CreatorBroadcastsPanel keyId={KEY} keyName="Ada" />);
		await user.type(await screen.findByLabelText('Message'), 'Big news');
		expect(screen.getByTestId('broadcast-preview')).toHaveTextContent(/Big news.*Unsubscribe instantly: .*\/unsubscribe\//s);
	});

	it('sends to opted-in holders and lists it in history', async () => {
		const user = userEvent.setup();
		wrap(<CreatorBroadcastsPanel keyId={KEY} keyName="Ada" />);
		await user.type(await screen.findByLabelText('Subject'), 'Launch');
		await user.type(screen.getByLabelText('Message'), 'Hello');
		await user.click(screen.getByRole('button', { name: 'Send now' }));
		await waitFor(() => expect(listBroadcasts(KEY)).toHaveLength(1));
		expect(listBroadcasts(KEY)[0].recipients.map(r => r.wallet)).toEqual(['GA', 'GC']);
		const row = await screen.findByRole('row', { name: /Launch/ });
		expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('2');
		expect(screen.getByTestId('broadcast-allowance')).toHaveTextContent('3 of 4 broadcasts left this month');
	});

	it('blocks a fifth broadcast this month with an explanation', async () => {
		const holders = HOLDERS.map(h => ({ walletAddress: h.walletAddress, keyCount: h.keyCount }));
		for (let i = 0; i < 4; i++) createBroadcast({ keyId: KEY, subject: `S${i}`, body: 'b', minBalance: 1 }, holders);
		wrap(<CreatorBroadcastsPanel keyId={KEY} keyName="Ada" />);
		expect(await screen.findByRole('alert')).toHaveTextContent(/used all 4 broadcasts/);
		expect(screen.getByTestId('broadcast-allowance')).toHaveTextContent('0 of 4');
		expect(screen.getByRole('button', { name: 'Send now' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Schedule' })).toBeDisabled();
	});
});

describe('BroadcastHistory (#1476)', () => {
	it('shows recipients, delivered, bounced and unsubscribed per broadcast', async () => {
		const holders = HOLDERS.map(h => ({ walletAddress: h.walletAddress, keyCount: h.keyCount }));
		const reported = createBroadcast({ keyId: KEY, subject: 'Reported', body: 'b', minBalance: 1 }, holders);
		recordDeliveryReport(reported.id, { delivered: 1, bounced: 1 });
		createBroadcast({ keyId: KEY, subject: 'Pending', body: 'b', minBalance: 1 }, holders);
		wrap(<CreatorBroadcastsPanel keyId={KEY} keyName="Ada" />);
		const cells = (name: RegExp) => within(screen.getByRole('row', { name })).getAllByRole('cell').map(c => c.textContent);
		await screen.findByRole('row', { name: /Reported/ });
		expect(cells(/Reported/).slice(1, 5)).toEqual(['2', '1', '1', '0']);
		expect(cells(/Pending/).slice(1, 5)).toEqual(['2', '—', '—', '0']);
	});
});

describe('holder opt-in and unsubscribe (#1476)', () => {
	it('lists held keys with creator emails off by default', async () => {
		resetBroadcastStore();
		wrap(<CreatorEmailOptIns address="GHOLDER" />);
		const ada = await screen.findByRole('checkbox', { name: 'Emails from Ada' });
		expect(ada).not.toBeChecked();
		expect(screen.getByRole('checkbox', { name: 'Emails from Grace' })).not.toBeChecked();
	});

	it('requires an email, then opts in per key', async () => {
		resetBroadcastStore();
		const user = userEvent.setup();
		wrap(<CreatorEmailOptIns address="GHOLDER" />);
		await user.click(await screen.findByRole('checkbox', { name: 'Emails from Ada' }));
		expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/);
		expect(getEmailSubscription(KEY, 'GHOLDER')).toBeNull();
		await user.type(screen.getByLabelText('Email address'), 'me@example.com');
		await user.click(screen.getByRole('checkbox', { name: 'Emails from Ada' }));
		await waitFor(() => expect(getEmailSubscription(KEY, 'GHOLDER')?.optedIn).toBe(true));
		expect(getEmailSubscription('key-2', 'GHOLDER')).toBeNull();
		expect(await screen.findByRole('checkbox', { name: 'Emails from Ada' })).toBeChecked();
	});

	it('unsubscribes from the email link right away', async () => {
		const token = getEmailSubscription(KEY, 'GA')!.unsubscribeToken;
		wrap(
			<Routes>
				<Route path="/unsubscribe/:token" element={<UnsubscribePage />} />
			</Routes>,
			`/unsubscribe/${token}`
		);
		expect(await screen.findByRole('heading', { name: 'You are unsubscribed' })).toBeInTheDocument();
		expect(getEmailSubscription(KEY, 'GA')?.optedIn).toBe(false);
	});

	it('says so when the link is not recognised', async () => {
		wrap(
			<Routes>
				<Route path="/unsubscribe/:token" element={<UnsubscribePage />} />
			</Routes>,
			'/unsubscribe/bogus'
		);
		expect(await screen.findByRole('heading', { name: 'Link not recognised' })).toBeInTheDocument();
	});
});
