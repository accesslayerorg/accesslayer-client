import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useAccount } from 'wagmi';
import CampaignsSection from '@/components/marketplace/CampaignsSection';
import { useActiveCampaigns } from '@/hooks/useCampaigns';
import type { Campaign } from '@/utils/campaign.utils';

vi.mock('@/hooks/useCampaigns', () => ({
	useActiveCampaigns: vi.fn(),
}));

const mockUseActiveCampaigns = vi.mocked(useActiveCampaigns);
const mockUseAccount = vi.mocked(useAccount);
const NOW = Date.parse('2026-10-20T12:00:00Z');
const WALLET = '0x1111111111111111111111111111111111111111';

function makeCampaign(id: string, overrides: Partial<Campaign> = {}): Campaign {
	return {
		id,
		name: `Season ${id}`,
		creatorId: `creator-${id}`,
		keyName: 'NOVA',
		criteria: { type: 'hold_keys', target: 10 },
		rewardPoolXlm: 5000,
		endsAt: new Date(NOW + 60 * 60 * 1000).toISOString(),
		walletProgress: 4,
		...overrides,
	};
}

function mockCampaigns(data: Campaign[] | undefined) {
	mockUseActiveCampaigns.mockReturnValue({
		data,
	} as unknown as ReturnType<typeof useActiveCampaigns>);
}

function connectWallet(address: string | undefined) {
	mockUseAccount.mockReturnValue({
		address,
		isConnected: Boolean(address),
	} as unknown as ReturnType<typeof useAccount>);
}

function renderSection() {
	return render(
		<MemoryRouter>
			<CampaignsSection />
		</MemoryRouter>
	);
}

describe('CampaignsSection', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		connectWallet(WALLET);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders criteria, reward pool and wallet progress', () => {
		mockCampaigns([makeCampaign('a')]);
		renderSection();

		const card = screen.getByTestId('campaign-card-a');
		expect(within(card).getByTestId('campaign-criteria')).toHaveTextContent(
			'Hold 10 NOVA keys'
		);
		expect(within(card).getByTestId('campaign-reward-pool')).toHaveTextContent(
			'5,000 XLM'
		);
		expect(within(card).getByTestId('campaign-progress-label')).toHaveTextContent(
			'4 / 10'
		);
		expect(within(card).getByTestId('campaign-progress-bar')).toHaveAttribute(
			'aria-valuenow',
			'40'
		);
		expect(within(card).queryByTestId('campaign-eligible-badge')).not.toBeInTheDocument();
	});

	it('shows the Eligible badge when the wallet meets the criteria', () => {
		mockCampaigns([makeCampaign('a', { walletProgress: 10 })]);
		renderSection();
		expect(screen.getByTestId('campaign-eligible-badge')).toHaveTextContent('Eligible');
		expect(screen.getByTestId('campaign-progress-bar')).toHaveAttribute(
			'aria-valuenow',
			'100'
		);
	});

	it('hides progress and eligibility when no wallet is connected', () => {
		connectWallet(undefined);
		mockCampaigns([makeCampaign('a', { walletProgress: 10 })]);
		renderSection();
		expect(screen.queryByTestId('campaign-progress-bar')).not.toBeInTheDocument();
		expect(screen.queryByTestId('campaign-eligible-badge')).not.toBeInTheDocument();
	});

	it('scopes the campaigns query to the connected wallet', () => {
		mockCampaigns([makeCampaign('a')]);
		renderSection();
		expect(mockUseActiveCampaigns).toHaveBeenCalledWith(WALLET);
	});

	it('ticks the time remaining countdown', () => {
		mockCampaigns([makeCampaign('a')]);
		renderSection();
		expect(screen.getByTestId('campaign-time-remaining')).toHaveTextContent('1h 0m 0s');

		act(() => {
			vi.advanceTimersByTime(2_000);
		});
		expect(screen.getByTestId('campaign-time-remaining')).toHaveTextContent('59m 58s');
	});

	it('links to the full campaigns page and previews at most three cards', () => {
		mockCampaigns(['a', 'b', 'c', 'd'].map(id => makeCampaign(id)));
		renderSection();
		expect(screen.getByTestId('view-all-campaigns')).toHaveAttribute('href', '/campaigns');
		expect(screen.getAllByRole('article')).toHaveLength(3);
	});

	it('renders nothing when no campaigns are active', () => {
		mockCampaigns([makeCampaign('old', { endsAt: new Date(NOW - 1000).toISOString() })]);
		const { container } = renderSection();
		expect(container).toBeEmptyDOMElement();
	});

	it('renders nothing while campaigns are still loading', () => {
		mockCampaigns(undefined);
		const { container } = renderSection();
		expect(container).toBeEmptyDOMElement();
	});
});
