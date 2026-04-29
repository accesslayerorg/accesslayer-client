import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const networkBadgeVariants = cva(
	'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
	{
		variants: {
			network: {
				testnet:
					'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
				mainnet:
					'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
			},
		},
		defaultVariants: {
			network: 'testnet',
		},
	}
);

export interface NetworkBadgeProps
	extends
		React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof networkBadgeVariants> {
	/**
	 * The network type to display
	 */
	network?: 'testnet' | 'mainnet';
	/**
	 * Whether to show the status indicator dot
	 */
	showIndicator?: boolean;
}

const NetworkBadge = React.forwardRef<HTMLDivElement, NetworkBadgeProps>(
	(
		{ className, network = 'testnet', showIndicator = true, ...props },
		ref
	) => {
		return (
			<div
				ref={ref}
				className={cn(networkBadgeVariants({ network, className }))}
				role="status"
				aria-label={`Stellar ${network} network`}
				{...props}
			>
				{showIndicator && (
					<span
						className={cn(
							'size-1.5 rounded-full',
							network === 'testnet'
								? 'bg-yellow-600 dark:bg-yellow-400'
								: 'bg-green-600 dark:bg-green-400'
						)}
						aria-hidden="true"
					/>
				)}
				<span className="capitalize">{network}</span>
			</div>
		);
	}
);

NetworkBadge.displayName = 'NetworkBadge';

// eslint-disable-next-line react-refresh/only-export-components
export { NetworkBadge, networkBadgeVariants };
