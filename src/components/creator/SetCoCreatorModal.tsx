import React, { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSetCoCreator } from '@/hooks/useCreators';
import { isValidStellarAddress, isValidBps } from '@/utils/coCreator.utils';

interface SetCoCreatorModalProps {
	courseId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialAddress?: string;
	initialSplitBps?: number;
}



export function SetCoCreatorModal({
	courseId,
	open,
	onOpenChange,
	initialAddress = '',
	initialSplitBps,
}: SetCoCreatorModalProps) {
	const [address, setAddress] = useState(initialAddress);
	const [splitBps, setSplitBps] = useState<string>(
		initialSplitBps ? String(initialSplitBps) : ''
	);
	const [addressError, setAddressError] = useState('');
	const [bpsError, setBpsError] = useState('');

	const setCoCreatorMutation = useSetCoCreator(courseId);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		let hasError = false;
		setAddressError('');
		setBpsError('');

		const trimmedAddress = address.trim();
		if (!trimmedAddress) {
			setAddressError('Co-creator Stellar address is required');
			hasError = true;
		} else if (!isValidStellarAddress(trimmedAddress)) {
			setAddressError(
				'Invalid Stellar address. Must start with G and be 56 characters long.'
			);
			hasError = true;
		}

		const parsedBps = parseInt(splitBps, 10);
		if (!splitBps || Number.isNaN(parsedBps)) {
			setBpsError('Split percentage (bps) is required');
			hasError = true;
		} else if (!isValidBps(parsedBps)) {
			setBpsError('Split basis points must be an integer between 1 and 10000 (0.01% to 100%)');
			hasError = true;
		}

		if (hasError) return;

		try {
			await setCoCreatorMutation.mutateAsync({
				address: trimmedAddress,
				splitBps: parsedBps,
			});
			onOpenChange(false);
		} catch {
			// Toast notification handled in useSetCoCreator mutation
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-md bg-[#0b1728] border-white/10 text-white"
				data-testid="set-cocreator-modal"
			>
				<DialogHeader>
					<DialogTitle className="text-xl font-bold font-grotesque text-white">
						Configure Co-Creator Split
					</DialogTitle>
					<DialogDescription className="text-sm text-white/60">
						Set the Stellar wallet address and royalty split percentage (in basis points, e.g., 2500 = 25%) for your co-creator.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} noValidate className="space-y-4 py-2">
					<div>
						<label
							htmlFor="cocreator-address-input"
							className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5"
						>
							Co-Creator Stellar Address
						</label>
						<input
							id="cocreator-address-input"
							type="text"
							data-testid="cocreator-address-input"
							value={address}
							onChange={e => setAddress(e.target.value)}
							placeholder="G..."
							className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
						/>
						{addressError && (
							<p
								data-testid="cocreator-address-error"
								className="mt-1 text-xs text-red-400"
							>
								{addressError}
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="cocreator-bps-input"
							className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5"
						>
							Split (Basis Points: 1 - 10000)
						</label>
						<input
							id="cocreator-bps-input"
							type="number"
							data-testid="cocreator-bps-input"
							value={splitBps}
							onChange={e => setSplitBps(e.target.value)}
							placeholder="e.g. 2500 for 25%"
							min="1"
							max="10000"
							className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
						/>
						{bpsError && (
							<p
								data-testid="cocreator-bps-error"
								className="mt-1 text-xs text-red-400"
							>
								{bpsError}
							</p>
						)}
					</div>

					<DialogFooter className="mt-6 flex justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							data-testid="submit-cocreator-button"
							disabled={setCoCreatorMutation.isPending}
							className="bg-amber-400 text-black hover:bg-amber-500 font-semibold"
						>
							{setCoCreatorMutation.isPending ? 'Saving…' : 'Save Co-Creator'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default SetCoCreatorModal;
