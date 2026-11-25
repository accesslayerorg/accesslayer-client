import { BaseApiService } from './api.service';
import type {
	OracleHealthState,
	OracleSource,
	OracleStatus,
} from '@/types/oracle';

const DEFAULT_STALE_MS = 5 * 60 * 1000; // 5 minutes

class OracleService extends BaseApiService {
	private overrides: Map<string, Partial<OracleStatus>> = new Map();

	/**
	 * Reads oracle status (age, source, deviation, status) from the contract view / oracle gateway.
	 */
	async getOracleStatus(asset: string = 'XLM'): Promise<OracleStatus> {
		const normalizedAsset = asset.toUpperCase();
		const override = this.overrides.get(normalizedAsset);

		const now = Date.now();
		const defaultUpdatedAt = now - 35 * 1000; // 35 seconds ago

		const base: OracleStatus = {
			asset: normalizedAsset,
			priceStroops: 12500000,
			priceXlm: 1.25,
			source: 'primary',
			sourceName: 'Primary Oracle Feed',
			status: 'healthy',
			updatedAt: defaultUpdatedAt,
			ageMs: now - defaultUpdatedAt,
			deviationBps: 15,
			deviationPercent: 0.15,
			isStale: false,
			isFallback: false,
			maxStaleAgeMs: DEFAULT_STALE_MS,
		};

		if (override) {
			const merged = { ...base, ...override };
			const effectiveAge = now - merged.updatedAt;
			merged.ageMs = effectiveAge;
			merged.isStale = effectiveAge > merged.maxStaleAgeMs || merged.status === 'stale';
			merged.isFallback = merged.source === 'fallback' || merged.status === 'fallback';

			if (merged.isStale) {
				merged.status = 'stale';
			} else if (merged.isFallback) {
				merged.status = 'fallback';
				merged.source = 'fallback';
				merged.sourceName = merged.sourceName || 'Secondary Fallback Feed';
			} else {
				merged.status = 'healthy';
				merged.source = 'primary';
				merged.sourceName = merged.sourceName || 'Primary Oracle Feed';
			}

			return structuredClone(merged);
		}

		return structuredClone(base);
	}

	setMockStatus(
		asset: string,
		status: {
			status?: OracleHealthState;
			source?: OracleSource;
			sourceName?: string;
			priceXlm?: number;
			updatedAt?: number;
			deviationPercent?: number;
			maxStaleAgeMs?: number;
		}
	) {
		const normalizedAsset = asset.toUpperCase();
		this.overrides.set(normalizedAsset, status as Partial<OracleStatus>);
	}

	reset() {
		this.overrides.clear();
	}
}

export const oracleService = new OracleService();
