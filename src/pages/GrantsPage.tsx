import { useState } from 'react';
import { Link } from 'react-router';
import { useAccount } from 'wagmi';
import { ArrowLeft, Coins, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import EmptyState from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGrants } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import type { Grant } from '@/services/grants.service';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';

const CARD =
	'rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl backdrop-blur-md';

export default function GrantsPage() {
	useDocumentTitle('Grants — AccessLayer');
	const { address } = useAccount();
	const wallet = address ?? undefined;
	const [status, setStatus] = useState('all');
	const [role, setRole] = useState('all');

	const grantsQuery = useGrants({
		status: status as 'all' | Grant['status'],
		wallet: role === 'all' ? undefined : wallet,
		role: role === 'all' ? undefined : (role as 'recipient' | 'reviewer'),
	});

	const grants = grantsQuery.data?.pages.flatMap(page => page.grants) ?? [];

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8"
			data-testid="grants-page"
		>
			<div className="mx-auto max-w-5xl space-y-8">
				<Link
					to="/"
					className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to marketplace
				</Link>

				<header>
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400/80">
						Treasury
					</p>
					<h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
						Grants tracker
					</h1>
					<p className="mt-2 max-w-xl text-sm text-white/50">
						Follow milestone-based grants, submit evidence as a recipient
						and review work as a grant reviewer.
					</p>
				</header>

				<section
					className="flex flex-wrap gap-3"
					aria-label="Grant filters"
					data-testid="grant-filters"
				>
					<div className="space-y-1.5">
						<Label htmlFor="grant-status">Status</Label>
						<select
							id="grant-status"
							value={status}
							onChange={event => setStatus(event.target.value)}
							className="h-9 rounded-md border border-white/15 bg-[#0b1728] px-3 text-sm text-white"
							data-testid="grant-filter-status"
						>
							<option value="all">All</option>
							<option value="active">Active</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="grant-role">My role</Label>
						<select
							id="grant-role"
							value={role}
							onChange={event => setRole(event.target.value)}
							className="h-9 rounded-md border border-white/15 bg-[#0b1728] px-3 text-sm text-white"
							data-testid="grant-filter-role"
						>
							<option value="all">All grants</option>
							<option value="recipient">Recipient</option>
							<option value="reviewer">Reviewer</option>
						</select>
					</div>
				</section>

				{grantsQuery.isLoading && (
					<p role="status" className="text-sm text-white/50">
						Loading grants…
					</p>
				)}
				{!grantsQuery.isLoading && grants.length === 0 && (
					<EmptyState
						title="No grants found"
						message="Adjust the filters to see other grants in the treasury."
						data-testid="grants-empty"
					/>
				)}

				<section className="space-y-4" data-testid="grants-list">
					{grants.map(grant => (
						<article
							key={grant.id}
							className={cn(
								CARD,
								'p-5 transition-colors hover:border-white/25'
							)}
							data-testid={`grant-card-${grant.id}`}
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400/80">
										{grant.keyName}
									</p>
									<Link
										to={`/treasury/grants/${grant.id}`}
										className="mt-1 block text-lg font-bold hover:text-emerald-300"
									>
										{grant.title}
									</Link>
									<p className="mt-1 text-sm text-white/45">
										{grant.summary}
									</p>
								</div>
								<span
									className={cn(
										'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
										grant.status === 'active'
											? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
											: grant.status === 'completed'
												? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
												: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
									)}
								>
									{grant.status}
								</span>
							</div>

							<div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
								<div>
									<p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
										Total
									</p>
									<p className="mt-1 font-mono font-bold text-white/90">
										{formatDisplayKeyPrice(grant.totalStroops)}
									</p>
								</div>
								<div>
									<p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
										Released
									</p>
									<p className="mt-1 font-mono font-bold text-emerald-300">
										{formatDisplayKeyPrice(grant.releasedStroops)}
									</p>
								</div>
								<div>
									<p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
										<Coins className="size-3" aria-hidden="true" />{' '}
										Remaining
									</p>
									<p className="mt-1 font-mono font-bold text-white/70">
										{formatDisplayKeyPrice(
											grant.totalStroops - grant.releasedStroops
										)}
									</p>
								</div>
							</div>

							{grant.status === 'cancelled' && (
								<p
									className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200"
									data-testid={`grant-returned-${grant.id}`}
								>
									Returned to treasury:{' '}
									{formatDisplayKeyPrice(
										grant.returnedAmountStroops ?? 0
									)}
								</p>
							)}

							<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
								<p className="flex items-center gap-1.5 text-xs text-white/40">
									<Wallet className="size-3.5" aria-hidden="true" />
									{
										grant.milestones.filter(
											m => m.state === 'approved'
										).length
									}
									/{grant.milestones.length} milestones complete
								</p>
								<Link
									to={`/treasury/grants/${grant.id}`}
									className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
									data-testid={`grant-open-${grant.id}`}
								>
									Open tracker →
								</Link>
							</div>
						</article>
					))}
				</section>

				{grantsQuery.hasNextPage && (
					<Button
						variant="outline"
						onClick={() => void grantsQuery.fetchNextPage()}
						disabled={grantsQuery.isFetchingNextPage}
						data-testid="grants-load-more"
						className="border-white/15 text-white/70"
					>
						{grantsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
					</Button>
				)}
			</div>
		</main>
	);
}
