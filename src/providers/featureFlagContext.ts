import { createContext } from 'react';

interface FeatureFlagContextValue {
	isEnabled: (name: string) => boolean;
}

export const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);
