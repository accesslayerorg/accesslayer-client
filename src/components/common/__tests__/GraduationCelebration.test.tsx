import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GraduationCelebration from '@/components/common/GraduationCelebration';
import {
	GRADUATION_SESSION_PREFIX,
	buildGraduationReferralLink,
	buildGraduationStats,
	buildGraduationTweetText,
	getFinalMilestone,
	hasKeyGraduated,
} from '@/utils/graduation.utils';
import type { GraduatedCurveConfig } from '@/services/course.service';

const playPurchaseConfetti = vi.fn();
vi.mock('@/utils/confetti.utils', () => ({
	playPurchaseConfetti: (...args: unknown[]) => playPurchaseConfetti(...args),
}));

const copyTextToClipboard = vi.fn();
vi.mock('@/utils/clipboard.utils', () => ({
	copyTextToClipboard: (...args: unknown[]) => copyTextToClipboard(...args),
}));

let mockConfig: GraduatedCurveConfig | undefined;
vi.mock('@/hooks/useGraduatedCurveConfig', () => ({
	useGraduatedCurveConfig: () => ({ data: mockConfig }),
}));

const CONFIG: GraduatedCurveConfig = {
	hasGraduatedCurve: true,
	milestones: [
		{ supplyThreshold: 100, exponent: 1, simulatedPrice: 0.5 },
		{ supplyThreshold: 1000, exponent: 2, simulatedPrice: 4.25 },
		{ supplyThreshold: 500, exponent: 1.5, simulatedPrice: 2 },
	],
};

describe('graduation utils (#1110)', () => {
	it('uses the highest-supply milestone as the final one', () => {
		expect(getFinalMilestone(CONFIG)?.supplyThreshold).toBe(1000);
		expect(getFinalMilestone({ milestones: [] })).toBeNull();
		expect(getFinalMilestone(undefined)).toBeNull();
	});

	it('graduates only once supply reaches the final milestone', () => {
		expect(hasKeyGraduated(CONFIG, 999)).toBe(false);
		expect(hasKeyGraduated(CONFIG, 1000)).toBe(true);
		expect(hasKeyGraduated(CONFIG, 5000)).toBe(true);
		expect(hasKeyGraduated(CONFIG, null)).toBe(false);
		expect(hasKeyGraduated({ milestones: [] }, 5000)).toBe(false);
	});

	it('builds the milestone stats', () => {
		expect(buildGraduationStats(CONFIG, 321)).toEqual({
			finalSupply: 1000,
			graduationPriceXlm: 4.25,
			milestonesReached: 3,
			holderCount: 321,
		});
	});

	it('builds a tweet with the key name, stats and link', () => {
		const stats = buildGraduationStats(CONFIG, 1234)!;
		const text = buildGraduationTweetText({
			keyName: 'Alice Key',
			stats,
			link: 'https://accesslayer.app/creator/key-1',
		});
		expect(text).toContain('Alice Key');
		expect(text).toContain('1,000 keys');
		expect(text).toContain('1,234 holders');
		expect(text).toContain('https://accesslayer.app/creator/key-1');
	});

	it('builds the referral link with the wallet as ref', () => {
		expect(buildGraduationReferralLink('key-1', 'GWALLET')).toMatch(
			/\/creator\/key-1\?ref=GWALLET$/
		);
		expect(buildGraduationReferralLink('key-1', null)).toMatch(
			/\/creator\/key-1$/
		);
	});
});

describe('GraduationCelebration (#1110)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		playPurchaseConfetti.mockReset();
		copyTextToClipboard.mockReset().mockResolvedValue(undefined);
		mockConfig = CONFIG;
	});

	function renderCard(
		props: Partial<React.ComponentProps<typeof GraduationCelebration>> = {}
	) {
		return render(
			<GraduationCelebration
				keyId="key-1"
				keyName="Alice Key"
				currentSupply={1000}
				holderCount={321}
				walletAddress="GWALLET"
				{...props}
			/>
		);
	}

	it('shows nothing before the key graduates, and no animation', () => {
		renderCard({ currentSupply: 400 });
		expect(screen.queryByTestId('graduation-card')).toBeNull();
		expect(playPurchaseConfetti).not.toHaveBeenCalled();
	});

	it('shows the graduation card with milestone stats and plays confetti', async () => {
		renderCard();
		expect(screen.getByTestId('graduation-card')).toBeInTheDocument();
		expect(screen.getByTestId('graduation-stat-supply')).toHaveTextContent(
			'1,000'
		);
		expect(
			screen.getByTestId('graduation-stat-milestones')
		).toHaveTextContent('3');
		expect(screen.getByTestId('graduation-stat-price')).toHaveTextContent(
			'4.25 XLM'
		);
		expect(screen.getByTestId('graduation-stat-holders')).toHaveTextContent(
			'321'
		);
		await waitFor(() =>
			expect(playPurchaseConfetti).toHaveBeenCalledTimes(1)
		);
	});

	it('plays the animation only once per session per key', async () => {
		const first = renderCard();
		await waitFor(() =>
			expect(playPurchaseConfetti).toHaveBeenCalledTimes(1)
		);
		expect(
			window.sessionStorage.getItem(`${GRADUATION_SESSION_PREFIX}key-1`)
		).toBe('1');
		first.unmount();

		renderCard();
		expect(screen.getByTestId('graduation-card')).toBeInTheDocument();
		expect(playPurchaseConfetti).toHaveBeenCalledTimes(1);
	});

	it('still celebrates a different key in the same session', async () => {
		renderCard();
		await waitFor(() =>
			expect(playPurchaseConfetti).toHaveBeenCalledTimes(1)
		);
		renderCard({ keyId: 'key-2' });
		await waitFor(() =>
			expect(playPurchaseConfetti).toHaveBeenCalledTimes(2)
		);
	});

	it('pre-fills the tweet with the key name, stats and link', () => {
		renderCard();
		const href = screen
			.getByTestId('graduation-share-tweet')
			.getAttribute('href')!;
		expect(href.startsWith('https://twitter.com/intent/tweet?text=')).toBe(
			true
		);
		const text = decodeURIComponent(href.split('text=')[1]);
		expect(text).toContain('Alice Key');
		expect(text).toContain('1,000 keys');
		expect(text).toContain('321 holders');
		expect(text).toContain('/creator/key-1?ref=GWALLET');
	});

	it('copies the referral link', async () => {
		renderCard();
		fireEvent.click(screen.getByTestId('graduation-copy-link'));
		await waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledTimes(1));
		expect(copyTextToClipboard.mock.calls[0][0]).toMatch(
			/\/creator\/key-1\?ref=GWALLET$/
		);
		expect(await screen.findByText('Link copied')).toBeInTheDocument();
	});
});
