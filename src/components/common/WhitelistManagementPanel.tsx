import React, { useState } from 'react';
import {
	ShieldAlert,
	ShieldCheck,
	Trash2,
	AlertTriangle,
	Plus,
	Users,
	Copy,
	Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
	isValidStellarAddress,
	parseBatchWhitelist,
	formatWhitelistDate,
	truncateAddress,
} from '@/utils/whitelist.utils';
import type { WhitelistEntry } from '@/services/creatorWhitelist.service';

export interface WhitelistManagementPanelProps {
	creatorId: string;
	isWhitelistEnabled?: boolean;
	whitelist?: WhitelistEntry[];
	onAddAddresses: (addresses: string[]) => Promise<unknown> | void;
	onRemoveAddress: (address: string) => Promise<unknown> | void;
	onDisableWhitelist: () => Promise<unknown> | void;
	isSubmitting?: boolean;
	className?: string;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50 font-mono text-xs';

export const WhitelistManagementPanel: React.FC<
	WhitelistManagementPanelProps
> = ({
	isWhitelistEnabled = true,
	whitelist = [],
	onAddAddresses,
	onRemoveAddress,
	onDisableWhitelist,
	isSubmitting = false,
	className,
}) => {
	const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
	const [singleAddress, setSingleAddress] = useState('');
	const [singleError, setSingleError] = useState<string | null>(null);

	const [batchInput, setBatchInput] = useState('');
	const [batchError, setBatchError] = useState<string | null>(null);

	const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

	// Removal confirmation modal state
	const [walletToRemove, setWalletToRemove] = useState<string | null>(null);

	// Disable whitelist warning modal state
	const [showDisableModal, setShowDisableModal] = useState(false);

	const handleCopy = async (address: string) => {
		try {
			await navigator.clipboard.writeText(address);
			setCopiedAddress(address);
			setTimeout(() => setCopiedAddress(null), 2000);
		} catch {
			// Clipboard API fallback ignored
		}
	};

	const handleSingleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = singleAddress.trim();

		if (!trimmed) {
			setSingleError('Please enter a Stellar wallet address');
			return;
		}

		if (!isValidStellarAddress(trimmed)) {
			setSingleError(
				'Invalid Stellar address format. Must be a 56-character address starting with G.'
			);
			return;
		}

		const isDuplicate = whitelist.some(
			w => w.walletAddress.toUpperCase() === trimmed.toUpperCase()
		);
		if (isDuplicate) {
			setSingleError('Wallet address is already on the whitelist');
			return;
		}

		setSingleError(null);
		await onAddAddresses([trimmed]);
		setSingleAddress('');
	};

	const handleBatchSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const { valid, invalid } = parseBatchWhitelist(batchInput);

		if (valid.length === 0) {
			if (invalid.length > 0) {
				setBatchError(
					`No valid addresses found. ${invalid.length} invalid entr${
						invalid.length === 1 ? 'y' : 'ies'
					}.`
				);
			} else {
				setBatchError('Please paste at least one Stellar wallet address');
			}
			return;
		}

		setBatchError(null);
		await onAddAddresses(valid);
		setBatchInput('');
	};

	const handleConfirmRemove = async () => {
		if (!walletToRemove) return;
		await onRemoveAddress(walletToRemove);
		setWalletToRemove(null);
	};

	const handleConfirmDisable = async () => {
		await onDisableWhitelist();
		setShowDisableModal(false);
	};

	const batchParsed = parseBatchWhitelist(batchInput);

	return (
		<div
			className={cn('space-y-6', className)}
			data-testid="whitelist-management-panel"
		>
			{/* Header & Gate Toggle */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
				<div>
					<div className="flex items-center gap-2.5">
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
							Early Access Whitelist
						</h2>
						<span
							data-testid="whitelist-gate-status"
							className={cn(
								'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
								isWhitelistEnabled
									? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
									: 'border border-white/15 bg-white/5 text-white/50'
							)}
						>
							{isWhitelistEnabled ? (
								<>
									<ShieldCheck className="size-3 text-emerald-400" />
									Active
								</>
							) : (
								<>
									<ShieldAlert className="size-3 text-white/40" />
									Disabled
								</>
							)}
						</span>
					</div>
					<p className="mt-1 text-sm text-white/50">
						Restrict early key purchases to approved wallets.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant={isWhitelistEnabled ? 'destructive' : 'outline'}
						size="sm"
						disabled={!isWhitelistEnabled || isSubmitting}
						data-testid="whitelist-gate-toggle"
						onClick={() => setShowDisableModal(true)}
						className="rounded-xl font-bold transition-all text-xs"
					>
						{isWhitelistEnabled
							? 'Disable Whitelist'
							: 'Permanently Disabled'}
					</Button>
				</div>
			</div>

			{/* Status Banner when Disabled */}
			{!isWhitelistEnabled && (
				<div
					data-testid="whitelist-disabled-banner"
					className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60 flex items-start gap-3"
				>
					<ShieldAlert className="size-5 text-white/40 shrink-0 mt-0.5" />
					<div>
						<p className="font-semibold text-white/80">
							Whitelist gate is disabled
						</p>
						<p className="text-xs text-white/50 mt-0.5">
							Access is public. Any visitor can purchase keys without
							being whitelisted. This action is irreversible.
						</p>
					</div>
				</div>
			)}

			{/* Add Wallet Form (shown when whitelist is enabled) */}
			{isWhitelistEnabled && (
				<div
					className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4"
					data-testid="whitelist-add-form-container"
				>
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
							Add Approved Wallets
						</h3>
						<div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-xs">
							<button
								type="button"
								data-testid="whitelist-mode-single"
								onClick={() => setInputMode('single')}
								className={cn(
									'rounded-md px-3 py-1 font-semibold transition-all',
									inputMode === 'single'
										? 'bg-amber-400/20 text-amber-300'
										: 'text-white/60 hover:text-white'
								)}
							>
								Single Address
							</button>
							<button
								type="button"
								data-testid="whitelist-mode-batch"
								onClick={() => setInputMode('batch')}
								className={cn(
									'rounded-md px-3 py-1 font-semibold transition-all',
									inputMode === 'batch'
										? 'bg-amber-400/20 text-amber-300'
										: 'text-white/60 hover:text-white'
								)}
							>
								Batch Paste
							</button>
						</div>
					</div>

					{inputMode === 'single' ? (
						<form
							onSubmit={handleSingleSubmit}
							noValidate
							data-testid="whitelist-add-form"
							className="space-y-3"
						>
							<div className="space-y-1.5">
								<label
									htmlFor="whitelist-address-input"
									className="text-xs font-medium text-white/70"
								>
									Stellar Public Key
								</label>
								<div className="flex gap-2">
									<input
										id="whitelist-address-input"
										data-testid="whitelist-address-input"
										type="text"
										value={singleAddress}
										onChange={e => {
											setSingleAddress(e.target.value);
											if (singleError) setSingleError(null);
										}}
										placeholder="GBZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWAC"
										className={fieldClass}
										disabled={isSubmitting}
									/>
									<Button
										type="submit"
										data-testid="whitelist-add-button"
										disabled={isSubmitting || !singleAddress.trim()}
										className="rounded-xl font-bold shrink-0"
									>
										<Plus className="size-4 mr-1.5" />
										Add Wallet
									</Button>
								</div>
								{singleError && (
									<p
										role="alert"
										data-testid="whitelist-address-error"
										className="text-xs text-rose-400"
									>
										{singleError}
									</p>
								)}
							</div>
						</form>
					) : (
						<form
							onSubmit={handleBatchSubmit}
							noValidate
							data-testid="whitelist-batch-form"
							className="space-y-3"
						>
							<div className="space-y-1.5">
								<label
									htmlFor="whitelist-batch-input"
									className="text-xs font-medium text-white/70"
								>
									Paste Multiple Addresses (one per line)
								</label>
								<Textarea
									id="whitelist-batch-input"
									data-testid="whitelist-batch-input"
									rows={5}
									value={batchInput}
									onChange={e => {
										setBatchInput(e.target.value);
										if (batchError) setBatchError(null);
									}}
									placeholder={'GABC…\nGDEF…\nGCKF…'}
									className="font-mono text-xs"
									disabled={isSubmitting}
								/>
								{batchInput.trim() && (
									<div
										data-testid="whitelist-batch-summary"
										className="text-xs text-white/60 flex items-center gap-3"
									>
										<span className="text-emerald-400">
											{batchParsed.valid.length} valid address
											{batchParsed.valid.length === 1 ? '' : 'es'}
										</span>
										{batchParsed.invalid.length > 0 && (
											<span className="text-rose-400">
												{batchParsed.invalid.length} invalid
											</span>
										)}
										{batchParsed.duplicates.length > 0 && (
											<span className="text-amber-300">
												{batchParsed.duplicates.length} duplicate
												{batchParsed.duplicates.length === 1 ? '' : 's'}
											</span>
										)}
									</div>
								)}
								{batchError && (
									<p
										role="alert"
										data-testid="whitelist-batch-error"
										className="text-xs text-rose-400"
									>
										{batchError}
									</p>
								)}
							</div>
							<div className="flex justify-end">
								<Button
									type="submit"
									data-testid="whitelist-batch-add-button"
									disabled={
										isSubmitting || batchParsed.valid.length === 0
									}
									className="rounded-xl font-bold"
								>
									<Plus className="size-4 mr-1.5" />
									Add {batchParsed.valid.length > 0
										? `${batchParsed.valid.length} Wallets`
										: 'Batch'}
								</Button>
							</div>
						</form>
					)}
				</div>
			)}

			{/* Whitelist Table */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Users className="size-4 text-white/50" />
						<h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
							Approved Wallets ({whitelist.length})
						</h3>
					</div>
				</div>

				{whitelist.length === 0 ? (
					<div
						data-testid="whitelist-empty-state"
						className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center"
					>
						<p className="text-sm text-white/50">
							No approved wallets on the whitelist yet.
						</p>
						<p className="text-xs text-white/30 mt-1">
							Add Stellar wallet addresses above to grant early access.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
						<table
							data-testid="whitelist-table"
							className="w-full text-left text-sm"
						>
							<thead>
								<tr className="border-b border-white/10 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/40">
									<th className="px-5 py-3">Wallet Address</th>
									<th className="px-5 py-3">Date Added</th>
									<th className="px-5 py-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{whitelist.map(entry => (
									<tr
										key={entry.walletAddress}
										data-testid={`whitelist-row-${entry.walletAddress}`}
										className="hover:bg-white/[0.02] transition-colors"
									>
										<td className="px-5 py-3 font-mono text-xs text-white">
											<div className="flex items-center gap-2">
												<span
													data-testid="whitelist-wallet-address"
													title={entry.walletAddress}
												>
													{truncateAddress(entry.walletAddress, 10, 8)}
												</span>
												<button
													type="button"
													aria-label={`Copy address ${entry.walletAddress}`}
													onClick={() => handleCopy(entry.walletAddress)}
													className="text-white/40 hover:text-white transition-colors"
												>
													{copiedAddress === entry.walletAddress ? (
														<Check className="size-3 text-emerald-400" />
													) : (
														<Copy className="size-3" />
													)}
												</button>
											</div>
										</td>
										<td
											data-testid="whitelist-date-added"
											className="px-5 py-3 text-xs text-white/60"
										>
											{formatWhitelistDate(entry.addedAt)}
										</td>
										<td className="px-5 py-3 text-right">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												data-testid={`whitelist-remove-${entry.walletAddress}`}
												aria-label={`Remove wallet ${entry.walletAddress}`}
												onClick={() =>
													setWalletToRemove(entry.walletAddress)
												}
												disabled={isSubmitting}
												className="h-8 px-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg"
											>
												<Trash2 className="size-3.5 mr-1" />
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

			{/* Remove Wallet Confirmation Modal */}
			<Dialog
				open={Boolean(walletToRemove)}
				onOpenChange={open => !open && setWalletToRemove(null)}
			>
				<DialogContent
					data-testid="remove-wallet-modal"
					className="border-white/10 bg-[#091528] text-white sm:max-w-md"
				>
					<DialogHeader>
						<DialogTitle>Remove Wallet from Whitelist</DialogTitle>
						<DialogDescription className="text-white/60">
							Are you sure you want to remove this wallet address from
							early access? The wallet will no longer be able to purchase
							keys.
						</DialogDescription>
					</DialogHeader>

					{walletToRemove && (
						<div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-amber-300 break-all">
							{walletToRemove}
						</div>
					)}

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							data-testid="cancel-remove-wallet-btn"
							onClick={() => setWalletToRemove(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							data-testid="confirm-remove-wallet-btn"
							onClick={handleConfirmRemove}
							disabled={isSubmitting}
						>
							Remove Wallet
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Disable Whitelist Irreversibility Warning Modal */}
			<Dialog
				open={showDisableModal}
				onOpenChange={open => !open && setShowDisableModal(false)}
			>
				<DialogContent
					data-testid="disable-whitelist-modal"
					className="border-white/10 bg-[#091528] text-white sm:max-w-md"
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-rose-400">
							<AlertTriangle className="size-5 shrink-0" />
							Disable Early Access Whitelist
						</DialogTitle>
						<DialogDescription className="text-white/70">
							Disabling the whitelist gate is permanent and cannot be
							undone.
						</DialogDescription>
					</DialogHeader>

					<div
						data-testid="disable-whitelist-warning"
						className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 space-y-1.5"
					>
						<p className="font-bold text-sm text-rose-300">
							Warning: This action is irreversible
						</p>
						<p className="text-white/80">
							Once disabled, early access restriction will be permanently
							removed. All visitors will be able to buy this creator key,
							and you will not be able to re-enable the whitelist.
						</p>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							data-testid="cancel-disable-whitelist-btn"
							onClick={() => setShowDisableModal(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							data-testid="confirm-disable-whitelist-btn"
							onClick={handleConfirmDisable}
							disabled={isSubmitting}
						>
							Confirm & Disable
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default WhitelistManagementPanel;
