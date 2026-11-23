import { useState } from 'react';
import { Link } from 'react-router';
import {
	Activity,
	ArrowLeft,
	Coins,
	PauseCircle,
	Sparkles,
} from 'lucide-react';
import { LiveClaimable } from '@/components/creator/LiveClaimable';
import { StreamWithdrawForm } from '@/components/creator/StreamWithdrawForm';
import { StreamHistoryTable } from '@/components/creator/StreamHistoryTable';
import { useCreatorStreams, useStream } from '@/hooks/useStream';
import { formatStreamRate } from '@/utils/stream.utils';
import { cn } from '@/lib/utils';

function StreamCard({ streamId }: { streamId: string }) {
	const {
		stream,
		funded,
		withdrawn,
		rate,
		claimable,
		isPaused,
		withdrawals,
		withdraw,
		isWithdrawing,
	} = useStream(streamId);

	const [showHistory, setShowHistory] = useState<boolean>(true);

	if (!stream) return null;

	return (
		<article
			className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-5 shadow-lg"
			data-testid={`stream-card-${stream.id}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize tracking-wide',
								isPaused
									? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
									: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
							)}
							data-testid="stream-status-badge"
						>
							{isPaused ? 'Paused' : 'Streaming Active'}
						</span>
						<span className="font-mono text-xs text-white/40">
							Key: {stream.keySymbol}
						</span>
					</div>
					<h2 className="text-xl font-bold font-jakarta text-white">
						{stream.keyName}
					</h2>
					<p className="text-xs text-white/50 font-mono">
						Stream ID: {stream.id}
					</p>
				</div>

				{/* Stream Rate Display */}
				<div className="rounded-xl bg-white/[0.04] p-3 border border-white/5 text-right sm:min-w-[160px]">
					<span className="text-[11px] text-white/50 block">Streaming Rate</span>
					<span
						className="font-mono text-sm font-bold text-cyan-400 tabular-nums block"
						data-testid="stream-rate-display"
					>
						{formatStreamRate(rate)}
					</span>
				</div>
			</div>

			{/* Paused Notice: Accrual stopped (#acceptance criteria) */}
			{isPaused && (
				<div
					className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200"
					role="alert"
					data-testid="stream-paused-notice"
				>
					<PauseCircle className="size-4 shrink-0 text-amber-400 mt-0.5" />
					<div>
						<strong className="font-semibold block text-amber-300">
							Stream Paused — Accrual Stopped
						</strong>
						This continuous stream is paused by the contract. Earnings accrual
						is frozen and no new tokens will accumulate until resumed.
					</div>
				</div>
			)}

			{/* Funded vs Withdrawn summary */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl bg-white/[0.02] p-3 text-xs border border-white/5">
				<div>
					<span className="text-white/50 block">Total Funded</span>
					<span
						className="font-mono text-white font-semibold text-sm tabular-nums"
						data-testid="stream-funded-amount"
					>
						{funded.toLocaleString()} XLM
					</span>
				</div>
				<div>
					<span className="text-white/50 block">Total Withdrawn</span>
					<span
						className="font-mono text-white/70 text-sm tabular-nums"
						data-testid="stream-withdrawn-amount"
					>
						{withdrawn.toLocaleString()} XLM
					</span>
				</div>
				<div className="col-span-2 sm:col-span-1">
					<span className="text-white/50 block">Remaining in Stream</span>
					<span className="font-mono text-cyan-300 text-sm tabular-nums">
						{(funded - withdrawn).toLocaleString()} XLM
					</span>
				</div>
			</div>

			{/* Live Claimable Balance */}
			<LiveClaimable stream={stream} />

			{/* Withdraw Form */}
			<StreamWithdrawForm
				streamId={stream.id}
				claimableBalance={claimable}
				onWithdraw={amount => withdraw(amount)}
				isPending={isWithdrawing}
			/>

			{/* Withdrawals History Toggle & Table */}
			<div className="space-y-2 pt-1">
				<div className="flex items-center justify-between text-xs">
					<button
						type="button"
						onClick={() => setShowHistory(prev => !prev)}
						className="text-white/60 hover:text-white transition-colors underline"
					>
						{showHistory ? 'Hide Withdrawal History' : 'View Withdrawal History'} ({withdrawals.length})
					</button>
				</div>
				{showHistory && <StreamHistoryTable withdrawals={withdrawals} />}
			</div>
		</article>
	);
}

export default function EarningsStreamPage() {
	const { streams, isLoading } = useCreatorStreams();

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8"
			data-testid="earnings-stream-page"
		>
			<div className="mx-auto max-w-5xl space-y-8">
				{/* Top nav */}
				<div className="flex items-center justify-between">
					<Link
						to="/creator/revenue"
						className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
					>
						<ArrowLeft className="size-4" />
						Back to Creator Dashboard
					</Link>
				</div>

				{/* Header */}
				<header className="space-y-3">
					<div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-medium">
						<Activity className="size-3.5" />
						Continuous Streaming
					</div>
					<h1 className="text-3xl font-black font-jakarta tracking-tight text-white sm:text-4xl">
						Creator Earnings Streams
					</h1>
					<p className="text-sm text-white/60 max-w-2xl leading-relaxed">
						Continuous earnings streams allow creators to receive streaming revenue
						in real time. Watch your claimable balance accrue with every ledger,
						preview protocol fees, and withdraw whenever you choose.
					</p>
				</header>

				{/* Loading skeleton */}
				{isLoading && (
					<div className="space-y-4" aria-busy="true">
						<div className="h-64 animate-pulse rounded-2xl bg-white/[0.04] border border-white/5" />
						<div className="h-64 animate-pulse rounded-2xl bg-white/[0.04] border border-white/5" />
					</div>
				)}

				{/* Streams List */}
				{!isLoading && streams.length > 0 && (
					<section className="space-y-6" aria-label="Creator Streams List">
						{streams.map(stream => (
							<StreamCard key={stream.id} streamId={stream.id} />
						))}
					</section>
				)}

				{/* Creators without streams see an explanation (#acceptance criteria) */}
				{!isLoading && streams.length === 0 && (
					<section
						className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center space-y-3"
						data-testid="no-streams-explanation"
					>
						<div className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/[0.04] text-white/40">
							<Coins className="size-6" />
						</div>
						<h2 className="text-lg font-bold font-jakarta text-white">
							No Earnings Streams Found
						</h2>
						<p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
							You do not have any active earnings streams at this time. When your
							creator keys generate continuous distributions or recurring streaming
							rewards, they will appear here automatically.
						</p>
						<div className="pt-2">
							<Link
								to="/marketplace"
								className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
							>
								<Sparkles className="size-3.5" />
								Explore Keys & Opportunities
							</Link>
						</div>
					</section>
				)}
			</div>
		</main>
	);
}
