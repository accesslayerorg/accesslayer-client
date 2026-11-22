// src/services/curveMigration.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';
import type { CurveMigration } from '@/types/curveMigration';

/**
 * Curve migrations move faster than key profiles — a vote or a timelock can
 * land at any second — so the cache window is kept short.
 */
const CURVE_MIGRATION_CACHE_TTL = 15_000;

/** Cache key shared with the execute mutation's invalidation. */
export function curveMigrationCacheKey(keyId: string): string {
	return `curve_migrations_${keyId}`;
}

class CurveMigrationService extends BaseApiService {
	/**
	 * Fetch every curve migration for a creator key, pending and executed.
	 * GET /curve-migrations?keyId=:id
	 */
	async getMigrations(keyId: string): Promise<CurveMigration[]> {
		const cacheKey = curveMigrationCacheKey(keyId);
		const cached = cacheManager.get<CurveMigration[]>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<CurveMigration[]>>(
				'/curve-migrations',
				{ params: { keyId } }
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, CURVE_MIGRATION_CACHE_TTL);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Apply an approved, unlocked migration to the key's curve.
	 * POST /curve-migrations/:migrationId/execute
	 */
	async executeMigration(
		migrationId: string
	): Promise<{ transactionHash?: string | null }> {
		try {
			const response = await this.api.post<
				APIResponse<{ transactionHash?: string | null }>
			>(`/curve-migrations/${migrationId}/execute`, {});

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const curveMigrationService = new CurveMigrationService();
