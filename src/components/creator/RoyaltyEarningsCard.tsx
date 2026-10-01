import { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatNumber } from '@/utils/numberFormat.utils';
import { isOwnWallet } from '@/utils/isOwnWallet';
import { useRoyaltyEarnings, useClaimRoyaltiesMutation } from '@/hooks/useRoyaltyEarnings';
import type { RoyaltyEarningsSummary } from '@/services/royalty.service';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md';

const EXPLORER_TX_URL = 'https://stellar.expert/explorer/testnet/tx';

/**
 * Royalty earnings card for the creator key management dashboard (#987).
 *
 * Shows lifetime/pending/claimed totals, a per-transfer breakdown, a claim
 * button, and the claimed history with transaction hash links. Values
 * refresh every 60 seconds (see {@link useRoyaltyEarnings}).
 */
export default function RoyaltyEarningsCard({ keyId }: { keyId: string }) {
	const { address } = useAccount();
	const [expanded, setExpanded] = useState(false);

	const { data: earnings, isLoading, isError } = useRoyaltyEarnings(
		isOwnWallet(address, address) ? keyId : undefined,
		address
	);
	const claimMutation = useClaimRoyaltiesMutation(keyId, address ?? '');

	if (!address) return null;

	if (isLoading) {
		return (
			<section className={CARD_CLASS} data-testid="royalty-earnings-loading">
				<div className="h-4 w-40 animate-pulse rounded bg-white/10" />
				<div className="mt-4 h-24 animate-pulse rounded-xl bg-white/5" />
			</section>
		);
	}

	if (isError || !earnings) {
		return null;
	}

	const lowPending = earnings.pendingXlm <= 0;

	return (
		<section className={CARD_CLASS} data-testid="royalty-earnings-card">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="font-grotesque text-xl font-black tracking-tight">
					Royalty earnings
				</h2>
				{lowPending && (
					<span
						className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/50"
						data-testid="royalty-nothing-pending"
					>
						Nothing pending
					</span>
				)}
			</div>

			<dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Stat label="Total earned" value={earnings.totalEarnedXlm} />
				<Stat label="Pending" value={earnings.pendingXlm} highlight />
				<Stat label="Claimed" value={earnings.claimedXlm} />
			</dl>

			<div className="mt-6 flex items-center gap-3">
				<button
					type="button"
					className="rounded-full bg-white/10 px-5 py-2 font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
					disabled={lowPending || claimMutation.isPending}
					onClick={() => claimMutation.mutate()}
					data-testid="claim-royalties-button"
				>
					{claimMutation.isPending ? 'Claiming…' : 'Claim royalties'}
				</button>
				<button
					type="button"
					className="text-sm font-bold text-white/50 underline-offset-4 hover:underline"
					onClick={() => setExpanded(value => !value)}
					aria-expanded={expanded}
				>
					{expanded ? 'Hide transfer history' : 'Show transfer history'}
				</button>
			</div>

			{expanded && (
				<div className="mt-6 space-y-6">
					<TransferTable transfers={earnings.transfers} />
					<ClaimHistory claims={earnings.claims} />
				</div>
			)}
		</section>
	);
}

function Stat({
	label,
	value,
	highlight,
}: {
	label: string;
	value: number;
	highlight?: boolean;
}) {
	return (
		<div>
			<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
				{label}
			</dt>
			<dd
				className={`mt-1 font-jakarta font-bold ${highlight ? 'text-emerald-400' : ''}`}
			>
				{formatNumber(value)} XLM
			</dd>
		</div>
	);
}

function TransferTable({
	transfers,
}: {
	transfers: RoyaltyEarningsSummary['transfers'];
}) {
	if (transfers.length === 0) {
		return (
			<p className="text-sm text-white/40" data-testid="royalty-transfers-empty">
				No royalty-bearing transfers yet.
			</p>
		);
	}

	return (
		<table className="w-full text-left text-sm" data-testid="royalty-transfers-table">
			<thead>
				<tr className="text-[0.65rem] uppercase tracking-[0.22em] text-white/40">
					<th className="pb-2">Date</th>
					<th className="pb-2">Transfer</th>
					<th className="pb-2">Royalty</th>
					<th className="pb-2">Tx</th>
				</tr>
			</thead>
			<tbody>
				{transfers.map(t => (
					<tr key={t.id} className="border-t border-white/5">
						<td className="py-2 text-white/60">
							{new Date(t.transferredAt).toLocaleDateString()}
						</td>
						<td className="py-2">{formatNumber(t.transferAmountXlm)} XLM</td>
						<td className="py-2 font-bold text-emerald-400">
							+{formatNumber(t.royaltyEarnedXlm)} XLM
						</td>
						<td className="py-2">
							<TxLink hash={t.transactionHash} />
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function ClaimHistory({ claims }: { claims: RoyaltyEarningsSummary['claims'] }) {
	if (claims.length === 0) {
		return (
			<p className="text-sm text-white/40" data-testid="royalty-claims-empty">
				No claims yet — claimed royalties will appear here with their
				transaction hashes.
			</p>
		);
	}

	return (
		<div data-testid="royalty-claims-history">
			<h3 className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
				Claim history
			</h3>
			<ul className="space-y-2">
				{claims.map(c => (
					<li key={c.id} className="flex items-center justify-between text-sm">
						<span>
							{formatNumber(c.amountXlm)} XLM ·{' '}
							{new Date(c.claimedAt).toLocaleDateString()}
						</span>
						<TxLink hash={c.transactionHash} />
					</li>
				))}
			</ul>
		</div>
	);
}

function TxLink({ hash }: { hash: string }) {
	return (
		<a
			href={`${EXPLORER_TX_URL}/${hash}`}
			target="_blank"
			rel="noreferrer"
			className="font-mono text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
		>
			{hash.slice(0, 8)}…{hash.slice(-6)}
		</a>
	);
}
