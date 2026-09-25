import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { LogOut } from 'lucide-react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { shortenAddress } from '@/lib/web3/format';
import CopyField from '@/components/common/CopyField';
import {
	useWalletConnectionStallDetection,
	WALLET_CONNECTION_AD_BLOCKER_MESSAGE,
} from '@/hooks/useWalletConnectionStallDetection';
import { cn } from '@/lib/utils';

interface WalletConnectionPopoverProps {
	className?: string;
}

/**
 * Wallet connection control with two distinct states:
 *
 * - **Disconnected** — renders a "Connect Wallet" button.
 * - **Connected** — renders a trigger showing the truncated address.
 *   Opening the popover reveals the full copyable address and a
 *   "Disconnect" button. The full address is only shown inside the
 *   CopyField input; it is never rendered as plain text in the DOM.
 */
function WalletConnectionPopover({ className }: WalletConnectionPopoverProps) {
	const { address, isConnected } = useAccount();
	const { connect, connectors, error, isPending } = useConnect();
	const { disconnect } = useDisconnect();

	const primaryConnector = connectors[0];
	const showAdBlockerSuggestion = useWalletConnectionStallDetection({
		isAwaitingWalletResponse: isPending,
		hasWalletResponse: isConnected || Boolean(error),
	});

	if (!isConnected || !address) {
		return (
			<div className={cn('flex flex-col gap-2', className)}>
				<button
					type="button"
					data-testid="connect-wallet-button"
					onClick={() =>
						primaryConnector && connect({ connector: primaryConnector })
					}
					disabled={!primaryConnector || isPending}
					className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
				>
					{isPending ? 'Connecting…' : 'Connect Wallet'}
				</button>
				{error ? (
					<p className="text-sm text-red-600">{error.message}</p>
				) : null}
				{showAdBlockerSuggestion ? (
					<p role="status" className="max-w-sm text-sm text-amber-700">
						{WALLET_CONNECTION_AD_BLOCKER_MESSAGE}
					</p>
				) : null}
			</div>
		);
	}

	const truncated = shortenAddress(address);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					data-testid="wallet-address-trigger"
					className={cn(
						'rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white',
						className
					)}
					aria-label={`Wallet options for ${truncated}`}
				>
					{truncated}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-4">
				<div className="flex flex-col gap-4">
					<div>
						<p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
							Connected wallet
						</p>
						<CopyField
							value={address}
							label="Wallet address"
							data-testid="copy-address-field"
						/>
					</div>
					<button
						type="button"
						data-testid="disconnect-wallet-button"
						onClick={() => disconnect()}
						className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-200"
					>
						<LogOut className="size-4" aria-hidden="true" />
						Disconnect
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default WalletConnectionPopover;
