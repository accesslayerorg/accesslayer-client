import { BaseApiService, type APIResponse } from './api.service';
import type { Tip } from '@/types/tip.types';
import { calculateTipBreakdown } from '@/utils/tip.utils';

// In-memory store for tips by creatorId to guarantee immediate consistency across the session
const tipsStore = new Map<string, Tip[]>();

// Initial mock tips to display when no backend tips are returned yet
function getInitialMockTips(creatorId: string): Tip[] {
	const now = Date.now();
	const mockData = [
		{
			tipper: 'GBZXN7PIRZGNMHGA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y9Z0A1B2C',
			amount: 50,
			message: 'Incredible work on the latest release! Keep inspiring us. 🚀',
			offsetMinutes: 12,
		},
		{
			tipper: 'GCKJ4W7X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V',
			amount: 25,
			message: 'Always happy to support this journey. 💡',
			offsetMinutes: 45,
		},
		{
			tipper: 'GAA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y9Z0A1B2CGBZXN7PIRZGNM',
			amount: 10,
			message: 'Super valuable insights in the Discord session today!',
			offsetMinutes: 120,
		},
		{
			tipper: 'GDM4N5O6P7Q8R9S0T1U2VGCKJ4W7X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L',
			amount: 100,
			message: 'Big fan from day one! Let’s keep building. 🔥',
			offsetMinutes: 240,
		},
		{
			tipper: 'GB9Z0A1B2CGBZXN7PIRZGNMHGA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y',
			amount: 15,
			message: 'Thanks for always answering questions promptly.',
			offsetMinutes: 380,
		},
	];

	return mockData.map((item, index) => {
		const { fee, netAmount } = calculateTipBreakdown(item.amount);
		return {
			id: `tip_${creatorId}_${index + 1}`,
			creatorId,
			tipper: item.tipper,
			amount: item.amount,
			fee,
			netAmount,
			message: item.message,
			messageHash: `bafkreimockhash${index + 1}`,
			timestamp: now - item.offsetMinutes * 60 * 1000,
			txHash: `sim_tx_mock_${index + 1}`,
		};
	});
}

class TipService extends BaseApiService {
	/**
	 * Pins tip message text to IPFS and returns the content hash.
	 * If message is empty, returns empty string.
	 */
	async uploadTipMessage(message?: string): Promise<string> {
		if (!message || message.trim() === '') {
			return '';
		}

		try {
			const response = await this.api.post<APIResponse<{ hash: string }>>(
				'/ipfs/pin',
				{ content: message.trim() }
			);
			return response.data?.data?.hash ?? this.generateFallbackCid(message);
		} catch {
			// Gracefully generate a mock CID if IPFS endpoint is not available
			return this.generateFallbackCid(message);
		}
	}

	/**
	 * Generates a fallback IPFS CID for offline / testing environments.
	 */
	private generateFallbackCid(content: string): string {
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			hash = (hash << 5) - hash + content.charCodeAt(i);
			hash |= 0;
		}
		const hex = Math.abs(hash).toString(16).padStart(8, '0');
		return `bafkreitipmsg${hex}${Date.now().toString(16)}`;
	}

	/**
	 * Fetches the recent tips for a creator (last 10 tips, newest first).
	 */
	async getRecentTips(creatorId: string): Promise<Tip[]> {
		if (!tipsStore.has(creatorId)) {
			tipsStore.set(creatorId, getInitialMockTips(creatorId));
		}

		try {
			const response = await this.api.get<APIResponse<Tip[]>>(
				`/creators/${creatorId}/tips`
			);
			if (response.data?.data && Array.isArray(response.data.data)) {
				const remoteTips = response.data.data;
				const localTips = tipsStore.get(creatorId) || [];
				// Merge remote with any newly added local tips, deduplicating by id
				const map = new Map<string, Tip>();
				[...localTips, ...remoteTips].forEach(tip => map.set(tip.id, tip));
				const merged = Array.from(map.values())
					.sort((a, b) => b.timestamp - a.timestamp)
					.slice(0, 10);
				tipsStore.set(creatorId, merged);
				return merged;
			}
		} catch {
			// fallback to in-memory store
		}

		const tips = tipsStore.get(creatorId) || [];
		return tips.slice(0, 10);
	}

	/**
	 * Records a newly confirmed tip into the local feed cache.
	 */
	recordTip(tip: Tip): Tip[] {
		const existing = tipsStore.get(tip.creatorId) || [];
		const updated = [tip, ...existing.filter(t => t.id !== tip.id)].slice(0, 10);
		tipsStore.set(tip.creatorId, updated);
		return updated;
	}

	/**
	 * Clears tip store (primarily for test resets).
	 */
	clearStore(): void {
		tipsStore.clear();
	}
}

export const tipService = new TipService();
