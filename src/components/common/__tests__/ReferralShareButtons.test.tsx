import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferralShareButtons from '../ReferralShareButtons';

const LINK = 'https://app.test/?ref=GABC';

describe('ReferralShareButtons (#1119)', () => {
	let openSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		openSpy = vi
			.spyOn(window, 'open')
			.mockReturnValue(null as unknown as Window);
	});

	it('opens the pre-filled X (Twitter) share URL', async () => {
		const user = userEvent.setup();
		render(<ReferralShareButtons link={LINK} />);

		await user.click(screen.getByTestId('referral-share-twitter'));

		expect(openSpy).toHaveBeenCalledTimes(1);
		const [url, target, features] = openSpy.mock.calls[0];
		expect(url).toBe(
			`https://twitter.com/intent/tweet?text=${encodeURIComponent(
				`Join AccessLayer with my link and start trading creator keys: ${LINK}`
			)}`
		);
		expect(target).toBe('_blank');
		expect(features).toBe('noopener,noreferrer');
	});

	it('opens the pre-filled Telegram share URL', async () => {
		const user = userEvent.setup();
		render(<ReferralShareButtons link={LINK} />);

		await user.click(screen.getByTestId('referral-share-telegram'));

		expect(openSpy).toHaveBeenCalledTimes(1);
		expect(openSpy.mock.calls[0][0]).toBe(
			`https://t.me/share/url?url=${encodeURIComponent(
				LINK
			)}&text=${encodeURIComponent(
				`Join AccessLayer with my link and start trading creator keys: ${LINK}`
			)}`
		);
	});

	it('disables both buttons when no link is available', () => {
		render(<ReferralShareButtons link="" />);

		expect(screen.getByTestId('referral-share-twitter')).toBeDisabled();
		expect(screen.getByTestId('referral-share-telegram')).toBeDisabled();
	});
});
