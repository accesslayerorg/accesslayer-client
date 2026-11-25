import { BaseApiService, type APIResponse } from './api.service';
import type {
	KeyRating,
	KeyRatingDistribution,
	KeyRatingSummary,
	KeyRatingsPage,
	SubmitKeyRatingInput,
} from '@/types/keyRating';

type RawRating = Record<string, unknown>;

function toNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function toString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeDistribution(raw: unknown): KeyRatingDistribution {
	const source =
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const get = (key: number) =>
		Math.max(0, Math.round(toNumber(source[String(key)] ?? source[key]) ?? 0));
	return {
		1: get(1),
		2: get(2),
		3: get(3),
		4: get(4),
		5: get(5),
	};
}

export function normalizeKeyRating(raw: RawRating, keyId: string): KeyRating | null {
	const walletAddress = toString(raw.walletAddress ?? raw.wallet ?? raw.address);
	const rating = toNumber(raw.rating ?? raw.stars ?? raw.score);
	if (!walletAddress || rating == null) return null;

	const normalizedRating = Math.min(5, Math.max(1, Math.round(rating)));
	const id =
		toString(raw.id ?? raw.ratingId) ??
		`${keyId}:${walletAddress.toLowerCase()}`;

	return {
		id,
		keyId: toString(raw.keyId ?? raw.creatorId) ?? keyId,
		walletAddress,
		rating: normalizedRating,
		review: toString(raw.review ?? raw.comment ?? raw.text),
		createdAt:
			toString(raw.createdAt ?? raw.created_at ?? raw.timestamp) ??
			new Date(0).toISOString(),
		updatedAt: toString(raw.updatedAt ?? raw.updated_at),
	};
}

export function normalizeKeyRatingSummary(raw: unknown): KeyRatingSummary | null {
	if (!raw || typeof raw !== 'object') return null;
	const source = raw as Record<string, unknown>;
	const distribution = normalizeDistribution(
		source.distribution ?? source.ratingDistribution ?? source.stars
	);
	const totalRatings = Math.max(
		0,
		Math.round(
			toNumber(
				source.totalRatings ??
					source.reviewCount ??
					source.total ??
					source.count
			) ??
				Object.values(distribution).reduce((sum, value) => sum + value, 0)
		)
	);
	const averageRatingRaw = toNumber(
		source.averageRating ?? source.average ?? source.avgRating ?? source.rating
	);
	const averageRating =
		averageRatingRaw == null
			? totalRatings > 0
				? Object.entries(distribution).reduce(
						(sum, [star, count]) => sum + Number(star) * count,
						0
					) / totalRatings
				: 0
			: Math.min(5, Math.max(0, averageRatingRaw));

	return {
		averageRating,
		totalRatings,
		distribution,
	};
}

function extractRatingsPage(data: unknown, keyId: string): KeyRatingsPage {
	const source =
		data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
	const rawRatings = Array.isArray(data)
		? data
		: Array.isArray(source.ratings)
			? source.ratings
			: Array.isArray(source.reviews)
				? source.reviews
				: Array.isArray(source.items)
					? source.items
					: Array.isArray(source.data)
						? source.data
						: [];

	const ratings = rawRatings
		.map(item => normalizeKeyRating(item as RawRating, keyId))
		.filter((item): item is KeyRating => item !== null);

	const nextCursor =
		toString(source.nextCursor ?? source.next_cursor ?? source.cursor) ?? null;
	const summary = normalizeKeyRatingSummary(
		source.summary ?? source.aggregate ?? source.stats ?? source
	);

	return { ratings, nextCursor, summary };
}

class KeyRatingService extends BaseApiService {
	async getRatingsPage(
		keyId: string,
		cursor?: string | null
	): Promise<KeyRatingsPage> {
		try {
			const params: Record<string, string> = {};
			if (cursor) params.cursor = cursor;
			const response = await this.api.get<APIResponse<unknown>>(
				`/keys/${keyId}/ratings`,
				{ params }
			);
			return extractRatingsPage(response.data.data, keyId);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async submitRating(input: SubmitKeyRatingInput): Promise<KeyRating> {
		try {
			const response = await this.api.post<APIResponse<unknown>>(
				`/keys/${input.keyId}/ratings`,
				{
					rating: input.rating,
					review: input.review?.trim() || undefined,
					walletAddress: input.walletAddress,
				}
			);
			const normalized = normalizeKeyRating(
				(response.data.data ?? {}) as RawRating,
				input.keyId
			);
			if (normalized) return normalized;
			return {
				id: `${input.keyId}:${input.walletAddress.toLowerCase()}`,
				keyId: input.keyId,
				walletAddress: input.walletAddress,
				rating: input.rating,
				review: input.review?.trim() || null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyRatingService = new KeyRatingService();
