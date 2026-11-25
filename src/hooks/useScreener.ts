import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { courseService, type Course } from '@/services/course.service';

/** Supported screener metrics. */
export type ScreenerMetric =
	| 'price'
	| 'change_24h'
	| 'volume'
	| 'holder_count'
	| 'top10_share'
	| 'age_days'
	| 'royalty_rate';

/** Supported comparison operators. */
export type ScreenerOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export interface ScreenerRule {
	id: string;
	metric: ScreenerMetric;
	operator: ScreenerOperator;
	value: number | '';
}

export interface SavedScreen {
	id: string;
	name: string;
	rules: ScreenerRule[];
	sort: ScreenerSortKey;
	savedAt: string;
}

export type ScreenerSortKey = ScreenerMetric | 'name';

const SCREENS_STORAGE_KEY = 'accesslayer:screener-saved-screens';
const PAGE_SIZE = 20;

function loadSavedScreens(): SavedScreen[] {
	try {
		const raw = localStorage.getItem(SCREENS_STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as SavedScreen[];
	} catch {
		return [];
	}
}

function persistScreens(screens: SavedScreen[]): void {
	try {
		localStorage.setItem(SCREENS_STORAGE_KEY, JSON.stringify(screens));
	} catch {
		// Storage unavailable — silent degradation.
	}
}

function resolveMetricValue(creator: Course, metric: ScreenerMetric): number {
	switch (metric) {
		case 'price':
			return creator.priceStroops ?? creator.price ?? 0;
		case 'change_24h':
			return creator.priceChange24h ?? 0;
		case 'volume':
			return creator.volume24h ?? 0;
		case 'holder_count':
			return creator.holderCount ?? 0;
		case 'top10_share':
			return creator.top10HolderShare ?? 0;
		case 'age_days': {
			const dateStr = creator.createdAt ?? creator.joinedAt;
			if (!dateStr) return 0;
			const ms = Date.now() - new Date(dateStr).getTime();
			return ms / 86_400_000;
		}
		case 'royalty_rate':
			return creator.royaltyBps != null ? creator.royaltyBps / 100 : 0;
		default:
			return 0;
	}
}

function applyOperator(actual: number, operator: ScreenerOperator, threshold: number): boolean {
	switch (operator) {
		case 'gt': return actual > threshold;
		case 'gte': return actual >= threshold;
		case 'lt': return actual < threshold;
		case 'lte': return actual <= threshold;
		case 'eq': return actual === threshold;
		default: return true;
	}
}

/** Validates rules and returns a map of rule id → error message. */
export function validateRules(rules: ScreenerRule[]): Map<string, string> {
	const errors = new Map<string, string>();

	for (const rule of rules) {
		if (rule.value === '' || rule.value == null) {
			errors.set(rule.id, 'Enter a value.');
			continue;
		}
		if (Number.isNaN(Number(rule.value))) {
			errors.set(rule.id, 'Must be a number.');
		}
	}

	// Check for contradictory rules: same metric with conflicting bounds.
	const byMetric = new Map<ScreenerMetric, ScreenerRule[]>();
	for (const rule of rules) {
		const existing = byMetric.get(rule.metric) ?? [];
		byMetric.set(rule.metric, [...existing, rule]);
	}

	for (const [, group] of byMetric) {
		const lowers = group.filter(r => r.operator === 'gt' || r.operator === 'gte');
		const uppers = group.filter(r => r.operator === 'lt' || r.operator === 'lte');
		for (const lower of lowers) {
			for (const upper of uppers) {
				if (Number(lower.value) >= Number(upper.value)) {
					errors.set(lower.id, 'Contradictory rule: lower bound ≥ upper bound.');
					errors.set(upper.id, 'Contradictory rule: upper bound ≤ lower bound.');
				}
			}
		}
	}

	return errors;
}

/**
 * Hook for the advanced key screener (#1454).
 *
 * Evaluates composable filter rules client-side over the full creator list,
 * returns paginated results with a total match count, and persists saved
 * screens to localStorage.
 */
export function useScreener(rules: ScreenerRule[], sort: ScreenerSortKey) {
	const [page, setPage] = useState(0);
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

	const { data: allCreators = [], isLoading, error } = useQuery({
		queryKey: ['screener', 'all-creators'],
		queryFn: () => courseService.getCourses({}),
		staleTime: 60_000,
	});

	const errors = useMemo(() => validateRules(rules), [rules]);
	const hasErrors = errors.size > 0;

	const validRules = useMemo(
		() => rules.filter(r => r.value !== '' && !errors.has(r.id)),
		[rules, errors]
	);

	const matches = useMemo(() => {
		if (!allCreators.length) return [];

		const filtered = allCreators.filter(creator =>
			validRules.every(rule =>
				applyOperator(
					resolveMetricValue(creator, rule.metric),
					rule.operator,
					Number(rule.value)
				)
			)
		);

		return filtered.sort((a, b) => {
			const aVal =
				sort === 'name'
					? (a.title ?? '').localeCompare(b.title ?? '')
					: resolveMetricValue(a, sort as ScreenerMetric) -
					  resolveMetricValue(b, sort as ScreenerMetric);
			const bVal = sort === 'name' ? -aVal : 0;
			if (sort === 'name') return sortDirection === 'asc' ? aVal : -aVal;
			const diff =
				resolveMetricValue(a, sort as ScreenerMetric) -
				resolveMetricValue(b, sort as ScreenerMetric);
			return sortDirection === 'asc' ? diff : -diff;
			void aVal; void bVal;
		});
	}, [allCreators, validRules, sort, sortDirection]);

	const totalMatchCount = matches.length;
	const pageStart = page * PAGE_SIZE;
	const pageResults = matches.slice(pageStart, pageStart + PAGE_SIZE);
	const hasNextPage = pageStart + PAGE_SIZE < totalMatchCount;
	const hasPrevPage = page > 0;

	// Saved screens
	const [savedScreens, setSavedScreens] = useState<SavedScreen[]>(() =>
		loadSavedScreens()
	);

	const saveScreen = useCallback(
		(name: string) => {
			const screen: SavedScreen = {
				id: `${Date.now()}`,
				name,
				rules,
				sort,
				savedAt: new Date().toISOString(),
			};
			const updated = [...savedScreens.filter(s => s.name !== name), screen];
			setSavedScreens(updated);
			persistScreens(updated);
			return screen;
		},
		[rules, sort, savedScreens]
	);

	const deleteScreen = useCallback(
		(id: string) => {
			const updated = savedScreens.filter(s => s.id !== id);
			setSavedScreens(updated);
			persistScreens(updated);
		},
		[savedScreens]
	);

	const toggleSortDirection = useCallback(
		() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc')),
		[]
	);

	return {
		results: pageResults,
		totalMatchCount,
		isLoading,
		error,
		errors,
		hasErrors,
		page,
		hasNextPage,
		hasPrevPage,
		nextPage: () => setPage(p => p + 1),
		prevPage: () => setPage(p => Math.max(0, p - 1)),
		sortDirection,
		toggleSortDirection,
		savedScreens,
		saveScreen,
		deleteScreen,
	};
}
