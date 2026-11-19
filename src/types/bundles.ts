/**
 * Buyer-side marketplace bundle types (issue #981).
 *
 * The creator-side bundle types (`KeyBundle`, `BundlesPage`,
 * `CreateBundleRequest`) live in `src/services/bundle.service.ts` alongside
 * `BundleService`, because they were added there on `dev` before this
 * feature. These marketplace types are what the buyer-facing UI speaks to.
 */

export interface BundleLineItem {
	keyId: string;
	quantity: number;
}

export type BundleStatus = 'active' | 'expired' | 'cancelled';

export interface KeyBundle {
	id: string;
	creatorId: string;
	items: BundleLineItem[];
	listPriceXlm: number;
	discountPriceXlm: number;
	expiresAt: string;
	createdAt: string;
	purchaseCount: number;
	cancelledAt?: string | null;
}

export interface BundlesPage {
	bundles: KeyBundle[];
	nextCursor: string | null;
}

export interface CreateBundleRequest {
	items: BundleLineItem[];
	discountPriceXlm: number;
	expiresAt: string;
}

export interface MarketplaceBundleKey {
	creatorId: string;
	creatorName: string;
	creatorHandle: string;
	quantity: number;
	individualPriceStroops: number;
	discountedPriceStroops?: number;
}

export interface MarketplaceBundle {
	id: string;
	name: string;
	description: string;
	keys: MarketplaceBundleKey[];
	bundlePriceStroops: number;
	individualTotalStroops: number;
	discountStroops: number;
	discountPercent: number;
	expiresAt: string;
	createdAt: string;
	imageUrl?: string;
	curatorHandle?: string;
	purchased?: boolean;
	isPurchased?: boolean;
	purchasedAt?: string;
}

export interface BuyMarketplaceBundleResult {
	txHash: string;
	receivedKeys: Array<{
		creatorId: string;
		creatorName: string;
		quantity: number;
	}>;
}
