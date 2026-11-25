import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Wallet } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEscapeStatus } from '@/hooks/useEscapeStatus';
import { useWalletHoldings } from '@/hooks/useWallet';
import { useCreatorPrices } from '@/hooks/useCreatorPrices';
import { useKeyReserve } from '@/hooks/useKeyReserve';
import { escapeContractService } from '@/services/escapeContract.service';
import { queryKeys } from '@/lib/queryKeys';
import {
	estimateEscapePayout,
	formatStroopsAsXlm,
} from '@/utils/escapeHatch.utils';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';

interface EscapeHoldingRowProps {
	holding: HeldKeyPosition;
	keyName: string;
	address: string;
	redeemed: boolean;
	onRedeemed: (creatorId: string) => void;
}

function EscapeHoldingRow({
	holding,
	keyName,
	address,
	redeemed,
	onRedeemed,
}: EscapeHoldingRowProps) {
	const queryClient = useQueryClient();
	const reserveQuery = useKeyReserve(holding.creatorId);
	const [isRedeeming, setIsRedeeming] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const estimate = useMemo(
		() => estimateEscapePayout(holding, reserveQuery.data),
		[holding, reserveQuery.data]
	);

	const quantity =
		typeof holding.quantity === 'number' && Number.isFinite(holding.quantity)
			? holding.quantity
			: 0;

	const handleRedeem = async () => {
		if (redeemed || isRedeeming) return;
		setError(null);
		setIsRedeeming(true);
		try {
			await escapeContractService.escape_redeem({
				keyId: holding.creatorId,
				quantity,
				address,
			});

			// Update wallet holdings cache so the row reflects redemption.
			queryClient.setQueryData<HeldKeyPosition[]>(
				queryKeys.wallet.holdings(address),
				old =>
					(old ?? []).filter(item => item.creatorId !== holding.creatorId)
			);
			queryClient.invalidateQueries({
				queryKey: queryKeys.wallet.holdings(address),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(holding.creatorId),
			});

			onRedeemed(holding.creatorId);
		} catch (err) {
			const message =
				err instanceof Error && err.message
					? err.message
					: typeof err === 'string' && err
						? err
						: 'Failed to redeem holding.';
			setError(message);
		} finally {
			setIsRedeeming(false);
		}
	};

	return (
		<tr
			data-testid={`escape-row-${holding.creatorId}`}
			className="border-t border-white/10"
		>
			<td className="px-4 py-3 align-top">
				<div className="font-medium text-white">{keyName}</div>
				<div className="mt-0.5 font-mono text-xs text-white/45">
					{holding.creatorId}
				</div>
			</td>
			<td className="px-4 py-3 text-right tabular-nums text-white/90">
				{quantity.toLocaleString()}
			</td>
			<td className="px-4 py-3 text-right tabular-nums text-white/90">
				{reserveQuery.isLoading ? (
					<Skeleton className="ml-auto h-4 w-20 bg-white/10" />
				) : (
					formatStroopsAsXlm(estimate.perKeyStroops)
				)}
			</td>
			<td className="px-4 py-3 text-right tabular-nums text-amber-200/90">
				{reserveQuery.isLoading ? (
					<Skeleton className="ml-auto h-4 w-24 bg-white/10" />
				) : (
					formatStroopsAsXlm(estimate.totalStroops)
				)}
			</td>
			<td className="px-4 py-3 text-right">
				{redeemed ? (
					<span
						data-testid={`escape-redeemed-${holding.creatorId}`}
						className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300"
					>
						Redeemed
					</span>
				) : (
					<Button
						type="button"
						size="sm"
						onClick={() => void handleRedeem()}
						disabled={isRedeeming || reserveQuery.isLoading}
						aria-busy={isRedeeming || undefined}
						data-testid={`escape-redeem-${holding.creatorId}`}
						className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
					>
						{isRedeeming ? 'Redeeming…' : 'Redeem'}
					</Button>
				)}
				{error && (
					<p
						role="alert"
						data-testid={`escape-error-${holding.creatorId}`}
						className="mt-2 max-w-xs text-left text-xs text-red-300"
					>
						{error}
					</p>
				)}
				{reserveQuery.isError && !error && (
					<p className="mt-2 max-w-xs text-left text-xs text-amber-200/80">
						Reserve estimate unavailable.
					</p>
				)}
			</td>
		</tr>
	);
}

export default function EscapeRedeemPage() {
	useDocumentTitle('Emergency redemption — AccessLayer');
	const navigate = useNavigate();
	const { address } = useAccount();
	const {
		isLoading: isStatusLoading,
		isEscapeModeActive,
		isProtocolPaused,
	} = useEscapeStatus();

	const holdingsQuery = useWalletHoldings(address ?? '');
	const { data: creators = [] } = useCreatorPrices();
	const [redeemedIds, setRedeemedIds] = useState<Record<string, true>>({});

	const creatorNames = useMemo(() => {
		const map: Record<string, string> = {};
		for (const creator of creators) {
			map[creator.id] = creator.title || creator.id;
		}
		return map;
	}, [creators]);

	const holdings = useMemo(
		() =>
			(holdingsQuery.data ?? []).filter(
				holding =>
					typeof holding.quantity === 'number' &&
					Number.isFinite(holding.quantity) &&
					holding.quantity > 0
			),
		[holdingsQuery.data]
	);

	if (isStatusLoading) {
		return (
			<main
				className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12"
				data-testid="escape-page-loading"
			>
				<div className="mx-auto max-w-5xl space-y-4">
					<Skeleton className="h-8 w-64 bg-white/10" />
					<Skeleton className="h-24 w-full bg-white/10" />
					<Skeleton className="h-48 w-full bg-white/10" />
				</div>
			</main>
		);
	}

	if (!isEscapeModeActive) {
		return <Navigate to="/" replace />;
	}

	if (!address) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-5xl">
					<EmptyState
						icon={
							<Wallet
								className="size-10 text-amber-300"
								aria-hidden="true"
							/>
						}
						title="Connect a wallet"
						description="Connect the wallet that holds your keys to redeem your reserve share during emergency redemption."
						ctaLabel="Back to marketplace"
						onCtaClick={() => navigate('/marketplace')}
						data-testid="escape-connect-wallet"
					/>
				</div>
			</main>
		);
	}

	return (
		<main
			className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12"
			data-testid="escape-redeem-page"
		>
			<div className="mx-auto max-w-5xl space-y-6">
				<header className="space-y-2">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
							<ShieldAlert
								className="size-5 text-amber-300"
								aria-hidden="true"
							/>
						</div>
						<div>
							<h1 className="font-grotesque text-2xl font-black tracking-tight">
								Emergency redemption
							</h1>
							<p className="text-sm text-white/60">
								Withdraw your pro-rata share of the protocol reserve.
							</p>
						</div>
					</div>
					<div
						className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
						data-testid="escape-fee-note"
					>
						Fees and yield are skipped during emergency redemption. Only
						your pro-rata share of the reserve is paid out for each
						holding.
					</div>
					{!isProtocolPaused && (
						<p className="text-xs text-white/50">
							Escape mode is active.
						</p>
					)}
				</header>

				{holdingsQuery.isLoading ? (
					<div className="space-y-3" data-testid="escape-holdings-loading">
						<Skeleton className="h-12 w-full bg-white/10" />
						<Skeleton className="h-12 w-full bg-white/10" />
						<Skeleton className="h-12 w-full bg-white/10" />
					</div>
				) : holdings.length === 0 ? (
					<EmptyState
						icon={
							<Wallet
								className="size-10 text-white/40"
								aria-hidden="true"
							/>
						}
						title="No holdings to redeem"
						description="This wallet does not hold any creator keys eligible for emergency redemption."
						ctaLabel="Back to marketplace"
						onCtaClick={() => navigate('/marketplace')}
						data-testid="escape-empty-holdings"
					/>
				) : (
					<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
						<div className="overflow-x-auto">
							<table
								className="min-w-full text-sm"
								data-testid="escape-holdings-table"
							>
								<thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-white/50">
									<tr>
										<th className="px-4 py-3 font-semibold">
											Holding
										</th>
										<th className="px-4 py-3 text-right font-semibold">
											Quantity
										</th>
										<th className="px-4 py-3 text-right font-semibold">
											Estimated payout / key
										</th>
										<th className="px-4 py-3 text-right font-semibold">
											Estimated total payout
										</th>
										<th className="px-4 py-3 text-right font-semibold">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{holdings.map(holding => (
										<EscapeHoldingRow
											key={holding.creatorId}
											holding={holding}
											keyName={
												creatorNames[holding.creatorId] ??
												holding.creatorId
											}
											address={address}
											redeemed={Boolean(
												redeemedIds[holding.creatorId]
											)}
											onRedeemed={id =>
												setRedeemedIds(prev => ({
													...prev,
													[id]: true,
												}))
											}
										/>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
