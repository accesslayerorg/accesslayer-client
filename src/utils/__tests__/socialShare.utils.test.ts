import { describe, expect, it } from 'vitest';
import {
	buildSocialShareText,
	buildTelegramShareUrl,
	buildTwitterShareUrl,
} from '@/utils/socialShare.utils';

describe('buildSocialShareText (#1251)', () => {
	it('includes key name, price, and 24h change for a key share', () => {
		const text = buildSocialShareText({
			context: 'key',
			keyName: 'Luna Starlight',
			priceXlm: '0.25',
			change24h: 5.2,
			url: 'https://accesslayer.app/creator/creator-1',
		});
		expect(text).toContain('Luna Starlight');
		expect(text).toContain('0.25 XLM');
		expect(text).toContain('+5.2%');
		expect(text).toContain('https://accesslayer.app/creator/creator-1');
	});

	it('omits stats that are missing for a key share', () => {
		const text = buildSocialShareText({
			context: 'key',
			keyName: 'Luna Starlight',
			priceXlm: null,
			change24h: null,
			url: 'https://accesslayer.app/creator/creator-1',
		});
		expect(text).toBe(
			'Check out Luna Starlight on AccessLayer. https://accesslayer.app/creator/creator-1'
		);
	});

	it('includes badge name and criteria for a badge share', () => {
		const text = buildSocialShareText({
			context: 'badge',
			badgeName: 'Whale',
			criteria: 'Hold over 1000 keys',
			url: 'https://accesslayer.app/profile/wallet-1',
		});
		expect(text).toContain('Whale');
		expect(text).toContain('Hold over 1000 keys');
		expect(text).toContain('https://accesslayer.app/profile/wallet-1');
	});
});

describe('buildTwitterShareUrl / buildTelegramShareUrl (#1251)', () => {
	it('builds a Twitter intent URL with the text and link encoded', () => {
		const url = buildTwitterShareUrl('hello world', 'https://example.com');
		expect(url).toContain('https://twitter.com/intent/tweet?');
		expect(url).toContain('text=hello+world');
		expect(url).toContain('url=https%3A%2F%2Fexample.com');
	});

	it('builds a Telegram share URL with the link and text encoded', () => {
		const url = buildTelegramShareUrl('hello world', 'https://example.com');
		expect(url).toContain('https://t.me/share/url?');
		expect(url).toContain('url=https%3A%2F%2Fexample.com');
		expect(url).toContain('text=hello+world');
	});
});
