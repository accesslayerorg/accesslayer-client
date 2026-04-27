import { cn } from '@/lib/utils';

interface CreatorBioProps {
	/** Raw bio string from the creator profile. Anything falsy or whitespace-only is treated as missing. */
	bio?: string | null;
	/** Override the default fallback copy. */
	fallback?: string;
	/** Variant — `card` is muted/italic for list rows, `profile` is slightly more prominent for the detail header. */
	variant?: 'card' | 'profile';
	className?: string;
}

const DEFAULT_FALLBACK = "This creator hasn't shared a bio yet.";

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
	className,
}) => {
	const trimmed = bio?.trim();
	const styles = variantClasses[variant];

	if (!trimmed) {
		return (
			<p className={cn(styles.fallback, className)} aria-label="Bio not provided">
				{fallback}
			</p>
		);
	}

	return <p className={cn(styles.value, className)}>{trimmed}</p>;
};

export default CreatorBio;
