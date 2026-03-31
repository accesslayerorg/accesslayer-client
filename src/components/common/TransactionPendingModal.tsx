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

export type TransactionStatus = 'pending' | 'success' | 'error';

export interface TransactionPendingModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	statusText?: string;
	description?: string;
	status?: TransactionStatus;
	actionLabel?: string;
	onAction?: () => void;
	className?: string;
}

const STATUS_CONFIG: Record<
	TransactionStatus,
	{ color: string; spinnerColor: string; dotColor: string }
> = {
	pending: {
		color: 'text-amber-400',
		spinnerColor: '#f59e0b',
		dotColor: 'bg-amber-400',
	},
	success: {
		color: 'text-emerald-400',
		spinnerColor: '#34d399',
		dotColor: 'bg-emerald-400',
	},
	error: {
		color: 'text-red-400',
		spinnerColor: '#f87171',
		dotColor: 'bg-red-400',
	},
};

const TransactionPendingModal: React.FC<TransactionPendingModalProps> = ({
	isOpen,
	onClose,
	title = 'Transaction Pending',
	statusText = 'Waiting for confirmation...',
	description = 'Please do not close this window while your transaction is being processed on the network.',
	status = 'pending',
	actionLabel,
	onAction,
	className,
}) => {
	const config = STATUS_CONFIG[status];

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				showCloseButton={status !== 'pending'}
				className={cn(
					'border-white/10 bg-slate-950 text-white sm:max-w-md',
					className
				)}
			>
				<DialogHeader className="items-center text-center sm:text-center">
					<div className="mb-4 flex flex-col items-center gap-4">
						<div className="relative flex items-center justify-center">
							{status === 'pending' && (
								<CircularSpinner
									size={64}
									color={config.spinnerColor}
									bgOpacity={0.15}
									speed="1s"
								/>
							)}
							{status !== 'pending' && (
								<div
									className={cn(
										'flex size-16 items-center justify-center rounded-full border-2',
										status === 'success'
											? 'border-emerald-400/30 bg-emerald-400/10'
											: 'border-red-400/30 bg-red-400/10'
									)}
								>
									{status === 'success' ? (
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="size-8 text-emerald-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={2}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									) : (
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="size-8 text-red-400"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={2}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									)}
								</div>
							)}
						</div>

						<div className="flex items-center gap-2">
							<span
								className={cn(
									'size-2 rounded-full',
									config.dotColor,
									status === 'pending' && 'animate-pulse'
								)}
							/>
							<span className={cn('font-jakarta text-sm font-medium', config.color)}>
								{statusText}
							</span>
						</div>
					</div>

					<DialogTitle className="font-grotesque text-xl font-bold text-white">
						{title}
					</DialogTitle>

					<DialogDescription className="font-jakarta text-sm leading-relaxed text-white/50">
						{description}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
					{onAction && actionLabel && (
						<Button
							onClick={onAction}
							className="w-full rounded-xl bg-amber-500 font-bold text-black hover:bg-amber-400"
						>
							{actionLabel}
						</Button>
					)}
					{status !== 'pending' && (
						<Button
							variant="outline"
							onClick={onClose}
							className="w-full rounded-xl border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
						>
							Close
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TransactionPendingModal;
