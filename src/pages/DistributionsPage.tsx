import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, Coins } from 'lucide-react';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
	useDistributionHistory,
	useDistributionOverview,
} from '@/hooks/useDistributions';
import type { DistributionType } from '@/services/distributionHistory.service';
import {
	buildMonthlyDistributionSeries,
	hasDistributionAmount,
	resolveDistributionTotal,
	sumDistributionTotals,
} from '@/utils/distributions.utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

interface DistributionTabConfig {
	value: DistributionType;
	label: string;
	description: string;
	emptyTitle: string;
	emptyMessage: string;
}

const TAB_CONFIG: DistributionTabConfig[] = [
	{
		value: 'revenue-share',
		label: 'Revenue Share',
		description: 'Revenue distributed pro-rata to holders of your keys.',
		emptyTitle: 'No revenue share distributions yet',
		emptyMessage:
			'Revenue share payments from the creator keys you hold will appear here.',
	},
	{
		value: 'dividend',
		label: 'Dividends',
		description: 'Dividend payouts received from keys in your portfolio.',
		emptyTitle: 'No dividend distributions yet',
		emptyMessage:
			'Dividends paid out on the creator keys you hold will appear here.',
	},
	{
		value: 'airdrop',
		label: 'Airdrops',
		description: 'Airdrops allocated to your keys at each holder snapshot.',
		emptyTitle: 'No airdrop distributions yet',
		emptyMessage:
			'Airdrops allocated to the creator keys you hold will appear here.',
	},
];

function formatDistributionDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value || '—';

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function HistorySkeleton({ testId }: { testId: string }) {
	return (
		<div className="space-y-2" data-testid={testId} aria-busy="true">
			{Array.from({ length: 4 }).map((_, index) => (
				<div
					key={index}
					className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
				>
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-24" />
					</div>
					<Skeleton className="h-4 w-20" />
				</div>
			))}
		</div>
	);
}

function DistributionHistoryTab({
	wallet,
	config,
}: {
	wallet: string;
	config: DistributionTabConfig;
}) {
	const [page, setPage] = useState(0);
	const query = useDistributionHistory(wallet, config.value, page + 1);
	const data = query.data;
	const items = data?.items ?? [];
	const totalPages = Math.max(data?.totalPages ?? 1, 1);

	if (query.isLoading) {
		return (
			<HistorySkeleton testId={`distributions-${config.value}-skeleton`} />
		);
	}

	if (query.isError) {
		return (
			<div
				className="rounded-2xl border border-dashed border-red-500/30 p-8 text-center"
				data-testid={`distributions-${config.value}-error`}
			>
				<p className="text-sm text-red-400">
					Couldn&apos;t load {config.label.toLowerCase()} history. Please
					try again shortly.
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void query.refetch()}
					className="mt-4 rounded-lg border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
				>
					Retry
				</Button>
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<EmptyState
				title={config.emptyTitle}
				description={config.emptyMessage}
				data-testid={`distributions-${config.value}-empty`}
			/>
		);
	}

	return (
		<div>
			<ul
				data-testid={`distributions-${config.value}-list`}
				className="divide-y divide-white/5 rounded-xl border border-white/10"
			>
				{items.map(item => (
					<li
						key={item.id}
						data-testid={`distribution-row-${item.id}`}
						className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="min-w-0">
							<p
								className="truncate text-sm font-semibold text-white"
								data-testid="distribution-key"
							>
								{item.keyName || item.keyId}
							</p>
							<time
								dateTime={item.date || undefined}
								className="mt-1 block text-xs text-white/40"
								data-testid="distribution-date"
							>
								{formatDistributionDate(item.date)}
							</time>
						</div>
						<span
							className="font-mono text-sm font-semibold text-emerald-300"
							data-testid="distribution-amount"
						>
							+{formatXlmPrice(item.amount)}
						</span>
					</li>
				))}
			</ul>

			{totalPages > 1 && (
				<nav
					aria-label={`${config.label} history pagination`}
					className="mt-6 flex items-center justify-center gap-3"
				>
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label="Previous page"
						disabled={page === 0}
						onClick={() => setPage(current => Math.max(0, current - 1))}
					>
						<ChevronLeft className="size-4" aria-hidden="true" />
						Previous
					</Button>
					<span
						className="text-xs tabular-nums text-white/60"
						data-testid={`distributions-${config.value}-page`}
					>
						Page {page + 1} of {totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label="Next page"
						disabled={page >= totalPages - 1}
						onClick={() =>
							setPage(current => Math.min(totalPages - 1, current + 1))
						}
					>
						Next
						<ChevronRight className="size-4" aria-hidden="true" />
					</Button>
				</nav>
			)}
		</div>
	);
}

function DistributionsContent({ wallet }: { wallet: string }) {
	const {
		data: overview,
		isLoading,
		isError,
		refetch,
	} = useDistributionOverview(wallet);

	const series = useMemo(
		() => buildMonthlyDistributionSeries(overview?.monthly),
		[overview?.monthly]
	);
	const runningTotal = resolveDistributionTotal(overview);

	return (
		<div className="space-y-6">
			{/* Running total */}
			<section className={CARD_CLASS} data-testid="distribution-summary">
				<p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
					Total distributions received
				</p>
				{isLoading ? (
					<Skeleton className="mt-3 h-9 w-48" />
				) : (
					<p
						className="mt-2 font-mono text-3xl font-black text-amber-300"
						data-testid="distribution-running-total"
					>
						{formatXlmPrice(runningTotal)}
					</p>
				)}
				{overview && (
					<dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs text-white/50">
						{TAB_CONFIG.map(config => (
							<div
								key={config.value}
								className="flex items-center gap-2"
							>
								<dt>{config.label}</dt>
								<dd
									className="font-mono text-white/70"
									data-testid={`distribution-total-${config.value}`}
								>
									{formatXlmPrice(
										sumDistributionTotals({
											[config.value]: overview.byType[config.value],
										})
									)}
								</dd>
							</div>
						))}
					</dl>
				)}
			</section>

			{/* Monthly bar chart */}
			<section
				className={CARD_CLASS}
				data-testid="distribution-chart"
				aria-labelledby="distribution-chart-heading"
			>
				<h2
					id="distribution-chart-heading"
					className="font-grotesque text-xl font-black tracking-tight text-white"
				>
					Monthly distributions
				</h2>
				<p className="mt-1 text-sm text-white/60">
					Combined revenue share, dividends and airdrops over the last 12
					months
				</p>

				<div className="mt-6">
					{isLoading && (
						<Skeleton
							className="h-[240px] w-full rounded-xl"
							data-testid="distribution-chart-skeleton"
						/>
					)}

					{isError && (
						<div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10">
							<p className="text-sm text-white/50">
								Couldn&apos;t load your distribution totals.
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void refetch()}
								className="rounded-lg border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
							>
								Retry
							</Button>
						</div>
					)}

					{!isLoading && !isError && !hasDistributionAmount(series) && (
						<div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-white/10">
							<p className="text-sm text-white/40">
								No distributions recorded in the last 12 months.
							</p>
						</div>
					)}

					{!isLoading && !isError && hasDistributionAmount(series) && (
						<ResponsiveContainer width="100%" height={240}>
							<BarChart
								data={series}
								margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="rgba(255,255,255,0.06)"
									vertical={false}
								/>
								<XAxis
									dataKey="label"
									tick={{
										fill: 'rgba(255,255,255,0.35)',
										fontSize: 11,
									}}
									axisLine={false}
									tickLine={false}
								/>
								<YAxis
									tickFormatter={value =>
										formatXlmPrice(Number(value))
									}
									tick={{
										fill: 'rgba(255,255,255,0.35)',
										fontSize: 11,
									}}
									axisLine={false}
									tickLine={false}
									width={80}
								/>
								<Tooltip
									formatter={value => formatXlmPrice(Number(value))}
									cursor={{ fill: 'rgba(255,255,255,0.04)' }}
									contentStyle={{
										background: '#0a1929',
										border: '1px solid rgba(255,255,255,0.15)',
										borderRadius: 8,
										fontSize: 12,
									}}
								/>
								<Bar
									dataKey="amount"
									name="Distributions"
									fill="#f59e0b"
									radius={[6, 6, 0, 0]}
									isAnimationActive={false}
								/>
							</BarChart>
						</ResponsiveContainer>
					)}
				</div>
			</section>

			{/* Per-type history */}
			<section className={CARD_CLASS}>
				<Tabs defaultValue="revenue-share">
					<TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-white/[0.03] p-1">
						{TAB_CONFIG.map(config => (
							<TabsTrigger
								key={config.value}
								value={config.value}
								className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-200"
							>
								{config.label}
							</TabsTrigger>
						))}
					</TabsList>

					{TAB_CONFIG.map(config => (
						<TabsContent
							key={config.value}
							value={config.value}
							className="mt-6"
						>
							<p className="mb-4 text-sm text-white/50">
								{config.description}
							</p>
							<DistributionHistoryTab wallet={wallet} config={config} />
						</TabsContent>
					))}
				</Tabs>
			</section>
		</div>
	);
}

/**
 * Key holder distribution history page (#1259).
 *
 * Lists revenue share, dividend and airdrop distributions received across
 * every held key, with a running total card and a combined monthly bar chart
 * for the last 12 months.
 */
export default function DistributionsPage() {
	const { address, isConnected } = useAccount();

	useDocumentTitle('Distributions — AccessLayer');

	if (!isConnected || !address) {
		return (
			<main
				className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12"
				data-testid="distributions-page"
			>
				<div className="mx-auto max-w-7xl">
					<div className="mb-6 flex items-center gap-2">
						<Coins className="size-5 text-amber-300" aria-hidden="true" />
						<h1 className="text-2xl font-black">Distributions</h1>
					</div>
					<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center">
						<p className="text-white/60">
							Connect your wallet to view your distributions.
						</p>
						<div className="mt-4 flex justify-center">
							<ConnectWalletButton />
						</div>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main
			className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12"
			data-testid="distributions-page"
		>
			<div className="mx-auto max-w-7xl">
				<header className="mb-8">
					<div className="flex items-center gap-2">
						<Coins className="size-5 text-amber-300" aria-hidden="true" />
						<h1 className="text-2xl font-black">Distributions</h1>
					</div>
					<p className="mt-2 max-w-lg text-sm text-white/50">
						Every revenue share, dividend and airdrop received across the
						creator keys you hold.
					</p>
				</header>
				<DistributionsContent wallet={address} />
			</div>
		</main>
	);
}
