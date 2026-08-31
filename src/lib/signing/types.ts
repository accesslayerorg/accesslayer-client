export type SignerType = 'software' | 'hardware';

export interface Signer {
	type: SignerType;
	sign(xdr: string): Promise<string>;
	getPublicKey(): Promise<string>;
}

export type SigningErrorType =
	| 'UserRejected'
	| 'NetworkMismatch'
	| 'LedgerLocked'
	| 'LedgerAppNotOpen'
	| 'LedgerTimeout'
	| 'TransactionTooLarge'
	| 'SignerUnavailable';

export interface SigningError {
	type: SigningErrorType;
	hint: string;
	retryable: boolean;
	cause?: unknown;
}

export type SigningStage =
	| 'idle'
	| 'preparing'
	| 'waiting-for-signature'
	| 'submitting'
	| 'complete'
	| 'failed';

export interface SigningProgressState {
	stage: SigningStage;
	error?: SigningError;
}

export interface SignerAvailability {
	software: Signer | null;
	hardware: Signer | null;
}
