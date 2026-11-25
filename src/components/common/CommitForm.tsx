import { useState, type FC, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useCommitLaunchOrderMutation } from '@/hooks/useCreatorContractActions';
import {
	createLaunchOrderSecret,
	normalizeLaunchAmount,
	type LaunchOrderSecret,
} from '@/utils/launchCommitReveal.utils';
import { saveLaunchOrderSecret } from '@/services/launchOrderSecret.service';

interface CommitFormProps {
	keyId: string;
	walletAddress: string | null;
	phase: 'commit' | 'reveal' | 'settled' | 'inactive';
	secret: LaunchOrderSecret | null;
	onSecretChange: (secret: LaunchOrderSecret) => void;
}

const CommitForm: FC<CommitFormProps> = ({
	keyId,
	walletAddress,
	phase,
	secret,
	onSecretChange,
}) => {
	const mutation = useCommitLaunchOrderMutation(keyId);
	const [amount, setAmount] = useState('');
	const [error, setError] = useState<string | null>(null);

	const submitOrder = async (event: FormEvent) => {
		event.preventDefault();
		if (phase !== 'commit' || !walletAddress || mutation.isPending) return;

		try {
			let orderSecret = secret;
			if (!orderSecret) {
				const validAmount = normalizeLaunchAmount(amount);
				if (!validAmount) {
					setError('Enter an order amount greater than zero.');
					return;
				}
				orderSecret = createLaunchOrderSecret(
					keyId,
					walletAddress,
					validAmount
				);
				await saveLaunchOrderSecret(orderSecret);
				onSecretChange(orderSecret);
			}

			await mutation.mutateAsync({
				keyId,
				walletAddress,
				commitmentHash: orderSecret.commitmentHash,
			});
			const committedSecret = { ...orderSecret, committed: true };
			await saveLaunchOrderSecret(committedSecret);
			onSecretChange(committedSecret);
			setError(null);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Unable to commit this order.'
			);
		}
	};

	const alreadyCommitted = secret?.committed === true;
	const canCommit =
		phase === 'commit' &&
		Boolean(walletAddress) &&
		!alreadyCommitted &&
		!mutation.isPending;

	return (
		<form
			onSubmit={submitOrder}
			className="space-y-4"
			data-testid="launch-commit-form"
			noValidate
		>
			{alreadyCommitted ? (
				<div
					role="status"
					className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200"
				>
					Your order has been committed. Return during the reveal phase to
					reveal it.
				</div>
			) : (
				<>
					<p className="text-sm text-white/60">
						Your order amount stays private until you reveal it. Keep a
						backup of your salt so you can reveal from another browser.
					</p>
					<label className="block space-y-2 text-sm font-semibold text-white/80">
						Order amount
						<input
							data-testid="launch-order-amount"
							type="text"
							inputMode="decimal"
							autoComplete="off"
							className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40 disabled:opacity-50"
							value={secret?.amount ?? amount}
							onChange={event => setAmount(event.target.value)}
							disabled={!canCommit || Boolean(secret)}
							aria-label="Order amount"
						/>
					</label>
					<Button
						type="submit"
						data-testid="launch-commit-submit"
						disabled={!canCommit}
					>
						{mutation.isPending
							? 'Committing…'
							: secret
								? 'Retry commit'
								: 'Commit order'}
					</Button>
				</>
			)}
			{!walletAddress && (
				<p className="text-sm text-amber-200" role="status">
					Connect your wallet to commit an order.
				</p>
			)}
			{error && (
				<p className="text-sm text-rose-300" role="alert">
					{error}
				</p>
			)}
		</form>
	);
};

export default CommitForm;
