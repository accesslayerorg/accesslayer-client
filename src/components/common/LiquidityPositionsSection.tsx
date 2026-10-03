import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '@/components/common/EmptyState';
import LpEarningsSummaryCard from '@/components/common/LpEarningsSummaryCard';
import LpPositionsList from '@/components/common/LpPositionsList';
import AddLiquidityDialog from '@/components/common/AddLiquidityDialog';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useNowMs } from '@/hooks/useNowMs';
import {
	describeLpTransactionError,
	useAddLiquidity,
	useClaimLpRewards,
	useLpPositions,
	useRemoveLiquidity,
} from '@/hooks/useLpPositions';
import type { LpPosition } from '@/services/lpPositions.service';
import {
	formatLpAmount,
	resolveLpLockState,
	summarizeLpEarnings,
} from '@/utils/lpPositions.utils';
import { isOwnWallet } from '@/utils/isOwnWallet';
import { cn } from '@/lib/utils';

export interface LiquidityPositionsSectionProps {
	/**
	 * Wallet from `/profile/:wallet`. When absent this is the viewer's own
	 * portfolio and positions are loaded for the connected Stellar wallet.
	 */
	publicWallet?: string;
	className?: string;
}

function PositionSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 lg:flex-row lg:items-center lg:justify-between"
		>
			<div className="space-y-2">
				<div className="h-4 w-36 animate-pulse rounded bg-white/10" />
				<div className="h-3 w-24 animate-pulse rounded bg-white/10" />
			</div>
			<div className="flex gap-6">
				<div className="h-4 w-24 animate-pulse rounded bg-white/10" />
				<div className="h-4 w-16 animate-pulse rounded bg-white/10" />
				<div className="h-4 w-24 animate-pulse rounded bg-white/10" />
			</div>
		</div>
	);
}

/**
 * Portfolio Liquidity tab (#1030): total LP earnings, every active LP
 * position, and the add / claim / remove controls.
 *
 * Actions render only when the connected Stellar signer owns the positions
 * being viewed. Public portfolios are read-only.
 */
const LiquidityPositionsSection: React.FC<LiquidityPositionsSectionProps> = ({
	publicWallet,
	className,
}) => {
	const {
		address: stellarAddress,
		loading: walletLoading,
		activeSigner,
	} = useStellarWallet();
	const lpWallet = publicWallet || stellarAddress;
	const canTransact =
		Boolean(activeSigner) && isOwnWallet(stellarAddress, lpWallet);
	const actionContext = {
		wallet: canTransact ? lpWallet : undefined,
		signer: canTransact ? activeSigner : null,
	};

	const positionsQuery = useLpPositions(lpWallet);
	const addMutation = useAddLiquidity(actionContext);
	const claimMutation = useClaimLpRewards(actionContext);
	const removeMutation = useRemoveLiquidity(actionContext);
	const nowMs = useNowMs(1000);

	const [addTarget, setAddTarget] = useState<LpPosition | null>(null);
	const [removeTarget, setRemoveTarget] = useState<LpPosition | null>(null);

	const positions = useMemo(
		() => positionsQuery.data ?? [],
		[positionsQuery.data]
	);
	const summary = useMemo(() => summarizeLpEarnings(positions), [positions]);

	// When a countdown reaches zero, refetch so the unlocked state comes from
	// the API rather than resting only on the browser clock.
	const lockedIds = positions
		.filter(p => resolveLpLockState(p.lock, nowMs).status === 'locked')
		.map(p => p.lpId)
		.join(',');
	const previousLockedIds = useRef(lockedIds);
	const { refetch } = positionsQuery;
	useEffect(() => {
		const before = previousLockedIds.current.split(',').filter(Boolean);
		const now = new Set(lockedIds.split(',').filter(Boolean));
		previousLockedIds.current = lockedIds;
		if (before.some(id => !now.has(id))) void refetch();
	}, [lockedIds, refetch]);

	const isBusy =
		addMutation.isPending ||
		claimMutation.isPending ||
		removeMutation.isPending;

	const header = (
		<div>
			<h2 className="font-grotesque text-xl font-bold text-white">
				Liquidity
			</h2>
			<p className="mt-1 text-sm text-white/60">
				Your liquidity positions, their share of each key pool, and the
				trading-fee rewards they have earned.
			</p>
		</div>
	);

	let body: React.ReactNode;
	if (!lpWallet) {
		body = walletLoading ? (
			<div data-testid="lp-wallet-loading" className="space-y-2">
				<PositionSkeleton />
			</div>
		) : (
			<div data-testid="lp-connect-wallet">
				<EmptyState
					title="Connect a Stellar wallet"
					description="Connect Freighter or a Ledger to view and manage your liquidity positions."
				/>
			</div>
		);
	} else if (positionsQuery.isLoading) {
		body = (
			<div
				role="status"
				aria-label="Loading liquidity positions"
				aria-busy="true"
				className="space-y-2"
				data-testid="lp-positions-skeleton"
			>
				<span className="sr-only">Loading liquidity positions</span>
				{Array.from({ length: 3 }).map((_, index) => (
					<PositionSkeleton key={index} />
				))}
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

				<LpEarningsSummaryCard summary={summary} />

				{positions.length === 0 ? (
					<div data-testid="lp-positions-empty">
						<EmptyState
							title="No liquidity positions yet"
							description="Provide liquidity to a creator key pool to start earning a share of its trading fees."
							cta={{ label: 'Browse creators', href: '/creators' }}
						/>
					</div>
				) : (
					<LpPositionsList
						positions={positions}
						nowMs={nowMs}
						canTransact={canTransact}
						isBusy={isBusy}
						claimingLpId={
							claimMutation.isPending
								? (claimMutation.variables?.lpId ?? null)
								: null
						}
						removingLpId={
							removeMutation.isPending
								? (removeMutation.variables?.lpId ?? null)
								: null
						}
						onAddLiquidity={position => {
							addMutation.reset();
							setAddTarget(position);
						}}
						onClaim={position =>
							claimMutation.mutate({
								lpId: position.lpId,
								keyId: position.keyId,
							})
						}
						onRemove={position => {
							removeMutation.reset();
							setRemoveTarget(position);
						}}
					/>
				)}
			</div>
		);
	}

	const removeLock = removeTarget
		? resolveLpLockState(removeTarget.lock, nowMs)
		: null;

	return (
		<section
			aria-label="Liquidity positions"
			data-testid="portfolio-liquidity-section"
			className={cn('space-y-6', className)}
		>
			{header}
			{body}

			{canTransact && lpWallet && (
				<AddLiquidityDialog
					key={addTarget?.lpId ?? 'closed'}
					position={addTarget}
					wallet={lpWallet}
					onClose={() => setAddTarget(null)}
					isSubmitting={addMutation.isPending}
					submitError={
						addMutation.isError
							? describeLpTransactionError(addMutation.error)
							: null
					}
					onSubmit={amountInput => {
						if (!addTarget) return;
						addMutation.mutate(
							{ keyId: addTarget.keyId, amountInput },
							{ onSuccess: () => setAddTarget(null) }
						);
					}}
				/>
			)}

			<Dialog
				open={removeTarget !== null}
				onOpenChange={open => {
					if (!open && !removeMutation.isPending) setRemoveTarget(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove liquidity</DialogTitle>
						<DialogDescription className="break-words">
							Close position #{removeTarget?.lpId} in the{' '}
							{removeTarget?.keyName} pool. Your contribution and any
							unclaimed rewards are returned in one transaction.
						</DialogDescription>
					</DialogHeader>
					{removeTarget && (
						<dl className="space-y-1 rounded-xl border border-white/10 bg-slate-950/30 p-3 text-xs text-white/60">
							<div className="flex justify-between gap-3">
								<dt>Contribution</dt>
								<dd className="break-all text-right font-mono text-white/85">
									{formatLpAmount(removeTarget.contributionStroops)}
								</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt>Unclaimed rewards</dt>
								<dd className="break-all text-right font-mono text-emerald-300">
									{removeTarget.pendingRewardsStroops == null
										? 'Unavailable'
										: formatLpAmount(
												removeTarget.pendingRewardsStroops
											)}
								</dd>
							</div>
						</dl>
					)}
					{removeMutation.isError && (
						<p
							role="alert"
							data-testid="lp-remove-error"
							className="text-sm text-rose-300"
						>
							{describeLpTransactionError(removeMutation.error)}
						</p>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={removeMutation.isPending}
							onClick={() => setRemoveTarget(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							data-testid="lp-remove-confirm"
							disabled={
								removeMutation.isPending || !removeLock?.canRemove
							}
							onClick={() => {
								if (!removeTarget) return;
								removeMutation.mutate(
									{
										lpId: removeTarget.lpId,
										keyId: removeTarget.keyId,
									},
									{ onSuccess: () => setRemoveTarget(null) }
								);
							}}
						>
							{removeMutation.isPending && (
								<LoaderCircle
									className="size-4 animate-spin"
									aria-hidden="true"
								/>
							)}
							{removeMutation.isPending
								? 'Confirm in wallet…'
								: 'Sign and remove'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
};

export default LiquidityPositionsSection;
