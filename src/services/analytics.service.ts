import { BaseApiService, type APIResponse } from './api.service';

export interface KeyAnalyticsData {
	/** Unique wallet addresses that have bought or sold keys */
	uniqueTraderCount: number;
	/** Cumulative trade transactions (buys + sells) */
	totalTradeCount: number;
	/** Cumulative trading volume in XLM */
	cumulativeVolumeXlm: number;
	/** Cumulative trading volume in USD */
	cumulativeVolumeUsd: number;
	/** Conversion rate used for XLM to USD */
	xlmPriceUsd: number;
	/** ISO timestamp when the contract accumulator was last fetched */
	lastUpdated: string;
}

export type ProtocolTimeRange = '7d' | '30d' | '90d';

/**
 * Protocol-wide current metrics sourced from the on-chain analytics registry (#1167).
 */
export interface ProtocolAnalyticsSummary {
	/** Total value locked across all creator keys, in XLM */
	totalTvlXlm: number;
	/** Cumulative all-time trading volume across all keys, in XLM */
	cumulativeVolumeXlm: number;
	/** Creator keys currently active on the protocol */
	activeKeys: number;
	/** Unique wallets that have traded any key */
	uniqueTraders: number;
	/** Conversion rate used for XLM to USD */
	xlmPriceUsd: number;
}

/**
 * Single historical data point for the protocol TVL / volume charts.
 */
export interface ProtocolHistoryPoint {
	/** ISO timestamp of the sample */
	timestamp: string;
	/** Total value locked at this point, in XLM */
	tvl: number;
	/** Trading volume recorded for this interval, in XLM */
	volume: number;
}

/**
 * A creator key ranked by trading volume on the protocol analytics dashboard.
 */
export interface ProtocolTopKey {
	id: string;
	title: string;
	thumbnail?: string;
	/** 24-hour trading volume, in XLM */
	volume24h: number;
	/** Price change percentage over the last 24 hours (e.g. 5.2 = +5.2%) */
	change24h: number;
	/** Cumulative all-time trading volume, in XLM */
	cumulativeVolumeXlm: number;
}

/**
 * Full payload returned by GET /analytics/protocol.
 */
export interface ProtocolAnalyticsData {
	summary: ProtocolAnalyticsSummary;
	/** TVL history points ordered oldest → newest */
	tvlHistory: ProtocolHistoryPoint[];
	/** Volume history points ordered oldest → newest */
	volumeHistory: ProtocolHistoryPoint[];
	/** Top keys by 24-hour volume, descending */
	topKeys: ProtocolTopKey[];
	/** ISO timestamp when the analytics registry was last sampled */
	lastUpdated: string;
}

const DEFAULT_XLM_PRICE_USD = 0.12;

export class AnalyticsService extends BaseApiService {
	/**
	 * Fetches on-chain unique trader count and cumulative trade volume stats
	 * from the contract analytics accumulator endpoint (#966).
	 */
	async getKeyAnalytics(creatorId?: string): Promise<KeyAnalyticsData> {
		try {
			const response = await this.api.get<APIResponse<KeyAnalyticsData>>(
				'/analytics/keys',
				{
					params: creatorId ? { creatorId } : undefined,
				}
			);
			return response.data.data;
		} catch {
			// Fallback mock accumulator data for dev/testing or when backend is offline
			return this.getMockKeyAnalytics(creatorId);
		}
	}

	/**
	 * Fetches protocol-wide analytics (#1167): total TVL, cumulative volume,
	 * active keys, unique traders, historical TVL/volume points, and the top
	 * keys by 24-hour volume, from the on-chain analytics registry.
	 */
	async getProtocolAnalytics(
		range: ProtocolTimeRange = '30d'
	): Promise<ProtocolAnalyticsData> {
		try {
			const response = await this.api.get<APIResponse<ProtocolAnalyticsData>>(
				'/analytics/protocol',
				{ params: { range } }
			);
			return response.data.data;
		} catch {
			// Fallback mock registry data for dev/testing or when backend is offline
			return this.getMockProtocolAnalytics(range);
		}
	}

	/**
	 * Deterministic mock protocol analytics for fallback environments
	 */
	getMockProtocolAnalytics(range: ProtocolTimeRange = '30d'): ProtocolAnalyticsData {
		const dayCount = range === '7d' ? 7 : range === '30d' ? 30 : 90;
		const activeKeys = 148;
		const uniqueTraders = 3820;
		const baseTvl = 245_000;
		const dailyVolume = 18_500;
		const dayMs = 86_400_000;
		const now = Date.now();

		const tvlHistory: ProtocolHistoryPoint[] = [];
		const volumeHistory: ProtocolHistoryPoint[] = [];

		for (let daysAgo = dayCount - 1; daysAgo >= 0; daysAgo--) {
			const timestamp = new Date(now - daysAgo * dayMs).toISOString();
			const progress = dayCount - daysAgo;
			const point: ProtocolHistoryPoint = {
				timestamp,
				tvl: Math.round(baseTvl * (1 + Math.sin(progress / 4) * 0.08 + progress * 0.004)),
				volume: Math.round(dailyVolume * (1 + Math.cos(progress) * 0.35)),
			};
			tvlHistory.push(point);
			volumeHistory.push(point);
		}

		const latestTvl = tvlHistory[tvlHistory.length - 1]?.tvl ?? baseTvl;
		const cumulativeVolumeXlm =
			volumeHistory.reduce((sum, point) => sum + point.volume, 0) * 12;

		const topKeys: ProtocolTopKey[] = Array.from({ length: 10 }, (_, index) => ({
			id: `mock-key-${index + 1}`,
			title: `Creator Key #${index + 1}`,
			volume24h: Math.round(dailyVolume * (0.9 - index * 0.07)),
			change24h: Math.round(Math.sin(index + 1) * 1200) / 100,
			cumulativeVolumeXlm: Math.round(dailyVolume * (30 - index * 2)),
		}));

		return {
			summary: {
				totalTvlXlm: latestTvl,
				cumulativeVolumeXlm,
				activeKeys,
				uniqueTraders,
				xlmPriceUsd: DEFAULT_XLM_PRICE_USD,
			},
			tvlHistory,
			volumeHistory,
			topKeys,
			lastUpdated: new Date().toISOString(),
		};
	}

	/**
	 * Deterministic mock data for fallback environments
	 */
	getMockKeyAnalytics(creatorId?: string): KeyAnalyticsData {
		const seed = creatorId ? creatorId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 42;
		const uniqueTraders = 1240 + (seed % 500);
		const totalTrades = uniqueTraders * 4 + (seed % 350);
		const volumeXlm = 145000 + (seed * 120);
		const volumeUsd = Math.round(volumeXlm * DEFAULT_XLM_PRICE_USD * 100) / 100;

		return {
			uniqueTraderCount: uniqueTraders,
			totalTradeCount: totalTrades,
			cumulativeVolumeXlm: volumeXlm,
			cumulativeVolumeUsd: volumeUsd,
			xlmPriceUsd: DEFAULT_XLM_PRICE_USD,
			lastUpdated: new Date().toISOString(),
		};
	}

	/**
	 * Fetches platform-wide creator keys leaderboard ranked by volume,
	 * holder count, or reputation score (#1206).
	 */
	async getKeyDiscoveryLeaderboard(
		metric: LeaderboardMetric = 'volume'
	): Promise<KeyLeaderboardEntry[]> {
		try {
			const response = await this.api.get<
				APIResponse<Array<RawKeyLeaderboardEntry>>
			>('/analytics/keys/leaderboard', {
				params: { metric },
			});
			const rawData = response.data.data ?? [];
			return rawData.map((item, index) =>
				normalizeKeyLeaderboardEntry(item, index + 1, metric)
			);
		} catch {
			return this.getMockKeyDiscoveryLeaderboard(metric);
		}
	}

	/**
	 * Generates deterministic top 50 ranked keys for the given metric
	 * when backend is offline or during testing (#1206).
	 */
	getMockKeyDiscoveryLeaderboard(
		metric: LeaderboardMetric = 'volume'
	): KeyLeaderboardEntry[] {
		const baseKeys = [
			{ name: 'Apex Trader', symbol: 'APEX', creator: 'GDKXQ7HNV42...887A', creatorName: 'Apex Alpha' },
			{ name: 'Stellar Nexus', symbol: 'NEXUS', creator: 'GBPL7QW411...912C', creatorName: 'Nexus Studio' },
			{ name: 'CyberPulse', symbol: 'CPULSE', creator: 'GCKV8994MM...332X', creatorName: 'Cyber Labs' },
			{ name: 'Quantum Core', symbol: 'QCORE', creator: 'GAZT1188NN...554B', creatorName: 'Quantum Dao' },
			{ name: 'Solaria Prime', symbol: 'SLR', creator: 'GDOP5566WW...771Q', creatorName: 'Solaria Guild' },
			{ name: 'Vanguard Elite', symbol: 'VNG', creator: 'GBKL3344PP...882M', creatorName: 'Vanguard Collective' },
			{ name: 'Hyperion Alpha', symbol: 'HYP', creator: 'GDRT7788KK...991S', creatorName: 'Hyperion Capital' },
			{ name: 'Aether Dynamics', symbol: 'AETH', creator: 'GCFF2233JJ...441L', creatorName: 'Aether Team' },
			{ name: 'MetaNode VIP', symbol: 'NODE', creator: 'GAXX9900HH...112K', creatorName: 'MetaNode' },
			{ name: 'Nebula Protocol', symbol: 'NBLA', creator: 'GDZZ6677GG...223J', creatorName: 'Nebula DAO' },
			{ name: 'Chronos Yield', symbol: 'CRN', creator: 'GBMM4455FF...334H', creatorName: 'Chronos Research' },
			{ name: 'Zenith Matrix', symbol: 'ZNTH', creator: 'GCLL1122DD...445G', creatorName: 'Zenith Labs' },
			{ name: 'Titan Vault', symbol: 'TITAN', creator: 'GAKK8899SS...556F', creatorName: 'Titan Assets' },
			{ name: 'Echo Stream', symbol: 'ECHO', creator: 'GDJJ5566AA...667D', creatorName: 'Echo Media' },
			{ name: 'Orion Velocity', symbol: 'ORION', creator: 'GBHH2233ZZ...778S', creatorName: 'Orion Guild' },
			{ name: 'Spectra Key', symbol: 'SPEC', creator: 'GCGG9900YY...889A', creatorName: 'Spectra Net' },
			{ name: 'Vortex Syndicate', symbol: 'VTX', creator: 'GAFF6677XX...990B', creatorName: 'Vortex Org' },
			{ name: 'Beacon Horizon', symbol: 'BCN', creator: 'GDDD3344WW...001C', creatorName: 'Beacon Hub' },
			{ name: 'Astra Foundry', symbol: 'ASTRA', creator: 'GBSS0011VV...112D', creatorName: 'Astra Creative' },
			{ name: 'Eclipse Capital', symbol: 'ECLP', creator: 'GCAA7788UU...223E', creatorName: 'Eclipse Fund' },
			{ name: 'Fortress Key', symbol: 'FORT', creator: 'GAQQ4455TT...334F', creatorName: 'Fortress Security' },
			{ name: 'Mirage Ventures', symbol: 'MRG', creator: 'GDWW1122SS...445G', creatorName: 'Mirage Studio' },
			{ name: 'Solstice Guild', symbol: 'SLST', creator: 'GBEE8899RR...556H', creatorName: 'Solstice Group' },
			{ name: 'Radiant Edge', symbol: 'RDNT', creator: 'GCRR5566QQ...667J', creatorName: 'Radiant DAO' },
			{ name: 'Prism Network', symbol: 'PRISM', creator: 'GATT2233PP...778K', creatorName: 'Prism Labs' },
			{ name: 'Obsidian Pass', symbol: 'OBSD', creator: 'GDYY9900OO...889L', creatorName: 'Obsidian Guild' },
			{ name: 'Aura Protocol', symbol: 'AURA', creator: 'GBUU6677NN...990M', creatorName: 'Aura Collective' },
			{ name: 'Equinox Key', symbol: 'EQNX', creator: 'GCII3344MM...001N', creatorName: 'Equinox Capital' },
			{ name: 'Synergy Alpha', symbol: 'SYN', creator: 'GAOO0011LL...112P', creatorName: 'Synergy Core' },
			{ name: 'Velocity Run', symbol: 'VELO', creator: 'GDLL7788KK...223Q', creatorName: 'Velocity Sports' },
			{ name: 'Catalyst Node', symbol: 'CTLY', creator: 'GBKK4455JJ...334R', creatorName: 'Catalyst Hub' },
			{ name: 'Polaris Vault', symbol: 'PLRS', creator: 'GCJJ1122HH...445S', creatorName: 'Polaris Tech' },
			{ name: 'Helios DAO', symbol: 'HELI', creator: 'GAHH8899GG...556T', creatorName: 'Helios Creator' },
			{ name: 'Starlight Key', symbol: 'STR', creator: 'GDGG5566FF...667U', creatorName: 'Starlight Media' },
			{ name: 'Zenith Forge', symbol: 'ZFRG', creator: 'GBFF2233EE...778V', creatorName: 'Forge Alpha' },
			{ name: 'Apex Spectrum', symbol: 'ASPC', creator: 'GCEE9900DD...889W', creatorName: 'Spectrum Labs' },
			{ name: 'Genesis Block', symbol: 'GEN', creator: 'GADD6677CC...990X', creatorName: 'Genesis Hub' },
			{ name: 'Olympus Peak', symbol: 'OLYM', creator: 'GDCC3344BB...001Y', creatorName: 'Olympus DAO' },
			{ name: 'Flux Matrix', symbol: 'FLUX', creator: 'GBBB0011AA...112Z', creatorName: 'Flux Labs' },
			{ name: 'Terra Nova', symbol: 'TRRA', creator: 'GCAA7788ZZ...223A', creatorName: 'Terra Alpha' },
			{ name: 'Cosmic Drift', symbol: 'COSM', creator: 'GAZZ4455YY...334B', creatorName: 'Cosmic Space' },
			{ name: 'Pulse Point', symbol: 'PLSE', creator: 'GDYY1122XX...445C', creatorName: 'Pulse Guild' },
			{ name: 'Aetherial Key', symbol: 'AETHR', creator: 'GBXX8899WW...556D', creatorName: 'Aetherial' },
			{ name: 'Vanguard Pass', symbol: 'VPASS', creator: 'GCWW5566VV...667E', creatorName: 'Vanguard HQ' },
			{ name: 'Singularity Key', symbol: 'SING', creator: 'GAVV2233UU...778F', creatorName: 'Singularity DAO' },
			{ name: 'Infinity Node', symbol: 'INFT', creator: 'GDUU9900TT...889G', creatorName: 'Infinity Studio' },
			{ name: 'Krypton Alpha', symbol: 'KRP', creator: 'GBTT6677SS...990H', creatorName: 'Krypton Tech' },
			{ name: 'Oasis Network', symbol: 'OASIS', creator: 'GCSS3344RR...001J', creatorName: 'Oasis Labs' },
			{ name: 'Nexus Horizon', symbol: 'NXH', creator: 'GARR0011QQ...112K', creatorName: 'Nexus Foundation' },
			{ name: 'Valence Key', symbol: 'VLNC', creator: 'GDQQ7788PP...223L', creatorName: 'Valence Alpha' },
		];

		return baseKeys.map((item, index) => {
			const rank = index + 1;
			const id = `creator-key-${rank}`;
			let metricValue = 0;

			if (metric === 'volume') {
				// 120,000 down to 1,500 XLM
				metricValue = Math.round(120_000 * Math.pow(0.92, index) + 1500);
			} else if (metric === 'holders') {
				// 5,400 down to 42 holders
				metricValue = Math.round(5_400 * Math.pow(0.91, index) + 42);
			} else {
				// Reputation: 99.4 down to 54.0 score
				metricValue = Math.round((99.4 - index * 0.9) * 10) / 10;
			}

			// Varied 24h change percentages (positive, negative, flat)
			const changes = [
				14.5, -3.2, 28.4, 0.0, -8.7, 12.1, 5.4, -2.1, 19.8, -12.4,
				7.3, -1.5, 34.2, -6.8, 0.0, 9.4, -4.6, 16.2, 2.1, -15.3,
				11.8, -7.4, 4.3, 0.0, -3.9, 21.0, -9.1, 6.7, -1.8, 13.5,
				8.9, -5.2, 0.0, 17.3, -11.0, 3.8, -2.7, 24.6, -6.1, 5.9,
				10.4, -8.3, 1.2, 0.0, -4.5, 18.7, -13.2, 7.8, -3.4, 9.1
			];
			const change24h = changes[index % changes.length];
			const price = Math.round((45 * Math.pow(0.95, index) + 1.2) * 100) / 100;

			return {
				rank,
				id,
				name: item.name,
				symbol: item.symbol,
				thumbnail: `/avatars/key-${(index % 8) + 1}.png`,
				creator: {
					address: item.creator,
					name: item.creatorName,
				},
				metricValue,
				change24h,
				price,
			};
		});
	}
}

export type LeaderboardMetric = 'volume' | 'holders' | 'reputation';

export interface KeyLeaderboardCreator {
	address: string;
	name?: string;
	avatarUrl?: string;
}

export interface KeyLeaderboardEntry {
	rank: number;
	id: string;
	name: string;
	symbol?: string;
	thumbnail?: string;
	creator: KeyLeaderboardCreator;
	metricValue: number;
	change24h: number;
	price?: number;
}

export interface RawKeyLeaderboardEntry {
	rank?: number;
	id?: string;
	keyId?: string;
	name?: string;
	title?: string;
	symbol?: string;
	thumbnail?: string;
	avatarUrl?: string;
	creator?:
		| {
				address?: string;
				name?: string;
				avatarUrl?: string;
		  }
		| string;
	creatorAddress?: string;
	creatorName?: string;
	creatorAvatar?: string;
	metricValue?: number | string;
	value?: number | string;
	volume?: number | string;
	volume24h?: number | string;
	holders?: number | string;
	holderCount?: number | string;
	reputation?: number | string;
	reputationScore?: number | string;
	change24h?: number | string;
	priceChange24h?: number | string;
	price?: number | string;
	currentPrice?: number | string;
}

export function normalizeKeyLeaderboardEntry(
	entry: RawKeyLeaderboardEntry,
	fallbackRank: number,
	metric: LeaderboardMetric = 'volume'
): KeyLeaderboardEntry {
	const id = entry.id || entry.keyId || `key-${fallbackRank}`;
	const name = entry.name || entry.title || `Key #${fallbackRank}`;
	const symbol = entry.symbol;
	const thumbnail = entry.thumbnail || entry.avatarUrl;

	let creatorAddress = '';
	let creatorName: string | undefined = entry.creatorName;
	let creatorAvatar: string | undefined = entry.creatorAvatar;

	if (typeof entry.creator === 'object' && entry.creator !== null) {
		creatorAddress = entry.creator.address || entry.creatorAddress || '';
		creatorName = entry.creator.name || creatorName;
		creatorAvatar = entry.creator.avatarUrl || creatorAvatar;
	} else if (typeof entry.creator === 'string') {
		creatorAddress = entry.creator;
	} else if (entry.creatorAddress) {
		creatorAddress = entry.creatorAddress;
	}

	let metricValue = 0;
	if (metric === 'volume') {
		metricValue = Number(
			entry.volume24h ?? entry.volume ?? entry.metricValue ?? entry.value ?? 0
		);
	} else if (metric === 'holders') {
		metricValue = Number(
			entry.holderCount ?? entry.holders ?? entry.metricValue ?? entry.value ?? 0
		);
	} else if (metric === 'reputation') {
		metricValue = Number(
			entry.reputationScore ??
				entry.reputation ??
				entry.metricValue ??
				entry.value ??
				0
		);
	}

	const change24h = Number(entry.change24h ?? entry.priceChange24h ?? 0);
	const price =
		entry.price !== undefined
			? Number(entry.price)
			: entry.currentPrice !== undefined
				? Number(entry.currentPrice)
				: undefined;

	return {
		rank: entry.rank ?? fallbackRank,
		id,
		name,
		symbol,
		thumbnail,
		creator: {
			address: creatorAddress,
			name: creatorName,
			avatarUrl: creatorAvatar,
		},
		metricValue: Number.isFinite(metricValue) ? metricValue : 0,
		change24h: Number.isFinite(change24h) ? change24h : 0,
		price: price !== undefined && Number.isFinite(price) ? price : undefined,
	};
}

export const analyticsService = new AnalyticsService();

