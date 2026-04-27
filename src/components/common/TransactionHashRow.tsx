import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/web3/format';

interface TransactionHashRowProps {
	hash: string;
	label?: string;
	explorerUrl?: string;
	className?: string;
}

const TransactionHashRow: React.FC<TransactionHashRowProps> = ({
	hash,
	label = 'Transaction Hash',
	explorerUrl,
	className,
}) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = async (e: React.MouseEvent) => {
		e.stopPropagation();
		await navigator.clipboard.writeText(hash);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div
			className={cn(
				'flex items-center justify-between gap-3 py-1.5 text-xs',
				className
			)}
		>
			<span className="shrink-0 uppercase tracking-wider text-white/40">
				{label}
			</span>
			<div className="flex items-center gap-2 overflow-hidden">
				<span
					className="font-mono font-medium text-white/75 truncate"
					title={hash}
				>
					{shortenAddress(hash, 8, 8)}
				</span>
				<div className="flex shrink-0 items-center gap-1">
					<button
						onClick={handleCopy}
						className="inline-flex size-6 items-center justify-center rounded-md bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
						aria-label={copied ? 'Transaction hash copied' : 'Copy transaction hash'}
					>
						{copied ? (
							<Check className="size-3 text-emerald-400" aria-hidden="true" />
						) : (
							<Copy className="size-3" aria-hidden="true" />
						)}
					</button>
					<span
						role="status"
						aria-live="polite"
						aria-atomic="true"
						className="sr-only"
					>
						{copied ? 'Transaction hash copied to clipboard' : ''}
					</span>
					{explorerUrl && (
						<a
							href={explorerUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex size-6 items-center justify-center rounded-md bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
							aria-label="View on block explorer"
						>
							<ExternalLink className="size-3" />
						</a>
					)}
				</div>
			</div>
		</div>
	);
};

export default TransactionHashRow;
