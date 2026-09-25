/**
 * Display-only normalisation for creator handles (issue #298).
 *
 * Handles come from a few different sources — the API's `instructorId`, the
 * user-provided `socialHandle`, and search input — with inconsistent casing
 * and an optional leading "@". This helper produces a single display form so
 * the same creator's handle renders the same way on the card, the profile
 * header, and anywhere else we surface it.
 *
 * Rule: strip a leading "@", trim whitespace, lowercase, then prepend a
 * single "@". Empty or whitespace-only input becomes an empty string so
 * callers can decide whether to fall back to a placeholder.
 *
 * IMPORTANT: this is **display only**. Callers must keep using the raw
 * stored value for equality checks, URL construction, etc.; passing the
 * formatted value back to the API would lose the original casing.
 */
export const formatCreatorHandle = (raw: string | null | undefined): string => {
	if (raw == null) return '';
	const trimmed = raw.trim();
	if (trimmed === '') return '';
	const withoutLeadingAt = trimmed.startsWith('@')
		? trimmed.slice(1)
		: trimmed;
	const normalised = withoutLeadingAt.trim().toLowerCase();
	if (normalised === '') return '';
	return `@${normalised}`;
};

/**
 * Truncates a creator handle to a maximum length, appending an ellipsis
 * only when truncation occurs.
 */
export const truncateHandle = (
	handle: string,
	maxLength: number = 20
): string => {
	if (!handle) return '';
	if (handle.length <= maxLength) {
		return handle;
	}
	return `${handle.slice(0, maxLength)}...`;
};
