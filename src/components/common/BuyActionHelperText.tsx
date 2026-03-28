import { cn } from '@/lib/utils';
import { Info, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BuyActionHelperTextProps {
	state: 'idle' | 'submitting' | 'failed' | 'success';
	className?: string;
	disabledReason?: string;
}

const BuyActionHelperText: React.FC<BuyActionHelperTextProps> = ({
	state,
	className,
	disabledReason,
}) => {
	const getMessage = () => {
		switch (state) {
			case 'submitting':
				return 'Confirm the transaction in your Stellar-compatible wallet to proceed.';
			case 'failed':
				return 'Transaction failed. Please check your balance or connection and try again.';
			case 'success':
				return 'Transaction confirmed on the network. Your keys are being issued.';
			case 'idle':
			default:
				return 'A wallet signature will be required to confirm your purchase on-chain.';
		}
	};

	const getStyles = () => {
		switch (state) {
			case 'submitting':
				return {
					bg: 'bg-amber-500/10',
					border: 'border-amber-500/30',
					accent: 'bg-amber-500',
					text: 'text-amber-200/90',
					icon: <Loader2 className="size-3.5 animate-spin text-amber-400" />,
				};
			case 'failed':
				return {
					bg: 'bg-red-500/10',
					border: 'border-red-500/30',
					accent: 'bg-red-500',
					text: 'text-red-300/90',
					icon: <AlertCircle className="size-3.5 text-red-400" />,
				};
			case 'success':
				return {
					bg: 'bg-emerald-500/10',
					border: 'border-emerald-500/30',
					accent: 'bg-emerald-500',
					text: 'text-emerald-200/90',
					icon: <CheckCircle2 className="size-3.5 text-emerald-400" />,
				};
			default:
				return {
					bg: 'bg-white/[0.03]',
					border: 'border-white/10',
					accent: 'bg-white/20',
					text: 'text-white/45',
					icon: <Info className="size-3.5 text-white/30" />,
				};
		}
	};

	const styles = getStyles();

	// Handle disabled reason display
	const hasDisabledReason = disabledReason && disabledReason.trim().length > 0;

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-xl border px-3.5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-md transition-colors duration-500',
				styles.bg,
				styles.border,
				className
			)}
		>
			<div className={cn('absolute left-0 top-0 h-full w-1', styles.accent)} />
			<div className="flex items-start gap-3">
				<div className="mt-0.5 shrink-0">{styles.icon}</div>
				<div className="flex-1 space-y-2">
					<AnimatePresence mode="wait">
						<motion.p
							key={state}
							initial={{ opacity: 0, x: -4 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 4 }}
							transition={{ duration: 0.2 }}
							className={cn('text-[0.72rem] font-medium leading-relaxed', styles.text)}
						>
							{getMessage()}
						</motion.p>
					</AnimatePresence>
					{hasDisabledReason && (
						<motion.p
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.2 }}
							className="text-[0.72rem] font-medium leading-relaxed text-white/40"
						>
							{disabledReason}
						</motion.p>
					)}
				</div>
			</div>
		</div>
	);
};

export default BuyActionHelperText;
