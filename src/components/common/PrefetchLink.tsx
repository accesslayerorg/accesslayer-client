import React, { useEffect, useRef, useCallback } from 'react';
import { Link, type LinkProps } from 'react-router';
import {
	enqueuePrefetch,
	cancelPrefetch,
	prefetchPath,
} from '@/utils/navigationPrefetch.utils';

export interface PrefetchLinkProps extends LinkProps {
	prefetchOnViewport?: boolean;
	prefetchOnHover?: boolean;
	prefetchOnFocus?: boolean;
}

export const PrefetchLink: React.FC<PrefetchLinkProps> = ({
	to,
	prefetchOnViewport = true,
	prefetchOnHover = true,
	prefetchOnFocus = true,
	onMouseEnter,
	onFocus,
	children,
	...rest
}) => {
	const linkRef = useRef<HTMLAnchorElement | null>(null);
	const path = typeof to === 'string' ? to : (to.pathname ?? '');

	const handlePrefetch = useCallback(
		(priority: 'normal' | 'high' = 'normal') => {
			if (!path || path.startsWith('http://') || path.startsWith('https://')) {
				return;
			}
			enqueuePrefetch(path, () => prefetchPath(path), priority);
		},
		[path]
	);

	useEffect(() => {
		if (!prefetchOnViewport || !path || typeof IntersectionObserver === 'undefined') {
			return;
		}

		const element = linkRef.current;
		if (!element) return;

		let cancelViewportPrefetch: (() => void) | undefined;

		const observer = new IntersectionObserver(
			entries => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						cancelViewportPrefetch = enqueuePrefetch(
							path,
							() => prefetchPath(path),
							'normal'
						);
					} else {
						// Link left viewport before execution
						if (cancelViewportPrefetch) {
							cancelViewportPrefetch();
						} else {
							cancelPrefetch(path);
						}
					}
				}
			},
			{ rootMargin: '100px' }
		);

		observer.observe(element);

		return () => {
			observer.disconnect();
			cancelPrefetch(path);
		};
	}, [path, prefetchOnViewport]);

	const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if (prefetchOnHover) {
			handlePrefetch('high');
		}
		onMouseEnter?.(e);
	};

	const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
		if (prefetchOnFocus) {
			handlePrefetch('high');
		}
		onFocus?.(e);
	};

	return (
		<Link
			ref={linkRef}
			to={to}
			onMouseEnter={handleMouseEnter}
			onFocus={handleFocus}
			{...rest}
		>
			{children}
		</Link>
	);
};

export default PrefetchLink;
