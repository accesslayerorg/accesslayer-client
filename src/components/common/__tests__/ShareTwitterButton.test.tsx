import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareTwitterButton from '../ShareTwitterButton';
import {
	buildShareTweetText,
	buildTwitterIntentUrl,
} from '@/utils/shareTwitter.utils';

describe('ShareTwitterButton helpers', () => {
	it('builds pre-filled tweet text correctly', () => {
		const tweet = buildShareTweetText(
			'Alex Rivers',
			'0.05',
			'https://accesslayer.app/creator/creator-123?ref=G123'
		);
		expect(tweet).toBe(
			'Just bought Alex Rivers keys on AccessLayer at 0.05 XLM. Buy here: https://accesslayer.app/creator/creator-123?ref=G123'
		);
	});

	it('builds Twitter intent URL with URI encoding', () => {
		const text = 'Just bought Alex Rivers keys on AccessLayer at 0.05 XLM. Buy here: https://accesslayer.app/creator/creator-123';
		const intentUrl = buildTwitterIntentUrl(text);
		expect(intentUrl).toContain('https://twitter.com/intent/tweet?text=');
		expect(intentUrl).toContain(encodeURIComponent(text));
	});
});

describe('ShareTwitterButton Component', () => {
	const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not render button when user is unauthenticated', () => {
		render(
			<ShareTwitterButton
				creatorId="creator-123"
				creatorName="Alex Rivers"
				priceXlm="0.05"
				userAddress={null}
				userHoldingsCount={5}
			/>
		);

		expect(
			screen.queryByTestId('share-twitter-button')
		).not.toBeInTheDocument();
	});

	it('does not render button when user is authenticated but holds 0 keys', () => {
		render(
			<ShareTwitterButton
				creatorId="creator-123"
				creatorName="Alex Rivers"
				priceXlm="0.05"
				userAddress="GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7"
				userHoldingsCount={0}
			/>
		);

		expect(
			screen.queryByTestId('share-twitter-button')
		).not.toBeInTheDocument();
	});

	it('renders Share to X button when user is authenticated and holds at least 1 key', () => {
		render(
			<ShareTwitterButton
				creatorId="creator-123"
				creatorName="Alex Rivers"
				priceXlm="0.05"
				userAddress="GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7"
				userHoldingsCount={1}
			/>
		);

		const btn = screen.getByTestId('share-twitter-button');
		expect(btn).toBeInTheDocument();
		expect(btn).toHaveTextContent('Share to X');
	});

	it('opens Twitter intent URL in a new tab with referral link when clicked', async () => {
		const user = userEvent.setup();
		const userAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7';

		render(
			<ShareTwitterButton
				creatorId="creator-123"
				creatorName="Alex Rivers"
				priceXlm="0.05"
				userAddress={userAddress}
				userHoldingsCount={3}
			/>
		);

		const btn = screen.getByTestId('share-twitter-button');
		await user.click(btn);

		expect(openSpy).toHaveBeenCalledTimes(1);
		const openedUrl = openSpy.mock.calls[0][0] as string;
		const target = openSpy.mock.calls[0][1];

		expect(target).toBe('_blank');
		expect(openedUrl).toContain('https://twitter.com/intent/tweet?text=');
		expect(decodeURIComponent(openedUrl)).toContain(
			'Just bought Alex Rivers keys on AccessLayer at 0.05 XLM. Buy here:'
		);
		expect(decodeURIComponent(openedUrl)).toContain(`ref=${userAddress}`);
	});
});
