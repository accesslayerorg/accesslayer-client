import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MarketActionConfirmationModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	/** 'buy' or 'sell' */
	type: 'buy' | 'sell';
	creatorName: string;
	price: string;
	isLoading?: boolean;
}

const MarketActionConfirmationModal: React.FC<MarketActionConfirmationModalProps> = ({
	isOpen,
	onOpenChange,
	onConfirm,
	type,
	creatorName,
	price,
	isLoading = false,
}) => {
	const isBuy = type === 'buy';

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm border-white/10 bg-slate-950/95 backdrop-blur-xl">
				<DialogHeader>
					<div className="mb-4 flex justify-center">
						<div className={cn(
							"rounded-full p-4 ring-1",
							isBuy 
								? "bg-amber-500/10 text-amber-500 ring-amber-500/20" 
								: "bg-red-500/10 text-red-500 ring-red-500/20"
						)}>
							{isBuy ? <ShoppingCart className="size-8" /> : <AlertCircle className="size-8" />}
						</div>
					</div>
					<DialogTitle className="text-center text-xl font-bold text-white">
						Confirm {isBuy ? 'Purchase' : 'Sale'}
					</DialogTitle>
					<DialogDescription className="text-center text-white/60">
						Are you sure you want to {isBuy ? 'buy' : 'sell'} a key for <span className="font-semibold text-white">{creatorName}</span>?
					</DialogDescription>
				</DialogHeader>

				<div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4">
					<div className="flex items-center justify-between">
						<span className="text-sm text-white/40">Estimated Price</span>
						<span className="font-grotesque text-lg font-bold text-amber-400">{price}</span>
					</div>
				</div>

				<DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
						className="w-full text-white/60 hover:text-white hover:bg-white/5 sm:w-auto"
					>
						Cancel
					</Button>
					<Button
						onClick={onConfirm}
						disabled={isLoading}
						className={cn(
							"w-full font-bold sm:w-auto px-8",
							isBuy ? "bg-amber-500 hover:bg-amber-600 text-slate-950" : "bg-red-500 hover:bg-red-600 text-white"
						)}
					>
						{isLoading ? 'Processing...' : `Confirm ${isBuy ? 'Buy' : 'Sell'}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default MarketActionConfirmationModal;