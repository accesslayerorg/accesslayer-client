import { useState } from 'react';
import { KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import Skeleton from '@/components/ui/skeleton';
import { TruncatedText } from '@/components/ui/truncated-text';
import InlineValidationMessage from '@/components/common/InlineValidationMessage';
import {
	normalizeStellarContractAddress,
	getStellarContractAddressError,
} from '@/utils/stellarAddress.utils';
import {
	useAddOracleCaller,
	useOracleCallers,
	useRemoveOracleCaller,
} from '@/hooks/useOracleCallers';
import { cn } from '@/lib/utils';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

export default function OracleAccessPanel() {
	const {
		data: callers = [],
		isLoading,
		isError,
		refetch,
	} = useOracleCallers();
	const addCaller = useAddOracleCaller();
	const removeCaller = useRemoveOracleCaller();

	const [address, setAddress] = useState('');
	const [showValidation, setShowValidation] = useState(false);
	const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

	const normalizedAddress = normalizeStellarContractAddress(address);

	const validationError = (() => {
		const formatError = getStellarContractAddressError(address);
		if (formatError) return formatError;

		const alreadyApproved = callers.some(
			caller =>
				normalizeStellarContractAddress(caller.address) ===
				normalizedAddress
		);
		if (alreadyApproved) return 'This caller is already approved';

		return null;
	})();

	const isAddressValid = validationError === null && normalizedAddress !== '';
	const canAdd = isAddressValid && !addCaller.isPending;
	const showValidationError = showValidation && validationError !== null;

	const handleAdd = () => {
		if (!isAddressValid) {
			setShowValidation(true);
			return;
		}

		setShowValidation(false);
		addCaller.mutate(normalizedAddress, {
			onSuccess: () => setAddress(''),
		});
	};

	const handleConfirmRemove = (callerAddress: string) => {
		setPendingRemoval(callerAddress);
	};

	return (
		<section className={CARD_CLASS} data-testid="oracle-access-panel">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight">
						Oracle Access
					</h2>
					<p className="mt-1 text-sm text-white/50">
						Control which external contracts may call the AccessLayer
						price oracle.
					</p>
				</div>
			</div>

			<div className="mb-8">
				<label
					htmlFor="oracle-caller-input"
					className="mb-2 block text-sm font-medium text-white/70"
				>
					Approved caller address
				</label>
				<form
					onSubmit={event => {
						event.preventDefault();
						handleAdd();
					}}
					className="flex flex-col gap-3 sm:flex-row"
				>
					<input
						id="oracle-caller-input"
						data-testid="oracle-caller-input"
						type="text"
						inputMode="text"
						autoComplete="off"
						spellCheck={false}
						maxLength={56}
						placeholder="CA…"
						value={address}
						disabled={addCaller.isPending}
						onChange={event => {
							setAddress(event.target.value);
							if (address.trim() !== '') setShowValidation(true);
						}}
						className={cn(
							'h-12 min-w-0 flex-1 rounded-xl border bg-white/[0.03] px-4 font-mono text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20',
							showValidationError
								? 'border-red-500/50'
								: 'border-white/10'
						)}
						aria-invalid={showValidationError}
						aria-describedby={
							showValidationError
								? 'oracle-caller-validation-error'
								: undefined
						}
					/>
					<Button
						type="submit"
						data-testid="oracle-caller-add"
						disabled={!canAdd}
						className="h-12 rounded-xl px-5"
					>
						{addCaller.isPending ? (
							<Loader2 className="animate-spin" aria-hidden="true" />
						) : (
							<Plus aria-hidden="true" />
						)}
						{addCaller.isPending ? 'Adding…' : 'Add'}
					</Button>
				</form>

				{showValidationError && (
					<div
						id="oracle-caller-validation-error"
						data-testid="oracle-caller-validation-error"
					>
						<InlineValidationMessage message={validationError ?? ''} />
					</div>
				)}

				<p className="mt-2 text-xs text-white/35">
					Must be a valid Stellar contract address (56-character address
					beginning with C).
				</p>
			</div>

			{isLoading && (
				<div
					data-testid="oracle-callers-loading"
					className="space-y-3"
					aria-busy="true"
					aria-live="polite"
				>
					{Array.from({ length: 3 }).map((_, index) => (
						<Skeleton key={index} className="h-14 w-full rounded-2xl" />
					))}
				</div>
			)}

			{!isLoading && isError && (
				<div
					data-testid="oracle-callers-error"
					className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center"
				>
					<p className="font-jakarta text-sm text-white/60">
						We couldn&apos;t load the approved callers. Try again.
					</p>
					<Button
						type="button"
						variant="outline"
						data-testid="oracle-callers-retry"
						onClick={() => void refetch()}
						className="mt-4 rounded-xl border-white/10 bg-white/5 font-bold text-white hover:border-amber-500/30 hover:bg-amber-500/10"
					>
						Retry
					</Button>
				</div>
			)}

			{!isLoading && !isError && callers.length === 0 && (
				<div
					data-testid="oracle-callers-empty"
					className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center"
				>
					<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
						<KeyRound className="size-5" aria-hidden="true" />
					</div>
					<p className="font-jakarta text-sm text-white/50">
						No callers are approved yet. Add the first contract address
						above to grant oracle access.
					</p>
				</div>
			)}

			{!isLoading && !isError && callers.length > 0 && (
				<ul
					data-testid="oracle-callers-list"
					className="space-y-3"
					aria-label="Approved oracle callers"
				>
					{callers.map(caller => (
						<li
							key={caller.address}
							className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
						>
							<div className="flex min-w-0 items-center gap-3">
								<KeyRound
									className="size-4 shrink-0 text-amber-300/70"
									aria-hidden="true"
								/>
								<TruncatedText
									text={caller.address}
									maxWidth="100%"
									className="font-mono text-sm text-white/80"
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								data-testid={`oracle-caller-remove-${caller.address}`}
								onClick={() => handleConfirmRemove(caller.address)}
								disabled={removeCaller.isPending}
								className="shrink-0 text-red-300 hover:bg-red-500/10 hover:text-red-200"
							>
								<Trash2 aria-hidden="true" />
								Remove
							</Button>
						</li>
					))}
				</ul>
			)}

			<Dialog
				open={pendingRemoval !== null}
				onOpenChange={open => {
					if (!open && !removeCaller.isPending) setPendingRemoval(null);
				}}
			>
				<DialogContent
					data-testid="oracle-caller-remove-dialog"
					className="border-white/10 bg-[#0b1626] text-white"
					showEscapeHint={false}
				>
					<DialogHeader>
						<DialogTitle className="font-grotesque">
							Remove approved caller?
						</DialogTitle>
						<DialogDescription className="text-white/60">
							This contract will no longer be able to call the
							AccessLayer price oracle. The authorization is revoked
							immediately.
						</DialogDescription>
					</DialogHeader>

					<div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
						<p className="break-all font-mono text-xs text-white/80">
							{pendingRemoval}
						</p>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							data-testid="oracle-caller-cancel-remove"
							onClick={() => setPendingRemoval(null)}
							disabled={removeCaller.isPending}
							className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							data-testid="oracle-caller-confirm-remove"
							onClick={() =>
								pendingRemoval &&
								removeCaller.mutate(pendingRemoval, {
									onSuccess: () => setPendingRemoval(null),
								})
							}
							disabled={removeCaller.isPending}
							className="rounded-xl"
						>
							{removeCaller.isPending ? (
								<Loader2 className="animate-spin" aria-hidden="true" />
							) : (
								<Trash2 aria-hidden="true" />
							)}
							{removeCaller.isPending ? 'Removing…' : 'Remove caller'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
