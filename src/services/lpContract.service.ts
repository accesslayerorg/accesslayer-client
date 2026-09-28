import { Address, Networks } from '@stellar/stellar-sdk';
import { Client } from '@stellar/stellar-sdk/contract';
import type { Signer } from '@/lib/signing/types';
import { env } from '@/utils/env.utils';
import {
	describeLpContractErrorCode,
	extractContractErrorCode,
} from '@/utils/lpPositions.utils';

/**
 * On-chain liquidity-provider actions (#1030).
 *
 * Calls the LP entrypoints on the Creator Keys contract (accesslayer-contracts
 * #1002 / PR #1004): `add_liquidity`, `claim_lp_rewards`, `remove_liquidity`.
 * Same construction as `governanceContract.service`: a Soroban contract
 * `Client` built from the deployed contract spec, signing through the app's
 * `Signer` (Freighter or Ledger via `useStellarWallet`).
 *
 * Success is only reported after the network confirms the transaction
 * (`getTransaction` status `SUCCESS`). A transaction that lands but fails
 * on-chain is surfaced as an error, never as success.
 */

/** Minimal slice of `AssembledTransaction` this service relies on. */
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
		key_id: Address;
		provider: Address;
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

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

const defaultFactory: LpContractClientFactory = async (address, signer) => {
	if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
		throw new LpContractError(
			'NOT_CONFIGURED',
			'Liquidity actions are unavailable: VITE_STELLAR_RPC_URL and VITE_CREATOR_KEYS_CONTRACT_ID must be configured.'
		);
	}

	return Client.from<LpContractClient>({
		contractId: env.VITE_CREATOR_KEYS_CONTRACT_ID,
		rpcUrl: env.VITE_STELLAR_RPC_URL,
		networkPassphrase: getNetworkPassphrase(),
		publicKey: address,
		signTransaction: async (transaction: string) => ({
			signedTxXdr: await signer.sign(transaction),
		}),
	});
};

function parseAddress(value: string, label: string): Address {
	try {
		return Address.fromString(value);
	} catch {
		throw new LpContractError(
			'INVALID_INPUT',
			`${label} is not a valid Stellar address.`
		);
	}
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

function toContractRejection(text: string): LpContractError {
	const code = extractContractErrorCode(text);
	return new LpContractError(
		'CONTRACT_REJECTED',
		code === null
			? 'The liquidity contract rejected this transaction.'
			: describeLpContractErrorCode(code)
	);
}

/**
 * Reads the simulated return value, throwing when simulation failed.
 * Runs before the wallet prompt so a transaction the contract would reject
 * is never put in front of the user to sign.
 */
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

	/**
	 * `claim_lp_rewards(lp_id)`; resolves with the amount claimed.
	 *
	 * The simulated return value is the exact amount the contract would pay
	 * out. When it is zero, the contract would succeed as a no-op (it returns
	 * `Ok(0)`), so we stop before asking the user to sign and pay a fee.
	 */
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
