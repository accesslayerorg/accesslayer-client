import { create } from 'zustand';

export type TimelockActionType =
	| 'UPDATE_FEE_RECIPIENT'
	| 'SET_TIMELOCK_DELAY'
	| 'UPGRADE_CONTRACT'
	| 'UPDATE_BONDING_CURVE'
	| 'SET_EMERGENCY_GUARDIAN'
	| 'UPDATE_KEY_CONFIG';

export type TimelockActionStatus = 'pending' | 'executed' | 'cancelled';

export interface TimelockAction {
	id: string;
	actionType: TimelockActionType;
	title: string;
	description: string;
	parameters: Record<string, string | number>;
	proposedAt: number; // ms timestamp
	earliestExecutionTime: number; // ms timestamp
	status: TimelockActionStatus;
	executedAt?: number;
	cancelledAt?: number;
	proposer: string;
}

export const ADMIN_WALLETS = new Set([
	'0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
	'0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
	'0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
]);

export function isAuthorizedAdminWallet(address?: string | null): boolean {
	if (!address) return false;
	return ADMIN_WALLETS.has(address.toLowerCase().trim());
}

interface TimelockState {
	actions: TimelockAction[];
	isSubmitting: boolean;
	error: string | null;

	// Actions
	executeAction: (actionId: string, currentTimestamp?: number) => Promise<boolean>;
	cancelAction: (actionId: string) => Promise<boolean>;
	proposeAction: (action: Omit<TimelockAction, 'id' | 'status'>) => void;
	reset: () => void;
}

const INITIAL_ACTIONS: TimelockAction[] = [
	{
		id: 'tl-action-1',
		actionType: 'UPDATE_FEE_RECIPIENT',
		title: 'Update Protocol Fee Recipient',
		description: 'Update the contract treasury fee recipient address for key trade fee distributions.',
		parameters: {
			currentRecipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
			newRecipient: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
		},
		proposedAt: Date.now() - 90_000_000,
		// Ready for execution (delay was 24 hours, proposed 25h ago)
		earliestExecutionTime: Date.now() - 3_600_000,
		status: 'pending',
		proposer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
	},
	{
		id: 'tl-action-2',
		actionType: 'SET_TIMELOCK_DELAY',
		title: 'Increase Timelock Delay to 48 Hours',
		description: 'Strengthen security governance by extending the execution buffer from 24h to 48h.',
		parameters: {
			currentDelaySeconds: 86400,
			newDelaySeconds: 172800,
		},
		proposedAt: Date.now() - 10_000_000,
		// Still waiting for timelock delay to elapse (e.g. in ~14 hours)
		earliestExecutionTime: Date.now() + 50_400_000,
		status: 'pending',
		proposer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
	},
	{
		id: 'tl-action-3',
		actionType: 'UPDATE_BONDING_CURVE',
		title: 'Calibrate Initial Bonding Curve Multiplier',
		description: 'Adjust quadratic exponent multiplier from 1.0 to 1.15 for creator tier progression.',
		parameters: {
			curveModel: 'quadratic-stepped',
			previousMultiplier: 1.0,
			newMultiplier: 1.15,
		},
		proposedAt: Date.now() - 200_000_000,
		earliestExecutionTime: Date.now() - 113_600_000,
		status: 'executed',
		executedAt: Date.now() - 110_000_000,
		proposer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
	},
	{
		id: 'tl-action-4',
		actionType: 'UPGRADE_CONTRACT',
		title: 'Deploy Soroban Key Staking V2 Implementation',
		description: 'Proposed upgrade replacing legacy staking module with multi-key pool support.',
		parameters: {
			targetModule: 'StakingVaultModule',
			proposedWasmHash: '0x8f4b7a1e93c204d8b5e61298c412f71628d9c5b4',
		},
		proposedAt: Date.now() - 300_000_000,
		earliestExecutionTime: Date.now() - 213_600_000,
		status: 'cancelled',
		cancelledAt: Date.now() - 220_000_000,
		proposer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
	},
];

export const useTimelockStore = create<TimelockState>((set, get) => ({
	actions: INITIAL_ACTIONS,
	isSubmitting: false,
	error: null,

	executeAction: async (actionId: string, currentTimestamp = Date.now()) => {
		const action = get().actions.find(a => a.id === actionId);
		if (!action) {
			set({ error: 'Action not found.' });
			return false;
		}

		if (action.status !== 'pending') {
			set({ error: `Cannot execute action with status ${action.status}.` });
			return false;
		}

		if (currentTimestamp < action.earliestExecutionTime) {
			set({
				error: 'Timelock delay has not yet elapsed. Action cannot be executed yet.',
			});
			return false;
		}

		set({ isSubmitting: true, error: null });

		// Simulate on-chain confirmation
		await new Promise<void>(resolve => setTimeout(resolve, 300));

		set(state => ({
			isSubmitting: false,
			actions: state.actions.map(a =>
				a.id === actionId
					? { ...a, status: 'executed', executedAt: Date.now() }
					: a
			),
		}));

		return true;
	},

	cancelAction: async (actionId: string) => {
		const action = get().actions.find(a => a.id === actionId);
		if (!action) {
			set({ error: 'Action not found.' });
			return false;
		}

		if (action.status !== 'pending') {
			set({ error: `Cannot cancel action with status ${action.status}.` });
			return false;
		}

		set({ isSubmitting: true, error: null });

		// Simulate on-chain confirmation
		await new Promise<void>(resolve => setTimeout(resolve, 200));

		set(state => ({
			isSubmitting: false,
			actions: state.actions.map(a =>
				a.id === actionId
					? { ...a, status: 'cancelled', cancelledAt: Date.now() }
					: a
			),
		}));

		return true;
	},

	proposeAction: actionData => {
		const newAction: TimelockAction = {
			...actionData,
			id: `tl-action-${Date.now()}`,
			status: 'pending',
		};
		set(state => ({
			actions: [newAction, ...state.actions],
		}));
	},

	reset: () => {
		set({
			actions: INITIAL_ACTIONS,
			isSubmitting: false,
			error: null,
		});
	},
}));

// Selectors
export function selectPendingActions(state: { actions: TimelockAction[] }): TimelockAction[] {
	return state.actions
		.filter(a => a.status === 'pending')
		.sort((a, b) => a.earliestExecutionTime - b.earliestExecutionTime);
}

export function selectHistoryActions(state: { actions: TimelockAction[] }): TimelockAction[] {
	return state.actions
		.filter(a => a.status === 'executed' || a.status === 'cancelled')
		.sort((a, b) => {
			const timeA = a.executedAt ?? a.cancelledAt ?? a.proposedAt;
			const timeB = b.executedAt ?? b.cancelledAt ?? b.proposedAt;
			return timeB - timeA;
		});
}
