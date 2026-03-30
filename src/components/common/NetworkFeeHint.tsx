import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface NetworkFeeHintProps {
	fee?: string;
	className?: string;
	variant?: 'chip' | 'text';
}

const NetworkFeeHint = ({
	fee = '~0.0001 ETH',
	className,
	variant = 'chip',
}) => {
	if (variant === 'text') {
		return (
			<div className={cn('flex items-center gap-1.5 text-xs text-white/40', className)}>
				<Zap className="size-3 text-amber-500/50" />
				<span>Network fee: {fee}</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				'inline-flex min-w-0 items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[0.6rem] font-medium text-amber-200/70 backdrop-blur-sm',
				className
			)}
		>
			<Zap className="size-3 text-amber-500/60 shrink-0" />
			<span className="truncate font-jakarta text-xs">
				{fee}
			</span>
		</div>
	);
};

export default NetworkFeeHint;
