export interface KeyRating {
	id: string;
	keyId: string;
	walletAddress: string;
	/** 1-5 integer star rating. */
	rating: number;
	review?: string | null;
	createdAt: string;
	updatedAt?: string | null;
}

export interface KeyRatingDistribution {
	1: number;
	2: number;
	3: number;
	4: number;
	5: number;
}

export interface KeyRatingSummary {
	averageRating: number;
	totalRatings: number;
	distribution: KeyRatingDistribution;
}

export interface KeyRatingsPage {
	ratings: KeyRating[];
	nextCursor: string | null;
	summary?: KeyRatingSummary | null;
}

export interface SubmitKeyRatingInput {
	keyId: string;
	walletAddress: string;
	rating: number;
	review?: string;
}
