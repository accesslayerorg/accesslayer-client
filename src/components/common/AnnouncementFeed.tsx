/*
 * Creator announcements feed (#1175).
 * Shows the latest posts with category chips, expandable full content,
 * a Load More button, and an empty state.
 */

import React from 'react';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import AnnouncementItem from '@/components/common/AnnouncementItem';
import { Button } from '@/components/ui/button';

export interface AnnouncementFeedProps {
	creatorId: string;
	/** Page size for each Load More fetch (default 10). */
	pageSize?: number;
}

const AnnouncementFeed: React.FC<AnnouncementFeedProps> = ({
	creatorId,
	pageSize = 10,
}) => {
	const {
		data,
		isLoading,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	} = useAnnouncements(creatorId, pageSize);

	const announcements = data?.pages.flatMap(p => p.announcements) ?? [];

	if (isLoading) {
		return (
			<div className="space-y-3" role="status" aria-live="polite" data-testid="announcements-loading">
				{ [0, 1].map(i => (
					<div
						key={i}
						className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/[0.02]"
					/>
				)) }
			</div>
		);
	}

	if (announcements.length === 0) {
		return (
			<div
				className="rounded-xl border border-dashed border-white/15 p-8 text-center"
				data-testid="announcements-empty"
			>
				<p className="text-sm font-medium text-white/70">No announcements yet</p>
				<p className="mt-1 text-xs text-white/50">
					This creator has not posted any updates.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3" data-testid="announcement-feed">
			{announcements.map(a => (<AnnouncementItem key={a.id} announcement={a} />)) }
			{/* Load More button */}
			{hasNextPage && (<div className="pt-2 text-center"><Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Loading...' : 'Load More'}</Button></div>)}
		</div>
	);
};

export default AnnouncementFeed;
