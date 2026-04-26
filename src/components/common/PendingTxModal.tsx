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
import CircularSpinner from '@/components/common/CircularSpinnerProps';
import { cn } from '@/lib/utils';
import TransactionHashRow from '@/components/common/TransactionHashRow';

export interface PendingTxModalProps {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
	/** When true, renders the loading/spinner state */
	isLoading?: boolean;
	title?: string;
	description?: string;
	/** Optional transaction hash to display */
	txHash?: string;
	/** Optional explorer link for the transaction */
	explorerUrl?: string;
	/** Prevent the user from dismissing the modal while loading */
	blockDismissal?: boolean;
	/** Optional footer action (e.g. "View on explorer") */
	action?: {
		label: string;
		onClick: () => void;
	};
}

const PendingTxModal: React.FC<PendingTxModalProps> = ({
	open,
	onOpenChange,
	isLoading = false,
	title = 'Transaction pending',
	description = 'Your transaction has been submitted and is awaiting confirmation.',
	txHash,
	explorerUrl,
	blockDismissal = false,
	action,
}) => {
	const handleOpenChange = (next: boolean) => {
		if (!next && blockDismissal && isLoading) return;
		onOpenChange?.(next);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton={!(blockDismissal && isLoading)}
				className="max-w-sm"
				// Prevent closing via Escape when dismissal is blocked
				onEscapeKeyDown={(e: KeyboardEvent) => {
					if (blockDismissal && isLoading) e.preventDefault();
				}}
				// Prevent closing via overlay click when dismissal is blocked
				onInteractOutside={(e: Event) => {
					if (blockDismissal && isLoading) e.preventDefault();
				}}
			>
				<DialogHeader>
					<div className="mb-2 flex justify-center">
						<span
							className={cn(
								'inline-flex rounded-full p-3',
								isLoading
									? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-300/35'
									: 'bg-muted text-muted-foreground'
							)}
						>
							{isLoading ? (
								<CircularSpinner
									size={28}
									color="#fcd34d"
									speed="0.9s"
									bgOpacity={0.15}
								/>
							) : (
								<CircularSpinner
									size={28}
									color="currentColor"
									bgOpacity={0.15}
								/>
							)}
						</span>
					</div>
					<DialogTitle className="text-center">{title}</DialogTitle>
					<DialogDescription className="text-center">
						{description}
					</DialogDescription>
				</DialogHeader>

				{txHash && (
					<div className="mt-2 border-t border-white/5 pt-4">
						<TransactionHashRow
							hash={txHash}
							explorerUrl={explorerUrl}
							className="bg-white/5 rounded-lg px-3 py-2"
						/>
					</div>
				)}

				{(action || !blockDismissal) && (
					<DialogFooter className="sm:justify-center">
						{action && (
							<Button
								variant="outline"
								size="sm"
								onClick={action.onClick}
							>
								{action.label}
							</Button>
						)}
						{!blockDismissal && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onOpenChange?.(false)}
							>
								Dismiss
							</Button>
						)}
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default PendingTxModal;
