import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	useContractPausedStore,
	selectIsPaused,
	selectPauseKnown,
	isAuthorizedAdminWallet,
	addAuthorizedAdminWallet,
	POLL_INTERVAL_MS,
} from '../useContractPausedStore';

describe('useContractPausedStore (#953)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		useContractPausedStore.getState().stopPolling();
		useContractPausedStore.setState({
			status: 'unknown',
			lastCheckedAt: null,
			isChecking: false,
			_intervalId: null,
		});
	});

	afterEach(() => {
		useContractPausedStore.getState().stopPolling();
		vi.restoreAllMocks();
	});

	it('initializes with unknown pause status', () => {
		const state = useContractPausedStore.getState();
		expect(state.status).toBe('unknown');
		expect(selectIsPaused(state)).toBe(false);
		expect(selectPauseKnown(state)).toBe(false);
	});

	it('updates status and lastCheckedAt when setPaused is called', () => {
		useContractPausedStore.getState().setPaused(true);
		expect(useContractPausedStore.getState().status).toBe('active');
		expect(selectIsPaused(useContractPausedStore.getState())).toBe(true);
		expect(useContractPausedStore.getState().lastCheckedAt).not.toBeNull();

		useContractPausedStore.getState().setPaused(false);
		expect(useContractPausedStore.getState().status).toBe('inactive');
		expect(selectIsPaused(useContractPausedStore.getState())).toBe(false);
	});

	it('toggles pause state with togglePause', () => {
		useContractPausedStore.getState().setPaused(false);
		expect(selectIsPaused(useContractPausedStore.getState())).toBe(false);

		useContractPausedStore.getState().togglePause();
		expect(selectIsPaused(useContractPausedStore.getState())).toBe(true);

		useContractPausedStore.getState().togglePause();
		expect(selectIsPaused(useContractPausedStore.getState())).toBe(false);
	});

	it('starts polling on call and sets interval for 60 seconds', () => {
		useContractPausedStore.getState().startPolling();
		const intervalId = useContractPausedStore.getState()._intervalId;
		expect(intervalId).not.toBeNull();

		// Calling startPolling again is idempotent
		useContractPausedStore.getState().startPolling();
		expect(useContractPausedStore.getState()._intervalId).toBe(intervalId);

		expect(POLL_INTERVAL_MS).toBe(60_000);
	});

	it('stops polling and clears interval', () => {
		useContractPausedStore.getState().startPolling();
		expect(useContractPausedStore.getState()._intervalId).not.toBeNull();

		useContractPausedStore.getState().stopPolling();
		expect(useContractPausedStore.getState()._intervalId).toBeNull();
	});

	it('identifies authorized admin wallets', () => {
		// Anvil / default deployer wallet
		const admin = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
		expect(isAuthorizedAdminWallet(admin)).toBe(true);
		expect(isAuthorizedAdminWallet(admin.toLowerCase())).toBe(true);
		expect(isAuthorizedAdminWallet(admin.toUpperCase())).toBe(true);

		// Non-admin wallet
		expect(isAuthorizedAdminWallet('0x1111111111111111111111111111111111111111')).toBe(false);
		expect(isAuthorizedAdminWallet(undefined)).toBe(false);
		expect(isAuthorizedAdminWallet(null)).toBe(false);

		// Adding custom admin wallet
		const customAdmin = '0x9999999999999999999999999999999999999999';
		addAuthorizedAdminWallet(customAdmin);
		expect(isAuthorizedAdminWallet(customAdmin)).toBe(true);
	});
});
