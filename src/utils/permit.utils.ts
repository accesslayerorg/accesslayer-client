import { hash } from '@stellar/stellar-sdk';
import {
	PERMIT_DOMAIN,
	PERMIT_PAYLOAD_VERSION,
	type PermitPayload,
	type PermitPayloadFields,
} from '@/types/permit';

export const DEFAULT_PERMIT_DEADLINE_MINUTES = 30;
export const MAX_PERMIT_DEADLINE_MINUTES = 24 * 60;
export const MIN_PERMIT_DEADLINE_MINUTES = 1;

export type PermitErrorKind =
	| 'expired'
	| 'nonce-reused'
	| 'signature-mismatch'
	| 'unsupported'
	| 'unknown';

export const PERMIT_ERROR_MESSAGES: Record<PermitErrorKind, string> = {
	expired: 'This permit has expired. Choose a new deadline and sign it again.',
	'nonce-reused':
		'This permit nonce has already been used. A fresh nonce was loaded; review and sign again.',
	'signature-mismatch':
		'The wallet signature does not match this permit. Check the wallet and permit details, then sign again.',
	unsupported:
		'Signed permits are not supported here. Continue with the standard approval flow.',
	unknown: 'The signed permit could not be submitted. Please try again.',
};

export class PermitExpiredError extends Error {
	constructor() {
		super(PERMIT_ERROR_MESSAGES.expired);
		this.name = 'PermitExpiredError';
	}
}

export class PermitUnsupportedError extends Error {
	constructor() {
		super(PERMIT_ERROR_MESSAGES.unsupported);
		this.name = 'PermitUnsupportedError';
	}
}

export interface BuildPermitPayloadInput {
	contractId: string;
	networkPassphrase: string;
	owner: string;
	spender: string;
	key: string;
	amount: number;
	deadline: number;
	nonce: bigint;
}

function requireValue(value: string, label: string): string {
	const normalized = value.trim();
	if (!normalized) throw new Error(`${label} is required.`);
	return normalized;
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(
		''
	);
}

/** SHA-256 network id used to keep permits from replaying across networks. */
export function hashNetworkPassphrase(networkPassphrase: string): string {
	return bytesToHex(
		hash(requireValue(networkPassphrase, 'Network passphrase'))
	);
}

/**
 * Builds the versioned, deterministic message shown in the review modal.
 * Numeric contract values are decimal strings so JSON never loses u64
 * precision. Property insertion order and two-space indentation are fixed;
 * `message` is therefore stable for identical inputs.
 */
export function buildPermitPayload(
	input: BuildPermitPayloadInput
): PermitPayload {
	if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
		throw new Error('Permit amount must be a positive whole number.');
	}
	if (!Number.isSafeInteger(input.deadline) || input.deadline <= 0) {
		throw new Error('Permit deadline must be a positive Unix timestamp.');
	}
	if (input.nonce < 0n) {
		throw new Error('Permit nonce cannot be negative.');
	}

	const fields: PermitPayloadFields = {
		domain: PERMIT_DOMAIN,
		version: PERMIT_PAYLOAD_VERSION,
		contract: requireValue(input.contractId, 'Contract ID'),
		networkPassphraseHash: hashNetworkPassphrase(input.networkPassphrase),
		owner: requireValue(input.owner, 'Owner'),
		spender: requireValue(input.spender, 'Spender'),
		key: requireValue(input.key, 'Key'),
		amount: String(input.amount),
		deadline: String(input.deadline),
		nonce: input.nonce.toString(),
	};

	return {
		...fields,
		message: JSON.stringify(fields, null, 2),
	};
}

export function clampPermitDeadlineMinutes(
	minutes: number,
	maxMinutes = MAX_PERMIT_DEADLINE_MINUTES
): number {
	const safeMaximum = Number.isFinite(maxMinutes)
		? Math.max(MIN_PERMIT_DEADLINE_MINUTES, Math.floor(maxMinutes))
		: MAX_PERMIT_DEADLINE_MINUTES;
	if (!Number.isFinite(minutes)) return DEFAULT_PERMIT_DEADLINE_MINUTES;
	return Math.min(
		safeMaximum,
		Math.max(MIN_PERMIT_DEADLINE_MINUTES, Math.floor(minutes))
	);
}

export function createPermitDeadline(
	nowMs: number,
	minutes = DEFAULT_PERMIT_DEADLINE_MINUTES,
	maxMinutes = MAX_PERMIT_DEADLINE_MINUTES
): number {
	return (
		Math.floor(nowMs / 1000) +
		clampPermitDeadlineMinutes(minutes, maxMinutes) * 60
	);
}

function readErrorCode(error: unknown): string {
	if (typeof error !== 'object' || error === null || !('code' in error)) {
		return '';
	}
	return String((error as { code?: unknown }).code ?? '');
}

function readErrorText(error: unknown): string {
	if (error instanceof Error) return `${error.name} ${error.message}`;
	if (typeof error === 'string') return error;
	if (typeof error === 'object' && error !== null) {
		const value = error as Record<string, unknown>;
		return [value.name, value.message, value.error]
			.filter((part): part is string => typeof part === 'string')
			.join(' ');
	}
	return '';
}

/** Maps known permit contract failures to distinct user-facing states. */
export function classifyPermitError(error: unknown): PermitErrorKind {
	const code = readErrorCode(error);
	const text = readErrorText(error);

	if (
		code === '41' ||
		/Error\(Contract,\s*#41\)/i.test(text) ||
		/PermitExpired|DeadlinePassed|deadline[^a-z]+(?:passed|expired)|expired permit/i.test(
			text
		)
	) {
		return 'expired';
	}
	if (
		code === '104' ||
		/Error\(Contract,\s*#104\)/i.test(text) ||
		/NonceAlreadyUsed|nonce[^a-z]+(?:already used|reused|stale)/i.test(text)
	) {
		return 'nonce-reused';
	}
	if (
		code === '103' ||
		/Error\(Contract,\s*#103\)/i.test(text) ||
		/InvalidSignature|SignatureMismatch|signature[^a-z]+(?:invalid|mismatch|does not match)/i.test(
			text
		)
	) {
		return 'signature-mismatch';
	}
	if (
		error instanceof PermitUnsupportedError ||
		/PermitUnsupported/i.test(text)
	) {
		return 'unsupported';
	}
	return 'unknown';
}

export function getPermitErrorMessage(error: unknown): string {
	const kind = classifyPermitError(error);
	if (kind === 'unknown' && error instanceof Error && error.message) {
		return error.message;
	}
	return PERMIT_ERROR_MESSAGES[kind];
}
