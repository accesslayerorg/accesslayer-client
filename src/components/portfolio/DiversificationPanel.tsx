import { useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import CorrelationMatrix from '@/components/portfolio/CorrelationMatrix';
import {
	usePortfolioCorrelation,
	type CorrelationPosition,
} from '@/hooks/usePortfolioCorrelation';
import type { SnapshotHistoryRange } from '@/services/keySnapshotHistory.service';
import {
	HIGH_CORRELATION_THRESHOLD,
	MIN_HISTORY_DAYS,
	formatCorrelation,
} from '@/utils/portfolioCorrelation.utils';

const RANGES: { value: SnapshotHistoryRange; label: string }[] = [
	{ value: '30d', label: '30D' },
	{ value: '90d', label: '90D' },
	{ value: 'all', label: 'All' },
];

const SCORE_TONE: Record<string, string> = {
	'Well diversified': 'text-emerald-300',
	'Moderately diversified': 'text-lime-300',
	Concentrated: 'text-amber-300',
	'Highly concentrated': 'text-red-300',
};

interface DiversificationPanelProps {
	positions: readonly CorrelationPosition[];
	className?: string;
}

/**
 * Portfolio diversification analysis (#1474): how the held keys move
 * together (Correlation) and how value is spread across them (Concentration).
 */
export default function DiversificationPanel({
	positions,
	className,
}: DiversificationPanelProps) {
	const [range, setRange] = useState<SnapshotHistoryRange>('90d');
	const analysis = usePortfolioCorrelation(range, positions);
	const names = useMemo(
		() => Object.fromEntries(positions.map(p => [p.keyId, p.name])),
		[positions]
	);
	const { diversification, keys, highPairs, excluded, weights } = analysis;

	return (
		<section
			aria-labelledby="diversification-heading"
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.02] p-5',
				className
			)}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2
						id="diversification-heading"
						className="font-grotesque text-lg font-black tracking-tight"
					>
						Diversification
					</h2>
					<p className="mt-1 text-sm text-white/55">
						Whether your keys rise and fall together, and how much of your
						value sits in a few of them.
					</p>
				</div>
				<div role="group" aria-label="History range" className="flex gap-1">
					{RANGES.map(r => (
						<button
							key={r.value}
							type="button"
							aria-pressed={range === r.value}
							onClick={() => setRange(r.value)}
							className={cn(
								'rounded-lg px-2.5 py-1 font-mono text-xs font-bold',
								range === r.value
									? 'bg-amber-400 text-slate-950'
									: 'bg-white/5 text-white/60 hover:bg-white/10'
							)}
						>
							{r.label}
						</button>
					))}
				</div>
			</div>

			{analysis.isLoading ? (
				<div className="mt-4 space-y-2" aria-busy="true">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-40 w-full" />
				</div>
			) : analysis.isError ? (
				<p role="alert" className="mt-4 text-sm text-red-300">
					Price history could not be loaded, so diversification cannot be
					analysed right now.
				</p>
			) : (
				<>
					<div className="mt-4 flex flex-wrap items-baseline gap-3">
						<p
							className="font-mono text-3xl font-bold"
							data-testid="diversification-score"
						>
							{diversification.score}
							<span className="text-base text-white/40">/100</span>
						</p>
						<p
							className={cn(
								'text-sm font-bold',
								SCORE_TONE[diversification.label]
							)}
						>
							{diversification.label}
						</p>
					</div>
					<p className="mt-1 text-sm text-white/60">
						{diversification.summary}
					</p>

					{excluded.length > 0 && (
						<p
							role="note"
							className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60"
						>
							<Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span>
								Left out because they have less than {MIN_HISTORY_DAYS} days of
								price history:{' '}
								{excluded
									.map(e => `${e.name} (${e.days} day${e.days === 1 ? '' : 's'})`)
									.join(', ')}
								.
							</span>
						</p>
					)}

					{keys.length < 2 ? (
						<p className="mt-4 text-sm text-white/55">
							Correlation needs at least two keys with {MIN_HISTORY_DAYS}+ days
							of history.
						</p>
					) : (
						<Tabs defaultValue="correlation" className="mt-4">
							<TabsList>
								<TabsTrigger value="correlation">Correlation</TabsTrigger>
								<TabsTrigger value="concentration">Concentration</TabsTrigger>
							</TabsList>
							<TabsContent value="correlation" className="space-y-4 pt-3">
								<CorrelationMatrix matrix={analysis.matrix} names={names} />
								{highPairs.length > 0 && (
									<div
										role="status"
										className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm"
									>
										<p className="flex items-center gap-2 font-bold text-red-200">
											<AlertTriangle className="size-4" aria-hidden="true" />
											Highly correlated (above {HIGH_CORRELATION_THRESHOLD})
										</p>
										<ul className="mt-2 space-y-1 text-white/70">
											{highPairs.map(p => (
												<li key={`${p.a}-${p.b}`}>
													{names[p.a] ?? p.a} and {names[p.b] ?? p.b}:{' '}
													{formatCorrelation(p.correlation)}. They tend to move
													as one position; consider reducing one of them if you
													want less overlap.
												</li>
											))}
										</ul>
									</div>
								)}
							</TabsContent>
							<TabsContent value="concentration" className="pt-3">
								<ul className="space-y-2" aria-label="Share of analysed value">
									{keys.map(k => {
										const w = weights.get(k.keyId) ?? 0;
										return (
											<li key={k.keyId} className="text-sm">
												<div className="flex justify-between">
													<span>{k.name}</span>
													<span className="font-mono text-white/70">
														{(w * 100).toFixed(1)}%
													</span>
												</div>
												<div
													className="mt-1 h-2 rounded-full bg-white/5"
													aria-hidden="true"
												>
													<div
														className="h-2 rounded-full bg-amber-400"
														style={{ width: `${(w * 100).toFixed(1)}%` }}
													/>
												</div>
											</li>
										);
									})}
								</ul>
								<p className="mt-3 text-xs text-white/50">
									Concentration index {diversification.concentration.toFixed(2)}{' '}
									(1.00 means everything is in one key) · average correlation{' '}
									{formatCorrelation(diversification.averageCorrelation)}
								</p>
							</TabsContent>
						</Tabs>
					)}
				</>
			)}
		</section>
	);
}
