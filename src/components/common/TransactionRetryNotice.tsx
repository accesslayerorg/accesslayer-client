import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TransactionStatusIcon from '@/components/common/TransactionStatusIcon';

interface TransactionRetryNoticeProps {
	message: string;
	onRetry: () => void;
	title?: string;
	retryLabel?: string;
	className?: string;
	disabled?: boolean;
}

const TransactionRetryNotice: React.FC<TransactionRetryNoticeProps> = ({
	title = 'Transaction failed',
	message,
	onRetry,
	retryLabel = 'Retry',
	className,
	disabled = false,
}) => {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				'rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-left',
				className
			)}
		>
			<div className="flex items-start gap-3">
				<TransactionStatusIcon status="failed" className="mt-0.5" />
				<div className="min-w-0 flex-1">
					<p className="font-jakarta text-sm font-bold text-white">{title}</p>
					<p className="mt-1 font-jakarta text-sm leading-relaxed text-white/70">
						{message}
					</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={onRetry}
						disabled={disabled}
						className="mt-3 border-red-400/30 bg-transparent text-white hover:bg-red-500/10"
					>
						<RotateCcw className="size-4" />
						{retryLabel}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default TransactionRetryNotice;
