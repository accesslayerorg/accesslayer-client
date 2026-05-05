/**
 * Truncates a creator name to a maximum character length, appending an ellipsis
 * when the name exceeds the limit.
 *
 * @param name - The creator name to truncate.
 * @param maxLength - Maximum number of characters before truncation. Defaults to 24.
 * @returns The original name if within limit, or a truncated version ending with `…`.
 */
export function truncateCreatorName(name: string, maxLength = 24): string {
	if (!name) return '';
	const trimmed = name.trim();
	if (trimmed.length <= maxLength) return trimmed;
	return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}
