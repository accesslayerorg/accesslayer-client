import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SocialShareModal from '@/components/common/SocialShareModal';

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

describe('SocialShareModal (#1251)', () => {
	const originalOpen = window.open;

	beforeEach(() => {
		window.open = vi.fn();
	});

	afterEach(() => {
		window.open = originalOpen;
	});

	it('shows share text that includes the key name, price, and 24h change', () => {
		render(
			<SocialShareModal
				open={true}
				onOpenChange={vi.fn()}
				share={{
					context: 'key',
					keyName: 'Luna Starlight',
					priceXlm: '0.25',
					change24h: 3,
					url: 'https://accesslayer.app/creator/creator-1',
				}}
			/>
		);

		const preview = screen.getByTestId('social-share-preview-text');
		expect(preview).toHaveTextContent('Luna Starlight');
		expect(preview).toHaveTextContent('0.25 XLM');
		expect(preview).toHaveTextContent('+3%');
	});

	it('opens a Twitter intent in a new tab when the Twitter button is clicked', () => {
		render(
			<SocialShareModal
				open={true}
				onOpenChange={vi.fn()}
				share={{
					context: 'badge',
					badgeName: 'Whale',
					criteria: 'Hold over 1000 keys',
					url: 'https://accesslayer.app/profile/wallet-1',
				}}
			/>
		);

		fireEvent.click(screen.getByTestId('social-share-twitter-button'));
		expect(window.open).toHaveBeenCalledWith(
			expect.stringContaining('https://twitter.com/intent/tweet?'),
			'_blank',
			'noopener,noreferrer'
		);
	});

	it('opens a Telegram share link in a new tab when the Telegram button is clicked', () => {
		render(
			<SocialShareModal
				open={true}
				onOpenChange={vi.fn()}
				share={{
					context: 'badge',
					badgeName: 'Whale',
					criteria: 'Hold over 1000 keys',
					url: 'https://accesslayer.app/profile/wallet-1',
				}}
			/>
		);

		fireEvent.click(screen.getByTestId('social-share-telegram-button'));
		expect(window.open).toHaveBeenCalledWith(
			expect.stringContaining('https://t.me/share/url?'),
			'_blank',
			'noopener,noreferrer'
		);
	});

	it('copies the link to the clipboard and shows confirmation', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.assign(navigator, { clipboard: { writeText } });

		render(
			<SocialShareModal
				open={true}
				onOpenChange={vi.fn()}
				share={{
					context: 'badge',
					badgeName: 'Whale',
					criteria: 'Hold over 1000 keys',
					url: 'https://accesslayer.app/profile/wallet-1',
				}}
			/>
		);

		fireEvent.click(screen.getByTestId('social-share-copy-link-button'));
		expect(writeText).toHaveBeenCalledWith(
			'https://accesslayer.app/profile/wallet-1'
		);
	});
});
