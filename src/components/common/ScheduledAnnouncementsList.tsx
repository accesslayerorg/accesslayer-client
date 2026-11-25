import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { useScheduledAnnouncements } from '@/hooks/useScheduledAnnouncements';
import { ANNOUNCEMENT_CATEGORY_LABELS } from '@/utils/announcement.utils';
import type { ScheduledAnnouncement } from '@/services/announcement.service';
import {
	formatLocalScheduledTime,
	formatUtcScheduledTime,
} from '@/utils/announcementSchedule.utils';

export interface ScheduledAnnouncementsListProps {
	keyId: string;
	onEdit?: (announcement: ScheduledAnnouncement) => void;
}

export default function ScheduledAnnouncementsList({
	keyId,
	onEdit,
}: ScheduledAnnouncementsListProps) {
	const { announcements, isLoading, isError, cancelAnnouncement, isCancelling } =
		useScheduledAnnouncements(keyId);

	const [cancellingItem, setCancellingItem] =
		useState<ScheduledAnnouncement | null>(null);

	const handleConfirmCancel = async () => {
		if (!cancellingItem) return;
		try {
			await cancelAnnouncement(cancellingItem.id);
		} finally {
			setCancellingItem(null);
		}
	};

	return (
		<section
			aria-labelledby="scheduled-announcements-heading"
			data-testid="scheduled-announcements-section"
			className="space-y-3"
		>
			<h3
				id="scheduled-announcements-heading"
				className="font-grotesque text-base font-black text-white"
			>
				Scheduled &amp; Draft Announcements
			</h3>

			{isLoading && (
				<p
					data-testid="scheduled-announcements-loading"
					className="text-sm text-white/50"
				>
					Loading scheduled announcements…
				</p>
			)}

			{isError && (
				<p
					data-testid="scheduled-announcements-error"
					className="text-sm text-red-400"
				>
					Couldn&apos;t load scheduled announcements.
				</p>
			)}

			{!isLoading && !isError && announcements.length === 0 && (
				<p
					data-testid="scheduled-announcements-empty"
					className="text-sm text-white/50"
				>
					No scheduled announcements.
				</p>
			)}

			{!isLoading && !isError && announcements.length > 0 && (
				<ul
					className="space-y-3"
					data-testid="scheduled-announcements-list"
				>
					{announcements.map(item => {
						const localTime = formatLocalScheduledTime(item.scheduledAt);
						const utcTime = formatUtcScheduledTime(item.scheduledAt);

						return (
							<li
								key={item.id}
								data-testid={`scheduled-announcement-${item.id}`}
								className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors"
							>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div className="flex flex-wrap items-center gap-2 text-xs">
										{/* Category label */}
										<span className="rounded-full border border-amber-400/30 px-2 py-0.5 font-bold text-amber-300">
											{ANNOUNCEMENT_CATEGORY_LABELS[item.category] ??
												item.category}
										</span>

										{/* Status badge */}
										{item.status === 'published' ? (
											<span
												data-testid="scheduled-item-status-published"
												className="rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 font-bold text-emerald-300"
											>
												Published
											</span>
										) : item.status === 'draft' ? (
											<span
												data-testid="scheduled-item-status-draft"
												className="rounded-full border border-zinc-400/30 bg-zinc-400/10 px-2 py-0.5 font-bold text-zinc-300"
											>
												Draft
											</span>
										) : (
											<span
												data-testid="scheduled-item-status-scheduled"
												className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-bold text-amber-300"
											>
												Scheduled
											</span>
										)}

										{/* Timezone-aware date with UTC on hover */}
										<Tooltip content={`UTC: ${utcTime}`}>
											<span
												title={`UTC: ${utcTime}`}
												data-testid="scheduled-item-time"
												className="cursor-help text-white/60 underline decoration-dotted hover:text-white"
											>
												<span data-testid="scheduled-item-local-time">
													{localTime}
												</span>
											</span>
										</Tooltip>
									</div>

									{/* Action buttons: Edit, Reschedule, Cancel */}
									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											data-testid="scheduled-item-edit-btn"
											onClick={() => onEdit?.(item)}
											aria-label={`Edit ${item.title}`}
											disabled={item.status === 'published'}
										>
											Edit
										</Button>

										<Button
											type="button"
											variant="outline"
											size="sm"
											data-testid="scheduled-item-reschedule-btn"
											onClick={() => onEdit?.(item)}
											aria-label={`Reschedule ${item.title}`}
											disabled={item.status === 'published'}
										>
											Reschedule
										</Button>

										<Button
											type="button"
											variant="outline"
											size="sm"
											data-testid="scheduled-item-cancel-btn"
											className="border-red-500/30 text-red-300 hover:bg-red-500/10"
											onClick={() => setCancellingItem(item)}
											aria-label={`Cancel ${item.title}`}
											disabled={item.status === 'published'}
										>
											Cancel
										</Button>
									</div>
								</div>

								<h4
									data-testid="scheduled-item-title"
									className="mt-2 text-sm font-bold text-white"
								>
									{item.title}
								</h4>
								{item.content && (
									<p
										data-testid="scheduled-item-content"
										className="mt-1 line-clamp-2 text-xs text-white/60"
									>
										{item.content}
									</p>
								)}
							</li>
						);
					})}
				</ul>
			)}

			{/* Cancellation confirmation dialog */}
			<Dialog
				open={Boolean(cancellingItem)}
				onOpenChange={open => {
					if (!open) setCancellingItem(null);
				}}
			>
				<DialogContent data-testid="cancel-announcement-dialog">
					<DialogHeader>
						<DialogTitle>Cancel scheduled announcement</DialogTitle>
						<DialogDescription>
							Are you sure you want to cancel &ldquo;{cancellingItem?.title}
							&rdquo;? This announcement will not be published.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							data-testid="cancel-dialog-close"
							onClick={() => setCancellingItem(null)}
							disabled={isCancelling}
						>
							Keep announcement
						</Button>
						<Button
							type="button"
							variant="destructive"
							data-testid="cancel-dialog-confirm"
							onClick={handleConfirmCancel}
							disabled={isCancelling}
						>
							{isCancelling ? 'Cancelling…' : 'Cancel announcement'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
