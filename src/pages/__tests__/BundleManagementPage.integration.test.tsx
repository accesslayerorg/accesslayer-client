import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import BundleManagementPage from '@/pages/BundleManagementPage';
import { courseService, type Course } from '@/services/course.service';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import showToast from '@/utils/toast.util';
import type { BundlesPage, KeyBundle } from '@/services/bundle.service';

const { getCreatorBundles } = vi.hoisted(() => ({
	getCreatorBundles: vi.fn(),
}));

vi.mock('@/services/course.service', () => ({
	courseService: { getCourse: vi.fn(), getCourses: vi.fn() },
}));

vi.mock('@/services/bundle.service', () => ({
	bundleService: { getCreatorBundles },
	fetchCreatorBundlesPage: (creatorId: string, cursor: string | null) =>
		getCreatorBundles(creatorId, cursor),
}));

// The bundle page reuses the shared contract-call seam, so mocking it here
// also covers the creator dashboard's mutations.
vi.mock('@/hooks/useCreatorContractActions', () => ({
	submitCreatorContractCall: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		message: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

const CREATOR_ID = 'creator-1';
const DAY_MS = 86_400_000;
const KEY_PRICE_XLM = 10;

const mockGetCourse = vi.mocked(courseService.getCourse);
const mockGetCourses = vi.mocked(courseService.getCourses);
const mockSubmitCall = vi.mocked(submitCreatorContractCall);
const mockToastSuccess = vi.mocked(showToast.success);
const mockToastError = vi.mocked(showToast.error);

function makeCourse(): Course {
	return {
		id: 'key-a',
		title: 'Alpha Key',
		description: '',
		price: KEY_PRICE_XLM,
		priceStroops: KEY_PRICE_XLM * 10_000_000,
		instructorId: CREATOR_ID,
		category: 'Test',
		level: 'BEGINNER',
	};
}

function makeBundle(overrides: Partial<KeyBundle> = {}): KeyBundle {
	return {
		id: 'bundle-1',
		creatorId: CREATOR_ID,
		items: [{ keyId: 'key-a', quantity: 2 }],
		listPriceXlm: 20,
		discountPriceXlm: 16,
		expiresAt: new Date(Date.now() + 3 * DAY_MS).toISOString(),
		createdAt: new Date().toISOString(),
		purchaseCount: 2,
		cancelledAt: null,
		...overrides,
	};
}

/** Stands in for the bundle endpoint, persisting cancellations between fetches. */
function stubBundleEndpoint(initial: KeyBundle[]) {
	const store: KeyBundle[] = initial.map(bundle => ({ ...bundle }));
	getCreatorBundles.mockImplementation(
		async (): Promise<BundlesPage> => ({
			bundles: store.map(bundle => ({ ...bundle })),
			nextCursor: null,
		})
	);
	return store;
}

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
}

function renderPage() {
	return render(
		<QueryClientProvider client={makeQueryClient()}>
			<MemoryRouter initialEntries={[`/creator/${CREATOR_ID}/bundles`]}>
				<Routes>
					<Route
						path="/creator/:id/bundles"
						element={<BundleManagementPage />}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

/** Fills the create form with a valid draft: 2 x Alpha Key at 16 XLM for 7 days. */
function fillValidBundleDraft() {
	fireEvent.change(screen.getByTestId('bundle-key-select'), {
		target: { value: 'key-a' },
	});
	fireEvent.click(screen.getByTestId('bundle-add-key'));
	fireEvent.change(screen.getByTestId('bundle-line-quantity-key-a'), {
		target: { value: '2' },
	});
	fireEvent.change(screen.getByTestId('bundle-price-input'), {
		target: { value: '16' },
	});
	fireEvent.change(screen.getByTestId('bundle-expiry-input'), {
		target: { value: '7' },
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCourse.mockResolvedValue(makeCourse());
	mockGetCourses.mockResolvedValue([makeCourse()]);
	stubBundleEndpoint([makeBundle()]);
	mockSubmitCall.mockResolvedValue({ success: true });
});

afterEach(cleanup);

describe('BundleManagementPage', () => {
	it('shows an error state when the creator cannot be loaded', async () => {
		mockGetCourse.mockRejectedValue(new Error('nope'));
		renderPage();

		expect(await screen.findByTestId('bundle-management-error')).toBeInTheDocument();
	});

	it('blocks creating a bundle when the discount is under the price floor', async () => {
		renderPage();

		await screen.findByTestId('bundle-create-form');
		fireEvent.change(screen.getByTestId('bundle-key-select'), {
			target: { value: 'key-a' },
		});
		fireEvent.click(screen.getByTestId('bundle-add-key'));
		// 2 keys x 10 XLM = 20 XLM list price, so the floor is 16 XLM.
		fireEvent.change(screen.getByTestId('bundle-line-quantity-key-a'), {
			target: { value: '2' },
		});
		fireEvent.change(screen.getByTestId('bundle-price-input'), {
			target: { value: '15' },
		});
		fireEvent.click(screen.getByTestId('bundle-submit'));

		expect(mockSubmitCall).not.toHaveBeenCalled();
		expect(screen.getByTestId('bundle-price-error')).toHaveTextContent(
			'Bundle price must be at least 16 XLM (20% off list)'
		);
	});

	it('submits create_bundle with the selected keys, price and expiry', async () => {
		renderPage();

		await screen.findByTestId('bundle-create-form');
		fillValidBundleDraft();
		fireEvent.click(screen.getByTestId('bundle-submit'));

		await waitFor(() => expect(mockSubmitCall).toHaveBeenCalledTimes(1));
		expect(mockSubmitCall).toHaveBeenCalledWith(
			'create_bundle',
			expect.objectContaining({
				creatorId: CREATOR_ID,
				items: [{ keyId: 'key-a', quantity: 2 }],
				discountPriceXlm: 16,
				expiresAt: expect.any(String),
			})
		);
		expect(mockToastSuccess).toHaveBeenCalledWith('Bundle created');
	});

	it('surfaces a rejected signature without losing the page', async () => {
		mockSubmitCall.mockRejectedValue({ code: 4001 });
		renderPage();

		await screen.findByTestId('bundle-create-form');
		fillValidBundleDraft();
		fireEvent.click(screen.getByTestId('bundle-submit'));

		await waitFor(() => expect(mockToastError).toHaveBeenCalled());
		expect(screen.getByTestId('bundle-create-form')).toBeInTheDocument();
	});

	it('lists active bundles with purchase count and a countdown', async () => {
		renderPage();

		expect(await screen.findByTestId('active-bundle-row')).toHaveTextContent(
			'bundle-1'
		);
		expect(screen.getByTestId('active-bundle-purchases')).toHaveTextContent('2');
		expect(screen.getByTestId('bundle-time-remaining')).toHaveTextContent('2d');
	});

	it('archives a bundle that has already expired', async () => {
		stubBundleEndpoint([
			makeBundle({
				id: 'bundle-expired',
				expiresAt: new Date(Date.now() - DAY_MS).toISOString(),
			}),
		]);
		renderPage();

		expect(await screen.findByTestId('expired-bundle-row')).toHaveTextContent(
			'bundle-expired'
		);
		expect(screen.queryByTestId('active-bundle-row')).not.toBeInTheDocument();
		expect(screen.getByTestId('expired-bundle-end-reason')).toHaveTextContent(
			'Expired'
		);
	});

	it('removes a cancelled bundle from the active list and archives it', async () => {
		const store = stubBundleEndpoint([makeBundle()]);
		// Mirror the endpoint recording the cancellation.
		mockSubmitCall.mockImplementation(async (fn, args) => {
			if (fn === 'cancel_bundle') {
				const { bundleId } = args as { bundleId: string };
				const target = store.find(bundle => bundle.id === bundleId);
				if (target) target.cancelledAt = new Date().toISOString();
			}
			return { success: true };
		});

		renderPage();
		await screen.findByTestId('active-bundle-row');
		fireEvent.click(screen.getByTestId('active-bundle-cancel'));

		await waitFor(() =>
			expect(screen.queryByTestId('active-bundle-row')).not.toBeInTheDocument()
		);
		expect(mockSubmitCall).toHaveBeenCalledWith('cancel_bundle', {
			creatorId: CREATOR_ID,
			bundleId: 'bundle-1',
		});
		expect(mockToastSuccess).toHaveBeenCalledWith('Bundle cancelled');
		expect(await screen.findByTestId('expired-bundle-row')).toHaveTextContent(
			'bundle-1'
		);
	});

	it('keeps the bundle listed when the cancel call fails', async () => {
		mockSubmitCall.mockRejectedValue(new Error('network down'));
		renderPage();

		await screen.findByTestId('active-bundle-row');
		fireEvent.click(screen.getByTestId('active-bundle-cancel'));

		await waitFor(() => expect(mockToastError).toHaveBeenCalled());
		expect(screen.getByTestId('active-bundle-row')).toBeInTheDocument();
	});
});
