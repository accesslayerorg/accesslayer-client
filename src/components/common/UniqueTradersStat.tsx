import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { AccessibleInfoTrigger } from '@/components/common/AccessibleInfoTrigger';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	getUniqueTradersTrend,
	type UniqueTradersTrend,
} from '@/utils/uniqueTraders.utils';
import type { KeyUniqueTraders } from '@/services/course.service';

export const UNIQUE_TRADERS_LABEL = 'Unique Traders';
export const UNIQUE_TRADERS_EXPLANATION =
	'Number of distinct wallets that have bought or sold this key at least once.';

interface UniqueTradersStatProps {
	data?: KeyUniqueTraders | null;
	/** True only during the initial fetch (no data yet). */
	isLoading?: boolean;
}

const TREND_STYLES = {
	up: { Icon: ArrowUpRight, className: 'text-emerald-300', word: 'Up' },
	down: { Icon: ArrowDownRight, className: 'text-rose-300', word: 'Down' },
	flat: { Icon: Minus, className: 'text-white/40', word: 'No change' },
} as const;

/**
 * Unique trader count cell for the key stats panel (#1020). Uses the same
 * fixed-height cell as the other stats so the 5-minute refreshes never shift
 * the layout.
 */
const UniqueTradersStat: React.FC<UniqueTradersStatProps> = ({
	data,
	isLoading = false,
}) => {
	const showSkeleton = isLoading && !data;
	const current = data?.uniqueTraders;
	const trend = getUniqueTradersTrend(current, data?.uniqueTraders24hAgo);

	return (
		<div
			className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
			data-testid="key-stat-uniqueTraders"
		>
			<dt className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
				<span className="truncate">{UNIQUE_TRADERS_LABEL}</span>
				<AccessibleInfoTrigger
					explanation={UNIQUE_TRADERS_EXPLANATION}
					label={`Explanation for: ${UNIQUE_TRADERS_LABEL}`}
				/>
			</dt>
			<dd className="mt-2.5 flex h-7 items-center gap-2 font-jakarta text-base font-bold tabular-nums text-white md:text-[1.05rem]">
				{showSkeleton ? (
					<Skeleton className="h-5 w-20" />
				) : (
					<>
						<span
							className="truncate"
							data-testid="key-stat-uniqueTraders-value"
						>
							{formatNumber(current)}
						</span>
						{trend && <TrendIndicator {...trend} />}
					</>
				)}
			</dd>
		</div>
	);
};

const TrendIndicator: React.FC<UniqueTradersTrend> = ({ direction, delta }) => {
	const { Icon, className, word } = TREND_STYLES[direction];
	const label =
		direction === 'flat'
			? 'No change vs previous 24 hours'
			: `${word} ${formatNumber(delta)} vs previous 24 hours`;
	const sign = direction === 'up' ? '+' : direction === 'down' ? '−' : '';

	return (
		<span
			className={`flex shrink-0 items-center gap-0.5 text-xs font-semibold ${className}`}
			data-testid="key-stat-uniqueTraders-trend"
			data-direction={direction}
			role="img"
			aria-label={label}
			title={label}
		>
			<Icon className="h-3.5 w-3.5" aria-hidden="true" />
			{direction !== 'flat' && (
				<span aria-hidden="true">
					{sign}
					{formatNumber(delta)}
				</span>
			)}
		</span>
	);
};

export default UniqueTradersStat;
