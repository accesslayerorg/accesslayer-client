import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KeyAnalyticsPanel from '../KeyAnalyticsPanel';
import TimelockAdminPanel from '../TimelockAdminPanel';
import MultiKeyStakingVault from '../MultiKeyStakingVault';
import { useKeyAnalyticsStore } from '@/hooks/useKeyAnalyticsStore';
import { useTimelockStore, ADMIN_WALLETS } from '@/hooks/useTimelockStore';
import { useStakingVaultStore } from '@/hooks/useStakingVaultStore';
import { analyticsService } from '@/services/analytics.service';

describe('Key Management & Analytics Integration (#964, #966, #968)', () => {
	const adminWallet = Array.from(ADMIN_WALLETS)[0];

	beforeEach(() => {
		useKeyAnalyticsStore.getState().reset();
		useTimelockStore.getState().reset();
		useStakingVaultStore.getState().reset();

		vi.spyOn(analyticsService, 'getKeyAnalytics').mockResolvedValue({
			uniqueTraderCount: 2450,
			totalTradeCount: 9800,
			cumulativeVolumeXlm: 350000,
			cumulativeVolumeUsd: 42000,
			xlmPriceUsd: 0.12,
			lastUpdated: new Date().toISOString(),
		});
	});

	it('renders and exercises KeyAnalyticsPanel (#966)', async () => {
		render(<KeyAnalyticsPanel creatorId="creator-integration-test" />);

		await waitFor(() => {
			expect(screen.getByTestId('stat-unique-traders')).toHaveTextContent('2,450');
		});

		expect(screen.getByTestId('stat-total-trades')).toHaveTextContent('9,800');

		// Toggle currency
		const usdBtn = screen.getByTestId('currency-toggle-usd');
		fireEvent.click(usdBtn);

		await waitFor(() => {
			expect(screen.getByTestId('stat-cumulative-volume')).toHaveTextContent('$42,000 USD');
		});
	});

	it('renders and exercises TimelockAdminPanel (#964)', async () => {
		render(<TimelockAdminPanel walletAddress={adminWallet} />);

		expect(screen.getByTestId('timelock-admin-panel')).toBeInTheDocument();

		// Action 1 is ready, execute it
		const executeBtn = screen.getByTestId('timelock-execute-btn-tl-action-1');
		expect(executeBtn).not.toBeDisabled();
		fireEvent.click(executeBtn);

		await waitFor(() => {
			expect(screen.queryByTestId('timelock-action-tl-action-1')).not.toBeInTheDocument();
		});

		// Switch to history
		const historyTab = screen.getByTestId('tab-history-actions');
		fireEvent.click(historyTab);

		expect(screen.getByTestId('timelock-history-tl-action-1')).toBeInTheDocument();
	});

	it('exercises rewards claiming in MultiKeyStakingVault (#968)', async () => {
		render(<MultiKeyStakingVault />);

		expect(screen.getByTestId('multi-key-staking-vault')).toBeInTheDocument();
		expect(screen.getByTestId('user-share-percentage')).toHaveTextContent('20%');

		const claimBtn = screen.getByTestId('claim-rewards-btn');
		fireEvent.click(claimBtn);

		await waitFor(() => {
			expect(screen.getByTestId('vault-tx-status')).toHaveTextContent(/Claimed 145.80 XLM/i);
		});

		expect(screen.getByTestId('accrued-rewards-amount')).toHaveTextContent('0.00 XLM');
	});

	it('exercises proportional withdrawal in MultiKeyStakingVault (#968)', async () => {
		render(<MultiKeyStakingVault />);

		// Switch to withdraw tab
		const withdrawTab = screen.getByTestId('tab-vault-withdraw');
		fireEvent.click(withdrawTab);

		const sharesInput = screen.getByTestId('withdraw-shares-input');
		fireEvent.change(sharesInput, { target: { value: '900' } });

		// Proportional preview
		expect(screen.getByTestId('withdraw-preview-alex-rivers')).toHaveTextContent('+25 keys');

		const withdrawBtn = screen.getByTestId('vault-withdraw-submit-btn');
		fireEvent.click(withdrawBtn);

		await waitFor(() => {
			expect(screen.getByTestId('vault-tx-status')).toHaveTextContent(/Withdrew 900 shares/i);
		});

		expect(useStakingVaultStore.getState().position.sharesOwned).toBe(900);
	});

	it('renders and exercises CreatorKeyDashboard (#965)', async () => {
		const { CreatorKeyDashboard } = await import('../CreatorKeyDashboard');
		render(<CreatorKeyDashboard creatorAddress={adminWallet} />);

		await waitFor(() => {
			expect(screen.getByTestId('stat-holders')).toHaveTextContent('142');
		});

		expect(screen.getByTestId('stat-volume')).toHaveTextContent(/48,200\s+XLM/i);
		expect(screen.getByTestId('stat-price')).toHaveTextContent(/12.5\s+XLM/i);
	});
});
