const DEFAULT_MAX_LENGTH = 28;

/**
 * Truncates a creator display name to `maxLength` characters, appending "…"
 * when truncation occurs.  Returns the original string unchanged when it fits.
 */
export function truncateCreatorName(
	name: string,
	maxLength: number = DEFAULT_MAX_LENGTH,
): string {
	if (!name) return name;
	if (name.length <= maxLength) return name;
	return `${name.slice(0, maxLength).trimEnd()}…`;
}
