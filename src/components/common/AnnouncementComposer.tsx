import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import PublishingAnnouncement from '@/components/common/PublishingAnnouncement';
import { usePostAnnouncementMutation } from '@/hooks/useCreatorContractActions';
import { useScheduledAnnouncements } from '@/hooks/useScheduledAnnouncements';
import {
	ANNOUNCEMENT_CATEGORY_LABELS,
	ANNOUNCEMENT_CONTENT_MAX_LENGTH,
	validateAnnouncementDraft,
} from '@/utils/announcement.utils';
import {
	ANNOUNCEMENT_CATEGORIES,
	type AnnouncementCategory,
	type ScheduledAnnouncement,
} from '@/services/announcement.service';
import {
	toLocalDatetimeInputValue,
	validateScheduledTime,
} from '@/utils/announcementSchedule.utils';

export const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

export interface AnnouncementComposerProps {
	creatorId: string;
	initialAnnouncement?: ScheduledAnnouncement | null;
	onSuccess?: () => void;
	onCancelEdit?: () => void;
}

export default function AnnouncementComposer({
	creatorId,
	initialAnnouncement,
	onSuccess,
	onCancelEdit,
}: AnnouncementComposerProps) {
	const isEditMode = Boolean(initialAnnouncement);

	const [title, setTitle] = useState(initialAnnouncement?.title ?? '');
	const [category, setCategory] = useState<AnnouncementCategory>(
		initialAnnouncement?.category ?? 'update'
	);
	const [content, setContent] = useState(initialAnnouncement?.content ?? '');
	const [publishMode, setPublishMode] = useState<'now' | 'schedule'>(
		initialAnnouncement ? 'schedule' : 'now'
	);
	const [scheduledDateTime, setScheduledDateTime] = useState(
		initialAnnouncement?.scheduledAt
			? toLocalDatetimeInputValue(new Date(initialAnnouncement.scheduledAt))
			: ''
	);
	const [showError, setShowError] = useState(false);
	const [scheduleTouched, setScheduleTouched] = useState(false);

	const publishNowMutation = usePostAnnouncementMutation(creatorId);
	const { scheduleAnnouncement, updateAnnouncement, isScheduling, isUpdating } =
		useScheduledAnnouncements(creatorId);

	const isPublishingNow = publishNowMutation.isPending;
	const isSubmitting = isPublishingNow || isScheduling || isUpdating;

	const draftError = validateAnnouncementDraft({ title, category, content });
	const remaining = ANNOUNCEMENT_CONTENT_MAX_LENGTH - content.length;

	// Live validation for the schedule time
	const scheduleError = useMemo(() => {
		if (publishMode !== 'schedule') return null;
		if (!scheduledDateTime) return 'Pick a date and time to schedule.';
		return validateScheduledTime(new Date(scheduledDateTime), new Date());
	}, [publishMode, scheduledDateTime]);

	const isScheduleInvalid =
		publishMode === 'schedule' && (!scheduledDateTime || Boolean(scheduleError));
	const isSubmitDisabled = remaining < 0 || isScheduleInvalid;

	const resetForm = () => {
		setTitle('');
		setContent('');
		setCategory('update');
		setPublishMode('now');
		setScheduledDateTime('');
		setShowError(false);
		setScheduleTouched(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		// Re-check draft validation
		if (draftError) {
			setShowError(true);
			return;
		}

		// If scheduling, re-check lead-time validity at submit time since time passes
		if (publishMode === 'schedule') {
			setScheduleTouched(true);
			const liveScheduleError = scheduledDateTime
				? validateScheduledTime(new Date(scheduledDateTime), new Date())
				: 'Pick a date and time to schedule.';

			if (liveScheduleError) {
				setShowError(true);
				return;
			}

			// Local timezone input converted to UTC ISO 8601 for the API
			const scheduledAtUtc = new Date(scheduledDateTime).toISOString();

			if (isEditMode && initialAnnouncement) {
				await updateAnnouncement({
					id: initialAnnouncement.id,
					input: {
						title: title.trim(),
						category,
						content: content.trim(),
						scheduledAt: scheduledAtUtc,
					},
				});
				onSuccess?.();
			} else {
				await scheduleAnnouncement({
					keyId: creatorId,
					title: title.trim(),
					category,
					content: content.trim(),
					scheduledAt: scheduledAtUtc,
				});
				resetForm();
				onSuccess?.();
			}
			return;
		}

		// "Publish now" existing flow
		publishNowMutation.mutate(
			{ title: title.trim(), category, content: content.trim() },
			{
				onSuccess: () => {
					resetForm();
					onSuccess?.();
				},
			}
		);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4"
			noValidate
			data-testid="announcement-composer"
		>
			{/* Mode toggle: Publish now / Schedule */}
			{!isEditMode && (
				<fieldset className="space-y-1.5">
					<legend className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
						Publishing timing
					</legend>
					<div
						role="radiogroup"
						aria-label="Publishing timing"
						className="flex items-center gap-2"
					>
						<label
							htmlFor="publish-mode-now"
							className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
								publishMode === 'now'
									? 'border-amber-400 bg-amber-400/10 text-amber-300'
									: 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white'
							}`}
						>
							<input
								id="publish-mode-now"
								data-testid="publish-mode-now"
								type="radio"
								name="publishMode"
								value="now"
								checked={publishMode === 'now'}
								onChange={() => setPublishMode('now')}
								disabled={isSubmitting}
								className="sr-only"
							/>
							<span>Publish now</span>
						</label>

						<label
							htmlFor="publish-mode-schedule"
							className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
								publishMode === 'schedule'
									? 'border-amber-400 bg-amber-400/10 text-amber-300'
									: 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white'
							}`}
						>
							<input
								id="publish-mode-schedule"
								data-testid="publish-mode-schedule"
								type="radio"
								name="publishMode"
								value="schedule"
								checked={publishMode === 'schedule'}
								onChange={() => setPublishMode('schedule')}
								disabled={isSubmitting}
								className="sr-only"
							/>
							<span>Schedule</span>
						</label>
					</div>
				</fieldset>
			)}

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
						disabled={isSubmitting}
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
						onChange={e => setCategory(e.target.value as AnnouncementCategory)}
						disabled={isSubmitting}
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

			{/* Date/time picker when Schedule is active */}
			{publishMode === 'schedule' && (
				<div className="space-y-1.5" data-testid="schedule-time-section">
					<label
						htmlFor="announcement-schedule-input"
						className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
					>
						Scheduled Date &amp; Time (Local time)
					</label>
					<input
						id="announcement-schedule-input"
						data-testid="announcement-schedule-input"
						type="datetime-local"
						value={scheduledDateTime}
						onChange={e => {
							setScheduledDateTime(e.target.value);
							setScheduleTouched(true);
						}}
						disabled={isSubmitting}
						aria-invalid={
							(showError || scheduleTouched) && scheduleError ? true : undefined
						}
						aria-describedby={
							(showError || scheduleTouched) && scheduleError
								? 'announcement-schedule-error'
								: undefined
						}
						className={fieldClass}
					/>
					{(showError || scheduleTouched) && scheduleError && (
						<p
							id="announcement-schedule-error"
							role="alert"
							data-testid="announcement-schedule-error"
							className="text-xs text-red-400"
						>
							{scheduleError}
						</p>
					)}
				</div>
			)}

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
					disabled={isSubmitting}
					placeholder="Share an update with your key holders."
					aria-invalid={showError && remaining < 0 ? 'true' : undefined}
					className={fieldClass}
				/>
			</div>

			{showError && draftError && (
				<p
					role="alert"
					data-testid="announcement-error"
					className="text-xs text-red-400"
				>
					{draftError}
				</p>
			)}

			{isPublishingNow ? (
				<PublishingAnnouncement />
			) : (
				<div className="flex items-center gap-3">
					<Button
						type="submit"
						data-testid="announcement-submit"
						disabled={isSubmitDisabled || isSubmitting}
					>
						{isEditMode
							? 'Save changes'
							: publishMode === 'schedule'
								? isScheduling
									? 'Scheduling…'
									: 'Schedule announcement'
								: 'Publish announcement'}
					</Button>
					{isEditMode && onCancelEdit && (
						<Button
							type="button"
							variant="outline"
							data-testid="announcement-cancel-edit"
							onClick={onCancelEdit}
							disabled={isSubmitting}
						>
							Cancel editing
						</Button>
					)}
				</div>
			)}
		</form>
	);
}
