import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccount } from 'wagmi';
import BadgeAchievementListener from '../BadgeAchievementListener';
import { useBadgeAchievements } from '@/hooks/useBadgeAchievements';

vi.mock('@/hooks/useBadgeAchievements', () => ({
	useBadgeAchievements: vi.fn(),
}));

describe('BadgeAchievementListener (#1222)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useAccount).mockReturnValue({
			address: '0xabc',
			isConnected: true,
		} as unknown as ReturnType<typeof useAccount>);
		vi.mocked(useBadgeAchievements).mockReturnValue({ announced: [] });
	});

	it('watches the connected wallet', () => {
		render(<BadgeAchievementListener navigate={vi.fn()} />);

		expect(useBadgeAchievements).toHaveBeenCalledWith(
			'0xabc',
			expect.objectContaining({ onViewBadges: expect.any(Function) })
		);
	});

	it('does not watch anything while no wallet is connected', () => {
		vi.mocked(useAccount).mockReturnValue({
			address: undefined,
			isConnected: false,
		} as unknown as ReturnType<typeof useAccount>);

		render(<BadgeAchievementListener navigate={vi.fn()} />);

		expect(useBadgeAchievements).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({ onViewBadges: expect.any(Function) })
		);
	});

	it('navigates to the badge showcase when the toast CTA is used', () => {
		const navigate = vi.fn();
		render(<BadgeAchievementListener navigate={navigate} />);

		const options = vi.mocked(useBadgeAchievements).mock.calls[0][1];
		options?.onViewBadges?.('/profile/0xabc#wallet-badges');

		expect(navigate).toHaveBeenCalledWith('/profile/0xabc#wallet-badges');
	});
});
