import { describe, it, expect, beforeEach } from 'vitest';
import {
	useAllowanceStore,
	selectNeedsApproval,
	selectApprovalComplete,
} from '../useAllowanceStore';

describe('useAllowanceStore (#955)', () => {
	beforeEach(() => {
		useAllowanceStore.setState({
			status: 'idle',
			approvedAddresses: new Set<string>(),
			errorMessage: null,
		});
	});

	it('initializes with idle status and empty approved set', () => {
		const state = useAllowanceStore.getState();
		expect(state.status).toBe('idle');
		expect(state.approvedAddresses.size).toBe(0);
		expect(selectNeedsApproval(state)).toBe(false);
		expect(selectApprovalComplete(state)).toBe(false);
	});

	it('checks allowance and detects insufficient allowance for a new wallet', async () => {
		const store = useAllowanceStore.getState();
		const checkPromise = store.checkAllowance('0x1234567890123456789012345678901234567890');

		expect(useAllowanceStore.getState().status).toBe('checking');
		await checkPromise;

		const state = useAllowanceStore.getState();
		expect(state.status).toBe('insufficient');
		expect(selectNeedsApproval(state)).toBe(true);
		expect(selectApprovalComplete(state)).toBe(false);
	});

	it('submits approval and caches approved address for the session', async () => {
		const wallet = '0x1234567890123456789012345678901234567890';
		const store = useAllowanceStore.getState();

		const approvalPromise = store.submitApproval(wallet);
		expect(useAllowanceStore.getState().status).toBe('approving');

		await approvalPromise;

		const state = useAllowanceStore.getState();
		expect(state.status).toBe('approved');
		expect(state.approvedAddresses.has(wallet.toLowerCase())).toBe(true);
		expect(selectNeedsApproval(state)).toBe(false);
		expect(selectApprovalComplete(state)).toBe(true);
	});

	it('bypasses approval step on subsequent stakes for same session using cached approval', async () => {
		const wallet = '0x1234567890123456789012345678901234567890';

		// First stake: requires approval and gets approved
		await useAllowanceStore.getState().submitApproval(wallet);
		expect(useAllowanceStore.getState().approvedAddresses.has(wallet.toLowerCase())).toBe(true);

		// Reset dialog state for next stake
		useAllowanceStore.getState().reset();
		expect(useAllowanceStore.getState().status).toBe('idle');

		// Second stake: check allowance
		await useAllowanceStore.getState().checkAllowance(wallet);

		const state = useAllowanceStore.getState();
		expect(state.status).toBe('sufficient');
		expect(selectNeedsApproval(state)).toBe(false);
		expect(selectApprovalComplete(state)).toBe(true);
	});

	it('supports case-insensitive address matching in cache', async () => {
		const lowerWallet = '0xabcdef1234567890abcdef1234567890abcdef12';
		const upperWallet = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';

		useAllowanceStore.getState()._setApproved(lowerWallet);

		await useAllowanceStore.getState().checkAllowance(upperWallet);

		const state = useAllowanceStore.getState();
		expect(state.status).toBe('sufficient');
		expect(selectNeedsApproval(state)).toBe(false);
	});

	it('resets state to idle without clearing approved addresses cache', () => {
		const wallet = '0x1234567890123456789012345678901234567890';
		useAllowanceStore.getState()._setApproved(wallet);

		useAllowanceStore.getState().reset();

		const state = useAllowanceStore.getState();
		expect(state.status).toBe('idle');
		expect(state.approvedAddresses.has(wallet.toLowerCase())).toBe(true);
	});
});
