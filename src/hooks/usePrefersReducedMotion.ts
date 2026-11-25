import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

// jsdom (used in tests) doesn't implement matchMedia, so guard every call.
const canMatchMedia = () =>
	typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Subscribes to the user's reduced-motion preference.
 */
export function usePrefersReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
		canMatchMedia() ? window.matchMedia(QUERY).matches : false
	);

	useEffect(() => {
		if (!canMatchMedia()) return;
		const media = window.matchMedia(QUERY);
		const onChange = () => setPrefersReducedMotion(media.matches);
		onChange();
		media.addEventListener('change', onChange);
		return () => media.removeEventListener('change', onChange);
	}, []);

	return prefersReducedMotion;
}
