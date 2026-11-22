import { useMemo, useState } from 'react';
import { Address } from '@stellar/stellar-sdk';
import { CircleDollarSign, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	useDistributeTreasuryFees,
	useTreasuryBalance,
	useTreasuryDistributions,
	useTreasuryFeeEvents,
} from '@/hooks/useTreasuryAdmin';
import type { TreasuryDistributionRecipient } from '@/services/admin.service';
import {
	formatStroops,
	parseXlmToStroops,
	validateTreasuryDistribution,
} from '@/utils/treasury.utils';

const PANEL_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

interface RecipientDraft {
	id: number;
	address: string;
	amount: string;
}

function timestamp(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function validAddress(address: string): boolean {
	try {
		Address.fromString(address.trim());
		return true;
	} catch {
		return false;
	}
}

function hasDistributableBalance(value: string | undefined): boolean {
	return Boolean(value && /^\d+$/.test(value) && BigInt(value) > 0n);
}

function LoadingRows({ count = 2 }: { count?: number }) {
	return (
		<div className="space-y-3" aria-busy="true" role="status">
			{Array.from({ length: count }, (_, index) => (
				<div key={index} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
			))}
			<span className="sr-only">Loading treasury data</span>
		</div>
	);
}

function DataError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-100" role="alert">
			<p>Treasury data could not be loaded.</p>
			<Button type="button" variant="outline" onClick={onRetry} className="mt-3 border-white/15 text-white">
				Retry
			</Button>
		</div>
	);
}

export default function TreasuryPanel({ adminAddress }: { adminAddress: string }) {
	const balance = useTreasuryBalance();
	const distributions = useTreasuryDistributions();
	const feeEvents = useTreasuryFeeEvents();
	const distribute = useDistributeTreasuryFees();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [recipients, setRecipients] = useState<RecipientDraft[]>([]);
	const [nextId, setNextId] = useState(1);

	const distributionRecipients = useMemo<TreasuryDistributionRecipient[]>(
		() =>
			recipients.map(recipient => ({
				address: recipient.address.trim(),
				amountStroops:
					parseXlmToStroops(recipient.amount)?.toString() ?? '',
			})),
		[recipients]
	);
	const distributionError = balance.data
		? validateTreasuryDistribution(
				balance.data.accumulatedFeesStroops,
					distributionRecipients
			)
		: 'Treasury balance is unavailable.';
	const dataLoading = balance.isLoading || distributions.isLoading || feeEvents.isLoading;

	const openDistributionDialog = () => {
		setRecipients([{ id: nextId, address: '', amount: '' }]);
		setNextId(value => value + 1);
		setDialogOpen(true);
	};

	const addRecipient = () => {
		setRecipients(current => [...current, { id: nextId, address: '', amount: '' }]);
		setNextId(value => value + 1);
	};

	const updateRecipient = (id: number, field: 'address' | 'amount', value: string) => {
		setRecipients(current =>
			current.map(recipient =>
				recipient.id === id ? { ...recipient, [field]: value } : recipient
			)
		);
	};

	const submitDistribution = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!balance.data || distributionError) return;
		distribute.mutate(
			{
				admin: adminAddress,
				totalAmountStroops: balance.data.accumulatedFeesStroops,
				recipients: distributionRecipients,
			},
			{ onSuccess: () => setDialogOpen(false) }
		);
	};

	return (
		<div className="space-y-8" data-testid="treasury-panel">
			<section className={PANEL_CLASS} aria-labelledby="treasury-heading">
				<div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
					<div>
						<div className="flex items-center gap-2 text-amber-300">
							<CircleDollarSign className="size-5" aria-hidden="true" />
							<span className="text-xs font-bold uppercase tracking-[0.22em]">Protocol treasury</span>
						</div>
						<h2 id="treasury-heading" className="mt-2 font-grotesque text-2xl font-black">Accumulated fees</h2>
						<p className="mt-2 text-sm text-white/50">Unallocated protocol fees available for distribution.</p>
					</div>
					<Button
						type="button"
						onClick={openDistributionDialog}
						disabled={!hasDistributableBalance(balance.data?.accumulatedFeesStroops) || distribute.isPending}
						className="rounded-xl"
						data-testid="treasury-distribute-now"
					>
						{distribute.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
						Distribute now
					</Button>
				</div>
				<div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-5">
					{balance.isLoading ? (
						<div className="h-9 w-48 animate-pulse rounded bg-white/10" aria-label="Loading treasury balance" />
					) : balance.isError || !balance.data ? (
						<DataError onRetry={() => void balance.refetch()} />
					) : (
						<p className="font-mono text-3xl font-bold text-amber-200" data-testid="treasury-balance">
							{formatStroops(balance.data.accumulatedFeesStroops)}
						</p>
					)}
					{balance.data?.updatedAt && <p className="mt-2 text-xs text-white/35">Updated {timestamp(balance.data.updatedAt)}</p>}
				</div>
			</section>

			<section className={PANEL_CLASS} aria-labelledby="treasury-distributions-heading">
				<h2 id="treasury-distributions-heading" className="font-grotesque text-xl font-black">Distribution history</h2>
				<p className="mt-1 text-sm text-white/50">Completed distribution epochs, recipients, and confirmed transaction dates.</p>
				{distributions.isLoading ? <div className="mt-5"><LoadingRows /></div> : distributions.isError ? (
					<div className="mt-5"><DataError onRetry={() => void distributions.refetch()} /></div>
				) : (distributions.data?.length ?? 0) === 0 ? (
					<p className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">No treasury distributions yet.</p>
				) : (
					<div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
						<table className="w-full min-w-[760px] text-left text-sm">
							<thead className="bg-white/[0.04] text-xs uppercase text-white/45"><tr>
								<th className="px-4 py-3">Epoch</th><th className="px-4 py-3">Total distributed</th><th className="px-4 py-3">Recipients</th><th className="px-4 py-3">Date</th>
							</tr></thead>
							<tbody className="divide-y divide-white/10">
								{[...(distributions.data ?? [])].sort((a, b) => b.epoch - a.epoch).map(item => (
									<tr key={item.id} data-testid="treasury-distribution-row">
										<td className="px-4 py-4 font-mono text-amber-200">{item.epoch}</td>
										<td className="whitespace-nowrap px-4 py-4 font-mono">{formatStroops(item.totalDistributedStroops)}</td>
										<td className="px-4 py-4 text-white/65">{item.recipients.map(recipient => `${recipient.address} — ${formatStroops(recipient.amountStroops)}`).join('; ')}</td>
										<td className="whitespace-nowrap px-4 py-4 text-white/60">{timestamp(item.distributedAt)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className={PANEL_CLASS} aria-labelledby="treasury-fees-heading">
				<h2 id="treasury-fees-heading" className="font-grotesque text-xl font-black">Recent fee contributions</h2>
				<p className="mt-1 text-sm text-white/50">Recent per-trade FeeCollected events added to the treasury.</p>
				{feeEvents.isLoading ? <div className="mt-5"><LoadingRows count={3} /></div> : feeEvents.isError ? (
					<div className="mt-5"><DataError onRetry={() => void feeEvents.refetch()} /></div>
				) : (feeEvents.data?.length ?? 0) === 0 ? (
					<p className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">No fee collection events found.</p>
				) : (
					<div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
						<table className="w-full min-w-[700px] text-left text-sm">
							<thead className="bg-white/[0.04] text-xs uppercase text-white/45"><tr>
								<th className="px-4 py-3">Date</th><th className="px-4 py-3">Creator</th><th className="px-4 py-3">Trader</th><th className="px-4 py-3 text-right">Fee collected</th>
							</tr></thead>
							<tbody className="divide-y divide-white/10">
								{feeEvents.data?.slice(0, 20).map(item => (
									<tr key={item.id} data-testid="treasury-fee-row">
										<td className="whitespace-nowrap px-4 py-4 text-white/60">{timestamp(item.collectedAt)}</td>
										<td className="max-w-48 truncate px-4 py-4 font-mono text-white/70" title={item.creatorAddress}>{item.creatorAddress}</td>
										<td className="max-w-48 truncate px-4 py-4 font-mono text-white/70" title={item.traderAddress}>{item.traderAddress}</td>
										<td className="whitespace-nowrap px-4 py-4 text-right font-mono text-emerald-200">{formatStroops(item.amountStroops)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<Dialog open={dialogOpen} onOpenChange={open => !distribute.isPending && setDialogOpen(open)}>
				<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0a1929] text-white">
					<DialogHeader>
						<DialogTitle className="font-grotesque text-xl font-black">Distribute treasury fees</DialogTitle>
						<DialogDescription className="text-white/55">
							Assign the full accumulated balance to one or more Stellar recipients. Amounts use XLM, up to 7 decimal places.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={submitDistribution} className="space-y-5">
						<div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
							<p className="text-xs uppercase tracking-widest text-white/45">Total to distribute</p>
							<p className="mt-1 font-mono text-xl font-bold text-amber-200">{balance.data ? formatStroops(balance.data.accumulatedFeesStroops) : '—'}</p>
						</div>
						<div className="space-y-3">
							{recipients.map((recipient, index) => {
								const addressInvalid = recipient.address !== '' && !validAddress(recipient.address);
								const duplicate = recipient.address !== '' && recipients.some(other => other.id !== recipient.id && other.address.trim().toLowerCase() === recipient.address.trim().toLowerCase());
								return (
									<div key={recipient.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
										<div>
											<label htmlFor={`treasury-recipient-${recipient.id}`} className="mb-2 block text-xs font-semibold text-white/60">Recipient {index + 1} address</label>
											<input id={`treasury-recipient-${recipient.id}`} autoComplete="off" spellCheck={false} value={recipient.address} onChange={event => updateRecipient(recipient.id, 'address', event.target.value)} aria-invalid={addressInvalid || duplicate} className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 font-mono text-xs text-white outline-none focus:border-amber-400/50" placeholder="G… or C…" />
											{(addressInvalid || duplicate) && <p className="mt-1 text-xs text-red-300">{duplicate ? 'Recipient addresses must be unique.' : 'Enter a valid Stellar address.'}</p>}
										</div>
										<div>
											<label htmlFor={`treasury-amount-${recipient.id}`} className="mb-2 block text-xs font-semibold text-white/60">Amount (XLM)</label>
											<input id={`treasury-amount-${recipient.id}`} inputMode="decimal" value={recipient.amount} onChange={event => updateRecipient(recipient.id, 'amount', event.target.value)} aria-invalid={recipient.amount !== '' && parseXlmToStroops(recipient.amount) === null} className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 font-mono text-sm text-white outline-none focus:border-amber-400/50" placeholder="0.0000000" />
										</div>
										<Button type="button" variant="outline" aria-label={`Remove recipient ${index + 1}`} disabled={recipients.length <= 1} onClick={() => setRecipients(current => current.filter(item => item.id !== recipient.id))} className="h-11 border-white/10 text-white/65"><Trash2 className="size-4" aria-hidden="true" /></Button>
									</div>
								);
							})}
							<Button type="button" variant="outline" onClick={addRecipient} className="border-white/10 text-white"><Plus aria-hidden="true" /> Add recipient</Button>
						</div>
						{distributionError && <p role="alert" data-testid="treasury-distribution-validation" className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">{distributionError}</p>}
						{!distributionError && <p className="text-sm text-emerald-200">Recipient total matches the treasury balance.</p>}
						<DialogFooter>
							<Button type="button" variant="outline" disabled={distribute.isPending} onClick={() => setDialogOpen(false)} className="border-white/15 text-white">Cancel</Button>
							<Button type="submit" disabled={Boolean(distributionError) || distribute.isPending || dataLoading} data-testid="treasury-distribution-submit">
								{distribute.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
								{distribute.isPending ? 'Submitting…' : 'Confirm distribution'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
