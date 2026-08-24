export interface HolderRow {
	address: string;
	keyCount: number;
	totalValue: number;
	sharePercentage: number;
	rank: number;
	joinedAt: string;
}

export interface HolderListResponse {
	holders: HolderRow[];
	total: number;
	nextCursor?: string;
	hasMore: boolean;
}

export interface HolderQueryParams {
	creatorId: string;
	limit?: number;
	cursor?: string;
}
