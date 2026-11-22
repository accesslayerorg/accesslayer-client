import { useMemo, type ReactNode } from 'react';
import {
	isFeatureEnabled,
	parseFeatureFlags,
	type FeatureFlags,
} from './featureFlags';
import { FeatureFlagContext } from './featureFlagContext';

function defaultSubjectId(): string {
	if (typeof window === 'undefined') return 'anonymous';
	const storageKey = 'accesslayer-feature-subject';
	const stored = window.localStorage.getItem(storageKey);
	if (stored) return stored;
	const subject = window.crypto?.randomUUID?.() ?? `anonymous-${Date.now()}`;
	window.localStorage.setItem(storageKey, subject);
	return subject;
}

interface FeatureFlagProviderProps {
	children: ReactNode;
	flags?: FeatureFlags;
	subjectId?: string;
}

export function FeatureFlagProvider({ children, flags, subjectId }: FeatureFlagProviderProps) {
	const configuredFlags = flags ?? parseFeatureFlags(import.meta.env.VITE_FEATURE_FLAGS);
	const stableSubjectId = subjectId ?? defaultSubjectId();
	const value = useMemo(
		() => ({
			isEnabled: (name: string) => isFeatureEnabled(configuredFlags, name, stableSubjectId),
		}),
		[configuredFlags, stableSubjectId]
	);

	return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}
