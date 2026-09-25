import React from 'react';
import { cn } from '@/lib/utils';

export type TransactionType = 'buy' | 'sell' | string;

interface TransactionTypeBadgeProps {
	type?: TransactionType | null;
	className?: string;
}

export const TransactionTypeBadge: React.FC<TransactionTypeBadgeProps> = ({
	type,
	className,
}) => {
	const normalizedType = typeof type === 'string' ? type.toLowerCase() : '';

	let label = 'Unknown';
	let colorClass = 'bg-gray-500/10 text-gray-400 border-gray-500/20';

	if (normalizedType === 'buy') {
		label = 'Buy';
		colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
	} else if (normalizedType === 'sell') {
		label = 'Sell';
		colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
	}

	return (
		<span
			data-testid={`transaction-type-badge-${normalizedType || 'unknown'}`}
			className={cn(
				'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
				colorClass,
				className
			)}
		>
			{label}
		</span>
	);
};

export default TransactionTypeBadge;
