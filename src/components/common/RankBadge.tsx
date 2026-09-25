import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankBadgeProps {
	rank: number;
	className?: string;
	/** Data-testid for testing */
	dataTestid?: string;
}

/**
 * Renders a rank badge with medal icons for top 3 ranks.
 *
 * - Rank 1: Gold medal
 * - Rank 2: Silver medal
 * - Rank 3: Bronze medal
 * - Rank 4+: Plain number
 */
export default function RankBadge({
	rank,
	className,
	dataTestid = 'rank-badge',
}: RankBadgeProps) {
	// Determine medal color based on rank
	const getMedalColor = (r: number) => {
		switch (r) {
			case 1:
				return 'text-amber-500'; // Gold
			case 2:
				return 'text-gray-400'; // Silver
			case 3:
				return 'text-amber-700'; // Bronze
			default:
				return 'text-gray-500';
		}
	};

	const badgeBaseClasses = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-jakarta text-[10px] font-bold uppercase tracking-wider';

	// Render medal badge for ranks 1-3
	if (rank >= 1 && rank <= 3) {
		const bgColor =
			rank === 1
				? 'bg-amber-100'
				: rank === 2
					? 'bg-gray-100'
					: 'bg-amber-50';

		const textColor =
			rank === 1
				? 'text-amber-700'
				: rank === 2
					? 'text-gray-600'
					: 'text-amber-700';

		const medalColor = getMedalColor(rank);

		return (
			<span
				className={cn(badgeBaseClasses, bgColor, textColor, className)}
				data-testid={dataTestid}
				aria-label={`Rank ${rank} - ${['Gold', 'Silver', 'Bronze'][rank - 1]} medal`}
			>
				<Medal
					className={cn('size-3 fill-current', medalColor)}
					data-testid={`rank-${rank}-medal`}
				/>
				{rank === 1 && 'Top'}
				{rank === 2 && '2nd'}
				{rank === 3 && '3rd'}
			</span>
		);
	}

	// Render plain number for rank 4+
	return (
		<span
			className={cn(
				badgeBaseClasses,
				'bg-gray-100 text-gray-500',
				className
			)}
			data-testid={dataTestid}
			aria-label={`Rank ${rank}`}
		>
			#{rank}
		</span>
	);
}
