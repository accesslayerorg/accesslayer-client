// src/services/creatorActivity.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import {
	toActionAttribution,
	type ActionAttribution,
	type ActionAttributionDto,
} from '@/utils/actionAttribution.utils';

export type CreatorActivityType =
	| 'buy'
	| 'sell'
	| 'royalty_claim'
	| 'revenue_distribution';

/**
 * A single entry on a creator's public activity feed.
 *
 * Trades mirror the shape consumed by the existing `TransactionHistory`
 * component so the feed can pass entries straight through. Royalty claims
 * and revenue distributions reuse `amount` as the XLM moved (#1224).
 */
export interface CreatorActivityTrade {
	id: string;
	type: CreatorActivityType;
	traderHandle: string;
	amount: number;
	price: number;
	timestamp: number;
	txHash: string;
	status: 'completed' | 'pending' | 'failed';
	/** Creator or co-creator who acted, for creator-side actions (#1224). */
	actor?: ActionAttribution | null;
}

type CreatorActivityDto = Omit<CreatorActivityTrade, 'actor'> &
	ActionAttributionDto;

function toCreatorActivityTrade(dto: CreatorActivityDto): CreatorActivityTrade {
	return {
		id: dto.id,
		type: dto.type,
		traderHandle: dto.traderHandle,
		amount: dto.amount,
		price: dto.price,
		timestamp: dto.timestamp,
		txHash: dto.txHash,
		status: dto.status,
		actor: toActionAttribution(dto),
	};
}

class CreatorActivityService extends BaseApiService {
	async getCreatorActivity(creatorId: string): Promise<CreatorActivityTrade[]> {
		try {
			const response = await this.api.get<APIResponse<CreatorActivityDto[]>>(
				`/creators/${creatorId}/activity`
			);
			return (response.data.data ?? []).map(toCreatorActivityTrade);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const creatorActivityService = new CreatorActivityService();
