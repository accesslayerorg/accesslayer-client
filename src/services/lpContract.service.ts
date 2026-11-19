import type { Signer } from '@/lib/signing/types';

/**
 * On-chain liquidity-provider actions (#1030), reduced to a dependency-free
 * contract boundary. Consumers can inject a client factory in tests; the
 * default factory reports that on-chain wiring is not configured here.
 */

export interface LpAssembledTransaction {
	/** Simulation response; carries `error` when the contract rejected it. */
	simulation?: unknown;
	/** Simulated return value: a contract `Result` (`Ok`/`Err`) for these calls. */
	readonly result: unknown;
	signAndSend(): Promise<LpSentTransaction>;
}

export interface LpSentTransaction {
	sendTransactionResponse?: { hash?: string };
	getTransactionResponse?: { status?: string };
	readonly result: unknown;
}

export interface LpContractClient {
	add_liquidity(args: {
		key_id: string;
		provider: string;
		amount: bigint;
	}): Promise<LpAssembledTransaction>;
	claim_lp_rewards(args: { lp_id: bigint }): Promise<LpAssembledTransaction>;
	remove_liquidity(args: { lp_id: bigint }): Promise<LpAssembledTransaction>;
}

export type LpContractClientFactory = (
	address: string,
	signer: Signer
) => Promise<LpContractClient>;

export type LpContractErrorCode =
	| 'NOT_CONFIGURED'
	| 'INVALID_INPUT'
	| 'NOTHING_TO_CLAIM'
	| 'CONTRACT_REJECTED'
	| 'TRANSACTION_FAILED';

export class LpContractError extends Error {
	readonly code: LpContractErrorCode;
	/** Hash of a submitted transaction that failed on-chain, if any. */
	readonly hash: string | null;

	constructor(
		code: LpContractErrorCode,
		message: string,
		hash: string | null = null
	) {
		super(message);
		this.name = 'LpContractError';
		this.code = code;
		this.hash = hash;
	}
}

export interface LpTransactionResult<T> {
	hash: string;
	value: T;
}

const defaultFactory: LpContractClientFactory = async () => {
	throw new LpContractError(
		'NOT_CONFIGURED',
		'Liquidity actions are unavailable: no contract client is configured.'
	);
};

function parseAddress(value: string, label: string): string {
	if (!/^[CG][A-Z2-7]{55}$/.test(value)) {
		throw new LpContractError(
			'INVALID_INPUT',
			`${label} is not a valid Stellar address.`
		);
	}
	return value;
}

function parseLpId(lpId: string): bigint {
	if (!/^\d+$/.test(lpId)) {
		throw new LpContractError(
			'INVALID_INPUT',
			'This position has an invalid on-chain id.'
		);
	}
	return BigInt(lpId);
}

interface ResultLike {
	isOk(): boolean;
	isErr(): boolean;
	unwrap(): unknown;
}

function isResultLike(value: unknown): value is ResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as ResultLike).isOk === 'function' &&
		typeof (value as ResultLike).unwrap === 'function'
	);
}

function extractContractErrorCode(text: string): number | null {
	const match = /#(\d+)/.exec(text);
	return match ? Number(match[1]) : null;
}

function describeContractErrorCode(code: number): string {
	if (code === 2) return 'This liquidity position no longer exists.';
	if (code === 6) return 'This liquidity position has already been closed.';
	return 'The liquidity contract rejected this transaction.';
}

function toContractRejection(text: string): LpContractError {
	const code = extractContractErrorCode(text);
	return new LpContractError(
		'CONTRACT_REJECTED',
		code === null
			? 'The liquidity contract rejected this transaction.'
			: describeContractErrorCode(code)
	);
}

function readSimulatedValue(tx: LpAssembledTransaction): unknown {
	const simulationError = (tx.simulation as { error?: unknown } | undefined)
		?.error;
	if (typeof simulationError === 'string') {
		throw toContractRejection(simulationError);
	}

	let result: unknown;
	try {
		result = tx.result;
	} catch (error) {
		throw toContractRejection(
			error instanceof Error ? error.message : String(error)
		);
	}
	if (isResultLike(result)) {
		if (result.isErr()) throw toContractRejection('');
		return result.unwrap();
	}
	return result;
}

function toBigInt(value: unknown): bigint {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isSafeInteger(value)) {
		return BigInt(value);
	}
	if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
	throw new LpContractError(
		'TRANSACTION_FAILED',
		'The contract returned an unexpected value.'
	);
}

async function signSendAndConfirm(
	tx: LpAssembledTransaction
): Promise<LpTransactionResult<bigint>> {
	const sent = await tx.signAndSend();
	const hash = sent.sendTransactionResponse?.hash ?? null;
	const status = sent.getTransactionResponse?.status;

	if (status !== 'SUCCESS' || !hash) {
		throw new LpContractError(
			'TRANSACTION_FAILED',
			'The transaction was submitted but did not succeed on-chain.',
			hash
		);
	}

	const returned = sent.result;
	const value = isResultLike(returned) ? returned.unwrap() : returned;
	return { hash, value: toBigInt(value) };
}

export interface AddLiquidityInput {
	keyId: string;
	provider: string;
	amountStroops: bigint;
	signer: Signer;
}

export interface LpPositionActionInput {
	lpId: string;
	provider: string;
	signer: Signer;
}

export class LpContractService {
	private readonly clientFactory: LpContractClientFactory;

	constructor(clientFactory: LpContractClientFactory = defaultFactory) {
		this.clientFactory = clientFactory;
	}

	/** `add_liquidity(key_id, provider, amount)`; resolves with the new `lp_id`. */
	async addLiquidity({
		keyId,
		provider,
		amountStroops,
		signer,
	}: AddLiquidityInput): Promise<LpTransactionResult<bigint>> {
		if (amountStroops <= 0n) {
			throw new LpContractError(
				'INVALID_INPUT',
				'Amount must be greater than zero.'
			);
		}
		const keyAddress = parseAddress(keyId, 'Pool key');
		const providerAddress = parseAddress(provider, 'Connected wallet');
		const client = await this.clientFactory(provider, signer);
		const tx = await client.add_liquidity({
			key_id: keyAddress,
			provider: providerAddress,
			amount: amountStroops,
		});
		readSimulatedValue(tx);
		return signSendAndConfirm(tx);
	}

	/** `claim_lp_rewards(lp_id)`; resolves with the amount claimed. */
	async claimRewards({
		lpId,
		provider,
		signer,
	}: LpPositionActionInput): Promise<LpTransactionResult<bigint>> {
		const id = parseLpId(lpId);
		const client = await this.clientFactory(provider, signer);
		const tx = await client.claim_lp_rewards({ lp_id: id });
		if (toBigInt(readSimulatedValue(tx)) <= 0n) {
			throw new LpContractError(
				'NOTHING_TO_CLAIM',
				'There are no rewards to claim right now.'
			);
		}
		return signSendAndConfirm(tx);
	}

	/** `remove_liquidity(lp_id)`; resolves with principal + rewards returned. */
	async removeLiquidity({
		lpId,
		provider,
		signer,
	}: LpPositionActionInput): Promise<LpTransactionResult<bigint>> {
		const id = parseLpId(lpId);
		const client = await this.clientFactory(provider, signer);
		const tx = await client.remove_liquidity({ lp_id: id });
		readSimulatedValue(tx);
		return signSendAndConfirm(tx);
	}
}

export const lpContractService = new LpContractService();
