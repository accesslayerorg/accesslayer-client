import type { HolderRow as HolderRowType } from '@/types/holder.types';
import { formatCompactNumber } from '@/utils/numberFormat.utils';

interface HolderRowProps {
	holder: HolderRowType;
	style: React.CSSProperties;
}

export function HolderRow({ holder, style }: HolderRowProps) {
	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	return (
		<div
			style={style}
			className="absolute left-0 right-0 flex items-center gap-4 border-b border-white/5 px-6 py-3 text-white/90 hover:bg-white/[0.02] transition-colors"
		>
			<div className="w-12 text-sm font-medium text-white/60">
				#{holder.rank}
			</div>
			<div className="flex items-center gap-3 flex-1 min-w-0">
				<div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
				<span className="font-mono text-sm truncate">{formatAddress(holder.address)}</span>
			</div>
			<div className="w-20 text-right text-sm">
				{holder.keyCount} {holder.keyCount === 1 ? 'key' : 'keys'}
			</div>
			<div className="w-24 text-right text-sm font-medium">
				${formatCompactNumber(holder.totalValue)}
			</div>
			<div className="w-16 text-right text-sm text-white/60">
				{holder.sharePercentage.toFixed(2)}%
			</div>
		</div>
	);
}
