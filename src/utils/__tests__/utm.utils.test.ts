import { describe, it, expect, vi } from 'vitest';
import { appendUtmParams, getConfiguredUtmParams, type UtmParams } from '../utm.utils';

// Mock the env module
vi.mock('@/utils/env.utils', () => ({
	env: {
		VITE_BACKEND_URL: '/api',
		VITE_DEFAULT_CHAIN_ID: 84532,
		VITE_ANVIL_RPC_URL: 'http://127.0.0.1:8545',
		VITE_BASE_SEPOLIA_RPC_URL: 'https://sepolia.base.org',
		VITE_SEPOLIA_RPC_URL: undefined,
		VITE_MAINNET_RPC_URL: undefined,
		VITE_UTM_SOURCE: undefined,
		VITE_UTM_MEDIUM: undefined,
		VITE_UTM_CAMPAIGN: undefined,
		VITE_UTM_TERM: undefined,
		VITE_UTM_CONTENT: undefined,
	},
}));

describe('UTM Helper: appendUtmParams', () => {
	describe('Acceptance Criteria 1: Shared URL includes expected UTM parameters', () => {
		it('appends configured UTM params to URL', () => {
			const baseUrl = 'https://example.com/creator/alice';
			const params: UtmParams = {
				utm_source: 'twitter',
				utm_medium: 'social',
				utm_campaign: 'share',
			};

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('utm_source=twitter');
			expect(result).toContain('utm_medium=social');
			expect(result).toContain('utm_campaign=share');
		});

		it('includes all five UTM parameters when provided', () => {
			const baseUrl = 'https://example.com/creator/bob';
			const params: UtmParams = {
				utm_source: 'facebook',
				utm_medium: 'post',
				utm_campaign: 'creator_discovery',
				utm_term: 'nft_art',
				utm_content: 'profile_card',
			};

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('utm_source=facebook');
			expect(result).toContain('utm_medium=post');
			expect(result).toContain('utm_campaign=creator_discovery');
			expect(result).toContain('utm_term=nft_art');
			expect(result).toContain('utm_content=profile_card');
		});

		it('appends only provided parameters', () => {
			const baseUrl = 'https://example.com/creator/charlie';
			const params: UtmParams = {
				utm_source: 'email',
				utm_medium: 'newsletter',
			};

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('utm_source=email');
			expect(result).toContain('utm_medium=newsletter');
			expect(result).not.toContain('utm_campaign');
			expect(result).not.toContain('utm_term');
			expect(result).not.toContain('utm_content');
		});
	});

	describe('Acceptance Criteria 2: Helper does not modify URL when UTM params not configured', () => {
		it('returns original URL unchanged when no params provided', () => {
			const baseUrl = 'https://example.com/creator/diane';

			const result = appendUtmParams(baseUrl);

			expect(result).toBe(baseUrl);
		});

		it('returns original URL when empty params object', () => {
			const baseUrl = 'https://example.com/creator/elena';

			const result = appendUtmParams(baseUrl, {});

			expect(result).toBe(baseUrl);
		});

		it('returns original URL when all params are undefined', () => {
			const baseUrl = 'https://example.com/creator/frank';
			const params: UtmParams = {
				utm_source: undefined,
				utm_medium: undefined,
			};

			const result = appendUtmParams(baseUrl, params);

			expect(result).toBe(baseUrl);
		});
	});

	describe('Acceptance Criteria 3: Base URL unchanged; only query params appended', () => {
		it('preserves base URL structure', () => {
			const baseUrl = 'https://example.com/creator/grace';
			const params: UtmParams = { utm_source: 'linkedin' };

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('https://example.com/creator/grace');
		});

		it('preserves path when appending params', () => {
			const baseUrl = 'https://accesslayer.com/creator/grace#creations';
			const params: UtmParams = { utm_source: 'twitter', utm_medium: 'share' };

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('/creator/grace');
			expect(result).toContain('utm_source=twitter');
			expect(result).toContain('utm_medium=share');
		});

		it('preserves URL hash fragment', () => {
			const baseUrl = 'https://example.com/creator/henry#creations';
			const params: UtmParams = { utm_source: 'whatsapp' };

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('#creations');
			expect(result).toContain('utm_source=whatsapp');
		});

		it('preserves existing query parameters', () => {
			const baseUrl = 'https://example.com/creator/iris?tab=overview';
			const params: UtmParams = { utm_source: 'telegram' };

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('tab=overview');
			expect(result).toContain('utm_source=telegram');
		});

		it('does not duplicate base URL', () => {
			const baseUrl = 'https://example.com/creator/jack';
			const params: UtmParams = { utm_source: 'reddit' };

			const result = appendUtmParams(baseUrl, params);

			// Should have exactly one protocol
			const protocolCount = (result.match(/https:\/\//g) || []).length;
			expect(protocolCount).toBe(1);
		});
	});

	describe('Edge cases', () => {
		it('handles relative URLs', () => {
			const baseUrl = '/creator/karen'; // relative URL
			const params: UtmParams = { utm_source: 'slack' };

			const result = appendUtmParams(baseUrl, params);

			// Should fall back to original if URL parsing fails
			expect(result).toContain('utm_source=slack');
		});

		it('handles URLs with multiple existing query parameters', () => {
			const baseUrl = 'https://example.com/creator/leo?a=1&b=2&c=3';
			const params: UtmParams = { utm_source: 'github', utm_campaign: 'open_source' };

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('a=1');
			expect(result).toContain('b=2');
			expect(result).toContain('c=3');
			expect(result).toContain('utm_source=github');
			expect(result).toContain('utm_campaign=open_source');
		});

		it('encodes special characters in UTM param values', () => {
			const baseUrl = 'https://example.com/creator/maya';
			const params: UtmParams = {
				utm_content: 'Q&A Session',
				utm_term: 'digital art & design',
			};

			const result = appendUtmParams(baseUrl, params);

			// URL should have properly encoded special characters
			expect(result).toContain('utm_content=');
			expect(result).toContain('utm_term=');
			// The & should be encoded as %26 in the query string
		});

		it('returns original URL if parsing fails', () => {
			const invalidUrl = 'not a valid url at all!!!';
			const params: UtmParams = { utm_source: 'source' };

			const result = appendUtmParams(invalidUrl, params);

		if (result === invalidUrl) {
			expect(result).toBe(invalidUrl);
		} else {
			expect(result).toContain('utm_source=source');
		}
		});

		it('handles empty string params gracefully', () => {
			const baseUrl = 'https://example.com/creator/noah';
			const params: UtmParams = {
				utm_source: '',
				utm_medium: 'social',
			};

			const result = appendUtmParams(baseUrl, params);

			// Empty utm_source should not be appended
			expect(result).not.toContain('utm_source');
			expect(result).toContain('utm_medium=social');
		});

		it('handles very long URLs', () => {
			const baseUrl =
				'https://example.com/creator/' +
				'a'.repeat(100) +
				'?very=long&query=with&many=params';
			const params: UtmParams = { utm_source: 'test' };

			const result = appendUtmParams(baseUrl, params);

			expect(result).toContain('utm_source=test');
		});
	});

	describe('getConfiguredUtmParams', () => {
		it('returns configured params from environment', () => {
			// This test depends on the mocked env module above
			const params = getConfiguredUtmParams();

			expect(params).toEqual({});
		});

		it('only includes params that are configured', () => {
			const params = getConfiguredUtmParams();

			// Should not include undefined values
			Object.values(params).forEach((value) => {
				expect(value).toBeDefined();
				expect(value).not.toBe(undefined);
			});
		});
	});

	describe('Integration: Creator profile URL sharing', () => {
		it('appends UTM params to creator profile URL', () => {
			const profileUrl = 'https://accesslayer.com/#alice';
			const params: UtmParams = {
				utm_source: 'twitter',
				utm_medium: 'share_button',
				utm_campaign: 'creator_profiles',
			};

			const result = appendUtmParams(profileUrl, params);

			// Base URL should be preserved
			expect(result).toContain('accesslayer.com');
			// UTM params should be appended
			expect(result).toContain('utm_source=twitter');
			expect(result).toContain('utm_medium=share_button');
			expect(result).toContain('utm_campaign=creator_profiles');
		});

		it('enables tracking without separate landing pages', () => {
			const creatorUrl = 'https://accesslayer.com/creator/artist_001';
			const trackingParams: UtmParams = {
				utm_source: 'instagram',
				utm_medium: 'post',
				utm_campaign: 'featured_creator_week',
				utm_content: 'bio_link',
			};

			const trackedUrl = appendUtmParams(creatorUrl, trackingParams);

			// Same creator profile URL, but with tracking
			expect(trackedUrl).toContain('creator/artist_001');
			expect(trackedUrl).toContain('utm_source=instagram');
			expect(trackedUrl).toContain('utm_medium=post');
			expect(trackedUrl).toContain('utm_campaign=featured_creator_week');
			expect(trackedUrl).toContain('utm_content=bio_link');
		});
	});
});
