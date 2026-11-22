import { useState } from 'react';
import { Vault } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import StakeForm from '@/components/common/StakeForm';
import ActiveStakesList from '@/components/common/ActiveStakesList';
import {
	useVaultStakes,
	useStakeVaultMutation,
	useUnstakeVaultMutation,
} from '@/hooks/useStakingVault';
import type { StakingVaultLockPeriod } from '@/services/stakingVault.service';
import { formatXlmPrice } from '@/utils/numberFormat.utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StakingVaultPanelProps {
	/** Creator key id for this vault. */
	keyId: string;
	/** Connected wallet address. Null when the user is not authenticated. */
	userAddress: string | null | undefined;
	/** How many keys the wallet currently holds for this key (available to stake). */
	availableBalance: number;
	/** Current reward pool balance for this key (XLM). Used for reward preview. */
	rewardPoolBalance: number;
	/** Whether the parent page data is still loading (shows skeleton). */
	isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Staking Vault panel for the key detail page (#1017).
 *
 * Allows key holders to:
 * - Choose an amount and lock period and stake keys via wallet tx
 * - View active stakes with lock-expiry countdown, accrued rewards, and pool balance
 * - Unstake once the lock period has expired
 */
export default function StakingVaultPanel({
	keyId,
	userAddress,
	availableBalance,
	rewardPoolBalance,
	isLoading = false,
}: StakingVaultPanelProps) {
	const [pendingUnstakeId, setPendingUnstakeId] = useState<string | null>(null);

	const {
		data: vaultData,
		isLoading: isStakesLoading,
		isError: isStakesError,
		refetch,
	} = useVaultStakes(userAddress ?? '', keyId);

	const stakeMutation = useStakeVaultMutation(userAddress ?? '');
	const unstakeMutation = useUnstakeVaultMutation(userAddress ?? '');

	const stakes = vaultData?.stakes ?? [];

	// ── Handlers ────────────────────────────────────────────────────────────

	const handleStake = (amount: number, lockPeriodDays: StakingVaultLockPeriod) => {
		if (!userAddress) return;
		stakeMutation.mutate({
			keyId,
			wallet: userAddress,
			amount,
			lockPeriodDays,
		});
	};

	const handleUnstake = (stakeId: string) => {
		if (!userAddress) return;
		setPendingUnstakeId(stakeId);
		unstakeMutation.mutate(
			{ keyId, wallet: userAddress, stakeId },
			{
				onSettled: () => setPendingUnstakeId(null),
			}
		);
	};

	// ── Loading skeleton ─────────────────────────────────────────────────────

	if (isLoading) {
		return (
			<section
				className={CARD_CLASS}
				data-testid="staking-vault-skeleton"
				aria-busy="true"
			>
				<Skeleton className="h-6 w-44" />
				<div className="mt-6 space-y-3">
					<Skeleton className="h-12 w-full" />
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-14 w-full rounded-xl" />
						))}
					</div>
					<Skeleton className="h-16 w-full rounded-2xl" />
					<Skeleton className="h-10 w-full rounded-xl" />
				</div>
			</section>
		);
	}

	// ── Unauthenticated placeholder ──────────────────────────────────────────

	if (!userAddress) {
		return (
			<section
				className={CARD_CLASS}
				data-testid="staking-vault-panel"
			>
				<PanelHeader rewardPoolBalance={rewardPoolBalance} />
				<div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
					<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
						<Vault className="size-5" aria-hidden="true" />
					</div>
					<p className="font-jakarta text-sm text-white/50">
						Connect your wallet to stake keys and earn rewards.
					</p>
				</div>
			</section>
		);
	}

	// ── Main render ──────────────────────────────────────────────────────────

	return (
		<section
			className={CARD_CLASS}
			data-testid="staking-vault-panel"
		>
			<PanelHeader rewardPoolBalance={rewardPoolBalance} />

			{/* Stake form */}
			<div className="mt-6">
				<StakeForm
					availableBalance={availableBalance}
					rewardPoolBalance={rewardPoolBalance}
					onStake={handleStake}
					isSubmitting={stakeMutation.isPending}
					isConnected={Boolean(userAddress)}
				/>
			</div>

			{/* Divider */}
			<div
				className="my-6 border-t border-white/10"
				role="separator"
				aria-hidden="true"
			/>

			{/* Active stakes */}
			<div>
				<h3 className="mb-4 font-grotesque text-base font-black tracking-tight text-white">
					Active Stakes
				</h3>

				{isStakesLoading && (
					<div
						data-testid="active-stakes-loading"
						className="space-y-3"
						aria-busy="true"
						aria-live="polite"
					>
						{Array.from({ length: 2 }).map((_, i) => (
							<Skeleton key={i} className="h-24 w-full rounded-2xl" />
						))}
					</div>
				)}

				{!isStakesLoading && isStakesError && (
					<div
						data-testid="active-stakes-error"
						className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center"
					>
						<p className="font-jakarta text-sm text-white/60">
							We couldn&apos;t load your active stakes. Try again.
						</p>
						<Button
							type="button"
							variant="outline"
							data-testid="active-stakes-retry"
							onClick={() => void refetch()}
							className="mt-4 rounded-xl border-white/10 bg-white/5 font-bold text-white hover:border-amber-500/30 hover:bg-amber-500/10"
						>
							Retry
						</Button>
					</div>
				)}

				{!isStakesLoading && !isStakesError && (
					<ActiveStakesList
						stakes={stakes}
						pendingUnstakeId={pendingUnstakeId}
						onUnstake={handleUnstake}
					/>
				)}
			</div>
		</section>
	);
}

// ─── Panel header sub-component ───────────────────────────────────────────────

function PanelHeader({ rewardPoolBalance }: { rewardPoolBalance: number }) {
	return (
		<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-center gap-2">
				<Vault className="size-5 text-amber-300" aria-hidden="true" />
				<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
					Staking Vault
				</h2>
			</div>
			{rewardPoolBalance > 0 && (
				<div
					data-testid="vault-reward-pool-balance"
					className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs"
				>
					<span className="text-white/40 font-medium uppercase tracking-wide">
						Pool
					</span>
					<span className="font-bold text-amber-300">
						{formatXlmPrice(rewardPoolBalance)}
					</span>
				</div>
			)}
		</div>
	);
}
