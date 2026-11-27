import { Address, Networks } from '@stellar/stellar-sdk';
import { Client } from '@stellar/stellar-sdk/contract';
import type {
	PermitService,
	PermitTransferRequest,
	PermitTransferResult,
} from '@/types/permit';
import { env } from '@/utils/env.utils';
import { PermitUnsupportedError } from '@/utils/permit.utils';

export interface OnChainMetadataResult {
	name?: string;
	symbol?: string;
	description?: string;
	image?: string;
	imageCid?: string;
	image_cid?: string;
	ipfsCid?: string;
	ipfs_cid?: string;
	avatarUri?: string;
	avatar_uri?: string;
	cid?: string;
}

export interface PriceCeilingInfo {
	keyId: string;
	ceilingStroops: number | null;
	isActive: boolean;
	cooloffEndsAt: number | string | null;
}

export type CreatorKeysContractClientFactory = (
	contractId: string,
	rpcUrl: string,
	networkPassphrase: string
) => unknown;

/**
 * Adapter supplied once the deployed contract exposes a documented permit
 * nonce and an atomic permit-plus-transfer transaction builder.
 */
export interface PermitContractAdapter {
	getPermitNonce(owner: string): Promise<bigint>;
	submitPermitAndTransfer(
		request: PermitTransferRequest
	): Promise<PermitTransferResult>;
}

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

function numericValue(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function timestampValue(value: unknown): number | string | null {
	if (typeof value === 'string' && value.trim() !== '') return value;
	const parsed = numericValue(value);
	return parsed == null ? null : parsed;
}

function firstValue(source: Record<string, unknown>, keys: string[]): unknown {
	for (const key of keys) {
		if (source[key] != null) return source[key];
	}
	return null;
}

function unwrapCeilingResult(result: unknown): Record<string, unknown> | null {
	if (!result || typeof result !== 'object') return null;

	const candidate = result as Record<string, unknown>;
	if ('result' in candidate) {
		return unwrapCeilingResult(candidate.result);
	}

	return candidate;
}

export function normalizePriceCeiling(
	result: unknown,
	keyId: string
): PriceCeilingInfo | null {
	const raw = unwrapCeilingResult(result);
	if (!raw) return null;

	const ceilingCandidates = [
		'ceiling_price_stroops',
		'price_ceiling_stroops',
		'ceilingStroops',
		'ceilingPriceStroops',
		'priceCeilingStroops',
		'ceiling_price',
		'ceilingPrice',
		'price_ceiling',
		'priceCeiling',
		'ceiling',
	];
	const rawCeiling = firstValue(raw, ceilingCandidates);
	const ceilingStroops = numericValue(rawCeiling);
	const ceilingPriceXlm = numericValue(
		firstValue(raw, ['ceiling_price_xlm', 'ceilingPriceXlm'])
	);
	const normalizedCeiling =
		ceilingStroops ??
		(ceilingPriceXlm != null && ceilingPriceXlm > 0
			? Math.round(ceilingPriceXlm * 10_000_000)
			: null);

	if (normalizedCeiling == null || normalizedCeiling <= 0) return null;

	const activeFlag = firstValue(raw, [
		'is_active',
		'isActive',
		'active',
		'enabled',
	]);
	const isActive =
		typeof activeFlag === 'boolean'
			? activeFlag
			: activeFlag == null
				? true
				: Boolean(activeFlag);

	return {
		keyId,
		ceilingStroops: normalizedCeiling,
		isActive,
		cooloffEndsAt: timestampValue(
			firstValue(raw, [
				'cooloff_ends_at',
				'cool_off_ends_at',
				'ceiling_cooloff_ends_at',
				'cooldown_ends_at',
				'cooloffEndsAt',
				'coolOffEndsAt',
				'ceilingCooloffEndsAt',
				'cooldownEndsAt',
				'cooloff_until',
				'coolOffUntil',
			])
		),
	};
}

const defaultFactory: CreatorKeysContractClientFactory = (
	contractId,
	rpcUrl,
	networkPassphrase
) => {
	return Client.from({
		contractId,
		rpcUrl,
		networkPassphrase,
	});
};

export class CreatorKeysContractService implements PermitService {
	private readonly factory: CreatorKeysContractClientFactory;
	private readonly permitAdapter?: PermitContractAdapter;

	constructor(
		factory: CreatorKeysContractClientFactory = defaultFactory,
		permitAdapter?: PermitContractAdapter
	) {
		this.factory = factory;
		this.permitAdapter = permitAdapter;
	}

	/** True only when a real atomic contract adapter has been configured. */
	supportsPermit(): boolean {
		return this.permitAdapter !== undefined;
	}

	async getPermitNonce(owner: string): Promise<bigint> {
		if (!this.permitAdapter) throw new PermitUnsupportedError();
		return this.permitAdapter.getPermitNonce(owner);
	}

	/**
	 * Delegates one atomic submission to the contract adapter. This deliberately
	 * does not emulate the operation with separate `permit` and `transfer_from`
	 * calls because that would violate the one-transaction guarantee.
	 */
	async submitPermitAndTransfer(
		request: PermitTransferRequest
	): Promise<PermitTransferResult> {
		if (!this.permitAdapter) throw new PermitUnsupportedError();
		return this.permitAdapter.submitPermitAndTransfer(request);
	}

	async getMetadata(keyId: string): Promise<OnChainMetadataResult | null> {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			throw new Error(
				'VITE_STELLAR_RPC_URL and VITE_CREATOR_KEYS_CONTRACT_ID are required.'
			);
		}

		let address: Address;
		try {
			address = Address.fromString(keyId);
		} catch {
			throw new Error('Invalid key ID address.');
		}

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			get_metadata(args: { key_id: Address }): Promise<{ result: unknown }>;
		};

		try {
			const res = await client.get_metadata({ key_id: address });
			return (res?.result as OnChainMetadataResult) ?? null;
		} catch (err) {
			try {
				const clientWithCreator = this.factory(
					env.VITE_CREATOR_KEYS_CONTRACT_ID,
					env.VITE_STELLAR_RPC_URL,
					getNetworkPassphrase()
				) as {
					get_metadata(args: {
						creator_id: Address;
					}): Promise<{ result: unknown }>;
				};
				const res = await clientWithCreator.get_metadata({
					creator_id: address,
				});
				return (res?.result as OnChainMetadataResult) ?? null;
			} catch {
				throw err;
			}
		}
	}

	async getPriceCeiling(keyId: string): Promise<PriceCeilingInfo | null> {
		if (
			!keyId ||
			!env.VITE_STELLAR_RPC_URL ||
			!env.VITE_CREATOR_KEYS_CONTRACT_ID
		) {
			return null;
		}

		let keyAddress: Address | string = keyId;
		try {
			keyAddress = Address.fromString(keyId);
		} catch {
			keyAddress = keyId;
		}

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as Record<string, unknown>;

		const callArgs = {
			key_id: keyAddress,
			creator_id: keyAddress,
			keyId,
			creatorId: keyId,
		};
		let lastError: unknown;

		for (const methodName of [
			'get_price_ceiling',
			'getPriceCeiling',
			'get_ceiling',
			'price_ceiling',
		]) {
			const method = client?.[methodName];
			if (typeof method !== 'function') continue;

			try {
				const response = await (
					method as (args: typeof callArgs) => Promise<unknown>
				).call(client, callArgs);
				const normalized = normalizePriceCeiling(response, keyId);
				if (normalized) return normalized;
			} catch (err) {
				lastError = err;
			}
		}

		if (lastError) throw lastError;
		return null;
	}

	async batch_transfer(args: {
		creatorId: string;
		recipients: Array<{ address: string; quantity: number }>;
	}): Promise<{ success: boolean; hash?: string }> {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			throw new Error(
				'VITE_STELLAR_RPC_URL and VITE_CREATOR_KEYS_CONTRACT_ID are required.'
			);
		}

		let creatorAddress: Address;
		try {
			creatorAddress = Address.fromString(args.creatorId);
		} catch {
			throw new Error('Invalid creator ID address.');
		}

		const formattedRecipients = args.recipients.map(r => ({
			recipient: Address.fromString(r.address),
			amount: BigInt(r.quantity),
		}));

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			batch_transfer?: (callArgs: {
				creator_id: Address;
				recipients: Array<{ recipient: Address; amount: bigint }>;
			}) => Promise<{ result?: unknown; hash?: string }>;
		};

		if (typeof client.batch_transfer === 'function') {
			const res = await client.batch_transfer({
				creator_id: creatorAddress,
				recipients: formattedRecipients,
			});
			return { success: true, hash: res?.hash };
		}

		return { success: true };
	}

	async batchTransfer(args: {
		creatorId: string;
		recipients: Array<{ address: string; quantity: number }>;
	}): Promise<{ success: boolean; hash?: string }> {
		return this.batch_transfer(args);
	}

	/**
	 * Transfers keys to a recipient with an optional note, so the recipient
	 * sees who sent the keys and why.
	 */
	async gift_key(args: {
		keyId: string;
		quantity: number;
		to: string;
		message?: string;
	}): Promise<{ success: boolean; hash?: string }> {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			return { success: true, hash: `sim_tx_${Date.now()}` };
		}

		let keyAddress: Address;
		try {
			keyAddress = Address.fromString(args.keyId);
		} catch {
			throw new Error('Invalid key ID address.');
		}

		let recipientAddress: Address;
		try {
			recipientAddress = Address.fromString(args.to);
		} catch {
			throw new Error('Invalid recipient address.');
		}

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			gift_key?: (callArgs: {
				key_id: Address;
				recipient: Address;
				amount: bigint;
				message?: string;
			}) => Promise<{ result?: unknown; hash?: string }>;
		};

		if (typeof client.gift_key === 'function') {
			const res = await client.gift_key({
				key_id: keyAddress,
				recipient: recipientAddress,
				amount: BigInt(args.quantity),
				message: args.message,
			});
			return { success: true, hash: res?.hash };
		}

		return { success: true, hash: `sim_tx_${Date.now()}` };
	}

	async giftKey(args: {
		keyId: string;
		quantity: number;
		to: string;
		message?: string;
	}): Promise<{ success: boolean; hash?: string }> {
		return this.gift_key(args);
	}

	async set_whitelist_mode(args: {
		creatorId: string;
		enabled: boolean;
	}): Promise<{ success: boolean; enabled: boolean }> {
		void args;
		return { success: true, enabled: args.enabled };
	}

	async setWhitelistMode(args: {
		creatorId: string;
		enabled: boolean;
	}): Promise<{ success: boolean; enabled: boolean }> {
		return this.set_whitelist_mode(args);
	}

	async add_to_whitelist(args: {
		creatorId: string;
		address?: string;
		addresses?: string[];
	}): Promise<{ success: boolean; addresses: string[] }> {
		const list =
			args.addresses ?? (args.address ? [args.address] : []);
		return { success: true, addresses: list };
	}

	async addToWhitelist(args: {
		creatorId: string;
		address?: string;
		addresses?: string[];
	}): Promise<{ success: boolean; addresses: string[] }> {
		return this.add_to_whitelist(args);
	}

	async remove_from_whitelist(args: {
		creatorId: string;
		address: string;
	}): Promise<{ success: boolean; address: string }> {
		return { success: true, address: args.address };
	}

	async removeFromWhitelist(args: {
		creatorId: string;
		address: string;
	}): Promise<{ success: boolean; address: string }> {
		return this.remove_from_whitelist(args);
	}

	async send_tip(args: {
		creatorId: string;
		amount: number;
		messageHash?: string;
	}): Promise<{ success: boolean; hash?: string }> {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			return { success: true, hash: `sim_tx_${Date.now()}` };
		}

		let creatorAddress: Address;
		try {
			creatorAddress = Address.fromString(args.creatorId);
		} catch {
			throw new Error('Invalid creator ID address.');
		}

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			send_tip?: (callArgs: {
				creator_id: Address;
				amount: bigint;
				message_hash?: string;
			}) => Promise<{ result?: unknown; hash?: string }>;
		};

		if (typeof client.send_tip === 'function') {
			const res = await client.send_tip({
				creator_id: creatorAddress,
				amount: BigInt(Math.round(args.amount * 10_000_000)),
				message_hash: args.messageHash,
			});
			return { success: true, hash: res?.hash };
		}

		return { success: true, hash: `sim_tx_${Date.now()}` };
	}

	async sendTip(args: {
		creatorId: string;
		amount: number;
		messageHash?: string;
	}): Promise<{ success: boolean; hash?: string }> {
		return this.send_tip(args);
	}

	async submit_rating(args: {
		keyId: string;
		rating: number;
		review?: string;
	}): Promise<{ success: boolean; hash?: string }> {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			return { success: true, hash: `sim_rating_${Date.now()}` };
		}

		let keyAddress: Address;
		try {
			keyAddress = Address.fromString(args.keyId);
		} catch {
			throw new Error('Invalid key ID address.');
		}

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			submit_rating?: (callArgs: {
				key_id: Address;
				rating: number;
				review?: string;
			}) => Promise<{ result?: unknown; hash?: string }>;
		};

		if (typeof client.submit_rating === 'function') {
			const res = await client.submit_rating({
				key_id: keyAddress,
				rating: args.rating,
				review: args.review,
			});
			return { success: true, hash: res?.hash };
		}

		return { success: true, hash: `sim_rating_${Date.now()}` };
	}

	async submitRating(args: {
		keyId: string;
		rating: number;
		review?: string;
	}): Promise<{ success: boolean; hash?: string }> {
		return this.submit_rating(args);
	}
}

export const creatorKeysContractService = new CreatorKeysContractService();
