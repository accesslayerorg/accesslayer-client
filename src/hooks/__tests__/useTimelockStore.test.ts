import { describe, it, expect, beforeEach } from 'vitest';
import {
	useTimelockStore,
	isAuthorizedAdminWallet,
	selectPendingActions,
	selectHistoryActions,
	ADMIN_WALLETS,
} from '../useTimelockStore';

describe('useTimelockStore (#964)', () => {
	beforeEach(() => {
		useTimelockStore.getState().reset();
	});

	it('validates admin addresses correctly', () => {
		const adminAddress = Array.from(ADMIN_WALLETS)[0];
		expect(isAuthorizedAdminWallet(adminAddress)).toBe(true);
		expect(isAuthorizedAdminWallet(adminAddress.toUpperCase())).toBe(true);
		expect(isAuthorizedAdminWallet('0x0000000000000000000000000000000000000000')).toBe(false);
		expect(isAuthorizedAdminWallet(null)).toBe(false);
		expect(isAuthorizedAdminWallet(undefined)).toBe(false);
	});

	it('initializes with pending and history actions', () => {
		const state = useTimelockStore.getState();
		const pending = selectPendingActions(state);
		const history = selectHistoryActions(state);

		expect(pending.length).toBeGreaterThan(0);
		expect(history.length).toBeGreaterThan(0);
		expect(pending.every(a => a.status === 'pending')).toBe(true);
		expect(history.every(a => a.status === 'executed' || a.status === 'cancelled')).toBe(true);
	});

	it('prevents executing an action if timelock delay has not yet elapsed', async () => {
		const state = useTimelockStore.getState();
		// Find action where earliestExecutionTime is in the future
		const futureAction = state.actions.find(
			a => a.status === 'pending' && a.earliestExecutionTime > Date.now()
		);
		expect(futureAction).toBeDefined();

		const success = await useTimelockStore
			.getState()
			.executeAction(futureAction!.id, Date.now());

		expect(success).toBe(false);
		expect(useTimelockStore.getState().error).toContain('not yet elapsed');
		expect(useTimelockStore.getState().actions.find(a => a.id === futureAction!.id)?.status).toBe('pending');
	});

	it('allows executing an action when timelock delay has elapsed', async () => {
		const state = useTimelockStore.getState();
		// Find action where earliestExecutionTime is in the past
		const readyAction = state.actions.find(
			a => a.status === 'pending' && a.earliestExecutionTime <= Date.now()
		);
		expect(readyAction).toBeDefined();

		const success = await useTimelockStore
			.getState()
			.executeAction(readyAction!.id, Date.now());

		expect(success).toBe(true);
		const updated = useTimelockStore.getState().actions.find(a => a.id === readyAction!.id);
		expect(updated?.status).toBe('executed');
		expect(updated?.executedAt).toBeDefined();
	});

	it('cancels an action and updates its status', async () => {
		const state = useTimelockStore.getState();
		const pendingAction = state.actions.find(a => a.status === 'pending');
		expect(pendingAction).toBeDefined();

		const success = await useTimelockStore.getState().cancelAction(pendingAction!.id);
		expect(success).toBe(true);

		const updated = useTimelockStore.getState().actions.find(a => a.id === pendingAction!.id);
		expect(updated?.status).toBe('cancelled');
		expect(updated?.cancelledAt).toBeDefined();

		// Should now appear in history, not pending
		expect(selectPendingActions(useTimelockStore.getState()).some(a => a.id === pendingAction!.id)).toBe(false);
		expect(selectHistoryActions(useTimelockStore.getState()).some(a => a.id === pendingAction!.id)).toBe(true);
	});
});
