import React from 'react';

export function highlightMatchingSubstring(
	text: string,
	query: string
): React.ReactNode {
	if (!query.trim()) return text;
	const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`(${escaped})`, 'gi');
	const parts = text.split(regex);

	return parts.map((part, i) =>
		regex.test(part) ? (
			<b key={i} className="font-bold text-amber-400">
				{part}
			</b>
		) : (
			<React.Fragment key={i}>{part}</React.Fragment>
		)
	);
}
