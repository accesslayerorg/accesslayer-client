import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareModal from '../ShareModal';
import * as clipboardUtils from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe('ShareModal Component (#1050)', () => {
	const userAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYSFIZGK63PZZVVJAB7';
	const creatorId = 'creator-1';
	const creatorName = 'Alex Rivers';
	const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders share modal with pre-filled tweet, amount, and referral link', () => {
		render(
			<ShareModal
				open={true}
				onOpenChange={vi.fn()}
				creatorId={creatorId}
				creatorName={creatorName}
				amount={2}
				priceXlm="0.05"
				userAddress={userAddress}
			/>
		);

		expect(screen.getByTestId('share-modal')).toBeInTheDocument();
		expect(screen.getByTestId('share-modal-title')).toHaveTextContent('Share Your Purchase');
		expect(screen.getByText('2 Keys')).toBeInTheDocument();
		expect(screen.getByText('0.05 XLM')).toBeInTheDocument();

		const tweetText = screen.getByTestId('prefilled-tweet-text').textContent ?? '';
		expect(tweetText).toContain(creatorName);
		expect(tweetText).toContain('2');
		expect(tweetText).toContain(`ref=${userAddress}`);

		const referralInput = screen.getByTestId('share-modal-referral-input') as HTMLInputElement;
		expect(referralInput.value).toContain(`/creator/${creatorId}?ref=${userAddress}`);
	});

	it('formats singular key count when amount is 1', () => {
		render(
			<ShareModal
				open={true}
				onOpenChange={vi.fn()}
				creatorId={creatorId}
				creatorName={creatorName}
				amount={1}
				priceXlm="0.05"
				userAddress={userAddress}
			/>
		);

		expect(screen.getByText('1 Key')).toBeInTheDocument();
		const tweetText = screen.getByTestId('prefilled-tweet-text').textContent ?? '';
		expect(tweetText).toContain('Just bought 1 Alex Rivers key on AccessLayer');
	});

	it('opens Twitter intent URL with encoded tweet text when clicking Share on X', async () => {
		const user = userEvent.setup();

		render(
			<ShareModal
				open={true}
				onOpenChange={vi.fn()}
				creatorId={creatorId}
				creatorName={creatorName}
				amount={5}
				priceXlm="0.10"
				userAddress={userAddress}
			/>
		);

		const shareButton = screen.getByTestId('share-twitter-intent-button');
		await user.click(shareButton);

		expect(openSpy).toHaveBeenCalledTimes(1);
		const openedUrl = openSpy.mock.calls[0][0] as string;
		expect(openedUrl).toContain('https://twitter.com/intent/tweet?text=');
		expect(decodeURIComponent(openedUrl)).toContain('Just bought 5 Alex Rivers keys on AccessLayer');
		expect(decodeURIComponent(openedUrl)).toContain(`ref=${userAddress}`);
	});

	it('copies referral link to clipboard and displays copied feedback', async () => {
		const user = userEvent.setup();
		const copySpy = vi.spyOn(clipboardUtils, 'copyTextToClipboard').mockResolvedValue();

		render(
			<ShareModal
				open={true}
				onOpenChange={vi.fn()}
				creatorId={creatorId}
				creatorName={creatorName}
				amount={3}
				userAddress={userAddress}
			/>
		);

		const copyButton = screen.getByTestId('copy-referral-link-button');
		expect(copyButton).toHaveTextContent('Copy Link');

		await user.click(copyButton);

		expect(copySpy).toHaveBeenCalledWith(
			expect.stringContaining(`/creator/${creatorId}?ref=${userAddress}`)
		);
		expect(screen.getByTestId('copied-feedback')).toBeInTheDocument();
		expect(screen.getByText('Copied!')).toBeInTheDocument();
		expect(showToast.success).toHaveBeenCalledWith('Referral link copied to clipboard!');
	});

	it('dismisses cleanly when clicking the dismiss button', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		const onDismiss = vi.fn();

		render(
			<ShareModal
				open={true}
				onOpenChange={onOpenChange}
				creatorId={creatorId}
				creatorName={creatorName}
				amount={2}
				userAddress={userAddress}
				onDismiss={onDismiss}
			/>
		);

		const dismissButton = screen.getByTestId('share-modal-dismiss-button');
		await user.click(dismissButton);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});
