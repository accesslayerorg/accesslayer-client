import { describe, expect, it } from 'vitest';
import {
	buildKeyPurchaseTweetText,
	buildShareTweetText,
	buildTwitterIntentUrl,
} from '../shareTwitter.utils';
import { buildCreatorKeyReferralLink } from '../referral.utils';

describe('shareTwitter.utils (#1050)', () => {
	const referralLink = 'https://accesslayer.app/creator/creator-1?ref=G123';

	describe('buildKeyPurchaseTweetText', () => {
		it('includes key name, amount, and referral link', () => {
			const text = buildKeyPurchaseTweetText({
				creatorName: 'Alex Rivers',
				amount: 2,
				referralLink,
			});
			expect(text).toBe(
				'Just bought 2 Alex Rivers keys on AccessLayer! Buy here: https://accesslayer.app/creator/creator-1?ref=G123'
			);
		});

		it('formats singular "key" when amount is 1', () => {
			const text = buildKeyPurchaseTweetText({
				creatorName: 'Alex Rivers',
				amount: 1,
				referralLink,
			});
			expect(text).toBe(
				'Just bought 1 Alex Rivers key on AccessLayer! Buy here: https://accesslayer.app/creator/creator-1?ref=G123'
			);
		});

		it('includes price in XLM when price is provided', () => {
			const text = buildKeyPurchaseTweetText({
				creatorName: 'Alex Rivers',
				amount: 3,
				priceXlm: '0.05',
				referralLink,
			});
			expect(text).toBe(
				'Just bought 3 Alex Rivers keys on AccessLayer at 0.05 XLM. Buy here: https://accesslayer.app/creator/creator-1?ref=G123'
			);
		});

		it('falls back gracefully when amount is null/undefined', () => {
			const text = buildKeyPurchaseTweetText({
				creatorName: 'Alex Rivers',
				priceXlm: '0.05',
				referralLink,
			});
			expect(text).toBe(
				'Just bought Alex Rivers keys on AccessLayer at 0.05 XLM. Buy here: https://accesslayer.app/creator/creator-1?ref=G123'
			);
		});
	});

	describe('buildShareTweetText (backward compatibility)', () => {
		it('preserves existing signature without amount', () => {
			const text = buildShareTweetText('Alex Rivers', '0.05', referralLink);
			expect(text).toBe(
				'Just bought Alex Rivers keys on AccessLayer at 0.05 XLM. Buy here: https://accesslayer.app/creator/creator-1?ref=G123'
			);
		});

		it('supports optional amount parameter', () => {
			const text = buildShareTweetText('Alex Rivers', '0.05', referralLink, 4);
			expect(text).toBe(
				'Just bought 4 Alex Rivers keys on AccessLayer at 0.05 XLM. Buy here: https://accesslayer.app/creator/creator-1?ref=G123'
			);
		});
	});

	describe('buildTwitterIntentUrl', () => {
		it('generates properly URI-encoded twitter intent URL', () => {
			const tweet = 'Just bought 2 Alex Rivers keys on AccessLayer! Buy here: https://accesslayer.app';
			const url = buildTwitterIntentUrl(tweet);
			expect(url).toBe(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`);
		});
	});
});

describe('buildCreatorKeyReferralLink (#1050)', () => {
	it('builds referral URL with wallet param when wallet is provided', () => {
		const link = buildCreatorKeyReferralLink({
			creatorId: 'alex-rivers',
			wallet: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7',
			origin: 'https://accesslayer.app',
		});
		expect(link).toBe(
			'https://accesslayer.app/creator/alex-rivers?ref=GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7'
		);
	});

	it('returns plain creator URL when wallet is omitted or empty', () => {
		const link = buildCreatorKeyReferralLink({
			creatorId: 'alex-rivers',
			origin: 'https://accesslayer.app',
		});
		expect(link).toBe('https://accesslayer.app/creator/alex-rivers');
	});
});
