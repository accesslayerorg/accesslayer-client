import React from 'react';

interface SkipToContentProps {
	/** ID of the target element to focus on when the link is activated */
	targetId: string;
	/** Text displayed on the link */
	label?: string;
	/** Optional className for styling */
	className?: string;
}

/**
 * Visually hidden skip-to-content link that appears on first Tab press.
 * Allows keyboard users to bypass navigation and jump directly to main content.
 *
 * Usage:
 * 1. Add this component as the first focusable element in your page
 * 2. Add id and tabIndex={-1} to your main content container
 * 3. On Enter/Space, focus moves to the target element
 *
 * @example
 * <SkipToContent targetId="main-content" label="Skip to main content" />
 */
const SkipToContent: React.FC<SkipToContentProps> = ({
	targetId,
	label = 'Skip to main content',
	className,
}) => {
	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		e.preventDefault();
		focusTarget();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
		// Allow both Enter and Space keys to activate the link
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			focusTarget();
		}
	};

	const focusTarget = () => {
		const target = document.getElementById(targetId);
		if (target) {
			// Set focus to the target
			target.focus({ preventScroll: true });
			// Scroll it into view smoothly if supported by the environment
			const maybeTarget = target as HTMLElement & { scrollIntoView?: (options?: ScrollIntoViewOptions) => void };
			if (typeof maybeTarget.scrollIntoView === 'function') {
				maybeTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}
	};

	return (
		<a
			href={`#${targetId}`}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={className ?? (
				// Visually hidden by default: positioned off-screen
				'absolute -left-full top-0 z-50 ' +
				'bg-amber-400 text-slate-950 ' +
				'px-4 py-2 font-bold text-sm ' +
				'rounded-md ' +
				// Visible on focus: brought back into view
				'focus:left-4 focus:top-4 ' +
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-600 ' +
				'transition-all duration-200'
			)}
		>
			{label}
		</a>
	);
};

export default SkipToContent;
