// src/services/course.service.ts
import { BaseApiService, ApiError, type APIResponse } from './api.service';
import type { CreatorSocialLinks } from '@/types/creatorProfile';
import type { ContractDynamicFeeRate } from '@/utils/dynamicFeeRate.utils';
import { cacheManager } from '@/utils/cache.utils';

export interface Course {
	id: string;
	title: string;
	description: string;
	price: number;
	/** On-chain key price in stroops (preferred over legacy `price`). */
	priceStroops?: number;
	/** ISO timestamp for the next scheduled drop, when applicable. */
	nextDropAt?: string;
	creatorShareSupply?: number;
	instructorId: string;
	thumbnail?: string;
	category: string;
	level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
	socialHandle?: string;
	/** Optional creator-published social links (#1054). */
	socialLinks?: CreatorSocialLinks | null;
	isVerified?: boolean;
	volume24h?: number;
	/** Cumulative all-time traded volume in stroops, when the API reports it. */
	totalVolume?: number | null;
	change24h?: number;
	joinedAt?: string;
	/** ISO timestamp for when the creator key was created. */
	createdAt?: string;
	/** Whether this creator is pinned in the marketplace list. */
	isPinned?: boolean;
	creatorFeeBps?: number;
	protocolFeeBps?: number;
	/** Max keys that can be bought in a single transaction; null means no limit. */
	maxBuyQuantity?: number | null;
	/** Maximum holding cap per wallet configured by creator (#1015). */
	holdingCap?: number | null;
	maxHoldingCap?: number | null;
	/** Last up to 7 price history points in stroops, oldest to newest. */
	priceHistory?: number[];
	holderCount?: number;
	holdersCount?: number;
	holders?: number;
	/** XLM currently held in the staking reward pool for this key. */
	stakingPoolBalance?: number;
	/** Number of keys staked across all holders. */
	totalStaked?: number;
	/** Protocol fees that flowed into the staking pool over the last month. */
	recentFeeInflow?: number;
	/** Editable creator metadata (falls back to title/description/thumbnail). */
	name?: string;
	bio?: string;
	avatarUri?: string;
	/** Fixed auction price in XLM, when an auction has been configured. */
	auctionPrice?: number;
	/** Number of keys allocated to the auction. */
	auctionSupply?: number;
	/** Keys sold through the auction so far. */
	auctionSold?: number;
	/**
	 * ISO timestamp for when the pre-launch bidding window closes and the
	 * key goes live on the bonding curve (#924).
	 */
	auctionEndsAt?: string;
	/**
	 * Minimum amount (XLM) a new bid must exceed the current highest bid by.
	 * Defaults to a 5% increment when absent.
	 */
	auctionMinIncrement?: number;
	/** Current highest bid in XLM. */
	auctionHighestBid?: number;
	/** Pre-launch auction bid history, newest first (#924). */
	auctionBids?: AuctionBidEntry[];
	/**
	 * Early-sell penalty in basis points (0–2000 = 0%–20%).
	 * Applied to sells within the first 7 days after key creation.
	 */
	launchPenaltyBps?: number;
	/**
	 * Per-wallet delay between consecutive buys, expressed in Stellar ledgers.
	 */
	buyCooldownLedgers?: number;
	/**
	 * Proposal quorum threshold in basis points (100–5000 = 1%–50%).
	 */
	quorumBps?: number;
	/** Ledger sequence at which this key was created. */
	createdAtLedger?: number;
	/** Network ledger sequence as of this response. */
	currentLedger?: number;
	/** Optional co-creator wallet configured for this creator key. */
	coCreatorAddress?: string;
	/** Co-creator revenue share in basis points. */
	coCreatorSplitBps?: number;
	/** Lifetime payout to the co-creator, expressed in stroops. */
	totalPaidToCoCreator?: number;
	/** Lifetime payout to the primary creator, expressed in stroops. */
	totalPaidToCreator?: number;
	/**
	 * Fallback, creator-wide buy-cooldown expiry used when no per-user
	 * nextBuyAllowedAt is present on the caller's held position.
	 */
	nextBuyAllowedAt?: number | string | null;
	/**
	 * Cooldown policy for this key in seconds. Drives tooltip copy on
	 * disabled trade buttons.
	 */
	tradeCooldownSeconds?: number | null;
	/**
	 * Cooldown policy expressed in Stellar ledgers (~5 seconds per ledger).
	 * Preferred over tradeCooldownSeconds when both are present.
	 */
	tradeCooldownLedgers?: number | null;
	/**
	 * Whether this key has been marked deprecated.
	 * Deprecated keys can no longer be bought or sold.
	 */
	deprecated?: boolean;
	/** Optional human-readable reason surfaced in the deprecation notice. */
	deprecationReason?: string | null;
	/** Performance bond status for creator key protection (#975). */
	performanceBond?: PerformanceBond | null;
	/** Key-level circuit breaker price impact threshold in basis points. */
	circuitBreakerThresholdBps?: number | null;
	/** Key-level circuit breaker price impact threshold in percent. */
	circuitBreakerThresholdPercent?: number | null;
	/** Whether the early-access whitelist gate is enabled (#1031). */
	isWhitelistEnabled?: boolean;
	/** Backward-compatible alias for isWhitelistEnabled. */
	whitelistEnabled?: boolean;
	/** Approved wallet addresses on the early-access whitelist (#1031). */
	whitelist?: WhitelistEntry[];
	/** Migration details shown when a deprecated key has a successor. */
	deprecation?: KeyDeprecation | null;

	/** Whether purchases are restricted to the early-access whitelist. */
	earlyAccessEnabled?: boolean;
	/** Wallet addresses allowed to buy while early access is active. */
	earlyAccessWhitelist?: string[];
	/** ISO timestamp for when public purchases begin. */
	publicLaunchDate?: string | null;
}

export interface KeyDeprecation {
	/** ISO 8601 date the key was (or will be) deprecated. */
	deprecatedAt: string;
	/** Human-readable reason for deprecation. */
	reason: string;
	/** Successor creator ID, when one has been designated. */
	successorId?: string;
	/** Display name of the successor key. */
	successorName?: string;
}

export interface WhitelistEntry {
	walletAddress: string;
	addedAt: string;
}

export interface CurveMilestone {
	supplyThreshold: number;
	exponent: number;
	simulatedPrice: number;
	exponentChange?: string;
}

export interface GraduatedCurveConfig {
	keyId?: string;
	hasGraduatedCurve?: boolean;
	defaultExponent?: number;
	milestones?: CurveMilestone[];
}

/**
 * Trade cooldown status for a creator key (#998).
 *
 * Returned by GET /keys/:keyId/trade-cooldown.
 * nextBuyAllowedAt is the absolute timestamp after which the authenticated
 * wallet may trade the key again. It is null when no cooldown is in effect.
 */
export interface TradeCooldownInfo {
	/** Key this cooldown status belongs to, when the backend echoes it back. */
	keyId?: string;
	/**
	 * Absolute timestamp (seconds epoch, milliseconds epoch, or ISO string)
	 * after which trading is allowed again.
	 */
	nextBuyAllowedAt?: number | string | null;
	/** Cooldown policy length in seconds, when reported explicitly. */
	cooldownDurationSeconds?: number | null;
	/** Cooldown policy length in Stellar ledgers (~5 seconds per ledger). */
	cooldownDurationLedgers?: number | null;
}

/**
 * Live trading configuration for a single creator key (#951).
 *
 * Returned by GET /keys/:keyId/config.
 * All prices are in stroops (1 XLM = 10,000,000 stroops).
 */
export interface KeyConfig {
	/** Key this config belongs to, when the backend echoes it back. */
	keyId?: string;
	/** Current price to buy one key, in stroops. */
	buyPriceStroops?: number | null;
	/** Current price to sell one key, in stroops. */
	sellPriceStroops?: number | null;
	/** Absolute spread (buy - sell) in stroops. */
	spreadStroops?: number | null;
	/** Spread expressed in basis points of the buy price. */
	spreadBps?: number | null;
	/** Maximum holding cap per wallet, when reported by the config endpoint. */
	holdingCap?: number | null;
	/** Alias for holdingCap. */
	maxHoldingCap?: number | null;
	/** Key-level circuit breaker price impact threshold in basis points. */
	circuitBreakerThresholdBps?: number | null;
	/** Key-level circuit breaker price impact threshold in percent. */
	circuitBreakerThresholdPercent?: number | null;
}

/**
 * Vesting schedule for a creator key's reserved creator allocation (#960).
 *
 * Amounts are expressed in XLM; dates are ISO timestamps.
 * The contract remains the source of truth for vested and claimable amounts.
 */
export interface KeyVestingSchedule {
	keyId?: string;
	/** Wallet the allocation is registered to. */
	beneficiary?: string | null;
	/** Total allocation subject to vesting, in XLM. */
	totalAllocationXlm?: number | null;
	/** Amount unlocked so far, in XLM. */
	vestedAmountXlm?: number | null;
	/** Amount already claimed, in XLM. */
	claimedAmountXlm?: number | null;
	/** Vested but unclaimed amount, in XLM. */
	claimableXlm?: number | null;
	/** ISO timestamp at which vesting starts. */
	startAt?: string | null;
	/** ISO timestamp after which tokens unlock. */
	cliffAt?: string | null;
	/** ISO timestamp at which the allocation is fully vested. */
	endAt?: string | null;
}

/** A single completed claim of vested creator tokens (#960). */
export interface KeyVestingClaim {
	/** Stable identifier for the claim record. */
	id: string;
	/** Amount claimed, in XLM. */
	amountXlm: number;
	/** ISO timestamp of the claim. */
	claimedAt: string;
	/** Transaction hash of the claim transaction. */
	transactionHash: string;
}

/**
 * External oracle price for a creator key (#967).
 *
 * priceStroops is the oracle's view of the key's value, surfaced next to
 * the bonding-curve spot price.
 */
export interface KeyOraclePrice {
	keyId?: string;
	/** Oracle price in stroops (1 XLM = 10,000,000 stroops). */
	priceStroops?: number | null;
	/** ISO timestamp the oracle last published this price. */
	updatedAt?: string | null;
	/** Feed identifier shown in the source tooltip. */
	source?: string | null;
	/**
	 * Maximum age in seconds before the feed is considered stale.
	 * Falls back to the default staleness window when absent.
	 */
	maxAgeSeconds?: number | null;
}

export type PerformanceBondState = 'staked' | 'released' | 'forfeited';

/**
 * Creator performance bond status (#975).
 *
 * Surfaces the bonded amount, current state, target milestone, and
 * state-specific details such as release timestamp or forfeiture reason.
 */
export interface PerformanceBond {
	keyId?: string;
	/** Bonded amount in XLM. */
	amountXlm?: number | null;
	/** Bonded amount in stroops. */
	amountStroops?: number | null;
	/** Current state of the bond. */
	state: PerformanceBondState | string;
	/** Maturity milestone required for bond release. */
	milestone?: string | null;
	targetMilestone?: string | null;
	/** ISO timestamp when the bond was released. */
	releasedAt?: string | null;
	/** Reason for forfeiture. */
	forfeitureReason?: string | null;
	reason?: string | null;
}

export type CourseSortOption =
	'volume_desc' | 'price_asc' | 'price_desc' | 'newest';

export interface GetCoursesParams {
	page?: number;
	limit?: number;
	category?: string;
	search?: string;
	min_price?: number;
	max_price?: number;
	sort?: CourseSortOption;
}

export type PriceHistoryInterval = '1h' | '24h' | '7d';

export interface PriceHistoryPoint {
	timestamp: string;
	price: number;
}

/** Raw envelope shape for a paginated /courses response. */
interface CoursesPageEnvelope {
	items?: Course[];
	data?: Course[];
	has_more?: boolean;
	hasMore?: boolean;
}

export interface CoursesPage {
	items: Course[];
	/** The page number that was requested (used as this page's cursor). */
	page: number;
	/** Whether another page is available after this one. */
	hasMore: boolean;
}

/** Single holder entry from the key holders endpoint. */
export interface KeyHolderEntry {
	id: string;
	displayName: string;
	walletAddress: string;
	/** Total keys held by this holder, including any that are staked. */
	keyCount: number;
	/**
	 * How many of keyCount are currently locked in the staking contract.
	 * Missing values should be treated as 0.
	 */
	stakedQuantity?: number;
}

/** Cursor-paginated response envelope for the key holders endpoint. */
export interface KeyHoldersPage {
	holders: KeyHolderEntry[];
	nextCursor: string | null;
}

export interface KeyTwap {
	/** 24-hour time-weighted average price in stroops. */
	priceStroops: number | null;
	window?: string;
}

export interface KeyBuybackInfo {
	keyId: string;
	deprecated: boolean;
	buybackPriceStroops: number;
	expiryDate: string;
	terms?: string;
	isActive?: boolean;
}

/**
 * Aggregated on-chain stats for a creator key (#952).
 * Price and volume values are expressed in stroops.
 */
export interface KeyStats {
	/** Current circulating key supply. */
	supply: number | null;
	/** Number of unique wallets holding at least one key. */
	holderCount: number | null;
	/** Trading volume over the last 24 hours, in stroops. */
	volume24h: number | null;
	/** Cumulative all-time trading volume, in stroops. */
	totalVolume: number | null;
	/** 1-hour time-weighted average price, in stroops. */
	twap1h: number | null;
	/** 24-hour time-weighted average price, in stroops. */
	twap24h: number | null;
}

/** Single bid placed during a key's pre-launch auction window (#924). */
export interface AuctionBidEntry {
	/** Unique bid id from the contract. */
	id: string;
	/** Wallet that placed the bid. */
	bidderAddress: string;
	/** Optional display name for the bidder. */
	bidderName?: string;
	/** Bid amount in XLM. */
	amount: number;
	/** ISO timestamp when the bid was placed. */
	placedAt: string;
}

/**
 * Unique trader count for a creator key (#1020).
 * Counts distinct wallets that have bought or sold the key at least once.
 */
export interface KeyUniqueTraders {
	/** Current all-time unique trader count. */
	uniqueTraders: number | null;
	/** Unique trader count as of 24 hours ago. */
	uniqueTraders24hAgo: number | null;
}

class CourseService extends BaseApiService {
	private readonly PROFILE_CACHE_TTL = 30000; // 30 seconds

	// Get all courses - GET /courses
	async getCourses(params?: GetCoursesParams): Promise<Course[]> {
		const cacheKey = `courses_${JSON.stringify(params || {})}`;
		const cached = cacheManager.get<Course[]>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<Course[]>>(
				'/courses',
				{ params }
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, this.PROFILE_CACHE_TTL);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Get one cursor-paginated page of courses for infinite-scroll marketplace
	 * browsing - GET /courses (#685).
	 *
	 * page is used as the cursor: pass the previous response's page + 1
	 * to fetch the next page.
	 */
	async getCoursesPage(
		page: number,
		params?: Omit<GetCoursesParams, 'page'>
	): Promise<CoursesPage> {
		const limit = params?.limit ?? 20;
		const requestParams: GetCoursesParams = { ...params, page, limit };
		const cacheKey = `courses_page_${JSON.stringify(requestParams)}`;
		const cached = cacheManager.get<CoursesPage>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<
				APIResponse<CoursesPageEnvelope | Course[]>
			>('/courses', { params: requestParams });

			const raw = response.data.data;

			const items: Course[] = Array.isArray(raw)
				? raw
				: (raw.items ?? raw.data ?? []);

			const hasMore: boolean = Array.isArray(raw)
				? items.length === limit
				: (raw.has_more ?? raw.hasMore ?? items.length === limit);

			const result: CoursesPage = { items, page, hasMore };
			cacheManager.set(cacheKey, result, this.PROFILE_CACHE_TTL);

			return result;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get single course - GET /courses/:id
	async getCourse(courseId: string): Promise<Course> {
		const cacheKey = `course_${courseId}`;
		const cached = cacheManager.get<Course>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<Course>>(
				`/courses/${courseId}`
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, this.PROFILE_CACHE_TTL);

			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get bonding curve price history - GET /keys/:keyId/price-history
	async getPriceHistory(
		keyId: string,
		interval: PriceHistoryInterval
	): Promise<PriceHistoryPoint[]> {
		try {
			const response = await this.api.get<APIResponse<PriceHistoryPoint[]>>(
				`/keys/${keyId}/price-history`,
				{ params: { interval } }
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get key holders - GET /keys/:keyId/holders
	async getHoldersPage(
		keyId: string,
		cursor?: string | null
	): Promise<KeyHoldersPage> {
		try {
			const params: Record<string, string> = {};

			if (cursor) {
				params.cursor = cursor;
			}

			const response = await this.api.get<APIResponse<KeyHoldersPage>>(
				`/keys/${keyId}/holders`,
				{ params }
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get the time-weighted average price - GET /keys/:keyId/twap
	async getKeyTwap(keyId: string, window = '24h'): Promise<KeyTwap> {
		try {
			const response = await this.api.get<APIResponse<KeyTwap>>(
				`/keys/${keyId}/twap`,
				{ params: { window } }
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get aggregated key stats - GET /keys/:keyId/stats
	async getKeyStats(keyId: string): Promise<KeyStats> {
		try {
			const response = await this.api.get<APIResponse<KeyStats>>(
				`/keys/${keyId}/stats`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Get live pre-launch auction bid history for a key (#924).
	 * GET /keys/:keyId/auction/bids
	 */
	async getAuctionBids(keyId: string): Promise<AuctionBidEntry[]> {
		try {
			const response = await this.api.get<APIResponse<AuctionBidEntry[]>>(
				`/keys/${keyId}/auction/bids`
			);

			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get the unique trader count - GET /keys/:keyId/unique-traders
	async getKeyUniqueTraders(keyId: string): Promise<KeyUniqueTraders> {
		try {
			const response = await this.api.get<APIResponse<KeyUniqueTraders>>(
				`/keys/${keyId}/unique-traders`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get enrolled courses - GET /courses/enrolled
	async getEnrolledCourses(): Promise<Course[]> {
		try {
			const response =
				await this.api.get<APIResponse<Course[]>>('/courses/enrolled');

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Enroll in course - POST /courses/:id/enroll
	async enrollInCourse(courseId: string): Promise<void> {
		try {
			await this.api.post(`/courses/${courseId}/enroll`);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Create course - POST /courses
	async createCourse(courseData: Partial<Course>): Promise<Course> {
		try {
			const response = await this.api.post<APIResponse<Course>>(
				'/courses',
				courseData
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Update course - PATCH /courses/:id
	async updateCourse(
		courseId: string,
		courseData: Partial<Course>
	): Promise<Course> {
		try {
			const response = await this.api.patch<APIResponse<Course>>(
				`/courses/${courseId}`,
				courseData
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Search keys - GET /keys/search?q=:query
	async searchKeys(query: string): Promise<Course[]> {
		const trimmed = query.trim();

		if (!trimmed) {
			return [];
		}

		try {
			const response = await this.api.get<
				APIResponse<Course[] | { items: Course[] }>
			>('/keys/search', {
				params: { q: trimmed },
			});

			const raw = response.data.data;

			if (Array.isArray(raw)) {
				return raw;
			}

			if (
				raw &&
				typeof raw === 'object' &&
				'items' in raw &&
				Array.isArray(raw.items)
			) {
				return raw.items;
			}

			return [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Set co-creator address and split - POST /courses/:id/co-creator
	async setCoCreator(
		courseId: string,
		address: string,
		splitBps: number
	): Promise<Course> {
		try {
			const response = await this.api.post<APIResponse<Course>>(
				`/courses/${courseId}/co-creator`,
				{ address, splitBps }
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Simulate buy - GET /keys/:keyId/simulate?quantity=N (#886, #887)
	async simulateBuy(
		keyId: string,
		quantity: number
	): Promise<Record<string, number>> {
		try {
			const response = await this.api.get<
				APIResponse<Record<string, number>>
			>(`/keys/${keyId}/simulate`, { params: { quantity } });

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get graduated curve config - GET /keys/:keyId/curve-config
	async getCurveConfig(keyId: string): Promise<GraduatedCurveConfig> {
		try {
			const response = await this.api.get<APIResponse<GraduatedCurveConfig>>(
				`/keys/${keyId}/curve-config`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get key buyback info - GET /keys/:keyId/buyback
	async getKeyBuyback(keyId: string): Promise<KeyBuybackInfo> {
		try {
			const response = await this.api.get<APIResponse<KeyBuybackInfo>>(
				`/keys/${keyId}/buyback`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get live key trading config - GET /keys/:keyId/config (#951)
	async getKeyConfig(keyId: string): Promise<KeyConfig> {
		try {
			const response = await this.api.get<APIResponse<KeyConfig>>(
				`/keys/${keyId}/config`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get the dynamic fee rate from the contract - GET /keys/:keyId/fee-rate (#994)
	async getDynamicFeeRate(
		keyId: string,
		config?: { signal?: AbortSignal }
	): Promise<ContractDynamicFeeRate> {
		try {
			const response = await this.api.get<
				APIResponse<ContractDynamicFeeRate>
			>(`/keys/${keyId}/fee-rate`, { signal: config?.signal });

			return response.data.data;
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				(error.name === 'CanceledError' || error.name === 'AbortError')
			) {
				throw error;
			}
			if (
				typeof error === 'object' &&
				error !== null &&
				'code' in error &&
				error.code === 'ERR_CANCELED'
			) {
				throw error;
			}

			throw this.handleError(error);
		}
	}

	// Get the creator vesting schedule - GET /keys/:keyId/vesting (#960)
	async getKeyVesting(
		keyId: string,
		wallet?: string
	): Promise<KeyVestingSchedule> {
		try {
			const response = await this.api.get<APIResponse<KeyVestingSchedule>>(
				`/keys/${keyId}/vesting`,
				{ params: wallet ? { wallet } : undefined }
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get the creator's vesting claim history - GET /keys/:keyId/vesting/claims (#960)
	async getKeyVestingClaims(
		keyId: string,
		wallet: string
	): Promise<KeyVestingClaim[]> {
		try {
			const response = await this.api.get<APIResponse<KeyVestingClaim[]>>(
				`/keys/${keyId}/vesting/claims`,
				{ params: { wallet } }
			);

			const data = response.data.data;

			return Array.isArray(data) ? data : [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get the external oracle price - GET /keys/:keyId/oracle (#967)
	async getKeyOraclePrice(keyId: string): Promise<KeyOraclePrice> {
		try {
			const response = await this.api.get<APIResponse<KeyOraclePrice>>(
				`/keys/${keyId}/oracle`
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get trade cooldown status - GET /keys/:keyId/trade-cooldown (#998)
	async getTradeCooldownStatus(
		keyId: string
	): Promise<TradeCooldownInfo | null> {
		try {
			const response = await this.api.get<APIResponse<TradeCooldownInfo>>(
				`/keys/${keyId}/trade-cooldown`
			);

			return response.data.data;
		} catch (error: unknown) {
			if (error instanceof ApiError && error.status === 404) {
				// No cooldown concept deployed for this key yet.
				// Treat as no cooldown data so trade buttons stay enabled.
				return null;
			}

			throw this.handleError(error);
		}
	}

	// Get creator performance bond status - GET /keys/:keyId/performance-bond (#975)
	async getPerformanceBond(keyId: string): Promise<PerformanceBond | null> {
		try {
			const response = await this.api.get<APIResponse<PerformanceBond>>(
				`/keys/${keyId}/performance-bond`
			);

			return response.data.data;
		} catch (error: unknown) {
			if (error instanceof ApiError && error.status === 404) {
				return null;
			}

			throw this.handleError(error);
		}
	}
}

export const courseService = new CourseService();
