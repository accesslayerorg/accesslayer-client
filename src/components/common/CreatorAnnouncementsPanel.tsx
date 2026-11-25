import { useState } from 'react';
import AnnouncementComposer from '@/components/common/AnnouncementComposer';
import ScheduledAnnouncementsList from '@/components/common/ScheduledAnnouncementsList';
import { useCreatorAnnouncements } from '@/hooks/useCreatorAnnouncements';
import {
	ANNOUNCEMENT_CATEGORY_LABELS,
	formatAnnouncementDate,
} from '@/utils/announcement.utils';
import type { ScheduledAnnouncement } from '@/services/announcement.service';

interface CreatorAnnouncementsPanelProps {
	creatorId: string;
}

/**
 * Creator dashboard composer for announcements to key holders (#1159, #1380).
 * Supports immediate publishing and scheduled publishing controls.
 */
export default function CreatorAnnouncementsPanel({
	creatorId,
}: CreatorAnnouncementsPanelProps) {
	const [editingAnnouncement, setEditingAnnouncement] =
		useState<ScheduledAnnouncement | null>(null);

	const { announcements, isLoading, isError } =
		useCreatorAnnouncements(creatorId);

	return (
		<div className="space-y-8" data-testid="creator-announcements-panel">
			{/* Announcement Composer (with publish now / schedule controls) */}
			<section aria-labelledby="compose-announcement-heading">
				<h3
					id="compose-announcement-heading"
					className="sr-only"
				>
					{editingAnnouncement ? 'Edit Announcement' : 'Compose Announcement'}
				</h3>
				<AnnouncementComposer
					creatorId={creatorId}
					initialAnnouncement={editingAnnouncement}
					onCancelEdit={() => setEditingAnnouncement(null)}
					onSuccess={() => setEditingAnnouncement(null)}
				/>
			</section>

			{/* Scheduled & Draft Announcements List */}
			<ScheduledAnnouncementsList
				keyId={creatorId}
				onEdit={item => setEditingAnnouncement(item)}
			/>

			{/* Posted Announcements Feed */}
			<section aria-labelledby="posted-announcements-heading" className="space-y-3">
				<h3
					id="posted-announcements-heading"
					className="font-grotesque text-base font-black text-white"
				>
					Posted announcements
				</h3>

				{isLoading && (
					<p className="text-sm text-white/50">Loading announcements…</p>
				)}
				{isError && (
					<p className="text-sm text-red-400">Couldn&apos;t load announcements.</p>
				)}
				{!isLoading && !isError && announcements.length === 0 && (
					<p className="text-sm text-white/50" data-testid="announcements-empty">
						No announcements yet.
					</p>
				)}

				<ul className="space-y-3" data-testid="announcements-list">
					{announcements.map(item => (
						<li
							key={item.id}
							className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
						>
							<div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
								<span className="rounded-full border border-amber-400/30 px-2 py-0.5 font-bold text-amber-300">
									{ANNOUNCEMENT_CATEGORY_LABELS[item.category] ?? item.category}
								</span>
								<time dateTime={item.createdAt}>
									{formatAnnouncementDate(item.createdAt)}
								</time>
							</div>
							<p className="mt-2 font-bold text-white">{item.title}</p>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
