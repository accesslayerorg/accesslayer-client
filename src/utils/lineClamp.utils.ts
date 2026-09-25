/**
 * Tailwind `line-clamp` utility selector keyed by line count and bio variant
 * (issue #282). Lives outside the React component file so importing it
 * doesn't break the file's Fast-Refresh boundary.
 *
 * The mapping uses fixed class names rather than `line-clamp-${n}` so
 * Tailwind's JIT keeps these utilities in the produced CSS bundle.
 */
export const lineClampClassFor = (
	variant: 'card' | 'profile',
	maxLines: number | null | undefined
): string => {
	if (variant !== 'card') return '';
	if (maxLines == null || maxLines <= 0) return '';
	switch (maxLines) {
		case 1:
			return 'line-clamp-1';
		case 2:
			return 'line-clamp-2';
		case 3:
			return 'line-clamp-3';
		case 4:
			return 'line-clamp-4';
		case 5:
			return 'line-clamp-5';
		case 6:
			return 'line-clamp-6';
		default:
			// Anything beyond 6 lines: cap at 6 to keep the card height bounded.
			return 'line-clamp-6';
	}
};

/**
 * Default line clamp count for creator card subtitles and bio descriptions.
 */
export const DEFAULT_CREATOR_CARD_SUBTITLE_MAX_LINES = 2;

/**
 * Returns the Tailwind `line-clamp` class for creator card subtitles and bio descriptions.
 * Uses `DEFAULT_CREATOR_CARD_SUBTITLE_MAX_LINES` (2 lines) if maxLines is omitted.
 */
export const creatorCardSubtitleClampClass = (
	maxLines: number | null | undefined = DEFAULT_CREATOR_CARD_SUBTITLE_MAX_LINES
): string => {
	return lineClampClassFor('card', maxLines);
};
