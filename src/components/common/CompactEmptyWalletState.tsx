import { WalletMinimal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EMPTY_STATE_ILLUSTRATION_SIZES } from './emptyStateIllustration.config';

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
			<div
				className={cn(
					'mt-0.5 flex items-center justify-center rounded-lg bg-amber-300/20',
					EMPTY_STATE_ILLUSTRATION_SIZES.compactBadgeFrame
				)}
			>
				<WalletMinimal
					className={cn(
						'text-amber-200',
						EMPTY_STATE_ILLUSTRATION_SIZES.compactBadgeIcon
					)}
				/>
			</div>
			<div>
				<p className="text-sm font-semibold text-amber-100">{title}</p>
				<p className="mt-0.5 text-xs text-amber-100/75">{description}</p>
			</div>
		</div>
	);
};

export default CompactEmptyWalletState;
