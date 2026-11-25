import React, { useEffect, useState } from 'react';
import { AlertTriangle, Flame, ShieldAlert } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface RagequitModalProps {
	isOpen: boolean;
	onClose: () => void;
	proposalId: string;
	maxKeys: number;
	payoutPerKeyXlm: number;
	onConfirm: (keysToBurn: number) => Promise<void> | void;
	isPending?: boolean;
}

export const RagequitModal: React.FC<RagequitModalProps> = ({
	isOpen,
	onClose,
	proposalId,
	maxKeys,
	payoutPerKeyXlm,
	onConfirm,
	isPending = false,
}) => {
	const [keysToBurn, setKeysToBurn] = useState<number>(maxKeys);
	const [acknowledged, setAcknowledged] = useState<boolean>(false);

	useEffect(() => {
		if (isOpen) {
			setKeysToBurn(maxKeys);
			setAcknowledged(false);
		}
	}, [isOpen, maxKeys]);

	const safeKeys = Math.min(maxKeys, Math.max(0, keysToBurn));
	const estimatedPayout = safeKeys * payoutPerKeyXlm;

	const handleKeysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.target.value);
		if (Number.isNaN(val)) {
			setKeysToBurn(0);
			return;
		}
		setKeysToBurn(Math.min(maxKeys, Math.max(0, Math.floor(val))));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!acknowledged || safeKeys <= 0) return;
		await onConfirm(safeKeys);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
			<DialogContent
				className="sm:max-w-md bg-[#0a1526] text-white border-white/10"
				data-testid="ragequit-modal"
			>
				<form onSubmit={handleSubmit} className="space-y-4">
					<DialogHeader>
						<div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase tracking-wider">
							<ShieldAlert className="size-4" />
							Reserve Exit Grace Window
						</div>
						<DialogTitle className="text-xl font-bold font-jakarta text-white">
							Ragequit & Burn Keys
						</DialogTitle>
						<DialogDescription className="text-white/60 text-sm">
							Oppose Proposal #{proposalId} by burning your creator keys to withdraw your proportional share of the liquidity reserve.
						</DialogDescription>
					</DialogHeader>

					{/* Warning alert */}
					<div
						className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 flex items-start gap-3 text-xs text-red-200"
						data-testid="ragequit-warning-alert"
					>
						<AlertTriangle className="size-4 text-red-400 shrink-0 mt-0.5" />
						<div className="space-y-1">
							<strong className="text-red-300 block font-semibold">
								Warning: Action is Irreversible
							</strong>
							<p className="leading-relaxed text-red-200/90">
								Once confirmed, your creator keys will be burned immediately and permanently from circulation. You cannot reclaim your keys or reverse this transaction.
							</p>
						</div>
					</div>

					{/* Keys to Burn Input */}
					<div className="space-y-2 pt-1">
						<div className="flex items-center justify-between text-xs">
							<Label htmlFor="keys-to-burn" className="text-white/80">
								Keys to Burn
							</Label>
							<button
								type="button"
								onClick={() => setKeysToBurn(maxKeys)}
								className="text-cyan-400 hover:text-cyan-300 font-medium"
								data-testid="ragequit-max-button"
							>
								Max ({maxKeys.toLocaleString()} keys)
							</button>
						</div>
						<div className="relative">
							<Input
								id="keys-to-burn"
								type="number"
								min={1}
								max={maxKeys}
								step={1}
								value={keysToBurn}
								onChange={handleKeysChange}
								className="bg-white/[0.06] border-white/15 text-white font-mono text-base pr-16"
								data-testid="ragequit-keys-input"
							/>
							<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">
								KEYS
							</span>
						</div>
					</div>

					{/* Payout calculation */}
					<div className="rounded-lg bg-white/[0.04] p-3 text-xs space-y-1.5 border border-white/5">
						<div className="flex justify-between text-white/60">
							<span>Reserve rate per key:</span>
							<span className="font-mono text-white/90">
								{payoutPerKeyXlm.toFixed(2)} XLM
							</span>
						</div>
						<div className="flex justify-between items-center pt-1 border-t border-white/10">
							<span className="font-semibold text-white/80">
								Estimated Payout:
							</span>
							<span
								className="text-base font-bold font-mono text-emerald-400 tabular-nums"
								data-testid="ragequit-estimated-payout"
							>
								{estimatedPayout.toLocaleString(undefined, {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}{' '}
								XLM
							</span>
						</div>
					</div>

					{/* Explicit acknowledgement of irreversibility checkbox (#acceptance criteria) */}
					<div className="pt-2">
						<label
							className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-3 cursor-pointer text-xs text-white/80 hover:bg-white/[0.04] transition-colors"
							htmlFor="acknowledge-checkbox"
						>
							<input
								id="acknowledge-checkbox"
								type="checkbox"
								checked={acknowledged}
								onChange={e => setAcknowledged(e.target.checked)}
								className="mt-0.5 rounded border-white/20 text-red-500 focus:ring-red-400 accent-red-500 cursor-pointer"
								data-testid="ragequit-ack-checkbox"
							/>
							<span className="leading-snug select-none">
								I acknowledge and confirm that burning my keys is{' '}
								<strong className="text-red-400 font-bold">
									permanent and irreversible
								</strong>
								.
							</span>
						</label>
					</div>

					<DialogFooter className="gap-2 sm:gap-0 pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							className="border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!acknowledged || safeKeys <= 0 || isPending}
							className="bg-red-500 hover:bg-red-600 text-white font-semibold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="ragequit-confirm-button"
						>
							<Flame className="size-4" />
							{isPending ? 'Burning keys…' : 'Confirm Ragequit'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default RagequitModal;
