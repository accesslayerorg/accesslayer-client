import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { downloadCsv } from '@/utils/transactionHistory.utils';
import {
	buildTradeHistoryCsvFilename,
	generateTradeHistoryCsv,
} from '@/utils/tradeLedger.utils';
import { fetchAllTrades } from '@/hooks/useAllTradeHistory';
import type { Trade } from '@/services/tradeHistory.service';

export interface ExportTradeHistoryCsvButtonProps {
	/** Wallet address whose trades to export. */
	walletAddress: string;
	/** Optional authenticated override (e.g. for testing). */
	isAuthenticated?: boolean;
	/** Whether the viewer is viewing their own profile dashboard. */
	isOwnProfile?: boolean;
	/** Optional custom trade fetcher (e.g. for testing). */
	fetchTrades?: (wallet: string) => Promise<Trade[]>;
	/** Custom class name. */
	className?: string;
	/** Custom test ID. */
	'data-testid'?: string;
}

/**
 * Trade history CSV export button on the portfolio page (#857).
 *
 * Placed in the trade history tab header. When clicked by an authenticated
 * user, fetches all trades from GET /users/:wallet/trades without pagination
 * limit, displays a loading spinner on the button, generates a formatted CSV
 * (columns: Date, Key Name, Type, Quantity, Price per Key, Total, Fee), and
 * triggers a file download with filename trades-[wallet-truncated]-[date].csv.
 * Only accessible when the user is authenticated.
 */
export const ExportTradeHistoryCsvButton: React.FC<
	ExportTradeHistoryCsvButtonProps
> = ({
	walletAddress,
	isAuthenticated: customIsAuthenticated,
	isOwnProfile = false,
	fetchTrades = fetchAllTrades,
	className,
	'data-testid': testId = 'export-trade-history-button',
}) => {
	const { address: connectedAddress, isConnected } = useAccount();
	const [isLoading, setIsLoading] = useState(false);

	const isAuth =
		customIsAuthenticated !== undefined
			? customIsAuthenticated
			: Boolean(connectedAddress && (isConnected ?? true)) ||
				Boolean(isOwnProfile);

	// Button accessible only when the user is authenticated (#857)
	if (!isAuth) {
		return null;
	}

	const handleExport = async () => {
		if (isLoading || !walletAddress) return;
		setIsLoading(true);

		try {
			const trades = await fetchTrades(walletAddress);
			const csv = generateTradeHistoryCsv(trades);
			const filename = buildTradeHistoryCsvFilename(walletAddress);
			downloadCsv(filename, csv);
		} catch (error) {
			console.error('Failed to export trade history CSV:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			onClick={handleExport}
			disabled={isLoading}
			data-testid={testId}
			aria-busy={isLoading}
			className={cn(
				'gap-2 rounded-xl border-white/10 bg-white/[0.04] text-sm font-semibold text-white hover:bg-white/[0.08] hover:text-white',
				className
			)}
		>
			{isLoading ? (
				<Loader2
					className="size-4 animate-spin"
					data-testid="export-trade-history-spinner"
					aria-hidden="true"
				/>
			) : (
				<Download className="size-4" aria-hidden="true" />
			)}
			Export CSV
		</Button>
	);
};

export default ExportTradeHistoryCsvButton;
