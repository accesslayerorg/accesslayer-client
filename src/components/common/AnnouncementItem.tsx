/**
 * Creator announcement item (#1175).
 * Collapsed by default; expanding fetches the full body from IPFS.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAnnouncementContent } from '@/hooks/useAnnouncements';
import {
	categoryColour,
	type Announcement,
} from '@/utils/announcements.utils';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import ActionAttributionLabel from '@/components/common/ActionAttributionLabel';

export interface AnnouncementItemProps {
	announcement: Announcement;
}

const AnnouncementItem: React.FC<AnnouncementItemProps> = ({
	announcement,
}) => {
	const [open, setOpen] = useState(false);
	const { data: content, isLoading } = useAnnouncementContent(
		announcement.id,
		open
	);
	const relative = useRelativeTime(announcement.publishedAt);

	return (
		<article
			className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
			data-testid="announcement-item"
			data-category={announcement.category}
		>
			<header className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="mb-2 flex flex-wrap items-center gap-2">
						<span
							className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryColour(
								announcement.category
							)}`}
							data-testid="announcement-category-chip"
							data-category={announcement.category}
						>
							{announcement.category}
						</span>
						<time
							className="text-xs text-white/50"
							dateTime={announcement.publishedAt}
							data-testid="announcement-date"
						>
							{relative}
						</time>
					</div>
					<h3 className="text-sm font-semibold text-white" data-testid="announcement-title">
						{announcement.title}
					</h3>
					{announcement.postedBy && (
						<ActionAttributionLabel
							attribution={announcement.postedBy}
							prefix="Posted by"
							className="mt-1"
						/>
					)}
					{!open && announcement.summary && (
						<p className="mt-1 text-xs text-white/60">{announcement.summary}</p>
					)}
				</div>
				<button
					type="button"
					className="flex-shrink-0 rounded-lg border border-white/10 p-1.5 text-white/60 hover:text-white"
					onClick={() => setOpen(v => !v)}
					aria-expanded={open}
					data-testid="announcement-expand"
				>
					{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
					<span className="sr-only">
						{open ? 'Collapse announcement' : 'Expand announcement'}
					</span>
				</button>
			</header>

			{open && (
				<div
					className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/75"
					data-testid="announcement-content"
				>
					{isLoading ? (
						<span className="text-white/50">Loading…</span>
					) : content ? (
						<p>{content}</p>
					) : (
						<span className="text-white/50">No content available.</span>
					)}
				</div>
			)}
		</article>
	);
};

export default AnnouncementItem;
