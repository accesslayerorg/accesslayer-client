import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VestingScheduleCard from '../VestingScheduleCard';
import VestingPositionsSection from '../VestingPositionsSection';
import { resolveVestingSchedule } from '@/utils/vestingSchedule.utils';
import { ApiError } from '@/services/api.service';
import { courseService } from '@/services/course.service';
import type { KeyVestingClaim } from '@/services/course.service';

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
	}) => (
		<span title={content} data-testid="tooltip-mock">
			{children}
		</span>
	),
}));

const NOW = Date.parse('2026-09-29T12:00:00Z');
const PRE_CLIFF_ISO = '2026-09-29T12:01:30Z'; // 90s after NOW
const END_ISO = '2027-03-29T12:00:00Z';

/** Schedules are built per test with an explicit `now` so phases are stable. */
const makeSchedule = (overrides: Record<string, unknown> = {}) =>
	resolveVestingSchedule(
		{
			totalAllocation: 1000,
			claimedAmount: 100,
			cliffAt: PRE_CLIFF_ISO,
			endAt: END_ISO,
			...overrides,
		},
		{ now: NOW }
	);

const renderCard = (props = {}) =>
	render(
		<VestingScheduleCard
			keyId="key-1"
			keyName="Alpha Key"
			beneficiary="GABCXYZ1234567890"
			schedule={makeSchedule()}
			cliffAt={PRE_CLIFF_ISO}
			endAt={END_ISO}
			{...props}
		/>
	);

describe('VestingScheduleCard (#1018)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('shows a live cliff countdown accurate to the second while in cliff', async () => {
		renderCard();

		const countdown = screen.getByTestId('vesting-card-countdown-value');
		expect(countdown).toHaveTextContent('00:01:30');

		// Ticks once per second.
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});
		expect(countdown).toHaveTextContent('00:01:29');
	});

	it('hides the countdown and shows the phase label once the cliff passes', () => {
		render(
			<VestingScheduleCard
				keyId="key-1"
				schedule={makeSchedule({ cliffAt: '2026-09-29T11:00:00Z' })}
				cliffAt="2026-09-29T11:00:00Z"
				endAt={END_ISO}
			/>
		);

		expect(
			screen.queryByTestId('vesting-card-cliff-countdown')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('vesting-card-phase')).toHaveTextContent(
			'Vesting in progress'
		);
	});

	it('renders the linear progress bar with the correct vested percentage', () => {
		renderCard();

		const bar = screen.getByTestId('vesting-card-progress-bar');
		expect(bar).toBeInTheDocument();
		const schedule = makeSchedule();
		expect(bar.style.width).toBe(`${schedule.vestedPercent}%`);
	});

	it('shows beneficiary, totals, and claimable amounts', () => {
		renderCard();

		expect(screen.getByTestId('vesting-card-beneficiary')).toHaveTextContent(
			'GABC…7890'
		);
		expect(screen.getByTestId('vesting-card-total')).toHaveTextContent(
			'1000.00 XLM'
		);
		expect(screen.getByTestId('vesting-card-claimable')).toBeInTheDocument();
	});

	it('disables claim during cliff with an explanatory reason', () => {
		renderCard();

		const button = screen.getByTestId('vesting-card-claim-button');
		expect(button).toBeDisabled();
		expect(
			screen.getByTestId('vesting-card-claim-disabled-reason')
		).toHaveTextContent(/cliff/i);
	});

	it('enables claim post-cliff and fires onClaim with claimable amount', async () => {
		// fireEvent (not userEvent): the click runs under fake timers.
		const onClaim = vi.fn();

		render(
			<VestingScheduleCard
				keyId="key-1"
				schedule={makeSchedule({
					cliffAt: '2026-09-29T11:00:00Z',
					vestedAmount: 500,
					claimableAmount: 400,
				})}
				cliffAt="2026-09-29T11:00:00Z"
				endAt={END_ISO}
				onClaim={onClaim}
			/>
		);

		const button = screen.getByTestId('vesting-card-claim-button');
		expect(button).toBeEnabled();
		fireEvent.click(button);
		expect(onClaim).toHaveBeenCalledTimes(1);
	});

	it('renders claim history rows when claims exist', () => {
		const claims: KeyVestingClaim[] = [
			{
				id: 'c1',
				amountXlm: 50,
				claimedAt: '2026-09-28T10:00:00Z',
				transactionHash: 'abc123',
			},
		];
		renderCard({ claims });

		expect(screen.getByTestId('vesting-card-claim-history')).toBeInTheDocument();
		expect(screen.getAllByTestId('vesting-card-history-row')).toHaveLength(1);
	});
});

describe('VestingPositionsSection (#1018)', () => {
	function makeWrapper() {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		return { wrapper, queryClient };
	}

	// Real timers here: react-query's async loops deadlock under fake timers.
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders one card per vesting position and none for 404 keys', async () => {
		vi.mocked(courseService.getKeyVesting).mockImplementation(
			async (keyId: string) => {
				if (keyId === 'key-404') {
					throw new ApiError('Vesting schedule', 404);
				}
				return {
					keyId,
					totalAllocationXlm: 1000,
					claimedAmountXlm: 0,
					vestedAmountXlm: 0,
					claimableXlm: 0,
					cliffAt: new Date(Date.now() + 90_000).toISOString(),
					endAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
				};
			}
		);

		const { wrapper } = makeWrapper();
		render(
			<VestingPositionsSection
				wallet="GWALLET1"
				keyIds={['key-1', 'key-404']}
			/>,
			{ wrapper }
		);

		await waitFor(() => {
			expect(screen.getAllByTestId('vesting-card')).toHaveLength(1);
		});
		expect(screen.getByTestId('vesting-card')).toHaveAttribute(
			'data-key-id',
			'key-1'
		);
	});

	it('moves completed schedules into the collapsible archive', async () => {
		const user = userEvent.setup();
		vi.mocked(courseService.getKeyVesting).mockResolvedValue({
			keyId: 'key-done',
			totalAllocationXlm: 500,
			claimedAmountXlm: 500,
			vestedAmountXlm: 500,
			claimableXlm: 0,
			startAt: '2026-01-01T00:00:00Z',
			cliffAt: '2026-02-01T00:00:00Z',
			endAt: '2026-03-01T00:00:00Z', // fully vested in the past
		});

		const { wrapper } = makeWrapper();
		render(<VestingPositionsSection wallet="GWALLET1" keyIds={['key-done']} />, {
			wrapper,
		});

		await waitFor(() => {
			expect(screen.getAllByTestId('vesting-archive-row')).toHaveLength(1);
		});
		expect(screen.getByTestId('vesting-archive-count')).toHaveTextContent('1');
		// Archive starts collapsed.
		expect(screen.queryAllByTestId('vesting-card')).toHaveLength(0);

		await user.click(screen.getByTestId('vesting-archive-row'));
		expect(screen.getAllByTestId('vesting-card')).toHaveLength(1);
	});

	it('shows the empty state for a wallet with no schedules', async () => {
		vi.mocked(courseService.getKeyVesting).mockRejectedValue(
			new ApiError('Vesting schedule', 404)
		);

		const { wrapper } = makeWrapper();
		render(<VestingPositionsSection wallet="GWALLET1" keyIds={['key-x']} />, {
			wrapper,
		});

		await waitFor(() => {
			expect(screen.getByTestId('vesting-section-empty')).toBeInTheDocument();
		});
	});

	it('surfaces a retryable banner when a schedule fails (non-404)', async () => {
		vi.mocked(courseService.getKeyVesting).mockRejectedValue(
			new ApiError('boom', 500)
		);

		const { wrapper } = makeWrapper();
		render(<VestingPositionsSection wallet="GWALLET1" keyIds={['key-bad']} />, {
			wrapper,
		});

		await waitFor(() => {
			expect(screen.getByTestId('vesting-section-error')).toBeInTheDocument();
		});
	});

	it('submits a claim and invalidates the vesting cache on success', async () => {
		const user = userEvent.setup();
		vi.mocked(courseService.getKeyVesting).mockResolvedValue({
			keyId: 'key-1',
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
		vi.mocked(submitCreatorContractCall).mockClear();

		const { wrapper, queryClient } = makeWrapper();
		render(<VestingPositionsSection wallet="GWALLET1" keyIds={['key-1']} />, {
			wrapper,
		});

		await waitFor(() => {
			expect(screen.getByTestId('vesting-card-claim-button')).toBeEnabled();
		});

		await user.click(screen.getByTestId('vesting-card-claim-button'));

		await waitFor(() => {
			expect(submitCreatorContractCall).toHaveBeenCalledWith(
				'claim_vested_tokens',
				expect.objectContaining({ creatorId: 'key-1', wallet: 'GWALLET1' })
			);
		});
		expect(
			queryClient.getQueryState(['creators', 'key-1', 'vesting'])
		).toBeTruthy();
	});
});
