import { useEffect, useState, type FC } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useLaunchPhase } from '@/hooks/useLaunchPhase';
import {
	getLaunchPhaseCountdown,
	parseLaunchOrderBackup,
	type LaunchOrderSecret,
} from '@/utils/launchCommitReveal.utils';
import { getLaunchOrderSecret } from '@/services/launchOrderSecret.service';
import showToast from '@/utils/toast.util';
import CommitForm from '@/components/common/CommitForm';
import RevealForm from '@/components/common/RevealForm';
import PhaseCountdown from '@/components/common/PhaseCountdown';

interface CommitRevealPanelProps {
	keyId: string;
	userAddress?: string | null;
}

function downloadSecretBackup(secret: LaunchOrderSecret): void {
	const blob = new Blob([JSON.stringify(secret, null, 2)], {
		type: 'application/json',
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `launch-order-${secret.keyId}.json`;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const CommitRevealPanel: FC<CommitRevealPanelProps> = ({
	keyId,
	userAddress,
}) => {
	const { address } = useAccount();
	const walletAddress = userAddress ?? address ?? null;
	const phaseState = useLaunchPhase(keyId);
	const storageKey = JSON.stringify([
		keyId,
		walletAddress?.trim().toLowerCase() ?? null,
	]);
	const [loadedSecret, setLoadedSecret] = useState<{
		storageKey: string;
		secret: LaunchOrderSecret | null;
		error: string | null;
	} | null>(null);

	useEffect(() => {
		let cancelled = false;
		if (!walletAddress) {
			return;
		}

		void getLaunchOrderSecret(keyId, walletAddress)
			.then(savedSecret => {
				const validatedSecret = savedSecret
					? parseLaunchOrderBackup(savedSecret, keyId, walletAddress)
					: null;
				if (!cancelled) {
					setLoadedSecret({
						storageKey,
						secret: validatedSecret,
						error: null,
					});
				}
			})
			.catch(error => {
				if (!cancelled) {
					setLoadedSecret({
						storageKey,
						secret: null,
						error:
							error instanceof Error
								? error.message
								: 'Unable to read the saved launch order.',
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [keyId, storageKey, walletAddress]);

	const hasLoadedCurrentSecret = loadedSecret?.storageKey === storageKey;
	const secret = hasLoadedCurrentSecret ? loadedSecret.secret : null;
	const storageError = hasLoadedCurrentSecret ? loadedSecret.error : null;
	const isLoadingSecret = Boolean(walletAddress) && !hasLoadedCurrentSecret;
	const handleSecretChange = (nextSecret: LaunchOrderSecret) => {
		setLoadedSecret({ storageKey, secret: nextSecret, error: null });
	};

	if (phaseState.phase === 'inactive') return null;

	const phaseTitle = {
		commit: 'Commit your launch order',
		reveal: 'Reveal your launch order',
		settled: 'Launch results',
		inactive: '',
	}[phaseState.phase];

	const countdown = getLaunchPhaseCountdown(phaseState.ledgersRemaining);

	return (
		<section
			className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 shadow-2xl backdrop-blur-md md:p-6"
			data-testid="commit-reveal-panel"
			aria-label="Commit-reveal launch participation"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
						Fair launch
					</p>
					<h2 className="mt-1 font-grotesque text-xl font-black tracking-tight text-white">
						{phaseTitle}
					</h2>
					<p className="mt-1 max-w-xl text-sm text-white/60">
						Commit an order privately, then reveal it before the reveal
						window closes to participate in settlement.
					</p>
				</div>
				<PhaseCountdown
					phase={phaseState.phase}
					ledgersRemaining={phaseState.ledgersRemaining}
					countdownLabel={countdown.label}
					className="sm:mt-1"
				/>
			</div>

			<div className="mt-5 space-y-4">
				{phaseState.phase !== 'settled' && (
					<p
						data-testid="launch-salt-warning"
						className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs text-amber-100/80"
					>
						Your salt is stored in this browser only. Clearing browser
						data or losing this device before revealing can forfeit your
						order. Download a backup and keep it somewhere safe.
					</p>
				)}

				{isLoadingSecret ? (
					<p role="status" className="text-sm text-white/50">
						Checking for a saved launch order…
					</p>
				) : phaseState.phase === 'commit' ? (
					<CommitForm
						keyId={keyId}
						walletAddress={walletAddress}
						phase={phaseState.phase}
						secret={secret}
						onSecretChange={handleSecretChange}
					/>
				) : phaseState.phase === 'reveal' ? (
					<RevealForm
						keyId={keyId}
						walletAddress={walletAddress}
						phase={phaseState.phase}
						secret={secret}
						onSecretChange={handleSecretChange}
					/>
				) : (
					<div
						className="grid gap-3 sm:grid-cols-3"
						data-testid="launch-settlement-results"
					>
						<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
							<p className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
								Filled
							</p>
							<p className="mt-1 font-semibold text-white">
								{phaseState.settlement.fillAmount ?? 'Not available'}
							</p>
						</div>
						<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
							<p className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
								Refunded
							</p>
							<p className="mt-1 font-semibold text-white">
								{phaseState.settlement.refundAmount ?? 'Not available'}
							</p>
						</div>
						<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
							<p className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
								Clearing price
							</p>
							<p className="mt-1 font-semibold text-white">
								{phaseState.settlement.clearingPrice ?? 'Not available'}
							</p>
						</div>
					</div>
				)}

				{storageError && (
					<p role="alert" className="text-sm text-rose-300">
						{storageError}
					</p>
				)}

				{secret && (
					<div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
								Order commitment
							</p>
							<p className="mt-1 truncate font-mono text-xs text-white/70">
								{secret.commitmentHash}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							data-testid="launch-download-backup"
							onClick={() => {
								try {
									downloadSecretBackup(secret);
								} catch (error) {
									showToast.error(
										error instanceof Error
											? error.message
											: 'Unable to download the salt backup.'
									);
								}
							}}
						>
							Download salt backup
						</Button>
					</div>
				)}

				{phaseState.isError && (
					<p role="alert" className="text-sm text-rose-300">
						Unable to load launch phase data. Refresh the page and try
						again.
					</p>
				)}
			</div>
		</section>
	);
};

export default CommitRevealPanel;
