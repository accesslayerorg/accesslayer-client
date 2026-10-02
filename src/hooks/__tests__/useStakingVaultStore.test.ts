import { describe, it, expect, beforeEach } from 'vitest';
import {
	useStakingVaultStore,
	selectSharePercentage,
	selectUserKeyBreakdown,
} from '../useStakingVaultStore';

describe('useStakingVaultStore (#968)', () => {
	beforeEach(() => {
		useStakingVaultStore.getState().reset();
	});

	it('initializes with default vault keys and user position', () => {
		const state = useStakingVaultStore.getState();
		expect(state.vaultKeys.length).toBe(4);
		expect(state.position.sharesOwned).toBe(1800);
		expect(state.position.totalVaultShares).toBe(9000);
		expect(selectSharePercentage(state.position)).toBe(20);
	});

	it('calculates proportional user key breakdown correctly', () => {
		const state = useStakingVaultStore.getState();
		const breakdown = selectUserKeyBreakdown(state.vaultKeys, state.position);

		// With 20% pool share:
		// Alex Rivers (250 total) -> 50 keys
		const rivers = breakdown.find(k => k.creatorId === 'alex-rivers');
		expect(rivers?.userOwnedKeys).toBe(50);

		// Elena Rostova (180 total) -> 36 keys
		const rostova = breakdown.find(k => k.creatorId === 'elena-rostova');
		expect(rostova?.userOwnedKeys).toBe(36);
	});

	it('deposits multiple keys, mints shares, and updates balances', async () => {
		const depositEntries = [
			{ creatorId: 'alex-rivers', amount: 5 },
			{ creatorId: 'marcus-vance', amount: 10 },
		];

		const prevShares = useStakingVaultStore.getState().position.sharesOwned;
		const prevRiversBalance = useStakingVaultStore
			.getState()
			.vaultKeys.find(k => k.creatorId === 'alex-rivers')?.userWalletHolding;

		const success = await useStakingVaultStore.getState().depositKeys(depositEntries);
		expect(success).toBe(true);

		const updatedState = useStakingVaultStore.getState();
		// 15 keys deposited * 10 shares/key = 150 new shares
		expect(updatedState.position.sharesOwned).toBe(prevShares + 150);
		expect(updatedState.txStatus).toBe('success');

		const updatedRivers = updatedState.vaultKeys.find(k => k.creatorId === 'alex-rivers');
		expect(updatedRivers?.userWalletHolding).toBe(prevRiversBalance! - 5);
		expect(updatedRivers?.vaultPooledKeys).toBe(255);
	});

	it('provides proportional return preview for withdrawals', () => {
		// With 900 shares (10% of total 9000 shares)
		const preview = useStakingVaultStore.getState().getWithdrawPreview(900);

		const rivers = preview.find(p => p.creatorId === 'alex-rivers');
		// 10% of 250 = 25 keys
		expect(rivers?.returnedKeys).toBe(25);

		const marcus = preview.find(p => p.creatorId === 'marcus-vance');
		// 10% of 320 = 32 keys
		expect(marcus?.returnedKeys).toBe(32);
	});

	it('withdraws shares and burns proportional keys', async () => {
		const prevShares = useStakingVaultStore.getState().position.sharesOwned;
		const prevRiversHolding = useStakingVaultStore
			.getState()
			.vaultKeys.find(k => k.creatorId === 'alex-rivers')?.userWalletHolding;

		// Withdraw 900 shares (10% of 9000 total shares)
		const success = await useStakingVaultStore.getState().withdrawShares(900);
		expect(success).toBe(true);

		const updatedState = useStakingVaultStore.getState();
		expect(updatedState.position.sharesOwned).toBe(prevShares - 900);
		expect(updatedState.txStatus).toBe('success');

		// 10% of 250 = 25 keys returned
		const updatedRivers = updatedState.vaultKeys.find(k => k.creatorId === 'alex-rivers');
		expect(updatedRivers?.userWalletHolding).toBe(prevRiversHolding! + 25);
	});

	it('claims accrued staking rewards', async () => {
		expect(useStakingVaultStore.getState().position.accruedRewardsXlm).toBeGreaterThan(0);

		const success = await useStakingVaultStore.getState().claimRewards();
		expect(success).toBe(true);

		const updatedPosition = useStakingVaultStore.getState().position;
		expect(updatedPosition.accruedRewardsXlm).toBe(0);
		expect(updatedPosition.accruedRewardsUsd).toBe(0);
		expect(useStakingVaultStore.getState().txStatus).toBe('success');
	});
});
