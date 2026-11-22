import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VestingSchedulesViewer from '../VestingSchedulesViewer';
import { courseService } from '@/services/course.service';
import { ApiError } from '@/services/api.service';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getKeyVesting: vi.fn(),
		getKeyVestingClaims: vi.fn().mockResolvedValue([]),
	},
}));

vi.mock('@/hooks/useCreatorContractActions', () => ({
	submitCreatorContractCall: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/tooltip', () => ({
	Tooltip: ({
		children,
		content,
	}: {
		children: React.ReactNode;
		content: string;
	}) => <span title={content}>{children}</span>,
}));

const WALLET = 'GCREATORWALLET';

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return {
		queryClient,
		wrapper: ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		),
	};
}

function renderViewer(
	props: Partial<React.ComponentProps<typeof VestingSchedulesViewer>> = {}
) {
	const { wrapper } = makeWrapper();
	return render(
		<VestingSchedulesViewer wallet={WALLET} keyIds={['key-1']} {...props} />,
		{ wrapper }
	);
}

describe('VestingSchedulesViewer (#1117)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders a card per active schedule with the next-unlock countdown', async () => {
		vi.mocked(courseService.getKeyVesting).mockResolvedValue({
			keyId: 'key-1',
			beneficiary: WALLET,
			totalAllocationXlm: 1000,
			claimedAmountXlm: 100,
			vestedAmountXlm: 0,
			claimableXlm: 0,
			cliffAt: new Date(Date.now() + 90_000).toISOString(),
			endAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
		});

		renderViewer({ keyNames: { 'key-1': 'Alpha Key' } });

		await waitFor(() => {
			expect(screen.getByTestId('vesting-card-key-name')).toHaveTextContent(
				'Alpha Key'
			);
		});

		// Cliff status + totals come from the shared vesting card.
		expect(screen.getByTestId('vesting-card-phase')).toHaveTextContent(
			/cliff/i
		);
		expect(screen.getByTestId('vesting-card-total')).toHaveTextContent(
			'1000.00 XLM'
		);

		// Next-unlock banner with a live countdown.
		const timer = screen.getByTestId('vesting-viewer-next-unlock');
		expect(timer).toBeInTheDocument();
		expect(screen.getByTestId('vesting-viewer-countdown')).toHaveTextContent(
			/^\d{2}:\d{2}:\d{2}$/
		);
		expect(timer).toHaveTextContent(/Cliff for Alpha Key/);
	});

	it('submits a claim_vested_tokens call for the claimable amount', async () => {
		const user = userEvent.setup();
		vi.mocked(courseService.getKeyVesting).mockResolvedValue({
			keyId: 'key-1',
			beneficiary: WALLET,
			totalAllocationXlm: 1000,
			claimedAmountXlm: 100,
			vestedAmountXlm: 500,
			claimableXlm: 400,
			cliffAt: new Date(Date.now() - 3_600_000).toISOString(), // past
			endAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
		});
		const { submitCreatorContractCall } = await import(
			'@/hooks/useCreatorContractActions'
		);

		renderViewer();

		const claimButton = await screen.findByTestId('vesting-card-claim-button');
		await waitFor(() => {
			expect(claimButton).toBeEnabled();
		});

		await user.click(claimButton);

		await waitFor(() => {
			expect(submitCreatorContractCall).toHaveBeenCalledWith(
				'claim_vested_tokens',
				expect.objectContaining({
					creatorId: 'key-1',
					wallet: WALLET,
					amountXlm: 400,
				})
			);
		});
	});

	it('keeps fully vested schedules that still have a claimable balance', async () => {
		vi.mocked(courseService.getKeyVesting).mockImplementation(
			async (keyId: string) => {
				if (keyId === 'key-settled') {
					// Fully claimed — nothing left to show.
					return {
						keyId,
						totalAllocationXlm: 500,
						claimedAmountXlm: 500,
						vestedAmountXlm: 500,
						claimableXlm: 0,
						cliffAt: '2026-01-01T00:00:00Z',
						endAt: '2026-02-01T00:00:00Z',
					};
				}
				// Fully vested but not yet claimed.
				return {
					keyId,
					totalAllocationXlm: 500,
					claimedAmountXlm: 0,
					vestedAmountXlm: 500,
					claimableXlm: 250,
					cliffAt: '2026-01-01T00:00:00Z',
					endAt: '2026-02-01T00:00:00Z',
				};
			}
		);

		renderViewer({ keyIds: ['key-left', 'key-settled'] });

		await waitFor(() => {
			expect(screen.getAllByTestId('vesting-card')).toHaveLength(1);
		});
		expect(screen.getByTestId('vesting-card')).toHaveAttribute(
			'data-key-id',
			'key-left'
		);
		// Fully vested → no upcoming milestone, so no countdown banner.
		expect(
			screen.queryByTestId('vesting-viewer-next-unlock')
		).not.toBeInTheDocument();
	});

	it('shows the empty state when the wallet has no active schedules', async () => {
		vi.mocked(courseService.getKeyVesting).mockRejectedValue(
			new ApiError('Vesting schedule', 404)
		);

		renderViewer();

		expect(
			await screen.findByTestId('vesting-viewer-empty')
		).toBeInTheDocument();
	});

	it('surfaces an error banner when a schedule fails to load', async () => {
		vi.mocked(courseService.getKeyVesting).mockRejectedValue(
			new ApiError('boom', 500)
		);

		renderViewer();

		expect(
			await screen.findByTestId('vesting-viewer-error')
		).toBeInTheDocument();
	});
});
