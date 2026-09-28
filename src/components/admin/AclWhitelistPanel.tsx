import { useState } from 'react';
import { KeyRound, Loader2, Plus, Trash2, History, ShieldAlert } from 'lucide-react';
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
	useAclWhitelist,
	useAclHistory,
	useAddAclContract,
	useRemoveAclContract,
} from '@/hooks/useAclWhitelist';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/web3/format';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

function formatActionTime(timestamp: string): string {
	const date = new Date(timestamp);
	return Number.isNaN(date.getTime())
		? timestamp
		: date.toLocaleString(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
		  });
}

export default function AclWhitelistPanel() {
	const { data: acl = [], isLoading: isAclLoading, isError: isAclError, refetch: refetchAcl } = useAclWhitelist();
	const { data: history = [], isLoading: isHistoryLoading, isError: isHistoryError, refetch: refetchHistory } = useAclHistory();
	const addAcl = useAddAclContract();
	const removeAcl = useRemoveAclContract();

	const [address, setAddress] = useState('');
	const [functionsInput, setFunctionsInput] = useState('');
	const [showValidation, setShowValidation] = useState(false);
	const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

	const normalizedAddress = normalizeStellarContractAddress(address);
	const functions = functionsInput
		.split(',')
		.map(f => f.trim())
		.filter(Boolean);

	const validationError = (() => {
		const formatError = getStellarContractAddressError(address);
		if (formatError) return formatError;

		const alreadyApproved = acl.some(
			contract =>
				normalizeStellarContractAddress(contract.address) === normalizedAddress
		);
		if (alreadyApproved) return 'This contract is already whitelisted';

		if (functions.length === 0 && address.trim() !== '') {
			return 'At least one function must be permitted';
		}

		return null;
	})();

	const isAddressValid = validationError === null && normalizedAddress !== '' && functions.length > 0;
	const canAdd = isAddressValid && !addAcl.isPending;
	const showValidationError = showValidation && validationError !== null;

	const handleAdd = () => {
		if (!isAddressValid) {
			setShowValidation(true);
			return;
		}

		setShowValidation(false);
		addAcl.mutate(
			{ address: normalizedAddress, functions },
			{
				onSuccess: () => {
					setAddress('');
					setFunctionsInput('');
				},
			}
		);
	};

	const handleConfirmRemove = (contractAddress: string) => {
		setPendingRemoval(contractAddress);
	};

	return (
		<section className={CARD_CLASS} data-testid="acl-whitelist-panel">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight">
						Integration ACL
					</h2>
					<p className="mt-1 text-sm text-white/50">
						Manage whitelisted contract integrations and permitted functions.
					</p>
				</div>
			</div>

			<div className="mb-8">
				<form
					onSubmit={event => {
						event.preventDefault();
						handleAdd();
					}}
					className="flex flex-col gap-4"
				>
					<div className="flex flex-col gap-3 sm:flex-row">
						<div className="flex-1">
							<label
								htmlFor="acl-caller-input"
								className="mb-2 block text-sm font-medium text-white/70"
							>
								Contract address
							</label>
							<input
								id="acl-caller-input"
								data-testid="acl-caller-input"
								type="text"
								inputMode="text"
								autoComplete="off"
								spellCheck={false}
								maxLength={56}
								placeholder="CA…"
								value={address}
								disabled={addAcl.isPending}
								onChange={event => {
									setAddress(event.target.value);
									if (address.trim() !== '') setShowValidation(true);
								}}
								className={cn(
									'h-12 w-full rounded-xl border bg-white/[0.03] px-4 font-mono text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20',
									showValidationError && getStellarContractAddressError(address)
										? 'border-red-500/50'
										: 'border-white/10'
								)}
								aria-invalid={showValidationError}
							/>
						</div>
						<div className="flex-1">
							<label
								htmlFor="acl-functions-input"
								className="mb-2 block text-sm font-medium text-white/70"
							>
								Permitted functions (comma separated)
							</label>
							<input
								id="acl-functions-input"
								data-testid="acl-functions-input"
								type="text"
								placeholder="e.g. mint, transfer, swap"
								value={functionsInput}
								disabled={addAcl.isPending}
								onChange={event => {
									setFunctionsInput(event.target.value);
									if (functionsInput.trim() !== '') setShowValidation(true);
								}}
								className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20"
							/>
						</div>
					</div>

					<Button
						type="submit"
						data-testid="acl-caller-add"
						disabled={!canAdd}
						className="h-12 self-start rounded-xl px-5 sm:self-end"
					>
						{addAcl.isPending ? (
							<Loader2 className="animate-spin" aria-hidden="true" />
						) : (
							<Plus aria-hidden="true" />
						)}
						{addAcl.isPending ? 'Adding…' : 'Add to ACL'}
					</Button>
				</form>

				{showValidationError && (
					<div className="mt-4" data-testid="acl-caller-validation-error">
						<InlineValidationMessage message={validationError ?? ''} />
					</div>
				)}
			</div>

			<div className="mb-10">
				<h3 className="mb-4 font-grotesque text-lg font-bold">Current Whitelist</h3>
				{isAclLoading && (
					<div className="space-y-3" aria-busy="true">
						{Array.from({ length: 2 }).map((_, index) => (
							<Skeleton key={index} className="h-16 w-full rounded-2xl" />
						))}
					</div>
				)}

				{!isAclLoading && isAclError && (
					<div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center">
						<p className="font-jakarta text-sm text-white/60">
							We couldn&apos;t load the ACL. Try again.
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => void refetchAcl()}
							className="mt-4 rounded-xl border-white/10 bg-white/5 font-bold text-white hover:border-amber-500/30 hover:bg-amber-500/10"
						>
							Retry
						</Button>
					</div>
				)}

				{!isAclLoading && !isAclError && acl.length === 0 && (
					<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
						<ShieldAlert className="size-6 text-white/40" />
						<p className="font-jakarta text-sm text-white/50">
							No contract integrations are currently whitelisted.
						</p>
					</div>
				)}

				{!isAclLoading && !isAclError && acl.length > 0 && (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm" data-testid="acl-table">
							<thead className="border-b border-white/10 text-xs uppercase text-white/40">
								<tr>
									<th className="pb-3 pr-4 font-semibold">Contract</th>
									<th className="pb-3 px-4 font-semibold">Functions</th>
									<th className="pb-3 px-4 font-semibold">Added</th>
									<th className="pb-3 pl-4 text-right font-semibold">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{acl.map(contract => (
									<tr key={contract.address} className="hover:bg-white/[0.02]">
										<td className="py-4 pr-4">
											<div className="flex items-center gap-2">
												<KeyRound className="size-4 text-amber-300/70" />
												<TruncatedText
													text={contract.address}
													maxWidth="120px"
													className="font-mono text-white/80"
												/>
											</div>
										</td>
										<td className="py-4 px-4 text-white/70">
											{contract.functions.join(', ')}
										</td>
										<td className="py-4 px-4 text-white/50 whitespace-nowrap">
											{formatActionTime(contract.addedAt)}
										</td>
										<td className="py-4 pl-4 text-right">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleConfirmRemove(contract.address)}
												disabled={removeAcl.isPending}
												className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
											>
												<Trash2 aria-hidden="true" />
												Remove
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<div className="border-t border-white/10 pt-8">
				<div className="mb-4 flex items-center gap-2">
					<History className="size-4 text-white/40" />
					<h3 className="font-grotesque text-lg font-bold">Update History</h3>
				</div>

				{isHistoryLoading && <p className="text-sm text-white/40">Loading history…</p>}
				{isHistoryError && (
					<div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-6 text-center">
						<p className="font-jakarta text-sm text-white/60">
							History could not be loaded. Try again.
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => void refetchHistory()}
							className="mt-4 rounded-xl border-white/10 bg-white/5 font-bold text-white hover:border-amber-500/30 hover:bg-amber-500/10"
						>
							Retry
						</Button>
					</div>
				)}
				
				{!isHistoryLoading && !isHistoryError && history.length === 0 && (
					<p className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-white/35">
						No ACL updates recorded yet.
					</p>
				)}

				{!isHistoryLoading && !isHistoryError && history.length > 0 && (
					<ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
						{history.map(event => (
							<li key={event.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="min-w-0">
									<p className="text-sm font-medium text-white/85">
										{event.type === 'add' ? 'Added' : event.type === 'remove' ? 'Removed' : 'Updated'} integration
										<span className="ml-2 font-mono text-xs text-white/60">{shortenAddress(event.address)}</span>
									</p>
									{event.functions && event.functions.length > 0 && (
										<p className="mt-1 text-xs text-white/50">Functions: {event.functions.join(', ')}</p>
									)}
									<p className="mt-1 text-xs text-white/40">By {shortenAddress(event.admin)}</p>
								</div>
								<time className="shrink-0 text-xs text-white/40" dateTime={event.timestamp}>
									{formatActionTime(event.timestamp)}
								</time>
							</li>
						))}
					</ul>
				)}
			</div>

			<Dialog
				open={pendingRemoval !== null}
				onOpenChange={open => {
					if (!open && !removeAcl.isPending) setPendingRemoval(null);
				}}
			>
				<DialogContent
					className="border-white/10 bg-[#0b1626] text-white"
					showEscapeHint={false}
				>
					<DialogHeader>
						<DialogTitle className="font-grotesque">
							Remove from ACL?
						</DialogTitle>
						<DialogDescription className="text-white/60">
							This integration will be removed from the whitelist immediately.
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
							onClick={() => setPendingRemoval(null)}
							disabled={removeAcl.isPending}
							className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={() =>
								pendingRemoval &&
								removeAcl.mutate(pendingRemoval, {
									onSuccess: () => setPendingRemoval(null),
								})
							}
							disabled={removeAcl.isPending}
							className="rounded-xl"
						>
							{removeAcl.isPending ? (
								<Loader2 className="animate-spin" aria-hidden="true" />
							) : (
								<Trash2 aria-hidden="true" />
							)}
							{removeAcl.isPending ? 'Removing…' : 'Remove integration'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
