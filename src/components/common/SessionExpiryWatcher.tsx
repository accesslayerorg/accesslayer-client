import { useSessionExpiryWarning } from '@/hooks/useSessionExpiryWarning';
import { authService } from '@/services/auth.service';
import SessionExpiryModal from '@/components/common/SessionExpiryModal';

export interface SessionExpiryWatcherProps {
	/**
	 * Navigates to the given path. Passed in (rather than pulled from
	 * `useNavigate`) so this component can be mounted at the app root,
	 * outside the `RouterProvider` tree where router hooks aren't
	 * available — `App.tsx` passes the `router.navigate` bound method
	 * from the same `createBrowserRouter` instance it renders.
	 */
	navigate: (path: string) => void;
}

/**
 * Mounted once at the app root so the session-expiry warning is watched
 * app-wide regardless of which page is active (#878).
 *
 * Renews via `authService.refreshSession()` — the existing
 * `POST /auth/refresh` endpoint the API layer already relies on for its
 * own silent refresh-on-401 retry (see `BaseApiService`'s response
 * interceptor) — without a full logout. Logging out clears the session
 * and returns to the marketplace listing.
 */
export default function SessionExpiryWatcher({
	navigate,
}: SessionExpiryWatcherProps) {
	const { isWarningVisible, isRenewing, renewError, renewSession, logOut } =
		useSessionExpiryWarning({
			onRenew: () => authService.refreshSession(),
			onLogout: () => {
				void authService.logout();
				navigate('/');
			},
		});

	return (
		<SessionExpiryModal
			open={isWarningVisible}
			isRenewing={isRenewing}
			renewError={renewError}
			onRenew={() => {
				void renewSession();
			}}
			onLogout={logOut}
		/>
	);
}
