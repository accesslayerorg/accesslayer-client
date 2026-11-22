import { Address, Networks } from '@stellar/stellar-sdk';
import { Client } from '@stellar/stellar-sdk/contract';
import { env } from '@/utils/env.utils';
import type {
	KeySubscription,
	CreateSubscriptionInput,
	CancelSubscriptionInput,
	SubscriptionInterval,
} from '@/types/keySubscription';

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

const defaultFactory = (
	contractId: string,
	rpcUrl: string,
	networkPassphrase: string
) => {
	return Client.from({
		contractId,
		rpcUrl,
		networkPassphrase,
	});
};

function normalizeSubscription(raw: unknown): KeySubscription | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	return {
		id: String(r.id ?? ''),
		creatorId: String(r.creatorId ?? r.creator_id ?? ''),
		investorAddress: String(r.investorAddress ?? r.investor_address ?? ''),
		amountXlm: Number(r.amountXlm ?? r.amount_xlm ?? 0),
		interval: (r.interval ?? 'monthly') as SubscriptionInterval,
		intervalSeconds: Number(r.intervalSeconds ?? r.interval_seconds ?? 0),
		nextExecutionAt: String(r.nextExecutionAt ?? r.next_execution_at ?? ''),
		totalInvestedXlm: Number(r.totalInvestedXlm ?? r.total_invested_xlm ?? 0),
		status: (r.status ?? 'active') as KeySubscription['status'],
		createdAt: String(r.createdAt ?? r.created_at ?? ''),
		updatedAt: String(r.updatedAt ?? r.updated_at ?? ''),
	};
}

export class KeySubscriptionContractService {
	private readonly factory: typeof defaultFactory;

	constructor(factory: typeof defaultFactory = defaultFactory) {
		this.factory = factory;
	}

	private getClient() {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			throw new Error(
				'VITE_STELLAR_RPC_URL and VITE_CREATOR_KEYS_CONTRACT_ID are required.'
			);
		}
		return this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			create_subscription?: (args: {
				creator_id: Address;
				amount: bigint;
				interval_seconds: bigint;
			}) => Promise<{ result?: unknown; hash?: string }>;
			cancel_subscription?: (args: {
				subscription_id: Address;
			}) => Promise<{ result?: unknown; hash?: string }>;
			get_subscription?: (args: {
				subscription_id: Address;
			}) => Promise<{ result?: unknown }>;
			get_subscriptions_for_investor?: (args: {
				investor: Address;
			}) => Promise<{ result?: unknown }>;
			get_subscriptions_for_creator?: (args: {
				creator_id: Address;
			}) => Promise<{ result?: unknown }>;
		};
	}

	async createSubscription(input: CreateSubscriptionInput): Promise<{
		subscription: KeySubscription | null;
		hash?: string;
	}> {
		const client = this.getClient();
		if (typeof client.create_subscription !== 'function') {
			throw new Error('create_subscription not available on contract');
		}

		let creatorAddress: Address;
		try {
			creatorAddress = Address.fromString(input.creatorId);
		} catch {
			throw new Error('Invalid creator ID address.');
		}

		const intervalSeconds = this.getIntervalSeconds(input.interval);

		const res = await client.create_subscription({
			creator_id: creatorAddress,
			amount: BigInt(Math.round(input.amountXlm * 10_000_000)),
			interval_seconds: BigInt(intervalSeconds),
		});

		const subscription = normalizeSubscription(res?.result);
		return { subscription, hash: res?.hash };
	}

	async cancelSubscription(input: CancelSubscriptionInput): Promise<{
		success: boolean;
		hash?: string;
	}> {
		const client = this.getClient();
		if (typeof client.cancel_subscription !== 'function') {
			throw new Error('cancel_subscription not available on contract');
		}

		let subscriptionAddress: Address;
		try {
			subscriptionAddress = Address.fromString(input.subscriptionId);
		} catch {
			throw new Error('Invalid subscription ID address.');
		}

		const res = await client.cancel_subscription({
			subscription_id: subscriptionAddress,
		});

		return { success: true, hash: res?.hash };
	}

	async getSubscription(subscriptionId: string): Promise<KeySubscription | null> {
		const client = this.getClient();
		if (typeof client.get_subscription !== 'function') {
			throw new Error('get_subscription not available on contract');
		}

		let subscriptionAddress: Address;
		try {
			subscriptionAddress = Address.fromString(subscriptionId);
		} catch {
			throw new Error('Invalid subscription ID address.');
		}

		const res = await client.get_subscription({
			subscription_id: subscriptionAddress,
		});

		return normalizeSubscription(res?.result);
	}

	async getSubscriptionsForInvestor(
		investorAddress: string
	): Promise<KeySubscription[]> {
		const client = this.getClient();
		if (typeof client.get_subscriptions_for_investor !== 'function') {
			throw new Error(
				'get_subscriptions_for_investor not available on contract'
			);
		}

		let investor: Address;
		try {
			investor = Address.fromString(investorAddress);
		} catch {
			throw new Error('Invalid investor address.');
		}

		const res = await client.get_subscriptions_for_investor({
			investor,
		});

		const raw = res?.result;
		if (!Array.isArray(raw)) return [];

		return raw.map(normalizeSubscription).filter(Boolean) as KeySubscription[];
	}

	async getSubscriptionsForCreator(
		creatorId: string
	): Promise<KeySubscription[]> {
		const client = this.getClient();
		if (typeof client.get_subscriptions_for_creator !== 'function') {
			throw new Error(
				'get_subscriptions_for_creator not available on contract'
			);
		}

		let creatorAddress: Address;
		try {
			creatorAddress = Address.fromString(creatorId);
		} catch {
			throw new Error('Invalid creator ID address.');
		}

		const res = await client.get_subscriptions_for_creator({
			creator_id: creatorAddress,
		});

		const raw = res?.result;
		if (!Array.isArray(raw)) return [];

		return raw.map(normalizeSubscription).filter(Boolean) as KeySubscription[];
	}

	private getIntervalSeconds(interval: SubscriptionInterval): number {
		const secondsMap: Record<SubscriptionInterval, number> = {
			daily: 86400,
			weekly: 604800,
			monthly: 2592000,
		};
		return secondsMap[interval];
	}
}

export const keySubscriptionContractService = new KeySubscriptionContractService();