import { useEffect, useState } from 'react';

/** Viewport widths below this value (in px) are treated as mobile. */
export const MOBILE_BREAKPOINT_PX = 768;

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`;

/**
 * Returns `true` when the viewport width is below {@link MOBILE_BREAKPOINT_PX}.
 */
export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
		return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
	});

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
		const media = window.matchMedia(MOBILE_MEDIA_QUERY);
		const onChange = (event: MediaQueryListEvent) => {
			setIsMobile(event.matches);
		};

		setIsMobile(media.matches);
		media.addEventListener('change', onChange);
		return () => media.removeEventListener('change', onChange);
	}, []);

	return isMobile;
}
