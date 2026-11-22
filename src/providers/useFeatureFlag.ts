import { useContext } from 'react';
import { FeatureFlagContext } from './featureFlagContext';

export function useFeatureFlag(name: string): boolean {
	const context = useContext(FeatureFlagContext);
	if (!context) throw new Error('useFeatureFlag must be used within FeatureFlagProvider');
	return context.isEnabled(name);
}
