import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import LpEarningsSummaryCard from '@/components/common/LpEarningsSummaryCard';
import LpPositionsList from '@/components/common/LpPositionsList';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useNowMs } from '@/hooks/useNowMs';
import {
	describeLpTransactionError,
	lpKeyPositionsQueryKey,
} from '@/hooks/useLpPositions';
import {
	claimKeyLpRewards,
	fetchKeyLpPositions,
} from '@/services/lpPositions.service';
import { summarizeLpEarnings } from '@/utils/lpPositions.utils';
import showToast from '@/utils/toast.util';
import { cn } from '@/lib/utils';

export interface LpPositionsPageProps {
	/** Key id; falls back to the `:keyId` / `:id` route param. */
	keyId?: string;
	/** Alias for `keyId`. */
	id?: string;
	/** Wallet whose positions are shown; defaults to the connected wallet. */
	wallet?: string;
	className?: string;
}

const LP_KEY_POLL_MS = 30_000;

/**
 * Dedicated liquidity-positions page (#1276).
 *
 * Polls the key-scoped LP endpoint, aggregates rewards, and claims through the
 * API-backed claim action. The shared `LiquidityPositionsSection` keeps the
 * contract-signing flow used on profiles; this page consumes the server view.
 */
const LpPositionsPage: React.FC<LpPositionsPageProps> = ({
	keyId: keyIdProp,
	id,
	wallet: walletProp,
	className,
}) => {
	const params = useParams();
	const { address, loading: walletLoading } = useStellarWallet();
	const queryClient = useQueryClient();
	const nowMs = useNowMs(1000);

	const keyId =
		keyIdProp ?? id ?? params.keyId ?? params.id ?? params.key ?? '';
	const wallet =
		walletProp ?? params.wallet ?? params.address ?? address ?? '';
	const canTransact = Boolean(wallet);

	const positionsQuery = useQuery({
		queryKey: lpKeyPositionsQueryKey(keyId, wallet),
		queryFn: () => fetchKeyLpPositions(keyId, wallet),
		enabled: Boolean(keyId) && Boolean(wallet),
		staleTime: 15_000,
		refetchInterval: LP_KEY_POLL_MS,
	});

	const [claimingLpId, setClaimingLpId] = useState<string | null>(null);

	const claimMutation = useMutation({
		mutationKey: ['lp', 'claim-key', keyId, wallet],
		mutationFn: () => claimKeyLpRewards(keyId, wallet),
		onSuccess: result => {
			void queryClient.invalidateQueries({
				queryKey: lpKeyPositionsQueryKey(keyId, wallet),
			});
			if (result?.message) showToast.success(result.message);
		},
		onError: error => {
			showToast.error(describeLpTransactionError(error));
		},
		onSettled: () => setClaimingLpId(null),
	});

	const positions = useMemo(
		() => positionsQuery.data ?? [],
		[positionsQuery.data]
	);
	const summary = useMemo(
		() =>
			summarizeLpEarnings(
				positions.map(position => ({
					lpId: position.lpId,
					pendingRewardsStroops: position.pendingRewardsStroops,
					claimedRewardsStroops: position.claimedRewardsStroops,
				}))
			),
		[positions]
	);

	let body: React.ReactNode;
	if (!keyId || !wallet) {
		body = walletLoading ? (
			<div
				data-testid="lp-page-wallet-loading"
				className="space-y-3"
				role="status"
				aria-label="Loading liquidity positions"
			>
				<div className="h-24 animate-pulse rounded-2xl bg-white/5" />
				<div className="h-32 animate-pulse rounded-2xl bg-white/5" />
			</div>
		) : (
			<div data-testid="lp-connect-wallet">
				<EmptyState
					title="Connect a Stellar wallet"
					description="Connect a Stellar wallet to view your liquidity positions."
				/>
			</div>
		);
	} else if (positionsQuery.isLoading) {
		body = (
			<div
				role="status"
				aria-label="Loading liquidity positions"
				aria-busy="true"
				data-testid="lp-positions-skeleton"
				className="space-y-3"
			>
				<span className="sr-only">Loading liquidity positions</span>
				<div className="h-24 animate-pulse rounded-2xl bg-white/5" />
				<div className="h-32 animate-pulse rounded-2xl bg-white/5" />
			</div>
		);
	} else if (positionsQuery.isError && !positionsQuery.data) {
		body = (
			<div data-testid="lp-positions-error">
				<EmptyState
					title="Couldn't load liquidity positions"
					description="There was a problem fetching LP positions. Please try again."
					cta={{
						label: 'Retry',
						onClick: () => void positionsQuery.refetch(),
					}}
				/>
			</div>
		);
	} else {
		body = (
			<div className="space-y-4">
				{positionsQuery.isError && (
					<div
						role="alert"
						data-testid="lp-positions-stale"
						className="flex flex-col gap-2 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between"
					>
						<span>
							Couldn't refresh positions. Showing data from{' '}
							{new Date(
								positionsQuery.dataUpdatedAt
							).toLocaleTimeString()}
							.
						</span>
						<Button
							type="button"
							size="xs"
							variant="outline"
							onClick={() => void positionsQuery.refetch()}
						>
							<RotateCcw className="size-3" aria-hidden="true" />
							Retry
						</Button>
					</div>
				)}

				<LpEarningsSummaryCard
					summary={summary}
					isLoading={positionsQuery.isLoading}
				/>

				{positions.length === 0 ? (
					<div data-testid="lp-positions-empty">
						<EmptyState
							title="No LP positions"
							description="No liquidity positions yet. Provide liquidity to a creator key pool to start earning trading-fee rewards."
						/>
					</div>
				) : (
					<LpPositionsList
						positions={positions}
						nowMs={nowMs}
						canTransact={canTransact}
						isBusy={claimMutation.isPending}
						claimingLpId={claimingLpId}
						onClaim={position => {
							setClaimingLpId(position.lpId);
							claimMutation.mutate();
						}}
					/>
				)}

				{claimMutation.isPending && (
					<p
						role="status"
						data-testid="lp-key-claim-pending"
						className="flex items-center gap-2 text-sm text-white/60"
					>
						<LoaderCircle
							className="size-4 animate-spin"
							aria-hidden="true"
						/>
						Claiming rewards…
					</p>
				)}
			</div>
		);
	}

	return (
		<main
			data-testid="lp-positions-page"
			className={cn('mx-auto max-w-6xl px-4 py-10 text-white', className)}
		>
			<header className="mb-6">
				<h1 className="font-grotesque text-2xl font-bold">
					Liquidity Positions
				</h1>
				<p className="mt-1 text-sm text-white/60">
					Your pool share, accrued rewards, and liquidity actions for this
					key.
				</p>
			</header>
			{body}
		</main>
	);
};

export default LpPositionsPage;
