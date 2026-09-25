import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarketingPage from '@/pages/MarketingPage';

describe('MarketingPage community links', () => {
	it('GitHub link points to the correct URL and opens in a new tab', () => {
		render(<MarketingPage />);

		const githubLink = screen.getByRole('link', { name: /github/i });

		expect(githubLink).toHaveAttribute('href', 'https://github.com/accesslayerorg');
		expect(githubLink).toHaveAttribute('target', '_blank');
		expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('Telegram link points to the correct URL and opens in a new tab', () => {
		render(<MarketingPage />);

		const telegramLink = screen.getByRole('link', { name: /telegram/i });

		expect(telegramLink).toHaveAttribute('href', 'https://t.me/c/accesslayerorg/');
		expect(telegramLink).toHaveAttribute('target', '_blank');
		expect(telegramLink).toHaveAttribute('rel', 'noopener noreferrer');
	});
});
