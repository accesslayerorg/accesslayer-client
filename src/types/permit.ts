import type { Signer } from '@/lib/signing/types';

export const PERMIT_DOMAIN = 'accesslayer.creator-keys.permit' as const;
export const PERMIT_PAYLOAD_VERSION = 1 as const;

/** Stable, JSON-serializable fields presented to and signed by the holder. */
export interface PermitPayloadFields {
	domain: typeof PERMIT_DOMAIN;
	version: typeof PERMIT_PAYLOAD_VERSION;
	contract: string;
	networkPassphraseHash: string;
	owner: string;
	spender: string;
	key: string;
	amount: string;
	deadline: string;
	nonce: string;
}

export interface PermitPayload extends PermitPayloadFields {
	/** Exact string passed to `Signer.signMessage`. */
	message: string;
}

export interface PermitTransferRequest {
	permit: PermitPayload;
	signature: string;
	/** Destination of the delegated transfer submitted with the permit. */
	recipient: string;
}

export interface PermitTransferResult {
	hash: string | null;
}

/**
 * Contract boundary for permit support.
 *
 * The deployed contract does not expose this capability yet. Keeping the
 * atomic submit operation behind one method prevents the client from
 * pretending that two independent contract calls are one transaction.
 */
export interface PermitService {
	supportsPermit(): boolean;
	getPermitNonce(owner: string): Promise<bigint>;
	submitPermitAndTransfer(
		request: PermitTransferRequest
	): Promise<PermitTransferResult>;
}

export interface PermitAllowanceConfig {
	contractId: string;
	networkPassphrase: string;
	spender: string;
	recipient: string;
	signer: Signer | null;
	service?: PermitService;
	maxDeadlineMinutes?: number;
	onTransferComplete?: (result: PermitTransferResult) => void;
}
