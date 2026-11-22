import { create } from 'zustand';
import {
	creatorKeyService,
	type DeployedCreatorKey,
	type KeyMetadata,
	type KeyConfig,
} from '@/services/creatorKey.service';

export interface TimelockNotice {
	actionId?: string;
	delayHours: number;
	message: string;
}

export type CreatorKeyTxStatus = 'idle' | 'submitting' | 'success' | 'error';

interface CreatorKeyState {
	keys: DeployedCreatorKey[];
	selectedKeyId: string | null;
	isLoading: boolean;
	isSubmitting: boolean;
	txStatus: CreatorKeyTxStatus;
	txMessage: string | null;
	timelockNotice: TimelockNotice | null;

	// Actions
	fetchKeys: (creatorAddress?: string) => Promise<void>;
	selectKey: (keyId: string) => void;
	updateMetadata: (keyId: string, metadata: KeyMetadata) => Promise<boolean>;
	updateConfig: (keyId: string, config: KeyConfig, creatorAddress: string) => Promise<boolean>;
	clearStatus: () => void;
	reset: () => void;
}

export const useCreatorKeyStore = create<CreatorKeyState>(set => ({
	keys: [],
	selectedKeyId: null,
	isLoading: false,
	isSubmitting: false,
	txStatus: 'idle',
	txMessage: null,
	timelockNotice: null,

	fetchKeys: async (creatorAddress?: string) => {
		if (!creatorAddress) {
			set({ keys: [], selectedKeyId: null, isLoading: false });
			return;
		}

		set({ isLoading: true, txStatus: 'idle', txMessage: null });
		try {
			const keys = await creatorKeyService.getDeployedKeys(creatorAddress);
			set(state => {
				const currentSelected = state.selectedKeyId;
				const stillValid = keys.some(k => k.id === currentSelected);
				return {
					keys,
					selectedKeyId: stillValid ? currentSelected : (keys[0]?.id ?? null),
					isLoading: false,
				};
			});
		} catch (err: unknown) {
			set({
				isLoading: false,
				txStatus: 'error',
				txMessage: err instanceof Error ? err.message : 'Failed to fetch deployed keys.',
			});
		}
	},

	selectKey: (keyId: string) => {
		set({ selectedKeyId: keyId, txStatus: 'idle', txMessage: null, timelockNotice: null });
	},

	updateMetadata: async (keyId: string, metadata: KeyMetadata) => {
		set({ isSubmitting: true, txStatus: 'submitting', txMessage: null, timelockNotice: null });
		try {
			const result = await creatorKeyService.updateKeyMetadata(keyId, metadata);
			// Update local key list
			set(state => ({
				isSubmitting: false,
				txStatus: 'success',
				txMessage: `Metadata successfully updated on-chain! Tx: ${result.txHash.slice(0, 10)}...`,
				keys: state.keys.map(k => (k.id === keyId ? { ...k, metadata: { ...metadata } } : k)),
			}));
			return true;
		} catch (err: unknown) {
			set({
				isSubmitting: false,
				txStatus: 'error',
				txMessage: err instanceof Error ? err.message : 'Failed to update metadata.',
			});
			return false;
		}
	},

	updateConfig: async (keyId: string, config: KeyConfig, creatorAddress: string) => {
		set({ isSubmitting: true, txStatus: 'submitting', txMessage: null, timelockNotice: null });
		try {
			const result = await creatorKeyService.updateKeyConfig(keyId, config, creatorAddress);

			if (result.requiresTimelock) {
				set({
					isSubmitting: false,
					txStatus: 'success',
					txMessage: `Config change submitted to timelock governance. Execution delayed by ${result.timelockDelayHours ?? 24} hours to protect key traders.`,
					timelockNotice: {
						actionId: result.timelockActionId,
						delayHours: result.timelockDelayHours ?? 24,
						message: `This parameter adjustment exceeds immediate execution thresholds. A timelock delay of ${result.timelockDelayHours ?? 24} hours has been scheduled.`,
					},
				});
			} else {
				set(state => ({
					isSubmitting: false,
					txStatus: 'success',
					txMessage: `Configuration successfully updated on-chain! Tx: ${result.txHash?.slice(0, 10)}...`,
					keys: state.keys.map(k => (k.id === keyId ? { ...k, config: { ...config } } : k)),
				}));
			}
			return true;
		} catch (err: unknown) {
			set({
				isSubmitting: false,
				txStatus: 'error',
				txMessage: err instanceof Error ? err.message : 'Failed to update key configuration.',
			});
			return false;
		}
	},

	clearStatus: () => {
		set({ txStatus: 'idle', txMessage: null, timelockNotice: null });
	},

	reset: () => {
		creatorKeyService.reset();
		set({
			keys: [],
			selectedKeyId: null,
			isLoading: false,
			isSubmitting: false,
			txStatus: 'idle',
			txMessage: null,
			timelockNotice: null,
		});
	},
}));

// Selector
export function selectSelectedKey(state: {
	keys: DeployedCreatorKey[];
	selectedKeyId: string | null;
}): DeployedCreatorKey | null {
	if (!state.selectedKeyId) return null;
	return state.keys.find(k => k.id === state.selectedKeyId) ?? null;
}
