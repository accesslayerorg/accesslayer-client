import { useState } from 'react';
import {
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
} from 'recharts';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Address } from '@stellar/stellar-sdk';
import { CircleDollarSign, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminService, type AllocateFundsInput } from '@/services/admin.service';
import { formatStroops, parseXlmToStroops } from '@/utils/treasury.utils';
import showToast from '@/utils/toast.util';

const PANEL_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

const DONUT_COLORS = [
	'#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
];

function timestamp(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function shortenAddress(address: string): string {
	if (address.length <= 12) return address;
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function validAddress(address: string): boolean {
	try {
		Address.fromString(address.trim());
		return true;
	} catch {
		return false;
	}
}

function LoadingRows({ count = 3 }: { count?: number }) {
	return (
		<div className="space-y-3" aria-busy="true" role="status">
			{Array.from({ length: count }, (_, i) => (
				<div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
			))}
			<span className="sr-only">Loading…</span>
		</div>
	);
}

function DataError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-100" role="alert">
			<p>Failed to load data.</p>
			<Button type="button" variant="outline" onClick={onRetry} className="mt-3 border-white/15 text-white">
				Retry
			</Button>
		</div>
	);
}

interface AllocateFormProps {
	adminAddress: string;
	onSuccess?: () => void;
}

function AllocateForm({ adminAddress, onSuccess }: AllocateFormProps) {
	const queryClient = useQueryClient();
	const [destination, setDestination] = useState('');
	const [amount, setAmount] = useState('');
	const [purpose, setPurpose] = useState('');

	const mutation = useMutation({
		mutationFn: (input: AllocateFundsInput) => adminService.allocateFunds(input),
		onSuccess: () => {
			showToast.success('Funds allocated successfully.');
			setDestination('');
			setAmount('');
			setPurpose('');
			void queryClient.invalidateQueries({ queryKey: ['treasury', 'allocations'] });
			void queryClient.invalidateQueries({ queryKey: ['treasury', 'balance'] });
			onSuccess?.();
		},
		onError: (err: Error) => {
			showToast.error(err.message || 'Allocation failed.');
		},
	});

	const amountStroops = parseXlmToStroops(amount);
	const addressValid = destination === '' || validAddress(destination);
	const canSubmit =
		validAddress(destination) &&
		amountStroops !== null &&
		amountStroops > 0n &&
		purpose.trim().length > 0 &&
		!mutation.isPending;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit || amountStroops === null) return;
		mutation.mutate({
			admin: adminAddress,
			destinationAddress: destination.trim(),
			amountStroops: amountStroops.toString(),
			purpose: purpose.trim(),
		});
	};

	return (
		<section className={PANEL_CLASS} aria-labelledby="allocate-funds-heading">
			<h2 id="allocate-funds-heading" className="font-grotesque text-xl font-black">
				Allocate Funds
			</h2>
			<p className="mt-1 text-sm text-white/50">
				Send treasury funds to an approved destination with a recorded purpose.
			</p>

			<form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
				<div>
					<label htmlFor="allocate-destination" className="mb-2 block text-xs font-semibold text-white/60">
						Destination address
					</label>
					<input
						id="allocate-destination"
						autoComplete="off"
						spellCheck={false}
						value={destination}
						onChange={e => setDestination(e.target.value)}
						aria-invalid={!addressValid}
						className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 font-mono text-sm text-white outline-none focus:border-amber-400/50"
						placeholder="G… or C…"
					/>
					{!addressValid && (
						<p className="mt-1 text-xs text-red-300" role="alert">
							Enter a valid Stellar address.
						</p>
					)}
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<label htmlFor="allocate-amount" className="mb-2 block text-xs font-semibold text-white/60">
							Amount (XLM)
						</label>
						<input
							id="allocate-amount"
							inputMode="decimal"
							value={amount}
							onChange={e => setAmount(e.target.value)}
							aria-invalid={amount !== '' && amountStroops === null}
							className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 font-mono text-sm text-white outline-none focus:border-amber-400/50"
							placeholder="0.0000000"
						/>
					</div>

					<div>
						<label htmlFor="allocate-purpose" className="mb-2 block text-xs font-semibold text-white/60">
							Purpose
						</label>
						<input
							id="allocate-purpose"
							value={purpose}
							onChange={e => setPurpose(e.target.value)}
							className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none focus:border-amber-400/50"
							placeholder="e.g. Liquidity incentive Q4"
						/>
					</div>
				</div>

				{mutation.isError && (
					<p className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200" role="alert">
						{mutation.error?.message || 'Allocation failed. Please try again.'}
					</p>
				)}

				<Button type="submit" disabled={!canSubmit}>
					{mutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
					{mutation.isPending ? 'Allocating…' : 'Allocate Funds'}
				</Button>
			</form>
		</section>
	);
}

export default function TreasuryManagementDashboard({ adminAddress }: { adminAddress: string }) {
	// Balance
	const balance = useQuery({
		queryKey: ['treasury', 'balance'],
		queryFn: () => adminService.getTreasuryBalance(),
		staleTime: 15_000,
	});

	// Fee breakdown for donut chart
	const breakdown = useQuery({
		queryKey: ['treasury', 'fee-breakdown'],
		queryFn: () => adminService.getTreasuryFeeBreakdown(),
		staleTime: 30_000,
	});

	// Recent inflows
	const inflows = useQuery({
		queryKey: ['treasury', 'fee-events'],
		queryFn: () => adminService.getTreasuryFeeEvents(),
		staleTime: 15_000,
	});

	// Allocation history (paginated)
	const allocations = useInfiniteQuery({
		queryKey: ['treasury', 'allocations'],
		queryFn: ({ pageParam }) =>
			adminService.getTreasuryAllocations(pageParam as string | undefined),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: page => page.nextCursor ?? undefined,
	});

	const allAllocations = allocations.data?.pages.flatMap(p => p.items) ?? [];
	const hasNextPage = allocations.hasNextPage;

	return (
		<div className="space-y-8" data-testid="treasury-management-dashboard">
			{/* Balance + Donut Chart */}
			<section className={PANEL_CLASS} aria-labelledby="treasury-mgmt-heading">
				<div className="flex items-center gap-2 text-amber-300">
					<CircleDollarSign className="size-5" aria-hidden="true" />
					<span className="text-xs font-bold uppercase tracking-[0.22em]">Treasury</span>
				</div>
				<h2 id="treasury-mgmt-heading" className="mt-2 font-grotesque text-2xl font-black">
					Balance Overview
				</h2>

				<div className="mt-6 grid gap-6 lg:grid-cols-2">
					{/* Total balance */}
					<div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-5">
						<p className="text-xs uppercase tracking-widest text-white/40">Total Balance</p>
						{balance.isLoading ? (
							<div className="mt-2 h-9 w-40 animate-pulse rounded bg-white/10" />
						) : balance.isError ? (
							<DataError onRetry={() => void balance.refetch()} />
						) : (
							<>
								<p className="mt-1 font-mono text-3xl font-bold text-amber-200">
									{formatStroops(balance.data?.accumulatedFeesStroops ?? '0')}
								</p>
								{balance.data?.updatedAt && (
									<p className="mt-1 text-xs text-white/35">
										Updated {timestamp(balance.data.updatedAt)}
									</p>
								)}
							</>
						)}
					</div>

					{/* Per-source donut */}
					<div>
						<p className="text-xs font-semibold uppercase tracking-widest text-white/40">
							Per-Source Breakdown
						</p>
						{breakdown.isLoading ? (
							<div className="mt-4 h-[160px] animate-pulse rounded-xl bg-white/[0.04]" />
						) : breakdown.isError || !breakdown.data?.length ? (
							<p className="mt-4 text-sm text-white/40">No breakdown data available.</p>
						) : (
							<div className="mt-3 flex items-center gap-4">
								<ResponsiveContainer width={150} height={150}>
									<PieChart>
										<Pie
											data={breakdown.data}
											dataKey="percentage"
											nameKey="source"
											cx="50%"
											cy="50%"
											innerRadius={44}
											outerRadius={70}
											strokeWidth={0}
										>
											{breakdown.data.map((entry, index) => (
												<Cell
													key={entry.source}
													fill={DONUT_COLORS[index % DONUT_COLORS.length]}
													opacity={0.85}
												/>
											))}
										</Pie>
										<RechartsTooltip
											formatter={(value, name) => [
												`${Number(value).toFixed(1)}%`,
												name,
											]}
											contentStyle={{
												background: '#0a1929',
												border: '1px solid rgba(255,255,255,0.12)',
												borderRadius: 8,
												fontSize: 12,
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
								<ul className="space-y-2 text-xs">
									{breakdown.data.map((entry, index) => (
										<li key={entry.source} className="flex items-center gap-2">
											<span
												className="size-2.5 shrink-0 rounded-sm"
												style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
												aria-hidden="true"
											/>
											<span className="text-white/70">{entry.source}</span>
											<span className="ml-auto font-mono text-white/50">
												{entry.percentage.toFixed(1)}%
											</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Recent Inflows */}
			<section className={PANEL_CLASS} aria-labelledby="treasury-inflows-heading">
				<h2 id="treasury-inflows-heading" className="font-grotesque text-xl font-black">
					Recent Inflows
				</h2>
				<p className="mt-1 text-sm text-white/50">Last 20 fee receipts collected into the treasury.</p>
				{inflows.isLoading ? (
					<div className="mt-5"><LoadingRows /></div>
				) : inflows.isError ? (
					<div className="mt-5"><DataError onRetry={() => void inflows.refetch()} /></div>
				) : !inflows.data?.length ? (
					<p className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">
						No fee inflows yet.
					</p>
				) : (
					<div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
						<table className="w-full min-w-[640px] text-left text-sm">
							<thead className="bg-white/[0.04] text-xs uppercase text-white/45">
								<tr>
									<th className="px-4 py-3">Date</th>
									<th className="px-4 py-3">Source</th>
									<th className="px-4 py-3">Trader</th>
									<th className="px-4 py-3 text-right">Amount</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/10">
								{inflows.data.slice(0, 20).map(item => (
									<tr key={item.id}>
										<td className="whitespace-nowrap px-4 py-4 text-white/60">
											{timestamp(item.collectedAt)}
										</td>
										<td className="max-w-40 truncate px-4 py-4 font-mono text-white/70" title={item.creatorAddress}>
											{shortenAddress(item.creatorAddress)}
										</td>
										<td className="max-w-40 truncate px-4 py-4 font-mono text-white/70" title={item.traderAddress}>
											{shortenAddress(item.traderAddress)}
										</td>
										<td className="whitespace-nowrap px-4 py-4 text-right font-mono text-emerald-200">
											{formatStroops(item.amountStroops)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			{/* Allocate Funds Form */}
			<AllocateForm adminAddress={adminAddress} />

			{/* Allocation History */}
			<section className={PANEL_CLASS} aria-labelledby="treasury-allocations-heading">
				<h2 id="treasury-allocations-heading" className="font-grotesque text-xl font-black">
					Allocation History
				</h2>
				<p className="mt-1 text-sm text-white/50">All recorded fund allocations with purpose and destination.</p>

				{allocations.isLoading ? (
					<div className="mt-5"><LoadingRows /></div>
				) : allocations.isError ? (
					<div className="mt-5"><DataError onRetry={() => void allocations.refetch()} /></div>
				) : !allAllocations.length ? (
					<p className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">
						No allocations recorded yet.
					</p>
				) : (
					<>
						<div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
							<table className="w-full min-w-[700px] text-left text-sm">
								<thead className="bg-white/[0.04] text-xs uppercase text-white/45">
									<tr>
										<th className="px-4 py-3">Date</th>
										<th className="px-4 py-3">Destination</th>
										<th className="px-4 py-3">Purpose</th>
										<th className="px-4 py-3 text-right">Amount</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/10">
									{allAllocations.map(item => (
										<tr key={item.id}>
											<td className="whitespace-nowrap px-4 py-4 text-white/60">
												{timestamp(item.allocatedAt)}
											</td>
											<td className="max-w-40 truncate px-4 py-4 font-mono text-white/70" title={item.destinationAddress}>
												{shortenAddress(item.destinationAddress)}
											</td>
											<td className="max-w-56 truncate px-4 py-4 text-white/70">
												{item.purpose}
											</td>
											<td className="whitespace-nowrap px-4 py-4 text-right font-mono text-amber-200">
												{formatStroops(item.amountStroops)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{hasNextPage && (
							<div className="mt-4 flex justify-center">
								<Button
									type="button"
									variant="outline"
									onClick={() => void allocations.fetchNextPage()}
									disabled={allocations.isFetchingNextPage}
									className="border-white/15 text-white"
								>
									{allocations.isFetchingNextPage ? (
										<Loader2 className="animate-spin" aria-hidden="true" />
									) : (
										<ChevronDown className="size-4" aria-hidden="true" />
									)}
									Load more
								</Button>
							</div>
						)}
					</>
				)}
			</section>
		</div>
	);
}
