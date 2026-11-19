import { useEffect, useState } from 'react';
import {
	Check,
	Clock3,
	History,
	Loader2,
	LockKeyhole,
	ShieldCheck,
	ShieldX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import { TruncatedText } from '@/components/ui/truncated-text';
import { useUpgradeProxy } from '@/hooks/useUpgradeProxy';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/web3/format';
import type { PendingUpgrade } from '@/services/admin.service';
import { formatCountdownTime } from '@/utils/lockupCountdown.utils';
import showToast from '@/utils/toast.util';

interface UpgradeProxyPanelProps {
	isAdmin: boolean;
}

const PANEL_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

const COUNTDOWN_TICK_MS = 1_000;

const EPOCH_SECONDS_CEILING = 1e11;

function uniqueSignatureCount(upgrade: PendingUpgrade): number {
	return new Set(
		upgrade.signatures.map(signature => signature.signer.toLowerCase())
	).size;
}

function getTimelockRemainingSeconds(
	timelockEndsAt: string | number,
	now: number
): number {
	let endsAtSec: number;
	if (typeof timelockEndsAt === 'number') {
		endsAtSec =
			timelockEndsAt > EPOCH_SECONDS_CEILING
				? Math.floor(timelockEndsAt / 1000)
				: timelockEndsAt;
	} else {
		endsAtSec = Math.floor(new Date(timelockEndsAt).getTime() / 1000);
	}
	return Math.max(0, endsAtSec - Math.floor(now / 1000));
}

function formatFreezePayload(isFrozen: boolean): string {
	return `emergency-freeze:${isFrozen ? 'enable' : 'disable'}:${Date.now()}`;
}

function StatusBadge({ label }: { label: string }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
			{label}
		</span>
	);
}

function PendingUpgradeCard({
	upgrade,
	isExecuting,
	onExecute,
	now,
}: {
	upgrade: PendingUpgrade;
	isExecuting: boolean;
	onExecute: (upgrade: PendingUpgrade) => void;
	now: number;
}) {
	const signatureCount = uniqueSignatureCount(upgrade);
	const thresholdMet = signatureCount >= upgrade.requiredSignatures;
	const remainingSeconds = getTimelockRemainingSeconds(
		upgrade.timelockEndsAt,
		now
	);
	const timelockElapsed = remainingSeconds <= 0;
	const canExecute = thresholdMet && timelockElapsed;
	const progress = Math.min(
		100,
		(signatureCount / upgrade.requiredSignatures) * 100
	);

	return (
		<li className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
							<LockKeyhole className="size-3" aria-hidden="true" />
							Upgrade proposal
						</span>
						<span className="text-xs text-white/35">
							{new Date(
								typeof upgrade.timelockEndsAt === 'number'
									? upgrade.timelockEndsAt
									: new Date(upgrade.timelockEndsAt).getTime()
							).toLocaleString(undefined, {
								dateStyle: 'medium',
								timeStyle: 'short',
							})}
						</span>
					</div>
					<h3 className="mt-3 font-grotesque text-lg font-bold text-white">
						Proposed implementation upgrade
					</h3>
					<div className="mt-2 flex items-center gap-2">
						<span className="text-xs text-white/35">New logic address:</span>
						<TruncatedText
							text={upgrade.newImplementation}
							maxWidth="120px"
							className="font-mono text-sm text-white/80"
						/>
					</div>
				</div>
				<div className="shrink-0 text-left lg:text-right">
					<p className="font-mono text-sm font-bold text-amber-200">
						{signatureCount} / {upgrade.requiredSignatures} signatures
					</p>
					<p className="mt-1 text-xs text-white/35">
						{upgrade.totalSigners} admin wallets in the quorum
					</p>
				</div>
			</div>

			<div className="mt-5" aria-label={`${signatureCount} of ${upgrade.requiredSignatures} signatures`}>
				<div
					className="flex gap-1.5"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={upgrade.requiredSignatures}
					aria-valuenow={signatureCount}
				>
					{Array.from({ length: upgrade.requiredSignatures }).map((_, index) => (
						<span
							key={index}
							className={cn(
								'h-2 flex-1 rounded-full transition-colors',
								index < signatureCount ? 'bg-amber-300' : 'bg-white/10'
							)}
						/>
					))}
				</div>
				<div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
					<div
						className="h-full rounded-full bg-amber-300/70 transition-all"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			<div className="mt-5">
				<div className="flex items-center gap-2">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Timelock
					</dt>
					<dd
						className="font-mono font-bold text-white"
						role="status"
						aria-live="polite"
						data-testid="upgrade-proxy-timelock"
					>
						{timelockElapsed ? 'Ready' : formatCountdownTime(remainingSeconds)}
					</dd>
				</div>
			</div>

			<div className="mt-5 flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex -space-x-1.5" aria-label="Signers">
					{upgrade.signatures.length === 0 ? (
						<span className="text-xs text-white/35">No admin signatures yet</span>
					) : (
						upgrade.signatures.map(signature => (
							<span
								key={`${signature.signer}-${signature.signature}`}
								title={signature.signer}
								className="flex size-7 items-center justify-center rounded-full border-2 border-[#091728] bg-emerald-400/20 text-emerald-200"
							>
								<Check
									className="size-3.5"
									aria-label={`Signed by ${signature.signer}`}
								/>
							</span>
						))
					)}
				</div>
				<Button
					type="button"
					onClick={() => onExecute(upgrade)}
					disabled={!canExecute || isExecuting}
					className="rounded-xl font-bold"
					data-testid="upgrade-proxy-execute"
				>
					{isExecuting ? (
						<Loader2 className="animate-spin" aria-hidden="true" />
					) : (
						<ShieldCheck aria-hidden="true" />
					)}
					{isExecuting
						? 'Executing…'
						: timelockElapsed && !thresholdMet
							? 'Waiting for signatures'
							: 'Execute upgrade'}
				</Button>
			</div>
		</li>
	);
}

export default function UpgradeProxyPanel({ isAdmin }: UpgradeProxyPanelProps) {
	const { address, isConnected, activeSigner } = useStellarWallet();
	const [executingId, setExecutingId] = useState<string | null>(null);
	const [togglingFreeze, setTogglingFreeze] = useState(false);
	const [now, setNow] = useState(() => Date.now());
	const {
		status,
		pendingUpgrade,
		history,
		executeUpgrade,
		toggleFreeze,
		enabled,
	} = useUpgradeProxy(isAdmin, isConnected);

	const hasCountdown =
		pendingUpgrade.data &&
		getTimelockRemainingSeconds(pendingUpgrade.data.timelockEndsAt, now) > 0;

	useEffect(() => {
		if (!hasCountdown) return;
		const id = window.setInterval(
			() => setNow(Date.now()),
			COUNTDOWN_TICK_MS
		);
		return () => window.clearInterval(id);
	}, [hasCountdown]);

	if (!enabled || !address) return null;

	const isFrozen = status.data?.isFrozen ?? false;

	const handleExecute = async (upgrade: PendingUpgrade) => {
		setExecutingId(upgrade.id);
		try {
			if (!activeSigner?.signMessage) {
				throw new Error(
					'The connected Stellar wallet cannot sign this upgrade.'
				);
			}
			const signature = await activeSigner.signMessage(upgrade.payload);
			executeUpgrade.mutate(
				{ signature, signer: address },
				{ onSettled: () => setExecutingId(null) }
			);
		} catch (error) {
			setExecutingId(null);
			showToast.error(
				error instanceof Error
					? error.message
					: 'The wallet signature was not completed.'
			);
		}
	};

	const handleToggleFreeze = async () => {
		setTogglingFreeze(true);
		try {
			if (!activeSigner?.signMessage) {
				throw new Error(
					'The connected Stellar wallet cannot sign this action.'
				);
			}
			const payload = formatFreezePayload(!isFrozen);
			const signature = await activeSigner.signMessage(payload);
			toggleFreeze.mutate(
				{ isFrozen: !isFrozen, signature, signer: address },
				{ onSettled: () => setTogglingFreeze(false) }
			);
		} catch (error) {
			setTogglingFreeze(false);
			showToast.error(
				error instanceof Error
					? error.message
					: 'The wallet signature was not completed.'
			);
		}
	};

	return (
		<section className={PANEL_CLASS} data-testid="upgrade-proxy-panel">
			<div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
				<div>
					<div className="flex items-center gap-2 text-amber-300">
						<ShieldCheck className="size-5" aria-hidden="true" />
						<span className="text-xs font-bold uppercase tracking-[0.22em]">
							Protocol safety
						</span>
					</div>
					<h2 className="mt-2 font-grotesque text-2xl font-black tracking-tight">
						Upgrade proxy
					</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
						View and manage the proxy implementation address, pending
						upgrades, and emergency freeze status. Sensitive actions
						require admin signature confirmation.
					</p>
				</div>
				<div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 px-4 py-3 text-sm">
					<p className="text-xs uppercase tracking-[0.16em] text-white/40">
						Connected admin
					</p>
					<p className="mt-1 font-mono text-xs font-bold text-emerald-200">
						{shortenAddress(address)}
					</p>
				</div>
			</div>

			<div className="mt-8">
				<h3 className="font-grotesque text-lg font-bold">
					Current implementation
				</h3>
				{status.isLoading && (
					<div className="mt-4 space-y-3" role="status" aria-label="Loading proxy status">
						<Skeleton className="h-8 w-full max-w-xs rounded-xl" />
					</div>
				)}
				{status.isError && (
					<div
						className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/5 p-5 text-sm text-rose-100"
						role="alert"
					>
						Proxy status could not be loaded. Retry from the dashboard refresh.
					</div>
				)}
				{!status.isLoading && !status.isError && (
					<div
						className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 md:py-5"
						data-testid="upgrade-proxy-status"
					>
						<div className="min-w-0 flex-1">
							<p className="text-xs uppercase tracking-[0.16em] text-white/40">
								Current logic address
							</p>
							<div className="mt-2 flex items-center gap-2">
								{status.data?.logicAddress ? (
									<TruncatedText
										text={status.data.logicAddress}
										maxWidth="100%"
										className="font-mono text-sm text-white/80"
									/>
								) : (
									<span className="text-sm text-white/40">
										Not configured
									</span>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<StatusBadge
								label={
									isFrozen ? 'Emergency frozen' : 'Active'
								}
							/>
							<Button
								type="button"
								variant={isFrozen ? 'outline' : 'destructive'}
								size="sm"
								onClick={() => void handleToggleFreeze()}
								disabled={togglingFreeze || !activeSigner}
								className={cn(
									'rounded-xl font-bold',
									isFrozen
										? 'border-white/10 bg-white/5 text-white hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200'
										: 'border-rose-500/20 bg-rose-500/10 text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/20'
								)}
								data-testid="upgrade-proxy-freeze-toggle"
							>
								{togglingFreeze ? (
									<Loader2 className="animate-spin" aria-hidden="true" />
								) : isFrozen ? (
									<ShieldX className="size-4 mr-1.5" aria-hidden="true" />
								) : (
									<ShieldCheck className="size-4 mr-1.5" aria-hidden="true" />
								)}
								{togglingFreeze
									? 'Toggling…'
									: isFrozen
										? 'Unfreeze'
										: 'Freeze'}
							</Button>
						</div>
					</div>
				)}
			</div>

			<div className="mt-10">
				<div className="mb-4 flex items-center justify-between gap-4">
					<div>
						<h3 className="font-grotesque text-lg font-bold">
							Pending upgrade
						</h3>
						<p className="mt-1 text-xs text-white/40">
							Proposals awaiting signature threshold and timelock expiry
						</p>
					</div>
					<Clock3 className="size-5 text-white/25" aria-hidden="true" />
				</div>

				{pendingUpgrade.isLoading && (
					<div className="space-y-3" role="status" aria-label="Loading pending upgrade">
						<div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
					</div>
				)}

				{pendingUpgrade.isError && (
					<div
						className="rounded-2xl border border-rose-300/20 bg-rose-300/5 p-5 text-sm text-rose-100"
						role="alert"
					>
						Pending upgrade could not be loaded. Retry from the dashboard refresh.
					</div>
				)}

				{!pendingUpgrade.isLoading &&
					!pendingUpgrade.isError &&
					!pendingUpgrade.data && (
					<div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-white/40">
						No pending upgrade proposals.
					</div>
				)}

				{!pendingUpgrade.isLoading &&
					!pendingUpgrade.isError &&
					pendingUpgrade.data && (
						<ul
							className="space-y-4"
							data-testid="upgrade-proxy-pending-list"
							aria-label="Pending upgrade proposals"
						>
							<PendingUpgradeCard
								upgrade={pendingUpgrade.data}
								isExecuting={executingId === pendingUpgrade.data.id}
								onExecute={handleExecute}
								now={now}
							/>
						</ul>
					)}
			</div>

			<div className="mt-10 border-t border-white/10 pt-8">
				<div className="mb-4 flex items-center gap-2">
					<History className="size-4 text-white/40" aria-hidden="true" />
					<h3 className="font-grotesque text-lg font-bold">Upgrade history</h3>
				</div>

				{history.isLoading && (
					<p className="text-sm text-white/40" role="status">
						Loading upgrade history…
					</p>
				)}

				{history.isError && (
					<div
						className="rounded-2xl border border-rose-300/20 bg-rose-300/5 px-4 py-6 text-center"
						role="alert"
					>
						<p className="font-jakarta text-sm text-white/60">
							History could not be loaded. Try again.
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => void history.refetch()}
							className="mt-4 rounded-xl border-white/10 bg-white/5 font-bold text-white hover:border-amber-500/30 hover:bg-amber-500/10"
						>
							Retry
						</Button>
					</div>
				)}

				{!history.isLoading &&
					!history.isError &&
					(history.data?.length ?? 0) === 0 && (
					<p className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-white/35">
						No upgrade history recorded yet.
					</p>
				)}

				{!history.isLoading &&
					!history.isError &&
					(history.data?.length ?? 0) > 0 && (
					<ul
						className="divide-y divide-white/10 rounded-2xl border border-white/10"
						data-testid="upgrade-proxy-history-list"
						aria-label="Upgrade history"
					>
						{history.data?.map(event => (
							<li
								key={event.id}
								className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0">
									<p className="font-semibold text-white/85">
										Implementation upgraded
									</p>
									<div className="mt-1 flex items-center gap-2">
										<TruncatedText
											text={event.previousImplementation}
											maxWidth="100px"
											className="font-mono text-xs text-white/60"
										/>
										<span className="text-xs text-white/40">→</span>
										<TruncatedText
											text={event.newImplementation}
											maxWidth="100px"
											className="font-mono text-xs text-white/60"
										/>
									</div>
									<p className="mt-1 text-xs text-white/40">
										By {shortenAddress(event.admin)}
									</p>
								</div>
								<time
									className="shrink-0 text-xs text-emerald-200/75"
									dateTime={event.executedAt}
								>
									{event.executedAt
										? new Date(event.executedAt).toLocaleString(undefined, {
												dateStyle: 'medium',
												timeStyle: 'short',
											})
										: 'Executed'}
								</time>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
