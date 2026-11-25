import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAccount } from 'wagmi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MediaKitPage from '@/pages/MediaKitPage';
import PublicPressPage from '@/pages/PublicPressPage';
import type { Course } from '@/services/course.service';
import {
	defaultMediaKit,
	getPublicMediaKit,
	resetMediaKitStore,
	saveMediaKitSettings,
} from '@/services/mediaKit.service';
import { formatDisplayKeyPrice, resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import { formatHolderCount } from '@/utils/numberFormat.utils';

const { getCourse } = vi.hoisted(() => ({ getCourse: vi.fn() }));
vi.mock('@/services/course.service', async importOriginal => {
	const actual = await importOriginal<typeof import('@/services/course.service')>();
	return { ...actual, courseService: { getCourse } };
});
vi.mock('@/hooks/useTelemetry', () => ({ useTelemetry: () => ({ track: vi.fn() }) }));
vi.mock('@/utils/toast.util', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const CREATOR_WALLET = 'GCREATORWALLET';
const course = {
	id: 'key-1',
	title: 'Ada Lovelace',
	instructorId: CREATOR_WALLET,
	priceStroops: 123_450_000,
	holderCount: 1_250,
	volume24h: 50_000_000,
	createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
	category: 'tech',
	level: 'BEGINNER',
	socialHandle: '@ada',
} as unknown as Course;

function seedKit(overrides: Partial<Parameters<typeof saveMediaKitSettings>[0]> = {}) {
	const { updatedAt: _u, ...base } = defaultMediaKit('key-1', 'ada');
	void _u;
	return saveMediaKitSettings({
		...base,
		bio: 'First programmer.',
		talkingPoints: ['Wrote the first algorithm'],
		contactEmail: 'press@example.com',
		...overrides,
	});
}

function renderAt(path: string) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={client}>
			<MemoryRouter initialEntries={[path]}>
				<Routes>
					<Route path="/creator/media-kit" element={<MediaKitPage />} />
					<Route path="/k/:handle/press" element={<PublicPressPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

beforeEach(() => {
	resetMediaKitStore();
	getCourse.mockReset();
	getCourse.mockResolvedValue(course);
	vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as never);
});

describe('public press page (#1475)', () => {
	it('returns the 404 page while visibility is off', async () => {
		seedKit({ isPublic: false });
		renderAt('/k/ada/press');
		expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
	});

	it('returns the 404 page for an unknown handle', async () => {
		renderAt('/k/nobody/press');
		expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
	});

	it('shows only the fields the creator enabled', async () => {
		seedKit({
			isPublic: true,
			visibleFields: { stats: false, bio: true, talkingPoints: false, contactEmail: false, assets: false, qrCode: true },
		});
		renderAt('/k/ada/press');
		expect(await screen.findByTestId('press-bio')).toHaveTextContent('First programmer.');
		expect(screen.queryByText('Talking points')).not.toBeInTheDocument();
		expect(screen.queryByText(/press@example.com/)).not.toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Stats' })).not.toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Downloads' })).not.toBeInTheDocument();
		expect(screen.queryByTestId('copy-block-stats')).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'QR code' })).toBeInTheDocument();
	});

	it('links the QR code to the key page and shows stats like the key page', async () => {
		seedKit({
			isPublic: true,
			visibleFields: { stats: true, bio: true, talkingPoints: true, contactEmail: true, assets: true, qrCode: true },
		});
		renderAt('/k/ada/press');
		const qrUrl = await screen.findByTestId('media-kit-qr-url');
		expect(qrUrl).toHaveAttribute('href', `${window.location.origin}/keys/key-1`);
		expect(screen.getByRole('img', { name: `QR code for ${window.location.origin}/keys/key-1` })).toBeInTheDocument();
		await screen.findByRole('heading', { name: 'Stats' });
		expect(screen.getByText(formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(course)))).toBeInTheDocument();
		expect(screen.getByText(formatHolderCount(1_250))).toBeInTheDocument();
		expect(screen.getByText('10 days')).toBeInTheDocument();
		expect(screen.getByTestId('media-kit-stats-updated')).toHaveTextContent(/Last updated/);
		expect(screen.getByText('press@example.com')).toHaveAttribute('href', 'mailto:press@example.com');
	});
});

describe('media kit editor (#1475)', () => {
	it('is only editable by the key creator wallet', async () => {
		vi.mocked(useAccount).mockReturnValue({ address: 'GSOMEONEELSE', isConnected: true } as never);
		renderAt('/creator/media-kit?key=key-1');
		expect(await screen.findByRole('alert')).toHaveTextContent(/Only the wallet that created this key/);
	});

	it('publishes and unpublishes the press page with the visibility toggle', async () => {
		const user = userEvent.setup();
		vi.mocked(useAccount).mockReturnValue({ address: CREATOR_WALLET, isConnected: true } as never);
		renderAt('/creator/media-kit?key=key-1');
		const visibility = await screen.findByRole('switch');
		expect(visibility).toHaveAttribute('aria-checked', 'false');
		expect(screen.getByLabelText('Handle')).toHaveValue('ada');

		await user.type(screen.getByLabelText('Short bio'), 'Hello press');
		await user.click(visibility);
		await user.click(screen.getByRole('button', { name: 'Save media kit' }));
		await waitFor(() => expect(getPublicMediaKit('ada')?.bio).toBe('Hello press'));

		await user.click(await screen.findByRole('switch'));
		await user.click(screen.getByRole('button', { name: 'Save media kit' }));
		await waitFor(() => expect(getPublicMediaKit('ada')).toBeNull());
	});

	it('shows validation errors instead of saving', async () => {
		const user = userEvent.setup();
		vi.mocked(useAccount).mockReturnValue({ address: CREATOR_WALLET, isConnected: true } as never);
		renderAt('/creator/media-kit?key=key-1');
		const email = await screen.findByRole('textbox', { name: 'Contact email' });
		await user.type(email, 'not-an-email');
		await user.click(screen.getByRole('button', { name: 'Save media kit' }));
		expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/);
	});
});
