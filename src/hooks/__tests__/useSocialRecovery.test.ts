import { Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	SOCIAL_RECOVERY_STORAGE_KEY,
	useSocialRecovery,
} from '@/hooks/useSocialRecovery';
import { RECOVERY_DELAY_MS } from '@/utils/socialRecovery.utils';

const address = () => Keypair.random().publicKey();

describe('useSocialRecovery store (#1382)', () => {
	const owner = address();
	const newOwner = address();
	const guardians = [address(), address(), address()];

	beforeEach(() => {
		window.localStorage.clear();
		useSocialRecovery.getState().reset();
	});

	it('rejects an invalid guardian set without saving', () => {
		const result = useSocialRecovery
			.getState()
			.saveGuardians(owner, guardians.slice(0, 2), 2);
		expect(result.ok).toBe(false);
		expect(useSocialRecovery.getState().configs[owner]).toBeUndefined();
	});

	it('saves guardians, persists them and reloads them', () => {
		const result = useSocialRecovery
			.getState()
			.saveGuardians(owner, guardians, 2, 10);
		expect(result.ok).toBe(true);
		expect(
			window.localStorage.getItem(SOCIAL_RECOVERY_STORAGE_KEY)
		).toContain(owner);
		useSocialRecovery.setState({ configs: {}, requests: [] });
		useSocialRecovery.getState().reload();
		expect(useSocialRecovery.getState().configs[owner]?.guardians).toEqual(
			guardians
		);
	});

	it('runs start → approve → cancel → restart → execute', () => {
		const store = useSocialRecovery.getState();
		store.saveGuardians(owner, guardians, 2, 0);

		expect(store.startRecovery(address(), newOwner).ok).toBe(false);

		const started = store.startRecovery(owner, newOwner, 0);
		if (!started.ok) throw new Error(started.error);
		expect(store.startRecovery(owner, newOwner, 0).ok).toBe(false);
		expect(store.saveGuardians(owner, guardians, 3).ok).toBe(false);

		expect(store.approve(started.request.id, guardians[0]).ok).toBe(true);
		const cancelled = store.cancel(started.request.id, owner, 1);
		expect(cancelled.ok && cancelled.request.approvals).toEqual([]);

		const restarted = store.startRecovery(owner, newOwner, 100);
		if (!restarted.ok) throw new Error(restarted.error);
		store.approve(restarted.request.id, guardians[0]);
		store.approve(restarted.request.id, guardians[1]);
		expect(store.execute(restarted.request.id, 101).ok).toBe(false);

		const executed = store.execute(
			restarted.request.id,
			100 + RECOVERY_DELAY_MS
		);
		expect(executed.ok).toBe(true);
		const { configs } = useSocialRecovery.getState();
		expect(configs[owner]).toBeUndefined();
		expect(configs[newOwner]?.guardians).toEqual(guardians);
	});
});
