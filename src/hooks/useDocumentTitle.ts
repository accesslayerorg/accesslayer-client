import { useEffect } from 'react';

const DEFAULT_DOCUMENT_TITLE =
	'Access Layer | Creator Keys Marketplace on Stellar';

export function useDocumentTitle(title: string | null | undefined) {
	useEffect(() => {
		if (typeof document === 'undefined' || !title) return;

		document.title = title;

		return () => {
			document.title = DEFAULT_DOCUMENT_TITLE;
		};
	}, [title]);
}
