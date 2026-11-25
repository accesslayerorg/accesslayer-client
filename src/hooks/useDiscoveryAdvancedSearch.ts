import { useEffect, useMemo, useState } from 'react';
import type { Course } from '@/services/course.service';
import { keyReputationService } from '@/services/keyReputation.service';
import {
	filterDiscoveryKeys,
	type DiscoveryFilters,
} from '@/utils/advancedSearch.utils';

export interface UseDiscoveryAdvancedSearchParams {
	trendingKeys: Course[];
	newListings: Course[];
	filters: DiscoveryFilters;
}

/**
 * Applies the discovery page's advanced search filters to the loaded trending
 * and new-listing keys (#1260).
 *
 * Reputation scores are not part of the listing payload, so when a minimum
 * reputation is selected the scores for the candidate keys are fetched once
 * and cached in local state for the lifetime of the page. Every other filter
 * is evaluated straight from the listing data.
 */
export function useDiscoveryAdvancedSearch({
	trendingKeys,
	newListings,
	filters,
}: UseDiscoveryAdvancedSearchParams) {
	const needsReputation = filters.minReputation != null;

	const candidateIds = useMemo(
		() =>
			Array.from(
				new Set([...trendingKeys, ...newListings].map(creator => creator.id))
			),
		[trendingKeys, newListings]
	);
	const candidateIdKey = candidateIds.join('|');

	const [reputationScores, setReputationScores] = useState<
		Record<string, number>
	>({});
	const [isLoadingReputation, setIsLoadingReputation] = useState(false);

	useEffect(() => {
		if (!needsReputation || candidateIds.length === 0) return;

		let cancelled = false;
		setIsLoadingReputation(true);

		void Promise.allSettled(
			candidateIds.map(keyId => keyReputationService.getKeyReputation(keyId))
		).then(results => {
			if (cancelled) return;

			const scores: Record<string, number> = {};
			results.forEach((result, index) => {
				if (
					result.status === 'fulfilled' &&
					Number.isFinite(result.value?.score)
				) {
					scores[candidateIds[index]] = result.value.score;
				}
			});

			setReputationScores(previous => ({ ...previous, ...scores }));
			setIsLoadingReputation(false);
		});

		return () => {
			cancelled = true;
		};
		// candidateIds is represented by its stable joined key so a background
		// refresh that returns the same keys does not refetch every score.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [needsReputation, candidateIdKey]);

	const filteredTrendingKeys = useMemo(
		() => filterDiscoveryKeys(trendingKeys, filters, reputationScores),
		[trendingKeys, filters, reputationScores]
	);

	const filteredNewListings = useMemo(
		() => filterDiscoveryKeys(newListings, filters, reputationScores),
		[newListings, filters, reputationScores]
	);

	return {
		trendingKeys: filteredTrendingKeys,
		newListings: filteredNewListings,
		isLoadingReputation: needsReputation && isLoadingReputation,
	};
}
