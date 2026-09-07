import { useState } from 'react';
import { Link } from 'react-router';
import { useGovernanceProposals } from '@/hooks/useGovernanceProposals';
import ProposalCard from '@/components/common/ProposalCard';
import type { ProposalStatus } from '@/types/governance';
import { cn } from '@/lib/utils';
import { ArrowLeft, Filter } from 'lucide-react';

const STATUS_FILTERS: Array<{ label: string; value: ProposalStatus | 'all' }> = [
	{ label: 'All', value: 'all' },
	{ label: 'Active', value: 'active' },
	{ label: 'Passed', value: 'passed' },
	{ label: 'Rejected', value: 'rejected' },
];

function GovernancePageContent() {
	const { data: proposals, isLoading, error } = useGovernanceProposals();
	const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');

	const filtered = proposals?.filter(
		p => statusFilter === 'all' || p.status === statusFilter
	);

	const activeCount = proposals?.filter(p => p.status === 'active').length ?? 0;

	return (
		<main className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8">
			<div className="mx-auto max-w-4xl">
				{/* Back nav */}
				<Link
					to="/"
					className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to marketplace
				</Link>

				{/* Header */}
				<div className="mb-8">
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400/80">
						Governance
					</p>
					<h1 className="mt-1 font-jakarta text-3xl font-black tracking-tight sm:text-4xl">
						Proposals
					</h1>
					<p className="mt-2 max-w-lg text-sm text-white/50">
						{activeCount > 0
							? `${activeCount} active proposal${activeCount === 1 ? '' : 's'} require${activeCount === 1 ? 's' : ''} your vote.`
							: 'No active proposals at the moment.'}
					</p>
				</div>

				{/* Filters */}
				<div className="mb-6 flex items-center gap-2">
					<Filter className="size-3.5 text-white/30" aria-hidden="true" />
					{STATUS_FILTERS.map(f => (
						<button
							key={f.value}
							type="button"
							onClick={() => setStatusFilter(f.value)}
							className={cn(
								'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
								statusFilter === f.value
									? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
									: 'border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70'
							)}
						>
							{f.label}
						</button>
					))}
				</div>

				{/* Loading skeleton */}
				{isLoading && (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="h-48 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
							/>
						))}
					</div>
				)}

				{/* Error state */}
				{error && (
					<div className="rounded-2xl border border-dashed border-red-500/30 p-8 text-center">
						<p className="text-sm text-red-400">
							Unable to load proposals. Please try again.
						</p>
					</div>
				)}

				{/* Empty state */}
				{!isLoading && !error && filtered && filtered.length === 0 && (
					<div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
						<p className="text-sm text-white/40">
							{statusFilter === 'all'
								? 'No proposals yet.'
								: `No ${statusFilter} proposals.`}
						</p>
					</div>
				)}

				{/* Proposal cards */}
				{!isLoading && !error && filtered && filtered.length > 0 && (
					<div className="space-y-4">
						{filtered.map(proposal => (
							<ProposalCard key={proposal.id} proposal={proposal} />
						))}
					</div>
				)}
			</div>
		</main>
	);
}

export default function GovernancePage() {
	return <GovernancePageContent />;
}
