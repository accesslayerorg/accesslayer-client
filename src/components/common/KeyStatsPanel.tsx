import Skeleton from '@/components/ui/skeleton';
import { AccessibleInfoTrigger } from '@/components/common/AccessibleInfoTrigger';
import { KEY_STAT_DEFINITIONS } from '@/components/common/keyStatDefinitions';
import type { KeyStats } from '@/services/course.service';

interface KeyStatsPanelProps {
	stats?: KeyStats | null;
	/** True only during the initial fetch (no data yet). */
	isLoading?: boolean;
	isError?: boolean;
}

/**
 * Key statistics panel for the creator key detail page (#952).
 *
 * Labels and tooltips render in every state and each value slot has a fixed
 * height, so the initial skeleton and the 30s background refreshes never
 * shift the surrounding layout.
 */
const KeyStatsPanel: React.FC<KeyStatsPanelProps> = ({
	stats,
	isLoading = false,
	isError = false,
}) => {
	const showSkeleton = isLoading && !stats;
	const showError = isError && !stats && !isLoading;

	return (
		<section
			aria-labelledby="key-stats-heading"
			aria-busy={showSkeleton}
			className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
			data-testid="key-stats-panel"
		>
			<h2
				id="key-stats-heading"
				className="font-grotesque text-xl font-black tracking-tight text-white mb-6"
			>
				Key Stats
			</h2>
			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{KEY_STAT_DEFINITIONS.map(stat => (
					<div
						key={stat.key}
						className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
						data-testid={`key-stat-${stat.key}`}
					>
						<dt className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
							<span className="truncate">{stat.label}</span>
							<AccessibleInfoTrigger
								explanation={stat.explanation}
								label={`Explanation for: ${stat.label}`}
							/>
						</dt>
						<dd className="mt-2.5 flex h-7 items-center font-jakarta text-base font-bold tabular-nums text-white md:text-[1.05rem]">
							{showSkeleton ? (
								<Skeleton className="h-5 w-20" />
							) : (
								<span
									className="truncate"
									data-testid={`key-stat-${stat.key}-value`}
								>
									{stat.format(stats?.[stat.key])}
								</span>
							)}
						</dd>
					</div>
				))}
			</dl>
			{showSkeleton && (
				<span role="status" className="sr-only">
					Loading key stats
				</span>
			)}
			{showError && (
				<p role="alert" className="mt-4 text-xs text-rose-300/80">
					Key stats are temporarily unavailable.
				</p>
			)}
		</section>
	);
};

export default KeyStatsPanel;
