// src/services/bundle.service.ts
import { BaseApiService, type APIResponse } from './api.service';

// =========================================================================
// Creator-side bundles (existing on `dev`)
// =========================================================================

/** A single key + quantity pair inside a bundle. */
export interface BundleLineItem {
	/** Creator key id included in the bundle. */
	keyId: string;
	/** How many units of that key the bundle contains. */
	quantity: number;
}

/**
 * Lifecycle status of a bundle.
 *
 * `active` and `expired` are both derived from `expiresAt`; `cancelled` is set
 * by the creator before expiry. Everything except `active` is archived.
 */
export type BundleStatus = 'active' | 'expired' | 'cancelled';

/** A creator-defined bundle of keys sold together at a discount. */
export interface KeyBundle {
	/** Bundle id. */
	id: string;
	/** Creator key the bundle is listed under. */
	creatorId: string;
	/** Per-key line items making up the bundle. */
	items: BundleLineItem[];
	/** Undiscounted total of every line item at list price, in XLM. */
	listPriceXlm: number;
	/** Price a buyer pays for the whole bundle, in XLM. */
	discountPriceXlm: number;
	/** ISO timestamp after which the bundle can no longer be purchased. */
	expiresAt: string;
	/** ISO timestamp of when the bundle was created. */
	createdAt: string;
	/** Number of completed bundle purchases. */
	purchaseCount: number;
	/** ISO timestamp of when the creator cancelled the bundle, when cancelled. */
	cancelledAt?: string | null;
}

/** Cursor-paginated envelope for the bundle list. */
export interface BundlesPage {
	bundles: KeyBundle[];
	nextCursor: string | null;
}

/** Payload for `create_bundle`. */
export interface CreateBundleRequest {
	/** Keys and quantities that make up the bundle. */
	items: BundleLineItem[];
	/** Discounted bundle price, in XLM. */
	discountPriceXlm: number;
	/** ISO timestamp after which the bundle expires. */
	expiresAt: string;
}

class BundleService extends BaseApiService {
	/**
	 * One cursor-paginated page of a creator's bundles -
	 * GET /creators/:creatorId/bundles.
	 *
	 * The API returns active and archived bundles together; the client splits
	 * them by comparing `expiresAt` against the current time so bundles archive
	 * the moment they expire, without waiting for a refetch.
	 */
	async getCreatorBundles(
		creatorId: string,
		cursor?: string | null
	): Promise<BundlesPage> {
		try {
			const response = await this.api.get<APIResponse<BundlesPage>>(
				`/creators/${creatorId}/bundles`,
				{ params: cursor ? { cursor } : undefined }
			);

			const data = response.data.data;
			return {
				bundles: Array.isArray(data?.bundles) ? data.bundles : [],
				nextCursor: data?.nextCursor ?? null,
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const bundleService = new BundleService();

/**
 * Convenience wrapper for fetching a page of a creator's bundles.
 * Exposed as a plain function to facilitate test spying.
 */
export async function fetchCreatorBundlesPage(
	creatorId: string,
	cursor: string | null | undefined
): Promise<BundlesPage> {
	return bundleService.getCreatorBundles(creatorId, cursor);
}

// =========================================================================
// Buyer-side marketplace bundles (issue #981)
// =========================================================================

/** A creator + quantity pair inside a marketplace bundle. */
export interface MarketplaceBundleKey {
	creatorId: string;
	creatorName: string;
	creatorHandle: string;
	quantity: number;
	/** Per-key price in stroops when bought individually. */
	individualPriceStroops: number;
}

/** A discounted marketplace bundle of creator keys. */
export interface MarketplaceBundle {
	id: string;
	name: string;
	description: string;
	keys: MarketplaceBundleKey[];
	/** Total price in stroops when bought as a bundle. */
	bundlePriceStroops: number;
	/** Sum of `quantity * individualPriceStroops` across all keys. */
	individualTotalStroops: number;
	/** `individualTotalStroops - bundlePriceStroops`, in stroops. */
	discountStroops: number;
	/** `discountStroops / individualTotalStroops`, as a 0-100 percent. */
	discountPercent: number;
	/** ISO-8601 timestamp. Bundles past this are unavailable. */
	expiresAt: string;
	createdAt: string;
	imageUrl?: string;
	curatorHandle?: string;
}

export interface BuyMarketplaceBundleResult {
	/** Transaction hash of the purchase. */
	txHash: string;
	/** Keys received. */
	receivedKeys: Array<{
		creatorId: string;
		creatorName: string;
		quantity: number;
	}>;
}

/**
 * Deterministic stub bundles for the marketplace UI. Prices are in stroops.
 * Replaced by the real endpoint once the backend ships.
 */
function stubMarketplaceBundles(): MarketplaceBundle[] {
	const now = Date.now();
	const daysFromNow = (n: number) => new Date(now + n * 86_400_000).toISOString();
	const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

	function makeBundle(
		id: string,
		name: string,
		description: string,
		keys: MarketplaceBundleKey[],
		bundlePriceStroops: number,
		expiresInDays: number
	): MarketplaceBundle {
		const individualTotalStroops = keys.reduce(
			(sum, k) => sum + k.individualPriceStroops * k.quantity,
			0
		);
		const discountStroops = Math.max(0, individualTotalStroops - bundlePriceStroops);
		const discountPercent =
			individualTotalStroops > 0
				? Math.round((discountStroops / individualTotalStroops) * 10_000) / 100
				: 0;

		return {
			id,
			name,
			description,
			keys,
			bundlePriceStroops,
			individualTotalStroops,
			discountStroops,
			discountPercent,
			expiresAt:
				expiresInDays >= 0 ? daysFromNow(expiresInDays) : daysAgo(-expiresInDays),
			createdAt: daysAgo(7),
		};
	}

	return [
		makeBundle(
			'bundle-art-starter',
			'Art Collector Starter',
			'Everything you need to start collecting from three creators in the illustration scene.',
			[
				{
					creatorId: '1',
					creatorName: 'Alex Rivers',
					creatorHandle: 'arivers',
					quantity: 3,
					individualPriceStroops: 500_000,
				},
				{
					creatorId: '3',
					creatorName: 'Elena Vance',
					creatorHandle: 'evance_design',
					quantity: 2,
					individualPriceStroops: 400_000,
				},
				{
					creatorId: '5',
					creatorName: 'Priya Nair',
					creatorHandle: 'pnair_art',
					quantity: 5,
					individualPriceStroops: 300_000,
				},
			],
			2_400_000,
			14
		),
		makeBundle(
			'bundle-dev-stack',
			'Developer Stack',
			'Key access to three Solidity and protocol engineers on the platform.',
			[
				{
					creatorId: '2',
					creatorName: 'Sarah Chen',
					creatorHandle: 'schen_dev',
					quantity: 4,
					individualPriceStroops: 1_200_000,
				},
				{
					creatorId: '6',
					creatorName: 'Ravi Patel',
					creatorHandle: 'rpatel_eth',
					quantity: 3,
					individualPriceStroops: 800_000,
				},
				{
					creatorId: '7',
					creatorName: 'Mika Ohno',
					creatorHandle: 'mohno',
					quantity: 2,
					individualPriceStroops: 600_000,
				},
			],
			6_000_000,
			3
		),
		makeBundle(
			'bundle-fintech',
			'Fintech Insider',
			'Strategists and analysts covering the crypto finance beat.',
			[
				{
					creatorId: '4',
					creatorName: 'Marcus Thorne',
					creatorHandle: 'mthorne',
					quantity: 5,
					individualPriceStroops: 800_000,
				},
				{
					creatorId: '8',
					creatorName: 'Lina Zhao',
					creatorHandle: 'lzhao_finance',
					quantity: 3,
					individualPriceStroops: 900_000,
				},
			],
			4_500_000,
			-2
		),
	];
}

/**
 * Buyer-side marketplace bundle service (issue #981).
 *
 * Separate from `BundleService` above, which is creator-scoped. The two are
 * different features that happen to share a name; keeping them in separate
 * classes avoids the creator-scoped `getCreatorBundles(creatorId, cursor)`
 * signature having to also carry a buyer view.
 */
class MarketplaceBundleService extends BaseApiService {
	async listBundles(): Promise<MarketplaceBundle[]> {
		// TODO(#981): replace with this.api.get<APIResponse<MarketplaceBundle[]>>('/bundles')
		return stubMarketplaceBundles();
	}

	async getBundle(id: string): Promise<MarketplaceBundle | null> {
		// TODO(#981): replace with this.api.get<APIResponse<MarketplaceBundle>>(`/bundles/${id}`)
		const all = await this.listBundles();
		return all.find(b => b.id === id) ?? null;
	}

	async buyBundle(id: string): Promise<BuyMarketplaceBundleResult> {
		// TODO(#981): replace with this.api.post<APIResponse<BuyMarketplaceBundleResult>>(...)
		// and, when the contract ABI lands, with a signed contract call.
		const bundle = await this.getBundle(id);
		if (!bundle) {
			throw new Error('Bundle not found');
		}
		if (new Date(bundle.expiresAt).getTime() <= Date.now()) {
			throw new Error('Bundle has expired');
		}

		const receivedKeys = bundle.keys.map(k => ({
			creatorId: k.creatorId,
			creatorName: k.creatorName,
			quantity: k.quantity,
		}));

		return {
			txHash: '0x' + 'a1b2c3d4'.repeat(8),
			receivedKeys,
		};
	}
}

export const marketplaceBundleService = new MarketplaceBundleService();