import { BaseApiService } from './api.service';
import type { EarningsStream, StreamWithdrawal } from '@/types/stream';
import { calculateClaimableBalance, calculateWithdrawalFee } from '@/utils/stream.utils';

const NOW = Date.now();
const ONE_DAY_MS = 24 * 3600 * 1000;

const DEFAULT_STREAMS: EarningsStream[] = [
	{
		id: 'stream-1',
		creatorAddress: 'GCXWDEVELOPERSACCESSLAYERKEYG7432',
		keyId: 'key-alice',
		keySymbol: 'ALICE',
		keyName: 'Alice Keyholder Stream',
		fundedAmount: 5000,
		withdrawnAmount: 1200,
		ratePerSecond: 0.005, // ~432 XLM/day
		startTime: NOW - 5 * ONE_DAY_MS,
		stopTime: NOW + 20 * ONE_DAY_MS,
		lastWithdrawalTime: NOW - ONE_DAY_MS,
		isPaused: false,
		withdrawals: [
			{
				id: 'w-1',
				txHash: 'a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01',
				amountXlm: 700,
				feeXlm: 3.5,
				netAmountXlm: 696.5,
				timestamp: new Date(NOW - 3 * ONE_DAY_MS).toISOString(),
				explorerUrl: 'https://stellar.expert/explorer/public/tx/a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01',
			},
			{
				id: 'w-2',
				txHash: 'b2c3d4e5f6a1789012345678abcdef0123456789abcdef0123456789abcdef02',
				amountXlm: 500,
				feeXlm: 2.5,
				netAmountXlm: 497.5,
				timestamp: new Date(NOW - ONE_DAY_MS).toISOString(),
				explorerUrl: 'https://stellar.expert/explorer/public/tx/b2c3d4e5f6a1789012345678abcdef0123456789abcdef0123456789abcdef02',
			},
		],
	},
	{
		id: 'stream-2',
		creatorAddress: 'GCXWDEVELOPERSACCESSLAYERKEYG7432',
		keyId: 'key-bob',
		keySymbol: 'BOB',
		keyName: 'Bob Production Stream',
		fundedAmount: 2500,
		withdrawnAmount: 800,
		ratePerSecond: 0.002, // ~172.8 XLM/day
		startTime: NOW - 10 * ONE_DAY_MS,
		stopTime: NOW + 15 * ONE_DAY_MS,
		lastWithdrawalTime: NOW - 2 * ONE_DAY_MS,
		isPaused: true,
		pausedAt: NOW - 4 * 3600 * 1000, // Paused 4 hours ago
		withdrawals: [
			{
				id: 'w-3',
				txHash: 'c3d4e5f6a1b2789012345678abcdef0123456789abcdef0123456789abcdef03',
				amountXlm: 800,
				feeXlm: 4.0,
				netAmountXlm: 796.0,
				timestamp: new Date(NOW - 2 * ONE_DAY_MS).toISOString(),
				explorerUrl: 'https://stellar.expert/explorer/public/tx/c3d4e5f6a1b2789012345678abcdef0123456789abcdef0123456789abcdef03',
			},
		],
	},
];

class CreatorStreamContractService extends BaseApiService {
	private streams: EarningsStream[] = structuredClone(DEFAULT_STREAMS);

	async getStreams(_creatorAddress?: string): Promise<EarningsStream[]> {
		return structuredClone(this.streams);
	}

	async getStream(streamId: string): Promise<EarningsStream | null> {
		const match = this.streams.find(s => s.id === streamId);
		return match ? structuredClone(match) : null;
	}

	async withdraw(
		streamId: string,
		amount: number,
		_creatorAddress?: string
	): Promise<StreamWithdrawal> {
		const stream = this.streams.find(s => s.id === streamId);
		if (!stream) {
			throw new Error(`Stream ${streamId} not found`);
		}

		const claimable = calculateClaimableBalance(stream);
		if (amount > claimable) {
			throw new Error(
				`Withdrawal amount of ${amount} XLM exceeds claimable balance of ${claimable.toFixed(4)} XLM`
			);
		}
		if (amount <= 0) {
			throw new Error('Withdrawal amount must be greater than zero');
		}

		const { feeXlm, netAmountXlm } = calculateWithdrawalFee(amount);
		const txHash = `e7f8a9b0c1d2${Math.random().toString(16).slice(2).padEnd(52, '0')}`;

		const withdrawal: StreamWithdrawal = {
			id: `w-${Date.now()}`,
			txHash,
			amountXlm: amount,
			feeXlm,
			netAmountXlm,
			timestamp: new Date().toISOString(),
			explorerUrl: `https://stellar.expert/explorer/public/tx/${txHash}`,
		};

		stream.withdrawnAmount += amount;
		stream.lastWithdrawalTime = Date.now();
		stream.withdrawals.unshift(withdrawal);

		return structuredClone(withdrawal);
	}

	setMockStreams(streams: EarningsStream[]) {
		this.streams = structuredClone(streams);
	}

	reset() {
		this.streams = structuredClone(DEFAULT_STREAMS);
	}
}

export const creatorStreamContractService = new CreatorStreamContractService();
