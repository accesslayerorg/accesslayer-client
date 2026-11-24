import { describe, expect, it } from 'vitest';
import {
	generateSvgBadge,
	buildBadgeUrl,
	buildWidgetIframeUrl,
	buildMarkdownSnippet,
	buildHtmlSnippet,
	buildIframeSnippet,
	isDomainAllowed,
	BADGE_CACHE_HEADERS,
} from '@/utils/embedGenerator.utils';

describe('EmbedGenerator Utilities (#1479)', () => {
	const baseConfig = {
		creatorKeyId: 'alice-key',
		creatorName: 'Alice Stellar',
		style: 'flat' as const,
		metric: 'price' as const,
		theme: 'dark' as const,
		width: 360,
		height: 180,
		allowedDomains: [],
	};

	describe('generateSvgBadge', () => {
		it('produces valid SVG XML with escaped values and requested style', () => {
			const svg = generateSvgBadge({
				label: 'Alice Key Price',
				value: '14.50 XLM',
				style: 'flat',
				theme: 'dark',
			});
			expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
			expect(svg).toContain('Alice Key Price');
			expect(svg).toContain('14.50 XLM');
			expect(svg).toContain('</svg>');
		});

		it('includes caching headers configuration', () => {
			expect(BADGE_CACHE_HEADERS['Content-Type']).toBe('image/svg+xml');
			expect(BADGE_CACHE_HEADERS['Cache-Control']).toContain('max-age=60');
		});
	});

	describe('Snippet Generation', () => {
		it('builds valid Markdown badge snippet', () => {
			const md = buildMarkdownSnippet(baseConfig);
			const expectedBadge = buildBadgeUrl(baseConfig);
			expect(md).toBe(`[![Alice Stellar Key price](${expectedBadge})](https://accesslayer.io/keys/alice-key)`);
		});

		it('builds valid HTML badge snippet', () => {
			const html = buildHtmlSnippet(baseConfig);
			const expectedBadge = buildBadgeUrl(baseConfig);
			expect(html).toContain(`<img src="${expectedBadge}"`);
			expect(html).toContain('href="https://accesslayer.io/keys/alice-key"');
		});

		it('builds valid iframe snippet with width, height, and allowlist', () => {
			const configWithAllow = { ...baseConfig, allowedDomains: ['example.com', '*.blog.org'] };
			const iframe = buildIframeSnippet(configWithAllow);
			const expectedUrl = buildWidgetIframeUrl(configWithAllow);
			expect(iframe).toContain(`<iframe src="${expectedUrl}"`);
			expect(iframe).toContain('width="360"');
			expect(iframe).toContain('height="180"');
			expect(expectedUrl).toContain('allow=example.com%2C*.blog.org');
		});
	});

	describe('isDomainAllowed', () => {
		it('allows all domains when allowlist is empty', () => {
			expect(isDomainAllowed('anything.com', [])).toBe(true);
		});

		it('enforces exact domain matches and wildcards when allowlist is present', () => {
			const allowlist = ['myblog.com', '*.mysite.io'];
			expect(isDomainAllowed('myblog.com', allowlist)).toBe(true);
			expect(isDomainAllowed('MYBLOG.COM', allowlist)).toBe(true);
			expect(isDomainAllowed('docs.mysite.io', allowlist)).toBe(true);
			expect(isDomainAllowed('mysite.io', allowlist)).toBe(true);
			expect(isDomainAllowed('evil.com', allowlist)).toBe(false);
			expect(isDomainAllowed('', allowlist)).toBe(false);
		});
	});
});
