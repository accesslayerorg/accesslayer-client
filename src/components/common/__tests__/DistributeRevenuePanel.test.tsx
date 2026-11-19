import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DistributeRevenuePanel from '../DistributeRevenuePanel';
import { courseService, type KeyHolderEntry } from '@/services/course.service';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import showToast from '@/utils/toast.util';
import { getCreatorDistributionStorageKey } from '@/utils/creatorRevenue.utils';

vi.mock('@/services/course.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getHoldersPage: vi.fn(),
		},
	};
});

vi.mock('@/hooks/useCreatorContractActions', async importOriginal => {
	const actual =
		await importOriginal<typeof import('@/hooks/useCreatorContractActions')>();
	return {
		...actual,
		submitCreatorContractCall: vi.fn((fn: string, args: unknown) =>
			actual.submitCreatorContractCall(fn, args)
		),
	};
});

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
const CREATOR_WALLET = 'GCREATORWALLETADDRESS000000000000000000000000000000000000';

const ADDR_A = 'GALICE000000000000000000000000000000000000000000000000';
const ADDR_B = 'GBOB00000000000000000000000000000000000000000000000000';
const ADDR_C = 'GCAROL0000000000000000000000000000000000000000000000000';
const ADDR_D = 'GDAVE00000000000000000000000000000000000000000000000000';
const ADDR_E = 'GEVE000000000000000000000000000000000000000000000000000';
const ADDR_F = 'GFRANK0000000000000000000000000000000000000000000000000';
const ADDR_G = 'GGRACE0000000000000000000000000000000000000000000000000';

// 7 holders with 280 keys total so the top-5 slice is exercised:
// Alice 70 (25%), Bob 60 (~21.43%), Carol 50 (~17.86%),
// Dave 40 (~14.29%), Eve 30 (~10.71%), Frank 20, Grace 10.
const HOLDERS: KeyHolderEntry[] = [
	{ id: 'h1', displayName: 'Alice', walletAddress: ADDR_A, keyCount: 70 },
	{ id: 'h2', displayName: 'Bob', walletAddress: ADDR_B, keyCount: 60 },
	{ id: 'h3', displayName: 'Carol', walletAddress: ADDR_C, keyCount: 50 },
	{ id: 'h4', displayName: 'Dave', walletAddress: ADDR_D, keyCount: 40 },
	{ id: 'h5', displayName: 'Eve', walletAddress: ADDR_E, keyCount: 30 },
	{ id: 'h6', displayName: 'Frank', walletAddress: ADDR_F, keyCount: 20 },
	{ id: 'h7', displayName: 'Grace', walletAddress: ADDR_G, keyCount: 10 },
];

const mockGetHoldersPage = vi.mocked(courseService.getHoldersPage);
const submitSpy = vi.mocked(submitCreatorContractCall);

function renderPanel() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<DistributeRevenuePanel
				creatorId={CREATOR_ID}
				wallet={CREATOR_WALLET}
			/>
		</QueryClientProvider>
	);
}

async function waitForHoldersLoaded() {
	await waitFor(
		() =>
			expect(screen.getByTestId('distribute-preview-empty')).toBeInTheDocument(),
		{ timeout: 3_000 }
	);
}

async function openConfirmModal(amount: string) {
	const input = screen.getByTestId('distribute-amount-input');
	fireEvent.change(input, { target: { value: amount } });
	fireEvent.click(screen.getByTestId('distribute-open-confirm-button'));
	await waitFor(
		() =>
			expect(screen.getByTestId('distribute-confirm-modal')).toBeInTheDocument(),
		{ timeout: 3_000 }
	);
}

describe('DistributeRevenuePanel', () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		window.localStorage.removeItem(getCreatorDistributionStorageKey(CREATOR_ID));
		mockGetHoldersPage.mockResolvedValue({
			holders: HOLDERS,
			nextCursor: null,
		});
	});

	it('validates the minimum distribution amount with an inline error', async () => {
		renderPanel();
		await waitForHoldersLoaded();

		const input = screen.getByTestId('distribute-amount-input');

		fireEvent.change(input, { target: { value: '0.5' } });
		expect(screen.getByTestId('distribute-amount-error')).toHaveTextContent(
			'Minimum distribution is 1 XLM'
		);
		expect(
			screen.getByTestId('distribute-open-confirm-button')
		).toBeDisabled();

		fireEvent.change(input, { target: { value: '1' } });
		expect(
			screen.queryByTestId('distribute-amount-error')
		).not.toBeInTheDocument();
		expect(
			screen.getByTestId('distribute-open-confirm-button')
		).not.toBeDisabled();
	});

	it('shows accurate pro-rata estimates for the top holders in the preview', async () => {
		renderPanel();
		await waitForHoldersLoaded();

		fireEvent.change(screen.getByTestId('distribute-amount-input'), {
			target: { value: '100' },
		});

		const rows = screen.getAllByTestId(/^distribute-preview-row-/);
		expect(rows).toHaveLength(5);

		expect(
			screen.getByTestId(`distribute-preview-row-${ADDR_A}`)
		).toBeInTheDocument();
		expect(
			screen.getByTestId(`distribute-preview-amount-${ADDR_A}`)
		).toHaveTextContent('25.00 XLM');
		expect(
			screen.getByTestId(`distribute-preview-amount-${ADDR_B}`)
		).toHaveTextContent('21.43 XLM');
		expect(
			screen.getByTestId(`distribute-preview-amount-${ADDR_C}`)
		).toHaveTextContent('17.86 XLM');

		// Frank and Grace fall outside the top 5 preview
		expect(
			screen.queryByTestId(`distribute-preview-row-${ADDR_F}`)
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId(`distribute-preview-row-${ADDR_G}`)
		).not.toBeInTheDocument();
	});

	it('shows the total and top 5 holder allocations in the confirm modal', async () => {
		renderPanel();
		await waitForHoldersLoaded();

		await openConfirmModal('100');

		expect(screen.getByTestId('distribute-confirm-total')).toHaveTextContent(
			'100.00 XLM'
		);

		const rows = screen.getAllByTestId(/^distribute-confirm-row-/);
		expect(rows).toHaveLength(5);
		expect(
			screen.getByTestId(`distribute-confirm-row-${ADDR_A}`)
		).toBeInTheDocument();
		expect(
			screen.getByTestId(`distribute-confirm-amount-${ADDR_A}`)
		).toHaveTextContent('25.00 XLM');
		expect(
			screen.getByTestId(`distribute-confirm-amount-${ADDR_B}`)
		).toHaveTextContent('21.43 XLM');

		// Cancel closes the modal without submitting
		fireEvent.click(screen.getByTestId('distribute-cancel-button'));
		expect(
			screen.queryByTestId('distribute-confirm-modal')
		).not.toBeInTheDocument();
		expect(submitSpy).not.toHaveBeenCalled();
	});

	it('submits the distribute_revenue contract call on confirm', async () => {
		renderPanel();
		await waitForHoldersLoaded();

		await openConfirmModal('100');
		fireEvent.click(screen.getByTestId('distribute-confirm-button'));

		await waitFor(
			() => {
				expect(submitSpy).toHaveBeenCalledWith('distribute_revenue', {
					creatorId: CREATOR_ID,
					amount: 100,
					holderCount: 7,
					wallet: CREATOR_WALLET,
				});
			},
			{ timeout: 3_000 }
		);

		await waitFor(
			() =>
				expect(showToast.success).toHaveBeenCalledWith('Revenue distributed'),
			{ timeout: 3_000 }
		);
	});

	it('updates the distribution history list after a distribution', async () => {
		renderPanel();
		await waitForHoldersLoaded();

		expect(screen.getByTestId('distribute-history-empty')).toBeInTheDocument();

		await openConfirmModal('100');
		fireEvent.click(screen.getByTestId('distribute-confirm-button'));

		await waitFor(
			() => {
				expect(
					screen.getByTestId('distribute-history-amount')
				).toHaveTextContent('100.00 XLM');
			},
			{ timeout: 3_000 }
		);

		expect(screen.getByTestId('distribute-history-holders')).toHaveTextContent(
			'7 holders'
		);
		expect(screen.getByTestId('distribute-history-date')).toBeInTheDocument();
		expect(
			screen.queryByTestId('distribute-history-empty')
		).not.toBeInTheDocument();
	});
});
