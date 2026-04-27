/**
 * Returns true when `file` matches the comma-separated `accept` string used
 * by `<input type="file" accept="...">`. Mirrors browser semantics: each
 * token is an extension (`.png`), a MIME type (`image/png`), or a wildcard
 * (`image/*`). An empty `accept` accepts everything.
 */
export function isFileAccepted(file: File, accept: string): boolean {
	const tokens = accept
		.split(',')
		.map(token => token.trim().toLowerCase())
		.filter(Boolean);
	if (tokens.length === 0) return true;

	const fileType = file.type.toLowerCase();
	const fileName = file.name.toLowerCase();

	return tokens.some(token => {
		if (token.startsWith('.')) {
			return fileName.endsWith(token);
		}
		if (token.endsWith('/*')) {
			return fileType.startsWith(token.slice(0, -1));
		}
		return fileType === token;
	});
}

/** User-facing helper text shown when a file's format is rejected. */
export function unsupportedFormatMessage(accept: string): string {
	const formats = accept
		.split(',')
		.map(token => token.trim())
		.filter(Boolean)
		.map(token => (token.startsWith('.') ? token.slice(1) : token))
		.map(token => token.toUpperCase());
	if (formats.length === 0) {
		return "That file format isn't supported. Pick a different file.";
	}
	return `That file format isn't supported. Use ${formats.join(', ')}.`;
}
