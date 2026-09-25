import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

export function useRouteChangeLogging() {
	const location = useLocation();
	const previousRoute = useRef<string | null>(null);
	const lastNavCompletedAt = useRef<number | null>(null);
	const isFirstNav = useRef(true);

	useEffect(() => {
		// Vitest sets MODE to 'test' by default; skip logging in that environment.
		if (import.meta.env.MODE === 'test') return;

		const now = performance.now();
		const toRoute = location.pathname;

		console.debug('[route-change]', {
			from_route: isFirstNav.current ? null : previousRoute.current,
			to_route: toRoute,
			time_since_last_nav_ms:
				lastNavCompletedAt.current === null
					? null
					: Math.round(now - lastNavCompletedAt.current),
		});

		isFirstNav.current = false;
		previousRoute.current = toRoute;
		lastNavCompletedAt.current = now;
	}, [location]);
}