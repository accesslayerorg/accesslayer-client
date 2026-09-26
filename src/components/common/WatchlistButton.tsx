import React from 'react';
import { Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useConnectedWallet, useWatchlist } from '@/hooks/useWatchlist';
import type { Course } from '@/services/course.service';

interface WatchlistButtonProps {
	creator: Course;
	className?: string;
	/** Visual size of the bookmark icon button. */
	size?: 'sm' | 'md';
	/** Accessible label prefix used to disambiguate multiple buttons on a page. */
	labelName?: string;
}

/**
 * A bookmark / watchlist toggle for a creator key. It scopes the bookmark
 * under the currently connected wallet (via the lightweight `useConnectedWallet`
 * store) in localStorage through the `useWatchlist` store, and gives instant
 * visual + toast feedback on toggle.
 */
const WatchlistButton: React.FC<WatchlistButtonProps> = ({
	creator,
	className,
	size = 'md',
	labelName,
}) => {
	const walletKey = useConnectedWallet(state => state.walletKey);
	const bookmarked = useWatchlist(state => state.isBookmarked(walletKey, creator.id));
	const toggleBookmark = useWatchlist(state => state.toggleBookmark);

	const displayName = labelName || creator.title || 'creator';

	const handleToggle = () => {
		if (bookmarked) {
			useWatchlist.getState().removeBookmark(walletKey, creator.id);
			toast(`${displayName} removed from your watchlist`);
		} else {
			toggleBookmark(walletKey, creator);
			toast.success(`${displayName} saved to your watchlist`);
		}
	};

	const sizeClasses =
		size === 'sm'
			? 'size-8 [&_svg]:size-4'
			: 'size-9 [&_svg]:size-[1.15rem]';

	return (
		<button
			type="button"
			aria-label={
				bookmarked
					? `${displayName} saved to watchlist. Remove bookmark.`
					: `Bookmark ${displayName}`
			}
			aria-pressed={bookmarked}
			onClick={handleToggle}
			className={cn(
				'inline-flex items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
				bookmarked
					? 'border-amber-400/60 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
					: 'border-white/10 bg-slate-950/70 text-white/40 hover:bg-white/10 hover:text-white/70',
				sizeClasses,
				className
			)}
		>
			<Bookmark
				className={bookmarked ? 'fill-amber-300' : undefined}
				aria-hidden="true"
			/>
		</button>
	);
};

export default WatchlistButton;
