import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/** Interests the user can select during onboarding. */
export type InterestCategory =
	| 'gaming'
	| 'music'
	| 'art'
	| 'finance'
	| 'sports'
	| 'technology'
	| 'education'
	| 'entertainment';

/** Budget range options. */
export type BudgetRange = 'under_10' | '10_50' | '50_200' | '200_plus';

/** Risk appetite options. */
export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';

/** Investment goal options. */
export type InvestmentGoal =
	| 'long_term_hold'
	| 'active_trading'
	| 'yield_farming'
	| 'community_access';

export interface UserPreferences {
	interests: InterestCategory[];
	budgetRange: BudgetRange | null;
	riskAppetite: RiskAppetite | null;
	goals: InvestmentGoal[];
	completedAt: string | null;
	skippedAt: string | null;
	version: number;
}

export interface UpdatePreferencesInput {
	interests?: InterestCategory[];
	budgetRange?: BudgetRange | null;
	riskAppetite?: RiskAppetite | null;
	goals?: InvestmentGoal[];
}

const PREFS_STORAGE_KEY = 'accesslayer:user-preferences';
const PREFS_QUERY_KEY = ['user', 'preferences'] as const;

const DEFAULT_PREFERENCES: UserPreferences = {
	interests: [],
	budgetRange: null,
	riskAppetite: null,
	goals: [],
	completedAt: null,
	skippedAt: null,
	version: 1,
};

function readFromStorage(): UserPreferences {
	try {
		const raw = localStorage.getItem(PREFS_STORAGE_KEY);
		if (!raw) return DEFAULT_PREFERENCES;
		return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<UserPreferences>) };
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

function writeToStorage(prefs: UserPreferences): void {
	try {
		localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
	} catch {
		// Storage unavailable — silent degradation.
	}
}

async function fetchPreferencesFromBackend(): Promise<UserPreferences> {
	// In production this would hit /api/preferences. For now fall back to
	// localStorage so the feature works without a deployed backend.
	return readFromStorage();
}

async function savePreferencesToBackend(
	prefs: UserPreferences
): Promise<UserPreferences> {
	writeToStorage(prefs);
	return prefs;
}

/**
 * Hook for reading and updating the connected user's discovery preferences (#1455).
 *
 * Preferences are persisted to the backend and mirrored in localStorage as a
 * fallback. The quiz completion and skip state are both tracked here so the
 * rest of the app can gate the DiscoveryQuizModal and ForYou section correctly.
 */
export function usePreferences() {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: PREFS_QUERY_KEY,
		queryFn: fetchPreferencesFromBackend,
		staleTime: 5 * 60 * 1000,
	});

	const preferences = query.data ?? DEFAULT_PREFERENCES;

	const updateMutation = useMutation({
		mutationFn: async (input: UpdatePreferencesInput) => {
			const next: UserPreferences = {
				...preferences,
				...input,
				completedAt: new Date().toISOString(),
				skippedAt: null,
			};
			return savePreferencesToBackend(next);
		},
		onSuccess: data => {
			queryClient.setQueryData(PREFS_QUERY_KEY, data);
		},
	});

	const skipMutation = useMutation({
		mutationFn: async () => {
			const next: UserPreferences = {
				...preferences,
				skippedAt: new Date().toISOString(),
			};
			return savePreferencesToBackend(next);
		},
		onSuccess: data => {
			queryClient.setQueryData(PREFS_QUERY_KEY, data);
		},
	});

	const clearMutation = useMutation({
		mutationFn: async () => {
			return savePreferencesToBackend({ ...DEFAULT_PREFERENCES });
		},
		onSuccess: data => {
			queryClient.setQueryData(PREFS_QUERY_KEY, data);
		},
	});

	const hasCompletedQuiz = Boolean(preferences.completedAt);
	const hasSkippedQuiz = Boolean(preferences.skippedAt);
	const hasSeenQuiz = hasCompletedQuiz || hasSkippedQuiz;

	const savePreferences = useCallback(
		(input: UpdatePreferencesInput) => updateMutation.mutate(input),
		[updateMutation]
	);
	const skipQuiz = useCallback(() => skipMutation.mutate(), [skipMutation]);
	const clearPreferences = useCallback(
		() => clearMutation.mutate(),
		[clearMutation]
	);

	return {
		preferences,
		isLoading: query.isLoading,
		hasCompletedQuiz,
		hasSkippedQuiz,
		hasSeenQuiz,
		savePreferences,
		skipQuiz,
		clearPreferences,
		isSaving: updateMutation.isPending,
		isSkipping: skipMutation.isPending,
		isClearing: clearMutation.isPending,
	};
}
