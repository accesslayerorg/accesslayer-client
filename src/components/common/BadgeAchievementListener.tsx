import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useBadgeAchievements } from '@/hooks/useBadgeAchievements';

export interface BadgeAchievementListenerProps {
	/**
	 * Navigates to the given path. Passed in (rather than pulled from
	 * `useNavigate`) so this component can be mounted at the app root, outside
	 * the `RouterProvider` tree where router hooks aren't available —
	 * `App.tsx` passes the `router.navigate` bound method from the same
	 * `createBrowserRouter` instance it renders.
	 */
	navigate: (path: string) => void;
}

/**
 * Mounted once at the app root so badge achievements are celebrated wherever
 * the user happens to be (#1222).
 *
 * Watches the connected wallet for newly earned badges and shows the
 * achievement toast. The toast's "View Badges" CTA deep-links to the
 * wallet's badge showcase on the profile page.
 */
export default function BadgeAchievementListener({
	navigate,
}: BadgeAchievementListenerProps) {
	const { address } = useAccount();

	const handleViewBadges = useCallback(
		(profilePath: string) => {
			navigate(profilePath);
		},
		[navigate]
	);

	useBadgeAchievements(address, { onViewBadges: handleViewBadges });

	return null;
}
