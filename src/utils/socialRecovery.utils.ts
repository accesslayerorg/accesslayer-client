import { StrKey } from '@stellar/stellar-sdk';

/**
 * Pure social recovery rules (#1382).
 *
 * An owner nominates 3 to 7 guardians and an approval threshold. A recovery
 * names a new owner wallet, collects guardian approvals and can only execute
 * once both the threshold is met and the safety delay has elapsed. The owner
 * may cancel at any point during the delay, which clears every approval.
 *
 * Everything here is side-effect free so the store and the screens share one
 * tested source of truth.
 */

export const MIN_GUARDIANS = 3;
export const MAX_GUARDIANS = 7;
/** A single guardian must never be able to move funds alone. */
export const MIN_THRESHOLD = 2;
/** Safety window between a recovery starting and it being executable. */
export const RECOVERY_DELAY_MS = 48 * 60 * 60 * 1000;

export type RecoveryStatus = 'pending' | 'cancelled' | 'executed';

export interface GuardianConfig {
	owner: string;
	guardians: string[];
	threshold: number;
	delayMs: number;
	updatedAt: number;
}

export interface RecoveryRequest {
	id: string;
	/** Account being recovered. */
	owner: string;
	/** Wallet that takes control once the recovery executes. */
	newOwner: string;
	/** Guardian snapshot taken when the recovery started. */
	guardians: string[];
	threshold: number;
	approvals: string[];
	initiatedAt: number;
	executableAt: number;
	status: RecoveryStatus;
	cancelledAt?: number;
	executedAt?: number;
}

export type RecoveryResult =
	{ ok: true; request: RecoveryRequest } | { ok: false; error: string };

/** Trims an address; Stellar public keys are uppercase base32. */
export function normalizeAddress(address: string): string {
	return address.trim().toUpperCase();
}

export function isValidStellarPublicKey(address: string): boolean {
	try {
		return StrKey.isValidEd25519PublicKey(address);
	} catch {
		return false;
	}
}

/** Majority of guardians, never below {@link MIN_THRESHOLD}. */
export function defaultThreshold(guardianCount: number): number {
	return Math.max(MIN_THRESHOLD, Math.floor(guardianCount / 2) + 1);
}

/**
 * Validates one candidate guardian against the guardians already added and
 * the owner's own address. Returns an error message, or null when valid.
 */
export function validateGuardianAddress(
	candidate: string,
	existing: string[],
	ownerAddress?: string | null
): string | null {
	const address = normalizeAddress(candidate);
	if (!address) return 'Guardian address is required';
	if (!isValidStellarPublicKey(address)) {
		return 'Enter a valid Stellar public address (starts with G)';
	}
	if (ownerAddress && normalizeAddress(ownerAddress) === address) {
		return 'You cannot add your own address as a guardian';
	}
	if (existing.some(item => normalizeAddress(item) === address)) {
		return 'This guardian has already been added';
	}
	if (existing.length >= MAX_GUARDIANS) {
		return `You can add at most ${MAX_GUARDIANS} guardians`;
	}
	return null;
}

export interface GuardianSetErrors {
	guardians?: string;
	threshold?: string;
}

/** Validates a full guardian set and threshold before it is saved. */
export function validateGuardianSet(
	guardians: string[],
	threshold: number,
	ownerAddress?: string | null
): GuardianSetErrors {
	const errors: GuardianSetErrors = {};
	const normalized = guardians.map(normalizeAddress);
	const owner = ownerAddress ? normalizeAddress(ownerAddress) : null;

	if (normalized.length < MIN_GUARDIANS) {
		errors.guardians = `Add at least ${MIN_GUARDIANS} guardians`;
	} else if (normalized.length > MAX_GUARDIANS) {
		errors.guardians = `You can add at most ${MAX_GUARDIANS} guardians`;
	} else if (normalized.some(address => !isValidStellarPublicKey(address))) {
		errors.guardians =
			'Every guardian must be a valid Stellar public address';
	} else if (new Set(normalized).size !== normalized.length) {
		errors.guardians = 'Each guardian can only be added once';
	} else if (owner && normalized.includes(owner)) {
		errors.guardians = 'You cannot add your own address as a guardian';
	}

	if (!Number.isInteger(threshold)) {
		errors.threshold = 'Threshold must be a whole number';
	} else if (threshold < MIN_THRESHOLD) {
		errors.threshold = `Threshold must be at least ${MIN_THRESHOLD}`;
	} else if (threshold > normalized.length) {
		errors.threshold = 'Threshold cannot exceed the number of guardians';
	}

	return errors;
}

export function hasGuardianSetErrors(errors: GuardianSetErrors): boolean {
	return Boolean(errors.guardians || errors.threshold);
}

export interface CreateRecoveryInput {
	id: string;
	config: GuardianConfig;
	newOwner: string;
	now: number;
}

/** Starts a recovery for an owner who has guardians configured. */
export function createRecoveryRequest({
	id,
	config,
	newOwner,
	now,
}: CreateRecoveryInput): RecoveryResult {
	const target = normalizeAddress(newOwner);
	if (!isValidStellarPublicKey(target)) {
		return { ok: false, error: 'Enter a valid Stellar public address' };
	}
	if (target === normalizeAddress(config.owner)) {
		return {
			ok: false,
			error: 'The new owner must be different from the current owner',
		};
	}
	return {
		ok: true,
		request: {
			id,
			owner: normalizeAddress(config.owner),
			newOwner: target,
			guardians: config.guardians.map(normalizeAddress),
			threshold: config.threshold,
			approvals: [],
			initiatedAt: now,
			executableAt: now + config.delayMs,
			status: 'pending',
		},
	};
}

export function isGuardianOf(
	request: RecoveryRequest,
	address?: string | null
): boolean {
	if (!address) return false;
	return request.guardians.includes(normalizeAddress(address));
}

/** Pending requests that name `guardian`; guardians never see other requests. */
export function requestsForGuardian(
	requests: RecoveryRequest[],
	guardian?: string | null
): RecoveryRequest[] {
	if (!guardian) return [];
	return requests.filter(
		request => request.status === 'pending' && isGuardianOf(request, guardian)
	);
}

export function pendingRequestForOwner(
	requests: RecoveryRequest[],
	owner?: string | null
): RecoveryRequest | undefined {
	if (!owner) return undefined;
	const key = normalizeAddress(owner);
	return requests.find(
		request => request.status === 'pending' && request.owner === key
	);
}

export interface RecoveryProgress {
	approvals: number;
	threshold: number;
	thresholdMet: boolean;
	delayElapsed: boolean;
	msUntilExecution: number;
	canExecute: boolean;
}

export function getRecoveryProgress(
	request: RecoveryRequest,
	now: number
): RecoveryProgress {
	const approvals = request.approvals.length;
	const thresholdMet = approvals >= request.threshold;
	const msUntilExecution = Math.max(0, request.executableAt - now);
	const delayElapsed = msUntilExecution === 0;
	return {
		approvals,
		threshold: request.threshold,
		thresholdMet,
		delayElapsed,
		msUntilExecution,
		canExecute: request.status === 'pending' && thresholdMet && delayElapsed,
	};
}

export function approveRecovery(
	request: RecoveryRequest,
	guardian: string
): RecoveryResult {
	if (request.status !== 'pending') {
		return { ok: false, error: 'This recovery is no longer pending' };
	}
	const address = normalizeAddress(guardian);
	if (!request.guardians.includes(address)) {
		return { ok: false, error: 'Only a named guardian can approve' };
	}
	if (request.approvals.includes(address)) {
		return { ok: false, error: 'You have already approved this recovery' };
	}
	return {
		ok: true,
		request: { ...request, approvals: [...request.approvals, address] },
	};
}

/** Owner-only. Allowed during the delay; clears every approval. */
export function cancelRecovery(
	request: RecoveryRequest,
	caller: string,
	now: number
): RecoveryResult {
	if (request.status !== 'pending') {
		return { ok: false, error: 'This recovery is no longer pending' };
	}
	if (normalizeAddress(caller) !== request.owner) {
		return { ok: false, error: 'Only the account owner can cancel' };
	}
	if (now >= request.executableAt) {
		return {
			ok: false,
			error: 'The safety delay has ended, so this recovery can no longer be cancelled',
		};
	}
	return {
		ok: true,
		request: {
			...request,
			approvals: [],
			status: 'cancelled',
			cancelledAt: now,
		},
	};
}

export function executeRecovery(
	request: RecoveryRequest,
	now: number
): RecoveryResult {
	const progress = getRecoveryProgress(request, now);
	if (request.status !== 'pending') {
		return { ok: false, error: 'This recovery is no longer pending' };
	}
	if (!progress.thresholdMet) {
		return { ok: false, error: 'Not enough guardians have approved yet' };
	}
	if (!progress.delayElapsed) {
		return { ok: false, error: 'The safety delay has not ended yet' };
	}
	return {
		ok: true,
		request: { ...request, status: 'executed', executedAt: now },
	};
}

/** Compact duration such as `1d 02h 03m` or `4m 05s`. */
export function formatRecoveryCountdown(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (value: number) => String(value).padStart(2, '0');
	if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
	if (hours > 0) return `${hours}h ${pad(minutes)}m`;
	return `${minutes}m ${pad(seconds)}s`;
}

export function formatDelayHours(delayMs: number): string {
	const hours = Math.round(delayMs / 3_600_000);
	return `${hours} hour${hours === 1 ? '' : 's'}`;
}
