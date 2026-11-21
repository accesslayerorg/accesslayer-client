import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useAccount } from 'wagmi';
import CampaignsPage from '@/pages/CampaignsPage';
import {
	useCampaigns,
	useClaimCampaignRewardMutation,
} from '@/hooks/useCampaigns';
import type { Campaign } from '@/utils/campaign.utils';

vi.mock('@/hooks/useCampaigns', () => ({
	useCampaigns: vi.fn(),
	useClaimCampaignRewardMutation: vi.fn(),
}));

vi.mock('@/hooks/useSigner', () => ({
	useSigner: () => ({ activeSigner: null }),
}));

const mockUseCampaigns = vi.mocked(useCampaigns);
const mockUseClaim = vi.mocked(useClaimCampaignRewardMutation);
const mockUseAccount = vi.mocked(useAccount);
const NOW = Date.parse('2026-10-20T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const WALLET = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

function makeCampaign(id: string, overrides: Partial<Campaign> = {}): Campaign {
	return {
		id,
		name: `Season ${id}`,
		creatorId: `creator-${id}`,
		keyName: 'NOVA',
		criteria: { type: 'trade_volume', target: 100 },
		rewardPoolXlm: 5000,
		endsAt: new Date(NOW + HOUR).toISOString(),
		walletProgress: 40,
		...overrides,
	};
}

const mutate = vi.fn();

function setup(data: Campaign[] | undefined, address: string | undefined = WALLET) {
	mockUseAccount.mockReturnValue({
		address,
		isConnected: Boolean(address),
	} as unknown as ReturnType<typeof useAccount>);
	mockUseCampaigns.mockReturnValue({
		data,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	} as unknown as ReturnType<typeof useCampaigns>);
	mockUseClaim.mockReturnValue({
		mutate,
		isPending: false,
		variables: undefined,
	} as unknown as ReturnType<typeof useClaimCampaignRewardMutation>);

	return render(
		<MemoryRouter>
			<CampaignsPage />
		</MemoryRouter>
	);
}

describe('CampaignsPage', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		mutate.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('groups campaigns into active, upcoming and ended sections', () => {
		setup([
			makeCampaign('a'),
			makeCampaign('u', {
				startsAt: new Date(NOW + 2 * HOUR).toISOString(),
				endsAt: new Date(NOW + 48 * HOUR).toISOString(),
			}),
			makeCampaign('e', { endsAt: new Date(NOW - HOUR).toISOString() }),
		]);

		expect(
			within(screen.getByTestId('campaigns-active-grid')).getByTestId(
				'campaign-card-a'
			)
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('campaigns-upcoming-grid')).getByTestId(
				'campaign-card-u'
			)
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('campaigns-ended-grid')).getByTestId(
				'campaign-card-e'
			)
		).toBeInTheDocument();
	});

	it('shows eligibility progress and a live countdown on active campaigns', () => {
		setup([makeCampaign('a')]);
		const card = screen.getByTestId('campaign-card-a');

		expect(within(card).getByTestId('campaign-progress-label')).toHaveTextContent(
			'40 / 100'
		);
		expect(within(card).getByTestId('campaign-time-remaining')).toHaveTextContent(
			'1h 0m 0s'
		);

		act(() => {
			vi.advanceTimersByTime(5_000);
		});

		expect(within(card).getByTestId('campaign-time-remaining')).toHaveTextContent(
			'59m 55s'
		);
	});

	it('submits the claim for an ended campaign the wallet qualified for', () => {
		setup([
			makeCampaign('e', {
				endsAt: new Date(NOW - HOUR).toISOString(),
				walletProgress: 150,
			}),
		]);

		fireEvent.click(screen.getByTestId('campaign-claim-e'));

		expect(mutate).toHaveBeenCalledWith('e');
	});

	it('does not offer a claim to wallets that missed the criteria', () => {
		setup([
			makeCampaign('e', {
				endsAt: new Date(NOW - HOUR).toISOString(),
				walletProgress: 10,
			}),
		]);

		expect(screen.queryByTestId('campaign-claim-e')).not.toBeInTheDocument();
	});

	it('shows the claimed badge instead of the claim button once claimed', () => {
		setup([
			makeCampaign('e', {
				endsAt: new Date(NOW - HOUR).toISOString(),
				walletProgress: 150,
				claimed: true,
			}),
		]);

		expect(screen.getByTestId('campaign-claimed-badge')).toHaveTextContent(
			'Claimed'
		);
		expect(screen.queryByTestId('campaign-claim-e')).not.toBeInTheDocument();
	});

	it('shows the empty state when no campaigns exist', () => {
		setup([]);

		expect(screen.getByText('No campaigns yet')).toBeInTheDocument();
	});
});
