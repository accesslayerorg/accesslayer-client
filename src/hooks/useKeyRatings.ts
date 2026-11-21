import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
	type InfiniteData,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { keyRatingService } from '@/services/keyRating.service';
import { creatorKeysContractService } from '@/services/creatorKeysContract.service';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import type {
	KeyRating,
	KeyRatingSummary,
	KeyRatingsPage,
	SubmitKeyRatingInput,
} from '@/types/keyRating';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

const MAX_REVIEW_LENGTH = 280;

export function getReviewCharacterCount(review: string): number {
	return Array.from(review).length;
}

function clampRating(rating: number): number {
	return Math.min(5, Math.max(1, Math.round(rating)));
}

function emptyDistribution() {
	return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as const;
}

export function buildRatingSummary(ratings: KeyRating[]): KeyRatingSummary {
	const distribution = { ...emptyDistribution() } as Record<1 | 2 | 3 | 4 | 5, number>;
	let total = 0;
	ratings.forEach(rating => {
		const star = clampRating(rating.rating) as 1 | 2 | 3 | 4 | 5;
		distribution[star] += 1;
		total += star;
	});
	const totalRatings = ratings.length;
	return {
		averageRating: totalRatings > 0 ? total / totalRatings : 0,
		totalRatings,
		distribution,
	};
}

function mergeSummary(
	existing: KeyRatingSummary | null | undefined,
	ratings: KeyRating[]
): KeyRatingSummary {
	if (ratings.length > 0) return buildRatingSummary(ratings);
	return (
		existing ?? {
			averageRating: 0,
			totalRatings: 0,
			distribution: { ...emptyDistribution() },
		}
	);
}

export function useKeyRatings(keyId: string) {
	const query = useInfiniteQuery({
		queryKey: queryKeys.creators.ratings(keyId),
		queryFn: ({ pageParam }) =>
			keyRatingService.getRatingsPage(keyId, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor,
		enabled: Boolean(keyId),
	});

	const ratings = useMemo<KeyRating[]>(() => {
		const seen = new Set<string>();
		const result: KeyRating[] = [];
		for (const page of query.data?.pages ?? []) {
			for (const rating of page.ratings) {
				const dedupeKey = rating.walletAddress.toLowerCase();
				if (seen.has(dedupeKey)) continue;
				seen.add(dedupeKey);
				result.push(rating);
			}
		}
		return result;
	}, [query.data]);

	const summary = useMemo<KeyRatingSummary>(() => {
		const serverSummary = query.data?.pages?.[0]?.summary;
		return mergeSummary(serverSummary, ratings);
	}, [query.data?.pages, ratings]);

	return {
		...query,
		ratings,
		summary,
	};
}

interface SubmitRatingVariables {
	rating: number;
	review?: string;
}

export function useSubmitKeyRatingMutation(
	keyId: string,
	walletAddress?: string | null
) {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.creators.ratings(keyId);

	return useMutation({
		mutationKey: ['contract', 'submit_rating', keyId, walletAddress ?? ''],
		mutationFn: async ({ rating, review }: SubmitRatingVariables) => {
			if (!walletAddress) {
				throw new Error('Connect your wallet to submit a rating.');
			}
			const trimmedReview = review?.trim();
			if (getReviewCharacterCount(trimmedReview ?? '') > MAX_REVIEW_LENGTH) {
				throw new Error(`Review must be ${MAX_REVIEW_LENGTH} characters or less.`);
			}

			const normalizedRating = clampRating(rating);

			// Contract call first so optimistic UI is rolled back on failure.
			if (typeof creatorKeysContractService.submit_rating === 'function') {
				await creatorKeysContractService.submit_rating({
					keyId,
					rating: normalizedRating,
					review: trimmedReview,
				});
			} else if (
				typeof (creatorKeysContractService as any).submitRating === 'function'
			) {
				await (creatorKeysContractService as any).submitRating({
					keyId,
					rating: normalizedRating,
					review: trimmedReview,
				});
			}

			await submitCreatorContractCall('submit_rating', {
				keyId,
				rating: normalizedRating,
				review: trimmedReview,
				walletAddress,
			});

			return keyRatingService.submitRating({
				keyId,
				walletAddress,
				rating: normalizedRating,
				review: trimmedReview,
			});
		},
		onMutate: async ({ rating, review }) => {
			if (!walletAddress) return { previous: undefined as InfiniteData<KeyRatingsPage> | undefined };
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<InfiniteData<KeyRatingsPage>>(queryKey);
			const now = new Date().toISOString();
			const trimmedReview = review?.trim() || null;
			const normalizedRating = clampRating(rating);
			const optimistic: KeyRating = {
				id: `optimistic:${keyId}:${walletAddress.toLowerCase()}`,
				keyId,
				walletAddress,
				rating: normalizedRating,
				review: trimmedReview,
				createdAt: now,
				updatedAt: now,
			};

			queryClient.setQueryData<InfiniteData<KeyRatingsPage>>(queryKey, old => {
				const base: InfiniteData<KeyRatingsPage> =
					old ?? { pages: [{ ratings: [], nextCursor: null, summary: null }], pageParams: [null] };

				let replaced = false;
				const pages = base.pages.map(page => {
					const existingIndex = page.ratings.findIndex(
						r => r.walletAddress.toLowerCase() === walletAddress.toLowerCase()
					);
					if (existingIndex === -1) return page;
					replaced = true;
					const nextRatings = page.ratings.slice();
					const existing = nextRatings[existingIndex];
					nextRatings[existingIndex] = {
						...existing,
						...optimistic,
						id: existing.id,
						createdAt: existing.createdAt,
					};
					return { ...page, ratings: nextRatings };
				});

				if (!replaced) {
					pages[0] = {
						...pages[0],
						ratings: [optimistic, ...pages[0].ratings],
					};
				}

				const allRatings = pages.flatMap(p => p.ratings);
				const summary = buildRatingSummary(allRatings);
				return {
					...base,
					pages: pages.map((page, idx) =>
						idx === 0 ? { ...page, summary } : page
					),
				};
			});

			return { previous };
		},
		onError: (error, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			showToast.success('Rating submitted');
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey });
			void queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.ratings() });
		},
	});
}

export const KEY_RATING_REVIEW_MAX_LENGTH = MAX_REVIEW_LENGTH;
