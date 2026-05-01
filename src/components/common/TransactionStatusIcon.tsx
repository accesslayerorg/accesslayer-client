import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TransactionStatus = 'success' | 'pending' | 'failed';

interface TransactionStatusIconProps {
	status: TransactionStatus;
	className?: string;
}

const statusStyles: Record<TransactionStatus, string> = {
	success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-300/35',
	pending: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-300/35',
	failed: 'bg-red-500/15 text-red-300 ring-1 ring-red-300/35',
};

const TransactionStatusIcon: React.FC<TransactionStatusIconProps> = ({
	status,
	className,
}) => {
	const Icon =
		status === 'success' ? CheckCircle2 : status === 'pending' ? Clock3 : XCircle;

	const label =
		status === 'success'
			? 'Transaction success'
			: status === 'pending'
				? 'Transaction pending'
				: 'Transaction failed';

	return (
		<span
			aria-label={label}
			className={cn(
				'inline-flex items-center justify-center rounded-full p-1.5',
				statusStyles[status],
				status === 'pending' &&
					'motion-safe:animate-pulse motion-reduce:animate-none',
				className
			)}
		>
			<Icon className="size-4" />
		</span>
	);
};

export default TransactionStatusIcon;
