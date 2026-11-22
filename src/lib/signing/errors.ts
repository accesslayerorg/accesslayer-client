import type { SigningError, SigningErrorType } from './types';

const ERROR_DETAILS: Record<
	SigningErrorType,
	{ hint: string; retryable: boolean }
> = {
	UserRejected: {
		hint: 'Approve the request in your wallet when you are ready to continue.',
		retryable: false,
	},
	NetworkMismatch: {
		hint: 'Switch your wallet to the network selected by AccessLayer and try again.',
		retryable: false,
	},
	LedgerLocked: {
		hint: 'Unlock your Ledger and open the Stellar app.',
		retryable: false,
	},
	LedgerAppNotOpen: {
		hint: 'Open the Stellar app on your Ledger.',
		retryable: false,
	},
	LedgerTimeout: {
		hint: 'Keep your Ledger connected and confirm the request on the device.',
		retryable: true,
	},
	TransactionTooLarge: {
		hint: 'This transaction is too large for the selected signer. Use a software wallet or reduce its operations.',
		retryable: false,
	},
	SignerUnavailable: {
		hint: 'Install or reconnect a supported Stellar wallet and try again.',
		retryable: false,
	},
};

export class SigningPipelineError extends Error implements SigningError {
	readonly type: SigningErrorType;
	readonly hint: string;
	readonly retryable: boolean;
	readonly cause?: unknown;

	constructor(type: SigningErrorType, message?: string, cause?: unknown) {
		const details = ERROR_DETAILS[type];
		super(message ?? details.hint);
		this.name = 'SigningPipelineError';
		this.type = type;
		this.hint = details.hint;
		this.retryable = details.retryable;
		this.cause = cause;
	}
}

function readError(error: unknown): { message: string; code: string } {
	if (typeof error === 'string')
		return { message: error.toLowerCase(), code: '' };
	if (!error || typeof error !== 'object') return { message: '', code: '' };
	const value = error as Record<string, unknown>;
	const message = [value.message, value.name, value.error]
		.filter((part): part is string => typeof part === 'string')
		.join(' ')
		.toLowerCase();
	const rawCode = value.statusCode ?? value.status ?? value.code ?? value.id;
	const code =
		typeof rawCode === 'number'
			? rawCode.toString(16)
			: String(rawCode ?? '').toLowerCase();
	return { message, code };
}

/** Convert Freighter, WebHID, Ledger APDU, and browser failures into one UI-safe union. */
export function classifySigningError(error: unknown): SigningPipelineError {
	if (error instanceof SigningPipelineError) return error;
	const { message, code } = readError(error);
	const contains = (...values: string[]) =>
		values.some(value => message.includes(value) || code.includes(value));

	if (
		contains(
			'user rejected',
			'user refused',
			'denied by the user',
			'request rejected',
			'6985'
		)
	) {
		return new SigningPipelineError('UserRejected', undefined, error);
	}
	if (contains('network mismatch', 'wrong network', 'different network')) {
		return new SigningPipelineError('NetworkMismatch', undefined, error);
	}
	if (contains('device locked', 'ledger locked', 'locked device', '5515')) {
		return new SigningPipelineError('LedgerLocked', undefined, error);
	}
	if (
		contains(
			'app does not seem to be open',
			'stellar app',
			'app not open',
			'6e00',
			'6d00'
		)
	) {
		return new SigningPipelineError('LedgerAppNotOpen', undefined, error);
	}
	if (
		contains(
			'timeout',
			'timed out',
			'no response',
			'transport race condition'
		)
	) {
		return new SigningPipelineError('LedgerTimeout', undefined, error);
	}
	if (contains('too large', 'data size', 'transactiontoolarge', '6a84')) {
		return new SigningPipelineError('TransactionTooLarge', undefined, error);
	}
	return new SigningPipelineError('SignerUnavailable', undefined, error);
}

export function signingErrorDetails(type: SigningErrorType) {
	return ERROR_DETAILS[type];
}
