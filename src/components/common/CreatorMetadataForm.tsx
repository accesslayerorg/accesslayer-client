import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
	CREATOR_BIO_MAX_LENGTH,
	CREATOR_NAME_MAX_LENGTH,
	diffCreatorMetadata,
	validateCreatorMetadata,
	type CreatorMetadataChange,
	type CreatorMetadataDraft,
} from '@/utils/creatorMetadata.utils';

export interface CreatorMetadataFormProps {
	initialName: string;
	initialBio: string;
	initialAvatarUri: string;
	/** Receives only the fields that changed. Never called with an empty change. */
	onSubmit: (change: CreatorMetadataChange) => void;
	isSubmitting?: boolean;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

function CharacterCounter({
	length,
	max,
	testId,
}: {
	length: number;
	max: number;
	testId: string;
}) {
	const over = length > max;
	return (
		<span
			data-testid={testId}
			aria-live="polite"
			className={cn(
				'text-xs font-medium tabular-nums',
				over ? 'text-red-400' : length > max - 20 ? 'text-amber-400' : 'text-white/40'
			)}
		>
			{length} / {max}
		</span>
	);
}

/**
 * Edit Profile form for the creator dashboard settings tab (#818).
 *
 * Pre-fills from the current metadata, shows live character counters, blocks
 * submission when the name (64) or bio (256) limits are exceeded, and submits
 * only the fields that actually changed via `onSubmit`.
 */
const CreatorMetadataForm: React.FC<CreatorMetadataFormProps> = ({
	initialName,
	initialBio,
	initialAvatarUri,
	onSubmit,
	isSubmitting = false,
}) => {
	const initial = useMemo<CreatorMetadataDraft>(
		() => ({ name: initialName, bio: initialBio, avatarUri: initialAvatarUri }),
		[initialName, initialBio, initialAvatarUri]
	);

	const [draft, setDraft] = useState<CreatorMetadataDraft>(initial);

	// Re-sync when the upstream metadata changes (e.g. after a successful save
	// invalidates and refetches the creator detail query).
	useEffect(() => {
		setDraft(initial);
	}, [initial]);

	const { nameError, bioError, isValid } = validateCreatorMetadata(draft);
	const change = diffCreatorMetadata(initial, draft);
	const hasChange = Object.keys(change).length > 0;
	const canSubmit = isValid && hasChange && !isSubmitting;

	const update = (field: keyof CreatorMetadataDraft, value: string) => {
		setDraft(prev => ({ ...prev, [field]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit) return;
		onSubmit(change);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-5"
			data-testid="creator-metadata-form"
			noValidate
		>
			<div className="space-y-1.5">
				<div className="flex items-center justify-between gap-2">
					<label
						htmlFor="creator-metadata-name"
						className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
					>
						Display name
					</label>
					<CharacterCounter
						length={draft.name.length}
						max={CREATOR_NAME_MAX_LENGTH}
						testId="metadata-name-counter"
					/>
				</div>
				<input
					id="creator-metadata-name"
					className={fieldClass}
					value={draft.name}
					onChange={e => update('name', e.target.value)}
					disabled={isSubmitting}
					aria-invalid={nameError ? 'true' : undefined}
					aria-describedby={nameError ? 'metadata-name-error' : undefined}
				/>
				{nameError && (
					<p id="metadata-name-error" role="alert" data-testid="metadata-name-error" className="text-xs text-red-400">
						{nameError}
					</p>
				)}
			</div>

			<div className="space-y-1.5">
				<div className="flex items-center justify-between gap-2">
					<label
						htmlFor="creator-metadata-bio"
						className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
					>
						Bio
					</label>
					<CharacterCounter
						length={draft.bio.length}
						max={CREATOR_BIO_MAX_LENGTH}
						testId="metadata-bio-counter"
					/>
				</div>
				<Textarea
					id="creator-metadata-bio"
					className={cn(fieldClass, 'min-h-24')}
					value={draft.bio}
					onChange={e => update('bio', e.target.value)}
					disabled={isSubmitting}
					aria-invalid={bioError ? 'true' : undefined}
					aria-describedby={bioError ? 'metadata-bio-error' : undefined}
				/>
				{bioError && (
					<p id="metadata-bio-error" role="alert" data-testid="metadata-bio-error" className="text-xs text-red-400">
						{bioError}
					</p>
				)}
			</div>

			<div className="space-y-1.5">
				<label
					htmlFor="creator-metadata-avatar"
					className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
				>
					Avatar URI
				</label>
				<input
					id="creator-metadata-avatar"
					className={fieldClass}
					value={draft.avatarUri}
					onChange={e => update('avatarUri', e.target.value)}
					disabled={isSubmitting}
					placeholder="https://…"
				/>
			</div>

			<Button type="submit" data-testid="metadata-submit" disabled={!canSubmit}>
				{isSubmitting ? 'Saving…' : 'Save changes'}
			</Button>
		</form>
	);
};

export default CreatorMetadataForm;
