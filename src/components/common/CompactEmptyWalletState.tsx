import { WalletMinimal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactEmptyWalletStateProps {
	title?: string;
	description?: string;
	className?: string;
}

const CompactEmptyWalletState: React.FC<CompactEmptyWalletStateProps> = ({
	title = 'No wallet balance yet',
	description = 'Connect and fund your wallet to unlock creator key purchases.',
	className,
}) => {
	return (
		<div
			className={cn(
				'flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-400/8 p-3 text-left',
				className
			)}
		>
			<div className="mt-0.5 rounded-lg bg-amber-300/20 p-1.5">
				<WalletMinimal className="size-4 text-amber-200" />
			</div>
			<div>
				<p className="text-sm font-semibold text-amber-100">{title}</p>
				<p className="mt-0.5 text-xs text-amber-100/75">{description}</p>
			</div>
		</div>
	);
};

export default CompactEmptyWalletState;
