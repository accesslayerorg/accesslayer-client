import { useState } from 'react';
import { Button } from '@/components/ui/button';
import PublishingAnnouncement from '@/components/common/PublishingAnnouncement';
import { useCreatorAnnouncements } from '@/hooks/useCreatorAnnouncements';
import { usePostAnnouncementMutation } from '@/hooks/useCreatorContractActions';
import {
	ANNOUNCEMENT_CATEGORY_LABELS,
	ANNOUNCEMENT_CONTENT_MAX_LENGTH,
	formatAnnouncementDate,
	validateAnnouncementDraft,
} from '@/utils/announcement.utils';
import {
	ANNOUNCEMENT_CATEGORIES,
	type AnnouncementCategory,
} from '@/services/announcement.service';

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

interface CreatorAnnouncementsPanelProps {
	creatorId: string;
}

/**
 * Creator dashboard composer for announcements to key holders (#1159).
 * Content is pinned to IPFS on submit; the returned hash is what gets posted
 * on-chain alongside the title and category.
 */
export default function CreatorAnnouncementsPanel({
	creatorId,
}: CreatorAnnouncementsPanelProps) {
	const [title, setTitle] = useState('');
	const [category, setCategory] = useState<AnnouncementCategory>('update');
	const [content, setContent] = useState('');
	const [showError, setShowError] = useState(false);

	const { announcements, isLoading, isError } =
		useCreatorAnnouncements(creatorId);
	const publish = usePostAnnouncementMutation(creatorId);

	const validationError = validateAnnouncementDraft({ title, category, content });
	const remaining = ANNOUNCEMENT_CONTENT_MAX_LENGTH - content.length;
	const isPublishing = publish.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isPublishing) return;
		if (validationError) {
			setShowError(true);
			return;
		}

		publish.mutate(
			{ title: title.trim(), category, content: content.trim() },
			{
				onSuccess: () => {
					setTitle('');
					setContent('');
					setCategory('update');
					setShowError(false);
				},
			}
		);
	};

	return (
		<div className="space-y-6" data-testid="creator-announcements-panel">
			<form onSubmit={handleSubmit} className="space-y-4" noValidate>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_12rem]">
					<div className="space-y-1.5">
						<label
							htmlFor="announcement-title"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Title
						</label>
						<input
							id="announcement-title"
							data-testid="announcement-title-input"
							type="text"
							maxLength={120}
							value={title}
							onChange={e => setTitle(e.target.value)}
							disabled={isPublishing}
							placeholder="What's new?"
							className={fieldClass}
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="announcement-category"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Category
						</label>
						<select
							id="announcement-category"
							data-testid="announcement-category-select"
							value={category}
							onChange={e =>
								setCategory(e.target.value as AnnouncementCategory)
							}
							disabled={isPublishing}
							className={fieldClass}
						>
							{ANNOUNCEMENT_CATEGORIES.map(value => (
								<option key={value} value={value} className="bg-[#06111f]">
									{ANNOUNCEMENT_CATEGORY_LABELS[value]}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<label
							htmlFor="announcement-content"
							className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
						>
							Content
						</label>
						<span
							data-testid="announcement-char-count"
							aria-live="polite"
							className={
								remaining < 0 ? 'text-xs text-red-400' : 'text-xs text-white/40'
							}
						>
							{content.length}/{ANNOUNCEMENT_CONTENT_MAX_LENGTH}
						</span>
					</div>
					<textarea
						id="announcement-content"
						data-testid="announcement-content-input"
						rows={5}
						value={content}
						onChange={e => setContent(e.target.value)}
						disabled={isPublishing}
						placeholder="Share an update with your key holders."
						aria-invalid={showError && remaining < 0 ? 'true' : undefined}
						className={fieldClass}
					/>
				</div>

				{showError && validationError && (
					<p role="alert" data-testid="announcement-error" className="text-xs text-red-400">
						{validationError}
					</p>
				)}

				{isPublishing ? (
					<PublishingAnnouncement />
				) : (
					<Button
						type="submit"
						data-testid="announcement-submit"
						disabled={remaining < 0}
					>
						Publish announcement
					</Button>
				)}
			</form>

			<section aria-labelledby="posted-announcements-heading">
				<h3
					id="posted-announcements-heading"
					className="mb-3 font-grotesque text-base font-black"
				>
					Posted announcements
				</h3>

				{isLoading && <p className="text-sm text-white/50">Loading announcements…</p>}
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
