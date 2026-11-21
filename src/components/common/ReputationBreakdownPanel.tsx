import React, { useMemo } from 'react';
import {
	Radar,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	ResponsiveContainer,
	Tooltip as ChartTooltip,
} from 'recharts';
import { Info, ShieldCheck } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import Skeleton from '@/components/ui/skeleton';
import { useKeyReputation } from '@/hooks/useKeyReputation';
import {
	REPUTATION_METHODOLOGY_TOOLTIP,
	REPUTATION_SCORE_MAX,
	buildReputationRadarData,
	formatReputationScore,
	reputationTier,
} from '@/utils/keyReputation.utils';
import { cn } from '@/lib/utils';

export interface ReputationBreakdownPanelProps {
	keyId: string;
	className?: string;
}

const TIER_TEXT_CLASSNAMES: Record<string, string> = {
	excellent: 'text-emerald-300',
	good: 'text-amber-300',
	fair: 'text-orange-300',
	poor: 'text-rose-300',
};

/**
 * Expanded reputation breakdown for the key detail page (#1143): the
 * composite score, a radar chart of the four underlying metrics, and the
 * raw per-metric values. Score is fetched from `GET /keys/:key_id/reputation`.
 */
export const ReputationBreakdownPanel: React.FC<
	ReputationBreakdownPanelProps
> = ({ keyId, className }) => {
	const { data, isLoading, isError } = useKeyReputation(keyId);

	const radarData = useMemo(() => buildReputationRadarData(data), [data]);

	if (isLoading) {
		return (
			<div
				className={cn('space-y-4', className)}
				data-testid="reputation-breakdown-loading"
				role="status"
			>
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<p
				role="alert"
				className={cn('text-sm text-red-300', className)}
				data-testid="reputation-breakdown-error"
			>
				Couldn&apos;t load the reputation score. Please try again later.
			</p>
		);
	}

	const tier = reputationTier(data.score);

	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.03] p-5',
				className
			)}
			data-testid="reputation-breakdown-panel"
		>
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
				<div className="flex items-center gap-2.5">
					<div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
						<ShieldCheck className="size-4" />
					</div>
					<h3 className="font-grotesque text-base font-bold tracking-tight text-white">
						Reputation Score
					</h3>
					<Tooltip content={REPUTATION_METHODOLOGY_TOOLTIP}>
						<button
							type="button"
							className="text-white/30 hover:text-white/60 focus:outline-hidden"
							aria-label="Explain reputation score methodology"
						>
							<Info className="size-3.5" />
						</button>
					</Tooltip>
				</div>
				<div
					data-testid="reputation-breakdown-score"
					className={cn(
						'font-jakarta text-2xl font-black tabular-nums',
						TIER_TEXT_CLASSNAMES[tier]
					)}
				>
					{formatReputationScore(data.score)}
					<span className="ml-1 text-sm font-semibold text-white/40">
						/ {REPUTATION_SCORE_MAX}
					</span>
				</div>
			</div>

			<div className="mt-4" style={{ height: 260 }} data-testid="reputation-radar-chart">
				<ResponsiveContainer width="100%" height="100%">
					<RadarChart data={radarData}>
						<PolarGrid stroke="rgba(255,255,255,0.08)" />
						<PolarAngleAxis
							dataKey="metric"
							stroke="rgba(255,255,255,0.5)"
							fontSize={11}
						/>
						<PolarRadiusAxis
							domain={[0, 100]}
							tick={false}
							axisLine={false}
						/>
						<ChartTooltip
							formatter={(_value, _name, entry) => [
								`${entry.payload.value} / ${REPUTATION_SCORE_MAX}`,
								entry.payload.metric,
							]}
						/>
						<Radar
							dataKey="normalized"
							stroke="#fbbf24"
							fill="#fbbf24"
							fillOpacity={0.35}
							isAnimationActive={false}
						/>
					</RadarChart>
				</ResponsiveContainer>
			</div>

			<dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{radarData.map(point => (
					<div
						key={point.metric}
						data-testid={`reputation-metric-${point.metric.toLowerCase().replace(/\s+/g, '-')}`}
					>
						<dt className="text-xs text-white/50">{point.metric}</dt>
						<dd className="text-sm font-bold tabular-nums text-white">
							{point.value} / {REPUTATION_SCORE_MAX}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
};

export default ReputationBreakdownPanel;
