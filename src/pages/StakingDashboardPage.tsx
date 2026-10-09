import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { useAccount } from 'wagmi';
import {
	ArrowLeft,
	Lock,
	TrendingUp,
	Clock,
	Coins,
	Shield,
	ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useStakingPositions } from '@/hooks/useStakingPositions';
import { useWalletHoldings } from '@/hooks/useWallet';
import {
	useStakeKeysMutation,
	useUnstakeKeysMutation,
	useClaimStakingRewardsMutation,
} from '@/hooks/useStakingDashboard';
import {
	isStakePositionUnlocked,
	computeRemainingStakeLockSeconds,
	formatClaimableReward,
	formatStakedQuantity,
	computeStakingPortfolioValueStroops,
} from '@/utils/stakingPositions.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatCountdownTime } from '@/utils/lockupCountdown.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import type { StakingPosition } from '@/services/stakingPositions.service';
import { cn } from '@/lib/utils';

// ── Lock period configuration ───────────────────────────────────────────

interface LockPeriodOption {
	label: string;
	days: number;
	apyBps: number;
}

const LOCK_PERIOD_OPTIONS: LockPeriodOption[] = [
	{ label: '30 days', days: 30, apyBps: 500 },
	{ label: '90 days', days: 90, apyBps: 1200 },
	{ label: '180 days', days: 180, apyBps: 2000 },
	{ label: '365 days', days: 365, apyBps: 3500 },
];

function formatApy(bps: number): string {
	return `${(bps / 100).toFixed(1)}%`;
}

// ── Card styling constant ───────────────────────────────────────────────

const CARD =
	'rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur-md';

// ── Summary stat card ───────────────────────────────────────────────────

function SummaryStat({
	label,
	value,
	icon: Icon,
	accent = 'amber',
}: {
	label: string;
	value: string;
	icon: React.ComponentType<{ className?: string }>;
	accent?: 'amber' | 'emerald' | 'cyan';
}) {
	const accentClass = {
		amber: 'from-amber-500/20 to-amber-600/5 text-amber-300',
		emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-300',
		cyan: 'from-cyan-500/20 to-cyan-600/5 text-cyan-300',
	}[accent];

	return (
		<div
			className={cn(
				CARD,
				'flex items-center gap-4 bg-gradient-to-br p-5',
				accentClass
			)}
		>
			<div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
				<Icon className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0">
				<p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
					{label}
				</p>
				<p className="mt-0.5 truncate font-mono text-lg font-bold text-white">
					{value}
				</p>
			</div>
		</div>
	);
}

// ── Stake input form ────────────────────────────────────────────────────

function StakeForm({
	address,
	holdings,
}: {
	address: string;
	holdings: Array<{
		creatorId: string;
		quantity?: number | null;
		name?: string;
		keyName?: string;
	}>;
}) {
	const [selectedKey, setSelectedKey] = useState('');
	const [quantity, setQuantity] = useState('');
	const [lockPeriodIdx, setLockPeriodIdx] = useState(0);
	const stakeMutation = useStakeKeysMutation(address);

	const availableKeys = useMemo(
		() => holdings.filter(h => (h.quantity ?? 0) > 0),
		[holdings]
	);

	const selectedHolding = availableKeys.find(
		h => h.creatorId === selectedKey
	);
	const maxQuantity = selectedHolding?.quantity ?? 0;
	const parsedQuantity = Number(quantity);
	const isValid =
		selectedKey &&
		Number.isFinite(parsedQuantity) &&
		parsedQuantity > 0 &&
		parsedQuantity <= maxQuantity;

	const lockOption = LOCK_PERIOD_OPTIONS[lockPeriodIdx];

	const handleStake = () => {
		if (!isValid || !lockOption) return;
		stakeMutation.mutate({
			keyId: selectedKey,
			quantity: parsedQuantity,
			lockPeriodDays: lockOption.days,
		});
	};

	return (
		<section className={cn(CARD, 'p-6 md:p-8')} data-testid="stake-form">
			<h2 className="mb-1 text-lg font-bold text-white">
				Stake creator keys
			</h2>
			<p className="mb-6 text-sm text-white/50">
				Lock your keys for a period to earn staking rewards from the
				reward pool.
			</p>

			{/* Key selector */}
			<div className="mb-4">
				<label
					htmlFor="stake-key-select"
					className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-white/40"
				>
					Select key
				</label>
				<div className="relative">
					<select
						id="stake-key-select"
						value={selectedKey}
						onChange={e => setSelectedKey(e.target.value)}
						className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-10 text-sm text-white transition-colors focus:border-amber-500/40 focus:outline-none"
					>
						<option value="">Choose a creator key…</option>
						{availableKeys.map(h => (
							<option key={h.creatorId} value={h.creatorId}>
								{h.name ?? h.keyName ?? h.creatorId} (
								{h.quantity ?? 0} held)
							</option>
						))}
					</select>
					<ChevronDown
						className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/30"
						aria-hidden="true"
					/>
				</div>
			</div>

			{/* Quantity input */}
			<div className="mb-4">
				<label
					htmlFor="stake-quantity"
					className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-white/40"
				>
					Quantity
				</label>
				<div className="relative">
					<input
						id="stake-quantity"
						type="number"
						min="1"
						max={maxQuantity}
						step="1"
						value={quantity}
						onChange={e => setQuantity(e.target.value)}
						placeholder={
							maxQuantity > 0
								? `Max ${maxQuantity}`
								: 'Select a key first'
						}
						className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-amber-500/40 focus:outline-none"
						disabled={!selectedKey}
					/>
					{maxQuantity > 0 && (
						<button
							type="button"
							onClick={() => setQuantity(String(maxQuantity))}
							className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300 transition-colors hover:bg-amber-500/30"
						>
							Max
						</button>
					)}
				</div>
			</div>

			{/* Lock period selection */}
			<div className="mb-6">
				<p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
					Lock period
				</p>
				<div
					className="grid grid-cols-2 gap-2 sm:grid-cols-4"
					role="radiogroup"
					aria-label="Lock period selection"
				>
					{LOCK_PERIOD_OPTIONS.map((option, idx) => (
						<button
							key={option.days}
							type="button"
							role="radio"
							aria-checked={lockPeriodIdx === idx}
							onClick={() => setLockPeriodIdx(idx)}
							data-testid={`lock-period-${option.days}`}
							className={cn(
								'flex flex-col items-center rounded-xl border p-3 text-center transition-all',
								lockPeriodIdx === idx
									? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_16px_rgba(251,191,36,0.1)]'
									: 'border-white/10 bg-white/[0.03] hover:border-white/20'
							)}
						>
							<span
								className={cn(
									'text-sm font-bold',
									lockPeriodIdx === idx
										? 'text-amber-300'
										: 'text-white/70'
								)}
							>
								{option.label}
							</span>
							<span
								className={cn(
									'mt-0.5 text-xs font-semibold',
									lockPeriodIdx === idx
										? 'text-emerald-300'
										: 'text-emerald-400/50'
								)}
							>
								{formatApy(option.apyBps)} APY
							</span>
						</button>
					))}
				</div>
			</div>

			{/* Estimated rewards preview */}
			{isValid && lockOption && (
				<div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
					<p className="text-xs font-semibold text-emerald-300/70">
						Estimated rewards
					</p>
					<p className="mt-1 font-mono text-lg font-bold text-emerald-300">
						{(
							(parsedQuantity *
								lockOption.apyBps *
								lockOption.days) /
							(365 * 10000)
						).toFixed(4)}{' '}
						XLM
					</p>
					<p className="mt-1 text-[10px] text-white/30">
						Based on current pool rate. Actual rewards vary.
					</p>
				</div>
			)}

			{/* Submit */}
			<Button
				type="button"
				onClick={handleStake}
				disabled={!isValid || stakeMutation.isPending}
				data-testid="stake-submit"
				className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-black transition-colors hover:bg-amber-400 disabled:bg-white/10 disabled:text-white/30"
			>
				{stakeMutation.isPending ? 'Staking…' : 'Stake keys'}
			</Button>
		</section>
	);
}

// ── Active positions table row ──────────────────────────────────────────

function PositionRow({
	position,
	address,
}: {
	position: StakingPosition;
	address: string;
}) {
	const [nowMs, setNowMs] = useState(() => Date.now());
	const unstakeMutation = useUnstakeKeysMutation(address);
	const claimMutation = useClaimStakingRewardsMutation(address);

	useEffect(() => {
		const id = window.setInterval(() => setNowMs(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, []);

	const unlocked = isStakePositionUnlocked(position, nowMs);
	const remainingSec = computeRemainingStakeLockSeconds(position, nowMs);
	const claimable = position.claimableReward ?? 0;

	const handleClaim = () => {
		claimMutation.mutate({
			positionId: position.id,
			keyId: position.keyId,
		});
	};

	const handleUnstake = () => {
		unstakeMutation.mutate({
			positionId: position.id,
			keyId: position.keyId,
		});
	};

	const expiryDate = new Date(position.unlockLedger * 1000);

	return (
		<div
			data-testid={`staking-position-${position.id}`}
			className={cn(
				CARD,
				'flex flex-col gap-4 p-5 transition-all hover:border-white/20 sm:flex-row sm:items-center sm:justify-between'
			)}
		>
			{/* Key info */}
			<div className="min-w-0 flex-1">
				<Link
					to={`/creator/${position.keyId}`}
					className="block truncate text-sm font-bold text-white transition-colors hover:text-amber-300"
				>
					{position.keyName}
				</Link>
				<span className="mt-1 block text-xs text-white/40">
					Staked {formatStakedQuantity(position.stakedQuantity)}
				</span>
			</div>

			{/* Expiry */}
			<div className="flex flex-col items-start text-xs sm:items-end">
				<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
					Lock expiry
				</span>
				<span className="font-mono text-white/60">
					{expiryDate.toLocaleDateString(undefined, {
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					})}
				</span>
			</div>

			{/* Lock status */}
			<div className="flex flex-col items-start sm:items-end">
				{unlocked ? (
					<span
						data-testid={`staking-lock-status-${position.id}`}
						className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300"
					>
						<TrendingUp
							className="size-3"
							aria-hidden="true"
						/>
						Unlocked
					</span>
				) : (
					<span
						data-testid={`staking-lock-status-${position.id}`}
						className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300"
					>
						<Lock className="size-3" aria-hidden="true" />
						{formatCountdownTime(remainingSec)}
					</span>
				)}
			</div>

			{/* Claimable rewards */}
			<div className="flex flex-col items-start sm:items-end">
				<span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
					Claimable
				</span>
				<span
					data-testid={`staking-claimable-${position.id}`}
					className="font-mono text-sm font-bold text-emerald-300"
				>
					{formatClaimableReward(claimable)}
				</span>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2">
				{claimable > 0 && (
					<Button
						size="sm"
						onClick={handleClaim}
						disabled={claimMutation.isPending}
						data-testid={`claim-rewards-${position.id}`}
						className="rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
					>
						{claimMutation.isPending ? 'Claiming…' : 'Claim'}
					</Button>
				)}
				<Button
					size="sm"
					onClick={handleUnstake}
					disabled={!unlocked || unstakeMutation.isPending}
					data-testid={`unstake-${position.id}`}
					className={cn(
						'rounded-lg',
						unlocked
							? 'bg-white/10 text-white hover:bg-white/15'
							: 'cursor-not-allowed bg-white/[0.04] text-white/25'
					)}
				>
					{unstakeMutation.isPending ? 'Unstaking…' : 'Unstake'}
				</Button>
			</div>
		</div>
	);
}

// ── Skeleton rows ───────────────────────────────────────────────────────

function PositionRowSkeleton() {
	return (
		<div
			aria-hidden="true"
			className={cn(
				CARD,
				'flex items-center justify-between gap-4 p-5'
			)}
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

function StakingDashboardContent() {
	useDocumentTitle('Staking Dashboard — AccessLayer');

	const { address, isConnected } = useAccount();
	const wallet = address ?? '';

	const {
		data: stakingData,
		isLoading: isPositionsLoading,
		isError: isPositionsError,
	} = useStakingPositions(wallet);

	const { data: holdings, isLoading: isHoldingsLoading } =
		useWalletHoldings(wallet);

	const positions = useMemo(
		() => stakingData?.positions ?? [],
		[stakingData?.positions]
	);

	// ── Computed summaries ──────────────────────────────────────────────

	const totalStakedValueStroops = useMemo(
		() => computeStakingPortfolioValueStroops(positions),
		[positions]
	);

	const totalClaimableStroops = useMemo(
		() =>
			positions.reduce(
				(acc, p) => acc + (p.claimableReward ?? 0),
				0
			),
		[positions]
	);

	const activePositionCount = positions.filter(
		p => p.stakedQuantity > 0
	).length;

	return (
		<main className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8">
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
						Staking
					</p>
					<h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
						Staking dashboard
					</h1>
					<p className="mt-2 max-w-lg text-sm text-white/50">
						Stake your creator keys, choose a lock period, and track
						the rewards accruing from the protocol reward pool.
					</p>
				</header>

				{/* Wallet not connected */}
				{!isConnected && (
					<section
						className={cn(CARD, 'p-8')}
						data-testid="staking-connect-prompt"
					>
						<p className="text-sm text-white/60">
							Connect your wallet to view your staking positions
							and stake creator keys.
						</p>
						<div className="mt-4">
							<ConnectWalletButton />
						</div>
					</section>
				)}

				{/* Summary cards */}
				{isConnected && (
					<div
						className="grid gap-4 sm:grid-cols-3"
						data-testid="staking-summary"
					>
						<SummaryStat
							label="Total staked value"
							value={
								totalStakedValueStroops != null
									? formatDisplayKeyPrice(
											totalStakedValueStroops
										)
									: '—'
							}
							icon={Shield}
							accent="amber"
						/>
						<SummaryStat
							label="Total claimable rewards"
							value={`${(totalClaimableStroops / STROOPS_PER_XLM).toFixed(4)} XLM`}
							icon={Coins}
							accent="emerald"
						/>
						<SummaryStat
							label="Active positions"
							value={String(activePositionCount)}
							icon={Clock}
							accent="cyan"
						/>
					</div>
				)}

				{/* Stake form */}
				{isConnected && (
					<StakeForm
						address={wallet}
						holdings={
							isHoldingsLoading
								? []
								: (holdings ?? []).map(h => ({
										creatorId: h.creatorId,
										quantity: h.quantity,
										name:
											(
												h as unknown as Record<
													string,
													unknown
												>
											).name as string | undefined,
										keyName:
											(
												h as unknown as Record<
													string,
													unknown
												>
											).keyName as
												| string
												| undefined,
									}))
						}
					/>
				)}

				{/* Active stakes table */}
				{isConnected && (
					<section data-testid="active-stakes-section">
						<h2 className="mb-4 text-lg font-bold text-white">
							Active positions
						</h2>

						{/* Loading */}
						{isPositionsLoading && (
							<div
								className="space-y-3"
								data-testid="staking-positions-skeleton"
							>
								{Array.from({ length: 3 }).map((_, i) => (
									<PositionRowSkeleton key={i} />
								))}
							</div>
						)}

						{/* Error */}
						{isPositionsError && (
							<div
								className="rounded-2xl border border-dashed border-red-500/30 p-8 text-center"
								data-testid="staking-positions-error"
							>
								<p className="text-sm text-red-400">
									Unable to load staking positions. Please try
									again.
								</p>
							</div>
						)}

						{/* Empty state */}
						{!isPositionsLoading &&
							!isPositionsError &&
							positions.length === 0 && (
								<div
									className="rounded-2xl border border-dashed border-white/10 p-8 text-center"
									data-testid="staking-positions-empty"
								>
									<Lock
										className="mx-auto mb-3 size-8 text-white/20"
										aria-hidden="true"
									/>
									<p className="text-sm text-white/40">
										No active staking positions. Use the
										form above to stake your first creator
										key.
									</p>
								</div>
							)}

						{/* Positions */}
						{!isPositionsLoading &&
							!isPositionsError &&
							positions.length > 0 && (
								<div
									className="space-y-3"
									data-testid="staking-positions-list"
								>
									{positions.map(position => (
										<PositionRow
											key={position.id}
											position={position}
											address={wallet}
										/>
									))}
								</div>
							)}
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

export default function StakingDashboardPage() {
	return <StakingDashboardContent />;
}
