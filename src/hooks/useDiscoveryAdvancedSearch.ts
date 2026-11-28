import { useCallback, useEffect, useMemo, useState } from 'react';
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

export const MAX_SAVED_VIEWS = 20;
export const MAX_SAVED_VIEW_NAME_LENGTH = 40;
const SAVED_VIEWS_STORAGE_KEY = 'discovery:saved-views';

export interface SavedViewSort {
	field: string;
	direction: 'asc' | 'desc';
}

export interface SavedView {
	id: string;
	name: string;
	filters: DiscoveryFilters;
	sort: SavedViewSort;
}

export interface UseSavedViewsParams {
	/** Current filters/sort so the hook can flag unsaved changes. */
	currentFilters: DiscoveryFilters;
	currentSort: SavedViewSort;
	/** When true, views are synced to the backend instead of only localStorage. */
	isSignedIn?: boolean;
	/** Optional backend sync adapter; defaults to `api.service`. */
	syncAdapter?: SavedViewsSyncAdapter;
}

export interface SavedViewsSyncAdapter {
	list: () => Promise<SavedView[]>;
	create: (view: SavedView) => Promise<SavedView>;
	update: (view: SavedView) => Promise<SavedView>;
	remove: (id: string) => Promise<void>;
}

export type SaveViewResult =
	| { ok: true; view: SavedView }
	| { ok: false; reason: 'empty-name' | 'name-too-long' | 'duplicate-name' | 'limit-reached'; message: string };

function readStoredViews(): SavedView[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
	} catch {
		return [];
	}
}

function writeStoredViews(views: SavedView[]): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
	} catch {
		// Storage may be unavailable (private mode/quota); views stay in memory.
	}
}

function createViewId(): string {
	return `view_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeName(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * Manages named discovery filter presets (#1401): saving the current filters
 * and sort order, applying, renaming and deleting them. Views persist to
 * localStorage as a fallback and sync to the backend when signed in.
 */
export function useSavedViews({
	currentFilters,
	currentSort,
	isSignedIn = false,
	syncAdapter,
}: UseSavedViewsParams = {
	currentFilters: {} as DiscoveryFilters,
	currentSort: { field: 'volume', direction: 'desc' },
}) {
	const [views, setViews] = useState<SavedView[]>(() => readStoredViews());
	const [appliedViewId, setAppliedViewId] = useState<string | null>(null);

	const persist = useCallback(
		(next: SavedView[]) => {
			setViews(next);
			writeStoredViews(next);
		},
		[]
	);

	useEffect(() => {
		if (!isSignedIn || !syncAdapter) return;
		let cancelled = false;
		void syncAdapter
			.list()
			.then(remote => {
				if (cancelled) return;
				persist(remote.slice(0, MAX_SAVED_VIEWS));
			})
			.catch(() => {
				// Fall back to whatever is already stored locally.
			});
		return () => {
			cancelled = true;
		};
	}, [isSignedIn, syncAdapter, persist]);

	const save = useCallback(
		(name: string): SaveViewResult => {
			const trimmed = name.trim();
			if (!trimmed) {
				return {
					ok: false,
					reason: 'empty-name',
					message: 'Enter a name for this view.',
				};
			}
			if (trimmed.length > MAX_SAVED_VIEW_NAME_LENGTH) {
				return {
					ok: false,
					reason: 'name-too-long',
					message: `View names must be ${MAX_SAVED_VIEW_NAME_LENGTH} characters or fewer.`,
				};
			}
			if (views.some(view => normalizeName(view.name) === normalizeName(trimmed))) {
				return {
					ok: false,
					reason: 'duplicate-name',
					message: 'A view with this name already exists.',
				};
			}
			if (views.length >= MAX_SAVED_VIEWS) {
				return {
					ok: false,
					reason: 'limit-reached',
					message: `You can save up to ${MAX_SAVED_VIEWS} views. Delete one to save another.`,
				};
			}

			const view: SavedView = {
				id: createViewId(),
				name: trimmed,
				filters: { ...currentFilters },
				sort: { ...currentSort },
			};
			const next = [...views, view];
			persist(next);
			setAppliedViewId(view.id);

			if (isSignedIn && syncAdapter) {
				void syncAdapter.create(view).catch(() => {
					// Local copy remains the source of truth until the next sync.
				});
			}

			return { ok: true, view };
		},
		[views, currentFilters, currentSort, persist, isSignedIn, syncAdapter]
	);

	const apply = useCallback(
		(id: string): SavedView | null => {
			const view = views.find(candidate => candidate.id === id);
			if (!view) return null;
			setAppliedViewId(view.id);
			return view;
		},
		[views]
	);

	const rename = useCallback(
		(id: string, name: string): SaveViewResult => {
			const trimmed = name.trim();
			if (!trimmed) {
				return {
					ok: false,
					reason: 'empty-name',
					message: 'Enter a name for this view.',
				};
			}
			if (trimmed.length > MAX_SAVED_VIEW_NAME_LENGTH) {
				return {
					ok: false,
					reason: 'name-too-long',
					message: `View names must be ${MAX_SAVED_VIEW_NAME_LENGTH} characters or fewer.`,
				};
			}
			if (
				views.some(
					view =>
						view.id !== id && normalizeName(view.name) === normalizeName(trimmed)
				)
			) {
				return {
					ok: false,
					reason: 'duplicate-name',
					message: 'A view with this name already exists.',
				};
			}

			const existing = views.find(view => view.id === id);
			if (!existing) {
				return {
					ok: false,
					reason: 'empty-name',
					message: 'This view no longer exists.',
				};
			}

			const updated: SavedView = { ...existing, name: trimmed };
			persist(views.map(view => (view.id === id ? updated : view)));

			if (isSignedIn && syncAdapter) {
				void syncAdapter.update(updated).catch(() => {
					// Local copy remains the source of truth until the next sync.
				});
			}

			return { ok: true, view: updated };
		},
		[views, persist, isSignedIn, syncAdapter]
	);

	const remove = useCallback(
		(id: string) => {
			persist(views.filter(view => view.id !== id));
			setAppliedViewId(previous => (previous === id ? null : previous));

			if (isSignedIn && syncAdapter) {
				void syncAdapter.remove(id).catch(() => {
					// Local copy remains the source of truth until the next sync.
				});
			}
		},
		[views, persist, isSignedIn, syncAdapter]
	);

	const appliedView = useMemo(
		() => views.find(view => view.id === appliedViewId) ?? null,
		[views, appliedViewId]
	);

	const isModified = useMemo(() => {
		if (!appliedView) return false;
		return (
			JSON.stringify(appliedView.filters) !== JSON.stringify(currentFilters) ||
			JSON.stringify(appliedView.sort) !== JSON.stringify(currentSort)
		);
	}, [appliedView, currentFilters, currentSort]);

	return {
		views,
		appliedView,
		isModified,
		canSaveMore: views.length < MAX_SAVED_VIEWS,
		save,
		apply,
		rename,
		delete: remove,
		saveView: (input: string | { name: string; filters?: DiscoveryFilters }) => {
			const name = typeof input === 'string' ? input : input.name;
			const result = save(name);
			return result.ok ? result.view : null;
		},
		renameView: rename,
		deleteView: remove,
	};
}
