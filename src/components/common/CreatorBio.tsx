import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import {
	lineClampClassFor,
	creatorCardSubtitleClampClass,
} from '@/utils/lineClamp.utils';

interface CreatorBioProps {
	/** Raw bio string from the creator profile. Anything falsy or whitespace-only is treated as missing. */
	bio?: string | null;
	/** Override the default fallback copy. */
	fallback?: string;
	/** Variant — `card` is muted/italic for list rows, `profile` is slightly more prominent for the detail header. */
	variant?: 'card' | 'profile';
	/** If true, returns null instead of a fallback when bio is missing. */
	allowEmpty?: boolean;
	/**
	 * When true and `bio` is empty, swap the generic "no bio" fallback for
	 * the pending-onboarding placeholder (#291) so visitors know the creator
	 * is still setting things up rather than seeing a blank section.
	 */
	isOnboardingPending?: boolean;
	/**
	 * Clamp the rendered bio to at most this many lines on the card (#282).
	 * Only effective for the `card` variant — the `profile` variant always
	 * shows the full bio, so the truncation stays purely cosmetic and the
	 * full text remains accessible on the creator profile page.
	 *
	 * Pass `null` (or omit) to disable clamping; the default is `3` lines on
	 * the card, which matches the card grid's row height and keeps layouts
	 * uniform across varying bio lengths. Short bios are unaffected.
	 */
	maxLines?: number | null;
	/**
	 * Enable auto-collapse with an expand toggle (#315). Only meaningful
	 * for the `profile` variant — on the card the clamp already keeps
	 * layouts compact. When true and the bio exceeds `collapsedMaxLines`,
	 * the bio renders in a collapsed state and a focusable "Show more" /
	 * "Show less" button toggles to the full bio.
	 *
	 * The auto-collapse threshold is heuristic: a character count proxy
	 * for the line count, since we don't have access to the rendered DOM
	 * height during render. Bios below the threshold render without the
	 * toggle (acceptance criterion: short bios are unaffected).
	 */
	collapsible?: boolean;
	/**
	 * Line count to clamp to in the collapsed state (default `4`).
	 * Ignored when `collapsible` is false.
	 */
	collapsedMaxLines?: number;
	/**
	 * Character count above which a `profile`-variant bio is treated as
	 * "long enough to warrant a toggle" (default `200`). Below this we
	 * render the full bio with no toggle — the auto-collapse is only
	 * useful for bios that would actually push other content off-screen.
	 */
	collapseThresholdChars?: number;
	className?: string;
}

const DEFAULT_FALLBACK = "This creator hasn't shared a bio yet.";
/** Default maximum bio lines on the card. */
const DEFAULT_CARD_MAX_LINES = 3;
/** Default maximum lines in the collapsed profile state. */
const DEFAULT_COLLAPSED_LINES = 4;
/** Default char count above which the collapsible toggle is rendered. */
const DEFAULT_COLLAPSE_THRESHOLD_CHARS = 200;

const variantClasses: Record<'card' | 'profile', { value: string; fallback: string }> = {
	card: {
		value: 'text-sm text-white/60 leading-relaxed',
		fallback: 'text-xs italic text-white/35',
	},
	profile: {
		value: 'font-jakarta text-sm text-white/70 leading-relaxed',
		fallback: 'font-jakarta text-sm italic text-white/40',
	},
};

/**
 * Renders a creator bio with a consistent fallback when the bio is missing.
 *
 * Centralizing this keeps wording aligned across the list and profile detail
 * surfaces — change the fallback once and every consumer picks it up.
 */
const CreatorBio: React.FC<CreatorBioProps> = ({
	bio,
	fallback = DEFAULT_FALLBACK,
	variant = 'card',
	allowEmpty = false,
	isOnboardingPending = false,
	maxLines,
	collapsible = false,
	collapsedMaxLines = DEFAULT_COLLAPSED_LINES,
	collapseThresholdChars = DEFAULT_COLLAPSE_THRESHOLD_CHARS,
	className,
}) => {
	const trimmed = bio?.trim();
	const styles = variantClasses[variant];
	const bioId = useId();
	const [expanded, setExpanded] = useState(false);

	if (!trimmed) {
		if (allowEmpty) {
			return null;
		}

		const effectiveFallback = isOnboardingPending
			? 'This creator is still setting up their profile. Bio coming soon.'
			: fallback;
		return (
			<p
				className={cn(styles.fallback, className)}
				aria-label={
					isOnboardingPending
						? 'Bio pending — onboarding in progress'
						: 'Bio not provided'
				}
			>
				{effectiveFallback}
			</p>
		);
	}

	// `collapsible` only applies to the `profile` variant; the card already
	// has its own clamp via `maxLines`. Long enough = above the char
	// threshold (acceptance: short bios are unaffected).
	const shouldOfferCollapse =
		collapsible &&
		variant === 'profile' &&
		trimmed.length > collapseThresholdChars;

	// Card defaults to a 3-line clamp; explicit null disables it. Profile
	// variant ignores `maxLines` unless `collapsible` is engaged, in which
	// case we clamp to `collapsedMaxLines` while collapsed.
	const effectiveMaxLines = shouldOfferCollapse
		? expanded
			? null
			: collapsedMaxLines
		: variant === 'card' && maxLines === undefined
			? DEFAULT_CARD_MAX_LINES
			: maxLines;
	const clampVariant: 'card' | 'profile' = shouldOfferCollapse
		? 'card'
		: variant;
	const clampClass =
		clampVariant === 'card'
			? creatorCardSubtitleClampClass(effectiveMaxLines)
			: lineClampClassFor(clampVariant, effectiveMaxLines);

	const bioParagraph = (
		<p
			id={shouldOfferCollapse ? bioId : undefined}
			// Preserve the full bio in the accessible name so screen readers
			// can read the unclamped text — the visual truncation is cosmetic.
			title={clampClass ? trimmed : undefined}
			className={cn(styles.value, clampClass, className)}
		>
			{trimmed}
		</p>
	);

	if (!shouldOfferCollapse) {
		return bioParagraph;
	}

	return (
		<div className="space-y-1">
			{bioParagraph}
			<button
				type="button"
				aria-expanded={expanded}
				aria-controls={bioId}
				onClick={() => setExpanded(prev => !prev)}
				className="font-jakarta text-xs font-semibold text-amber-300/85 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/55 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-sm"
			>
				{expanded ? 'Show less' : 'Show more'}
			</button>
		</div>
	);
};

export default CreatorBio;
