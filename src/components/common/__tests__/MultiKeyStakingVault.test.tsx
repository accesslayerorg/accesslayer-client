import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MultiKeyStakingVault from '../MultiKeyStakingVault';
import { useStakingVaultStore } from '@/hooks/useStakingVaultStore';

describe('MultiKeyStakingVault (#968)', () => {
	beforeEach(() => {
		useStakingVaultStore.getState().reset();
	});

	it('renders user position panel with correct share percentage and key breakdown', () => {
		render(<MultiKeyStakingVault />);

		expect(screen.getByTestId('multi-key-staking-vault')).toBeInTheDocument();
		expect(screen.getByTestId('user-share-percentage')).toHaveTextContent('20%');

		const keyBreakdown = screen.getByTestId('user-key-breakdown');
		expect(keyBreakdown).toHaveTextContent('Alex Rivers:50 keys');
		expect(keyBreakdown).toHaveTextContent('Elena Rostova:36 keys');
	});

	it('displays accrued rewards and allows claiming them', async () => {
		render(<MultiKeyStakingVault />);

		const rewardsCard = screen.getByTestId('vault-rewards-card');
		expect(rewardsCard).toHaveTextContent('145.80 XLM');

		const claimBtn = screen.getByTestId('claim-rewards-btn');
		fireEvent.click(claimBtn);

		await waitFor(() => {
			expect(screen.getByTestId('vault-tx-status')).toHaveTextContent(
				/Claimed 145.80 XLM/i
			);
		});

		expect(screen.getByTestId('accrued-rewards-amount')).toHaveTextContent('0.00 XLM');
		expect(claimBtn).toBeDisabled();
	});

	it('allows depositing multiple keys with quantities and tracks transaction status', async () => {
		render(<MultiKeyStakingVault />);

		const alexInput = screen.getByTestId('deposit-input-alex-rivers');
		const elenaInput = screen.getByTestId('deposit-input-elena-rostova');

		fireEvent.change(alexInput, { target: { value: '5' } });
		fireEvent.change(elenaInput, { target: { value: '3' } });

		expect(screen.getByText(/Total depositing:/i)).toHaveTextContent('8 keys');

		const submitBtn = screen.getByTestId('vault-deposit-submit-btn');
		fireEvent.click(submitBtn);

		await waitFor(() => {
			expect(screen.getByTestId('vault-tx-status')).toHaveTextContent(
				/Successfully deposited 8 keys/i
			);
		});

		// User shares should have increased
		expect(useStakingVaultStore.getState().position.sharesOwned).toBe(1880);
	});

	it('shows live proportional return preview on withdraw form and executes withdrawal', async () => {
		render(<MultiKeyStakingVault />);

		// Switch to withdraw tab
		const withdrawTab = screen.getByTestId('tab-vault-withdraw');
		fireEvent.click(withdrawTab);

		expect(screen.getByTestId('vault-withdraw-form')).toBeInTheDocument();

		// Set withdraw shares to 900 (10% of vault)
		const sharesInput = screen.getByTestId('withdraw-shares-input');
		fireEvent.change(sharesInput, { target: { value: '900' } });

		// Proportional return preview should show 10% of each pooled key:
		// 10% of 250 = 25 keys
		const previewRivers = screen.getByTestId('withdraw-preview-alex-rivers');
		expect(previewRivers).toHaveTextContent('+25 keys');

		// 10% of 180 = 18 keys
		const previewRostova = screen.getByTestId('withdraw-preview-elena-rostova');
		expect(previewRostova).toHaveTextContent('+18 keys');

		// Click confirm withdraw
		const withdrawBtn = screen.getByTestId('vault-withdraw-submit-btn');
		fireEvent.click(withdrawBtn);

		await waitFor(() => {
			expect(screen.getByTestId('vault-tx-status')).toHaveTextContent(
				/Withdrew 900 shares/i
			);
		});

		expect(useStakingVaultStore.getState().position.sharesOwned).toBe(900);
	});
});
