const createClipboardUnavailableError = () =>
	new Error('Clipboard API is unavailable in this environment.');

const copyWithExecCommandFallback = (text: string): boolean => {
	if (
		typeof document === 'undefined' ||
		!document.body ||
		typeof document.execCommand !== 'function'
	) {
		return false;
	}

	const activeElement =
		document.activeElement instanceof HTMLElement
			? document.activeElement
			: null;
	const textArea = document.createElement('textarea');

	textArea.value = text;
	textArea.setAttribute('readonly', '');
	textArea.setAttribute('aria-hidden', 'true');
	textArea.style.position = 'fixed';
	textArea.style.top = '0';
	textArea.style.left = '0';
	textArea.style.opacity = '0';
	textArea.style.pointerEvents = 'none';

	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
	textArea.setSelectionRange(0, text.length);

	try {
		return document.execCommand('copy');
	} finally {
		document.body.removeChild(textArea);
		activeElement?.focus();
	}
};

export const copyTextToClipboard = async (text: string): Promise<void> => {
	let originalError: unknown;

	try {
		if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
			throw createClipboardUnavailableError();
		}

		await navigator.clipboard.writeText(text);
		return;
	} catch (error) {
		originalError = error;
		console.error(
			'Clipboard API copy failed. Attempting execCommand fallback.',
			error
		);
	}

	if (copyWithExecCommandFallback(text)) {
		return;
	}

	if (originalError instanceof Error) {
		throw originalError;
	}

	throw new Error('Copy to clipboard failed.');
};
