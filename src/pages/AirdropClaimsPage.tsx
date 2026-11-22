import { useMemo } from 'react';
import { Link } from 'react-router';
import { Networks } from '@stellar/stellar-sdk';
import { useAccount } from 'wagmi';
import { ArrowLeft, Gift, History, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import EmptyState from '@/components/common/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSigner } from '@/hooks/useSigner';
import {
	useAirdropClaims,
	useClaimAirdropMutation,
	useClaimAllAirdropsMutation,
} from '@/hooks/useAirdropClaims';
import type { AirdropAllocation } from '@/services/airdropClaims.service';
import { env } from '@/utils/env.utils';
import { cn } from '@/lib/utils';

const networkPassphrase =
	env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

// ── Card styling constant ───────────────────────────────────────────────

const CARD =
	'rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-md';

// ── Formatting helpers ──────────────────────────────────────────────────

function formatXlm(amount: number): string {
	return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} XLM`;
}

function formatClaimDate(isoDate: string): string {
	return new Date(isoDate).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

// ── Single airdrop row ──────────────────────────────────────────────────

function AirdropRow({
	airdrop,
	onClaim,
	isClaiming,
}: {
	airdrop: AirdropAllocation;
	onClaim: (airdropId: string) => void;
	isClaiming: boolean;
}) {
	return (
		<div
			data-testid={`airdrop-row-${airdrop.id}`}
			className={cn(
				CARD,
				'flex flex-col gap-4 p-5 transition-all hover:border-white/20 sm:flex-row sm:items-center sm:justify-between'
			)}
		>
			{/* Snapshot info */}
			<div className="min-w-0 flex-1">
				<p
					data-testid={`airdrop-snapshot-date-${airdrop.id}`}
					className="text-sm font-bold text-white"
				>
					Snapshot {formatClaimDate(airdrop.snapshotDate)}
				</p>
				<span className="mt-1 block text-xs text-white/40">
					Total distributed:{' '}
					<span
						data-testid={`airdrop-total-distributed-${airdrop.id}`}
						className="font-mono text-white/60"
					>
						{formatXlm(airdrop.totalDistributed)}
					</span>
				</span>
			</div>

			{/* User allocation */}
			<div className="flex flex-col items-start sm:items-end">
				<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
					Your allocation
				</span>
				<span
					data-testid={`airdrop-allocation-${airdrop.id}`}
					className="font-mono text-sm font-bold text-emerald-300"
				>
					{formatXlm(airdrop.userAllocation)}
				</span>
			</div>

			{/* Claim action */}
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					onClick={() => onClaim(airdrop.id)}
					disabled={isClaiming}
					data-testid={`airdrop-claim-${airdrop.id}`}
					className="rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
				>
					{isClaiming ? 'Claiming…' : 'Claim'}
				</Button>
			</div>
		</div>
	);
}

// ── Skeleton rows ───────────────────────────────────────────────────────

function AirdropRowSkeleton() {
	return (
		<div
			aria-hidden="true"
			className={cn(CARD, 'flex items-center justify-between gap-4 p-5')}
		>
			<div className="space-y-2">
				<div className="h-4 w-36 animate-pulse rounded bg-white/10" />
				<div className="h-3 w-24 animate-pulse rounded bg-white/10" />
			</div>
			<div className="flex items-center gap-3">
				<div className="h-4 w-20 animate-pulse rounded bg-white/10" />
				<div className="h-8 w-24 animate-pulse rounded bg-white/10" />
			</div>
		</div>
	);
}

// ── Main page ───────────────────────────────────────────────────────────

function AirdropClaimsContent() {
	useDocumentTitle('Airdrop Claims — AccessLayer');

	const { address, isConnected } = useAccount();
	const wallet = address ?? '';
	const { activeSigner } = useSigner(networkPassphrase);

	const {
		data: claimsData,
		isLoading: isClaimsLoading,
		isError: isClaimsError,
	} = useAirdropClaims(wallet);

	const claimMutation = useClaimAirdropMutation(wallet, activeSigner);
	const claimAllMutation = useClaimAllAirdropsMutation(wallet, activeSigner);

	const airdrops = useMemo(
		() => claimsData?.airdrops ?? [],
		[claimsData?.airdrops]
	);

	const unclaimed = useMemo(
		() => airdrops.filter(a => !a.claimed),
		[airdrops]
	);

	const claimed = useMemo(
		() =>
			airdrops
				.filter(a => a.claimed)
				.sort(
					(a, b) =>
						new Date(b.claimedAt ?? 0).getTime() -
						new Date(a.claimedAt ?? 0).getTime()
				),
		[airdrops]
	);

	// Group unclaimed airdrops by the key they were distributed for.
	const keyGroups = useMemo(() => {
		const groups = new Map<string, AirdropAllocation[]>();
		for (const airdrop of unclaimed) {
			const existing = groups.get(airdrop.keyId);
			if (existing) {
				existing.push(airdrop);
			} else {
				groups.set(airdrop.keyId, [airdrop]);
			}
		}
		return Array.from(groups.entries()).map(([keyId, items]) => ({
			keyId,
			keyName: items[0]?.keyName ?? keyId,
			airdrops: items,
		}));
	}, [unclaimed]);

	const claimInProgress =
		claimMutation.isPending || claimAllMutation.isPending;

	const handleClaim = (airdropId: string) => {
		claimMutation.mutate({ airdropId });
	};

	const handleClaimAll = () => {
		if (unclaimed.length === 0) return;
		claimAllMutation.mutate(
			unclaimed.map(airdrop => ({ airdropId: airdrop.id }))
		);
	};

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8"
			data-testid="airdrop-claims-page"
		>
			<div className="mx-auto max-w-5xl space-y-8">
				{/* Back nav */}
				<Link
					to="/"
					className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to marketplace
				</Link>

				{/* Page header */}
				<header>
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400/80">
						Airdrops
					</p>
					<h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
						Airdrop claims
					</h1>
					<p className="mt-2 max-w-lg text-sm text-white/50">
						View every airdrop allocated to the creator keys you hold,
						based on each campaign&apos;s holder snapshot, and claim them
						individually or all at once.
					</p>
				</header>

				{/* Wallet not connected */}
				{!isConnected && (
					<section
						className={cn(CARD, 'p-8')}
						data-testid="airdrop-connect-prompt"
					>
						<p className="text-sm text-white/60">
							Connect your wallet to view the airdrops allocated to your
							creator keys.
						</p>
						<div className="mt-4">
							<ConnectWalletButton />
						</div>
					</section>
				)}

				{/* Available airdrops */}
				{isConnected && (
					<section data-testid="airdrop-claims-section">
						<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
							<h2 className="text-lg font-bold text-white">
								Available airdrops
							</h2>
							{unclaimed.length > 0 && (
								<Button
									size="sm"
									onClick={handleClaimAll}
									disabled={claimInProgress}
									data-testid="airdrop-claim-all"
									className="rounded-lg bg-amber-500 font-semibold text-black hover:bg-amber-400 disabled:bg-white/10 disabled:text-white/30"
								>
									{claimAllMutation.isPending
										? 'Claiming…'
										: `Claim All (${unclaimed.length})`}
								</Button>
							)}
						</div>

						{/* Loading */}
						{isClaimsLoading && (
							<div
								className="space-y-3"
								data-testid="airdrop-claims-skeleton"
							>
								{Array.from({ length: 3 }).map((_, i) => (
									<AirdropRowSkeleton key={i} />
								))}
							</div>
						)}

						{/* Error */}
						{isClaimsError && (
							<div
								className="rounded-2xl border border-dashed border-red-500/30 p-8 text-center"
								data-testid="airdrop-claims-error"
							>
								<p className="text-sm text-red-400">
									Unable to load airdrops. Please try again.
								</p>
							</div>
						)}

						{/* Empty: no airdrops at all */}
						{!isClaimsLoading &&
							!isClaimsError &&
							airdrops.length === 0 && (
								<EmptyState
									icon={
										<Gift
											className="size-10 text-amber-300/80"
											aria-hidden="true"
										/>
									}
									title="No airdrops yet"
									message="There are no airdrops allocated to the keys you hold right now. Check back after the next holder snapshot."
									data-testid="airdrops-empty"
								/>
							)}

						{/* Empty: everything already claimed */}
						{!isClaimsLoading &&
							!isClaimsError &&
							airdrops.length > 0 &&
							unclaimed.length === 0 && (
								<div
									className="rounded-2xl border border-dashed border-white/10 p-8 text-center"
									data-testid="airdrops-unclaimed-empty"
								>
									<PartyPopper
										className="mx-auto mb-3 size-8 text-white/20"
										aria-hidden="true"
									/>
									<p className="text-sm text-white/40">
										You have claimed every airdrop allocated to your
										keys. New airdrops will appear here after the next
										snapshot.
									</p>
								</div>
							)}

						{/* Airdrops grouped by key */}
						{!isClaimsLoading &&
							!isClaimsError &&
							keyGroups.map(group => (
								<div
									key={group.keyId}
									className="mb-6 space-y-3"
									data-testid={`airdrop-key-group-${group.keyId}`}
								>
									<div className="flex items-center gap-2">
										<Link
											to={`/creator/${group.keyId}`}
											className="text-sm font-bold text-white transition-colors hover:text-amber-300"
										>
											{group.keyName}
										</Link>
										<span className="text-xs text-white/30">
											{group.airdrops.length}{' '}
											{group.airdrops.length === 1
												? 'airdrop'
												: 'airdrops'}
										</span>
									</div>
									{group.airdrops.map(airdrop => (
										<AirdropRow
											key={airdrop.id}
											airdrop={airdrop}
											onClaim={handleClaim}
											isClaiming={claimInProgress}
										/>
									))}
								</div>
							))}
					</section>
				)}

				{/* Claim history */}
				{isConnected &&
					!isClaimsLoading &&
					!isClaimsError &&
					claimed.length > 0 && (
						<section data-testid="airdrop-history-section">
							<h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
								<History
									className="size-4 text-white/40"
									aria-hidden="true"
								/>
								Claim history
							</h2>
							<div className="space-y-3">
								{claimed.map(airdrop => (
									<div
										key={airdrop.id}
										data-testid={`airdrop-history-row-${airdrop.id}`}
										className={cn(
											CARD,
											'flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between'
										)}
									>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-bold text-white">
												{airdrop.keyName}
											</p>
											<span className="mt-1 block text-xs text-white/40">
												Snapshot{' '}
												{formatClaimDate(airdrop.snapshotDate)}
											</span>
										</div>
										<div className="flex flex-col items-start sm:items-end">
											<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
												Received
											</span>
											<span
												data-testid={`airdrop-received-${airdrop.id}`}
												className="font-mono text-sm font-bold text-emerald-300"
											>
												{formatXlm(
													airdrop.receivedAmount ??
														airdrop.userAllocation
												)}
											</span>
										</div>
										<div className="flex flex-col items-start sm:items-end">
											<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
												Claimed
											</span>
											<span
												data-testid={`airdrop-claimed-at-${airdrop.id}`}
												className="font-mono text-xs text-white/60"
											>
												{airdrop.claimedAt
													? formatClaimDate(airdrop.claimedAt)
													: '—'}
											</span>
										</div>
									</div>
								))}
							</div>
						</section>
					)}

				{/* Footer link */}
				{isConnected && (
					<p className="text-sm text-white/50">
						Looking for your portfolio?{' '}
						<Link
							to="/profile"
							className="font-semibold text-amber-300 hover:text-amber-200"
						>
							Open your profile
						</Link>
						.
					</p>
				)}
			</div>
		</main>
	);
}

export default function AirdropClaimsPage() {
	return <AirdropClaimsContent />;
}
