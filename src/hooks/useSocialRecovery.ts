import { create } from 'zustand';
import {
	RECOVERY_DELAY_MS,
	approveRecovery,
	cancelRecovery,
	createRecoveryRequest,
	executeRecovery,
	hasGuardianSetErrors,
	normalizeAddress,
	pendingRequestForOwner,
	validateGuardianSet,
	type GuardianConfig,
	type GuardianSetErrors,
	type RecoveryRequest,
	type RecoveryResult,
} from '@/utils/socialRecovery.utils';

/**
 * localStorage key backing guardian configs and recovery requests (#1382).
 *
 * There is no recovery contract or API in this client yet, so the store keeps
 * the state in this browser. The actions mirror the expected contract calls
 * (set guardians, start, approve, cancel, execute) and delegate every rule to
 * the pure functions in `socialRecovery.utils`, so swapping in a service later
 * only touches this file.
 */
export const SOCIAL_RECOVERY_STORAGE_KEY = 'al:social-recovery';

interface PersistedState {
	configs: Record<string, GuardianConfig>;
	requests: RecoveryRequest[];
}

export type SaveGuardiansResult =
	| { ok: true; config: GuardianConfig }
	| { ok: false; errors: GuardianSetErrors };

function readStored(): PersistedState {
	const empty: PersistedState = { configs: {}, requests: [] };
	try {
		const raw = window.localStorage.getItem(SOCIAL_RECOVERY_STORAGE_KEY);
		if (!raw) return empty;
		const parsed = JSON.parse(raw) as Partial<PersistedState> | null;
		if (!parsed || typeof parsed !== 'object') return empty;
		return {
			configs:
				parsed.configs && typeof parsed.configs === 'object'
					? parsed.configs
					: {},
			requests: Array.isArray(parsed.requests) ? parsed.requests : [],
		};
	} catch {
		return empty;
	}
}

function persist(state: PersistedState) {
	try {
		window.localStorage.setItem(
			SOCIAL_RECOVERY_STORAGE_KEY,
			JSON.stringify(state)
		);
	} catch {
		// Storage unavailable or full: keep the in-memory state usable.
	}
}

function createId(): string {
	return typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface SocialRecoveryState extends PersistedState {
	saveGuardians: (
		owner: string,
		guardians: string[],
		threshold: number,
		now?: number
	) => SaveGuardiansResult;
	startRecovery: (
		owner: string,
		newOwner: string,
		now?: number
	) => RecoveryResult;
	approve: (requestId: string, guardian: string) => RecoveryResult;
	cancel: (requestId: string, caller: string, now?: number) => RecoveryResult;
	execute: (requestId: string, now?: number) => RecoveryResult;
	/** Re-reads state from localStorage (e.g. after a reload). */
	reload: () => void;
	/** Clears everything; used by tests. */
	reset: () => void;
}

export const useSocialRecovery = create<SocialRecoveryState>((set, get) => {
	const commit = (next: Partial<PersistedState>) => {
		const state: PersistedState = {
			configs: next.configs ?? get().configs,
			requests: next.requests ?? get().requests,
		};
		persist(state);
		set(state);
	};

	const replaceRequest = (request: RecoveryRequest) =>
		get().requests.map(item => (item.id === request.id ? request : item));

	const findRequest = (id: string) =>
		get().requests.find(request => request.id === id);

	return {
		...readStored(),

		saveGuardians: (owner, guardians, threshold, now = Date.now()) => {
			const key = normalizeAddress(owner);
			const errors = validateGuardianSet(guardians, threshold, key);
			if (hasGuardianSetErrors(errors)) return { ok: false, errors };
			if (pendingRequestForOwner(get().requests, key)) {
				return {
					ok: false,
					errors: {
						guardians:
							'Guardians cannot change while a recovery is pending. Cancel it first.',
					},
				};
			}
			const config: GuardianConfig = {
				owner: key,
				guardians: guardians.map(normalizeAddress),
				threshold,
				delayMs: get().configs[key]?.delayMs ?? RECOVERY_DELAY_MS,
				updatedAt: now,
			};
			commit({ configs: { ...get().configs, [key]: config } });
			return { ok: true, config };
		},

		startRecovery: (owner, newOwner, now = Date.now()) => {
			const key = normalizeAddress(owner);
			const config = get().configs[key];
			if (!config) {
				return {
					ok: false,
					error: 'This account has no guardians set up',
				};
			}
			if (pendingRequestForOwner(get().requests, key)) {
				return {
					ok: false,
					error: 'A recovery is already pending for this account',
				};
			}
			const result = createRecoveryRequest({
				id: createId(),
				config,
				newOwner,
				now,
			});
			if (result.ok)
				commit({ requests: [...get().requests, result.request] });
			return result;
		},

		approve: (requestId, guardian) => {
			const request = findRequest(requestId);
			if (!request) return { ok: false, error: 'Recovery not found' };
			const result = approveRecovery(request, guardian);
			if (result.ok) commit({ requests: replaceRequest(result.request) });
			return result;
		},

		cancel: (requestId, caller, now = Date.now()) => {
			const request = findRequest(requestId);
			if (!request) return { ok: false, error: 'Recovery not found' };
			const result = cancelRecovery(request, caller, now);
			if (result.ok) commit({ requests: replaceRequest(result.request) });
			return result;
		},

		execute: (requestId, now = Date.now()) => {
			const request = findRequest(requestId);
			if (!request) return { ok: false, error: 'Recovery not found' };
			const result = executeRecovery(request, now);
			if (!result.ok) return result;
			// Control moves to the new owner, who inherits the guardian set.
			const configs = { ...get().configs };
			const previous = configs[request.owner];
			delete configs[request.owner];
			if (previous) {
				configs[request.newOwner] = {
					...previous,
					owner: request.newOwner,
					guardians: previous.guardians.filter(
						guardian => guardian !== request.newOwner
					),
					updatedAt: now,
				};
			}
			commit({ configs, requests: replaceRequest(result.request) });
			return result;
		},

		reload: () => set(readStored()),

		reset: () => commit({ configs: {}, requests: [] }),
	};
});
