import { describe, expect, it } from 'vitest';
import { isFeatureEnabled, parseFeatureFlags } from '../featureFlags';

describe('feature flag rollout', () => {
	it('fails closed for disabled and malformed configuration', () => {
		expect(isFeatureEnabled(parseFeatureFlags('{"newTrade":{"enabled":false}}'), 'newTrade', 'user-1')).toBe(false);
		expect(parseFeatureFlags('{not-json}')).toEqual({});
	});

	it('keeps a subject in a deterministic rollout bucket', () => {
		const flags = { newTrade: { rolloutPercentage: 50 } };
		expect(isFeatureEnabled(flags, 'newTrade', 'user-1')).toBe(
			isFeatureEnabled(flags, 'newTrade', 'user-1')
		);
		expect(isFeatureEnabled({ newTrade: { rolloutPercentage: 100 } }, 'newTrade', 'user-1')).toBe(true);
		expect(isFeatureEnabled({ newTrade: { rolloutPercentage: 0 } }, 'newTrade', 'user-1')).toBe(false);
	});
});
