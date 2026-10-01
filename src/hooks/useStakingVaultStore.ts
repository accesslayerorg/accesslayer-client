import { create } from 'zustand';

export interface VaultKeyItem {
	creatorId: string;
	creatorName: string;
	symbol: string;
	userWalletHolding: number; // Available to deposit
	vaultPooledKeys: number; // Total pooled in vault
}

export interface UserPosition {
	sharesOwned: number;
	totalVaultShares: number;
	accruedRewardsXlm: number;
	accruedRewardsUsd: number;
}

export interface DepositEntry {
	creatorId: string;
	amount: number;
}

export interface WithdrawPreviewEntry {
	creatorId: string;
	creatorName: string;
	returnedKeys: number;
}

export type VaultTxStatus = 'idle' | 'submitting' | 'success' | 'error';
export type VaultTxType = 'deposit' | 'withdraw' | 'claim' | null;

interface StakingVaultState {
	vaultKeys: VaultKeyItem[];
	position: UserPosition;
	txStatus: VaultTxStatus;
	txType: VaultTxType;
	txMessage: string | null;

	// Actions
	depositKeys: (deposits: DepositEntry[]) => Promise<boolean>;
	withdrawShares: (sharesToWithdraw: number) => Promise<boolean>;
	claimRewards: () => Promise<boolean>;
	getWithdrawPreview: (sharesToWithdraw: number) => WithdrawPreviewEntry[];
	clearTxStatus: () => void;
	reset: () => void;
}

const SHARES_PER_KEY = 10;
const XLM_PRICE_USD = 0.12;

const INITIAL_VAULT_KEYS: VaultKeyItem[] = [
	{
		creatorId: 'alex-rivers',
		creatorName: 'Alex Rivers',
		symbol: 'RIVER',
		userWalletHolding: 25,
		vaultPooledKeys: 250,
	},
	{
		creatorId: 'elena-rostova',
		creatorName: 'Elena Rostova',
		symbol: 'ROST',
		userWalletHolding: 15,
		vaultPooledKeys: 180,
	},
	{
		creatorId: 'marcus-vance',
		creatorName: 'Marcus Vance',
		symbol: 'VANCE',
		userWalletHolding: 40,
		vaultPooledKeys: 320,
	},
	{
		creatorId: 'sarah-chen',
		creatorName: 'Sarah Chen',
		symbol: 'CHEN',
		userWalletHolding: 10,
		vaultPooledKeys: 150,
	},
];

const INITIAL_POSITION: UserPosition = {
	sharesOwned: 1800, // 20% of 9000 total shares
	totalVaultShares: 9000,
	accruedRewardsXlm: 145.8,
	accruedRewardsUsd: Math.round(145.8 * XLM_PRICE_USD * 100) / 100,
};

export const useStakingVaultStore = create<StakingVaultState>((set, get) => ({
	vaultKeys: INITIAL_VAULT_KEYS,
	position: INITIAL_POSITION,
	txStatus: 'idle',
	txType: null,
	txMessage: null,

	depositKeys: async (deposits: DepositEntry[]) => {
		const validDeposits = deposits.filter(d => d.amount > 0);
		if (validDeposits.length === 0) {
			set({ txStatus: 'error', txType: 'deposit', txMessage: 'Please enter a valid deposit quantity.' });
			return false;
		}

		// Check wallet holdings
		for (const dep of validDeposits) {
			const keyItem = get().vaultKeys.find(k => k.creatorId === dep.creatorId);
			if (!keyItem || keyItem.userWalletHolding < dep.amount) {
				set({
					txStatus: 'error',
					txType: 'deposit',
					txMessage: `Insufficient holding for ${keyItem?.creatorName ?? dep.creatorId}.`,
				});
				return false;
			}
		}

		set({ txStatus: 'submitting', txType: 'deposit', txMessage: 'Submitting multi-key deposit to vault...' });

		// Simulate on-chain confirmation
		await new Promise<void>(resolve => setTimeout(resolve, 350));

		const totalKeysDeposited = validDeposits.reduce((acc, d) => acc + d.amount, 0);
		const newShares = totalKeysDeposited * SHARES_PER_KEY;

		set(state => {
			const updatedKeys = state.vaultKeys.map(k => {
				const dep = validDeposits.find(d => d.creatorId === k.creatorId);
				if (!dep) return k;
				return {
					...k,
					userWalletHolding: k.userWalletHolding - dep.amount,
					vaultPooledKeys: k.vaultPooledKeys + dep.amount,
				};
			});

			return {
				vaultKeys: updatedKeys,
				position: {
					...state.position,
					sharesOwned: state.position.sharesOwned + newShares,
					totalVaultShares: state.position.totalVaultShares + newShares,
				},
				txStatus: 'success',
				txMessage: `Successfully deposited ${totalKeysDeposited} keys and received ${newShares} vault shares.`,
			};
		});

		return true;
	},

	withdrawShares: async (sharesToWithdraw: number) => {
		if (sharesToWithdraw <= 0 || sharesToWithdraw > get().position.sharesOwned) {
			set({
				txStatus: 'error',
				txType: 'withdraw',
				txMessage: 'Invalid share quantity to withdraw.',
			});
			return false;
		}

		set({
			txStatus: 'submitting',
			txType: 'withdraw',
			txMessage: `Withdrawing ${sharesToWithdraw} shares from pool...`,
		});

		// Simulate on-chain confirmation
		await new Promise<void>(resolve => setTimeout(resolve, 350));

		const preview = get().getWithdrawPreview(sharesToWithdraw);

		set(state => {
			const updatedKeys = state.vaultKeys.map(k => {
				const returned = preview.find(p => p.creatorId === k.creatorId)?.returnedKeys ?? 0;
				return {
					...k,
					userWalletHolding: k.userWalletHolding + returned,
					vaultPooledKeys: Math.max(0, k.vaultPooledKeys - returned),
				};
			});

			return {
				vaultKeys: updatedKeys,
				position: {
					...state.position,
					sharesOwned: state.position.sharesOwned - sharesToWithdraw,
					totalVaultShares: Math.max(0, state.position.totalVaultShares - sharesToWithdraw),
				},
				txStatus: 'success',
				txMessage: `Withdrew ${sharesToWithdraw} shares and received proportional creator keys.`,
			};
		});

		return true;
	},

	claimRewards: async () => {
		if (get().position.accruedRewardsXlm <= 0) {
			set({
				txStatus: 'error',
				txType: 'claim',
				txMessage: 'No accrued rewards available to claim.',
			});
			return false;
		}

		set({
			txStatus: 'submitting',
			txType: 'claim',
			txMessage: 'Claiming accrued staking rewards...',
		});

		await new Promise<void>(resolve => setTimeout(resolve, 300));

		const claimedAmount = get().position.accruedRewardsXlm;

		set(state => ({
			position: {
				...state.position,
				accruedRewardsXlm: 0,
				accruedRewardsUsd: 0,
			},
			txStatus: 'success',
			txMessage: `Claimed ${claimedAmount.toFixed(2)} XLM in staking rewards!`,
		}));

		return true;
	},

	getWithdrawPreview: (sharesToWithdraw: number): WithdrawPreviewEntry[] => {
		const { totalVaultShares } = get().position;
		if (totalVaultShares <= 0 || sharesToWithdraw <= 0) {
			return get().vaultKeys.map(k => ({
				creatorId: k.creatorId,
				creatorName: k.creatorName,
				returnedKeys: 0,
			}));
		}

		const ratio = sharesToWithdraw / totalVaultShares;

		return get().vaultKeys.map(k => ({
			creatorId: k.creatorId,
			creatorName: k.creatorName,
			// Proportional returned keys rounded to 1 decimal place
			returnedKeys: Math.round(k.vaultPooledKeys * ratio * 10) / 10,
		}));
	},

	clearTxStatus: () => set({ txStatus: 'idle', txType: null, txMessage: null }),

	reset: () =>
		set({
			vaultKeys: INITIAL_VAULT_KEYS,
			position: INITIAL_POSITION,
			txStatus: 'idle',
			txType: null,
			txMessage: null,
		}),
}));

// Selectors
export function selectSharePercentage(position: UserPosition): number {
	if (position.totalVaultShares <= 0) return 0;
	return Math.round((position.sharesOwned / position.totalVaultShares) * 1000) / 10;
}

export function selectUserKeyBreakdown(
	vaultKeys: VaultKeyItem[],
	position: UserPosition
): { creatorId: string; creatorName: string; symbol: string; userOwnedKeys: number }[] {
	if (position.totalVaultShares <= 0 || position.sharesOwned <= 0) {
		return vaultKeys.map(k => ({
			creatorId: k.creatorId,
			creatorName: k.creatorName,
			symbol: k.symbol,
			userOwnedKeys: 0,
		}));
	}

	const ratio = position.sharesOwned / position.totalVaultShares;

	return vaultKeys.map(k => ({
		creatorId: k.creatorId,
		creatorName: k.creatorName,
		symbol: k.symbol,
		userOwnedKeys: Math.round(k.vaultPooledKeys * ratio * 10) / 10,
	}));
}
