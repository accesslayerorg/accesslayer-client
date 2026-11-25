import { useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { useRevealLaunchOrderMutation } from '@/hooks/useCreatorContractActions';
import { saveLaunchOrderSecret } from '@/services/launchOrderSecret.service';
import {
	parseLaunchOrderBackup,
	type LaunchOrderSecret,
} from '@/utils/launchCommitReveal.utils';

interface RevealFormProps {
	keyId: string;
	walletAddress: string | null;
	phase: 'commit' | 'reveal' | 'settled' | 'inactive';
	secret: LaunchOrderSecret | null;
	onSecretChange: (secret: LaunchOrderSecret) => void;
}

const RevealForm: FC<RevealFormProps> = ({
	keyId,
	walletAddress,
	phase,
	secret,
	onSecretChange,
}) => {
	const mutation = useRevealLaunchOrderMutation(keyId);
	const [error, setError] = useState<string | null>(null);

	const revealOrder = async () => {
		if (
			phase !== 'reveal' ||
			!walletAddress ||
			!secret ||
			mutation.isPending
		) {
			return;
		}

		try {
			await mutation.mutateAsync({
				keyId,
				walletAddress,
				amount: secret.amount,
				commitmentHash: secret.commitmentHash,
				salt: secret.salt,
			});
			const revealedSecret = { ...secret, revealed: true };
			await saveLaunchOrderSecret(revealedSecret);
			onSecretChange(revealedSecret);
			setError(null);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Unable to reveal this order.'
			);
		}
	};

	const restoreBackup = async (file: File | undefined) => {
		if (!file || !walletAddress) return;
		try {
			const backup = parseLaunchOrderBackup(
				JSON.parse(await file.text()) as unknown,
				keyId,
				walletAddress
			);
			await saveLaunchOrderSecret(backup);
			onSecretChange(backup);
			setError(null);
		} catch (restoreError) {
			setError(
				restoreError instanceof Error
					? restoreError.message
					: 'Unable to restore the launch order backup.'
			);
		}
	};

	const isRevealable = phase === 'reveal' && Boolean(walletAddress) && Boolean(secret);

	return (
		<div className="space-y-4" data-testid="launch-reveal-form">
			{secret?.revealed ? (
				<div
					role="status"
					className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200"
				>
					Your order has been revealed and is waiting for settlement.
				</div>
			) : secret ? (
				<>
					<p className="text-sm text-white/60">
						Reveal the committed order using its saved salt.
					</p>
					<Button
						type="button"
						data-testid="launch-reveal-submit"
						onClick={() => void revealOrder()}
						disabled={!isRevealable || mutation.isPending}
					>
						{mutation.isPending ? 'Revealing…' : 'Reveal order'}
					</Button>
				</>
			) : (
				<div
					role="alert"
					className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4"
					data-testid="launch-missing-salt"
				>
					<p className="text-sm text-rose-200">
						The order salt is missing from this browser. Without the
						original salt, the order cannot be revealed. Restore your
						backup file to continue.
					</p>
					<label className="block text-sm font-semibold text-white/80">
						Restore from backup
						<input
							data-testid="launch-backup-input"
							type="file"
							accept="application/json,.json"
							className="mt-2 block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
							disabled={phase !== 'reveal' || !walletAddress}
							onChange={event => {
								void restoreBackup(event.currentTarget.files?.[0]);
								event.currentTarget.value = '';
							}}
						/>
					</label>
				</div>
			)}
			{!walletAddress && (
				<p className="text-sm text-amber-200" role="status">
					Connect the wallet used to commit this order.
				</p>
			)}
			{error && (
				<p className="text-sm text-rose-300" role="alert">
					{error}
				</p>
			)}
		</div>
	);
};

export default RevealForm;
