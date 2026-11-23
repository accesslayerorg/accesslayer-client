import React, { useEffect, useState } from 'react';
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
import { getMaxStakeForProposal } from '@/utils/conviction.utils';

export interface AllocateStakeModalProps {
	isOpen: boolean;
	onClose: () => void;
	proposalId: string;
	proposalTitle: string;
	currentStake?: number;
	unallocatedBalance: number;
	onAllocate: (amount: number) => Promise<void> | void;
	isPending?: boolean;
}

export const AllocateStakeModal: React.FC<AllocateStakeModalProps> = ({
	isOpen,
	onClose,
	proposalId: _proposalId,
	proposalTitle,
	currentStake = 0,
	unallocatedBalance,
	onAllocate,
	isPending = false,
}) => {
	const maxAllowed = getMaxStakeForProposal(unallocatedBalance, currentStake);
	const [amount, setAmount] = useState<number>(currentStake);

	useEffect(() => {
		if (isOpen) {
			setAmount(Math.min(currentStake, maxAllowed));
		}
	}, [isOpen, currentStake, maxAllowed]);

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = Number(e.target.value);
		// Crucial constraint: slider never exceeds maxAllowed (unallocated balance + existing stake)
		const clamped = Math.min(maxAllowed, Math.max(0, val));
		setAmount(clamped);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const parsed = Number(e.target.value);
		if (Number.isNaN(parsed)) {
			setAmount(0);
			return;
		}
		// Strict clamp against unallocated balance ceiling
		const clamped = Math.min(maxAllowed, Math.max(0, parsed));
		setAmount(clamped);
	};

	const handleMax = () => {
		setAmount(maxAllowed);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (amount > maxAllowed) return;
		await onAllocate(amount);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
			<DialogContent
				className="sm:max-w-md bg-[#0a1526] text-white border-white/10"
				data-testid="allocate-stake-modal"
			>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle className="text-xl font-bold font-jakarta text-white">
							Allocate Stake
						</DialogTitle>
						<DialogDescription className="text-white/60 text-sm">
							Allocate governance voting stake to accumulate conviction for{' '}
							<span className="text-white font-medium">"{proposalTitle}"</span>.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-5 py-4">
						{/* Balances info */}
						<div className="grid grid-cols-2 gap-3 rounded-lg bg-white/[0.04] p-3 text-xs border border-white/5">
							<div>
								<span className="text-white/50 block">Current Stake</span>
								<span
									className="text-white font-mono font-semibold text-sm tabular-nums"
									data-testid="modal-current-stake"
								>
									{currentStake.toLocaleString()}
								</span>
							</div>
							<div>
								<span className="text-white/50 block">Unallocated Available</span>
								<span
									className="text-cyan-400 font-mono font-semibold text-sm tabular-nums"
									data-testid="modal-unallocated-balance"
								>
									{unallocatedBalance.toLocaleString()}
								</span>
							</div>
						</div>

						{/* Input & Slider */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label htmlFor="stake-amount" className="text-sm text-white/80">
									Stake to Allocate
								</Label>
								<button
									type="button"
									onClick={handleMax}
									className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
									data-testid="modal-max-button"
								>
									Max ({maxAllowed.toLocaleString()})
								</button>
							</div>

							<div className="relative">
								<Input
									id="stake-amount"
									type="number"
									min={0}
									max={maxAllowed}
									value={amount}
									onChange={handleInputChange}
									className="bg-white/[0.06] border-white/15 text-white font-mono text-base pr-16"
									data-testid="modal-amount-input"
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">
									VOTE
								</span>
							</div>

							{/* Slider explicitly capped at maxAllowed */}
							<div className="pt-2">
								<input
									type="range"
									id="stake-slider"
									min={0}
									max={maxAllowed}
									step={1}
									value={amount}
									onChange={handleSliderChange}
									className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
									data-testid="modal-stake-slider"
									aria-label="Stake allocation slider"
								/>
								<div className="flex justify-between text-[11px] text-white/40 mt-1 font-mono">
									<span>0</span>
									<span>{maxAllowed.toLocaleString()} max</span>
								</div>
							</div>
						</div>

						{amount > maxAllowed && (
							<p className="text-xs text-red-400" role="alert">
								Amount exceeds unallocated balance of {maxAllowed}.
							</p>
						)}
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
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
							disabled={isPending || amount > maxAllowed}
							className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
							data-testid="modal-confirm-button"
						>
							{isPending ? 'Allocating…' : 'Confirm Allocation'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default AllocateStakeModal;
