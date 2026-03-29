import * as React from 'react';

interface TooltipProps {
	content: string;
	children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
	return (
		<div className="relative inline-flex group">
			{children}

			<div
				role="tooltip"
				className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs text-white shadow-md group-hover:block group-focus-within:block"
			>
				{content}
			</div>
		</div>
	);
}
