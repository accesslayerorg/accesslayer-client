import { useAccount, useChainId, useDisconnect } from 'wagmi';
import { Link } from 'react-router';
import { Copy, Check, LogOut } from 'lucide-react';
import { useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { shortenAddress } from '@/lib/web3/format';
import { describeNetwork } from '@/lib/web3/network';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';

/**
 * Persistent wallet status chip for the nav bar (issue #686).
 *
 * Reads `useAccount` and `useChainId` directly rather than taking props, so the
 * chip re-renders from wagmi's own state when the user switches network in
 * their extension. Passing the address down would leave it stale until whatever
 * owns that prop happened to re-render.
 */
export function WalletStatusChip({ className = '' }: { className?: string }) {
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const { disconnect } = useDisconnect();
	const [copied, setCopied] = useState(false);

	if (!isConnected || !address) {
		return (
			<Link
				to="/connect"
				className={`inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 font-jakarta text-sm text-white transition-colors hover:bg-white/20 ${className}`}
			>
				Connect Wallet
			</Link>
		);
	}

	const network = describeNetwork(chainId);

	const handleCopy = async () => {
		try {
			await copyTextToClipboard(address);
		} catch {
			showToast.error('Could not copy address');
			return;
		}
		setCopied(true);
		showToast.success('Address copied');
		// Reverting the icon gives the user a second, unambiguous confirmation
		// that the action completed rather than leaving a permanent tick.
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={`Wallet ${shortenAddress(address)} on ${network.label}. Open wallet menu.`}
					className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 transition-colors hover:bg-white/20 ${className}`}
				>
					<span className="font-mono text-xs text-white">{shortenAddress(address)}</span>
					<span
						// aria-hidden: the network is already stated in the button's
						// accessible name, so announcing the badge repeats it.
						aria-hidden="true"
						className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${network.badgeClass}`}
					>
						{network.kind === 'unsupported' ? 'Unsupported' : network.label}
					</span>
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-72">
				<DropdownMenuLabel className="font-normal">
					<span className="block text-xs text-muted-foreground">Connected wallet</span>
					{/* break-all so a full address wraps instead of overflowing the menu */}
					<span className="mt-1 block break-all font-mono text-xs">{address}</span>
					<span className="mt-2 block text-xs text-muted-foreground">
						Network: {network.label}
					</span>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				<DropdownMenuItem onSelect={event => {
					// Keep the menu open so the copied-state tick is visible.
					event.preventDefault();
					void handleCopy();
				}}>
					{copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
					{copied ? 'Copied' : 'Copy address'}
				</DropdownMenuItem>

				<DropdownMenuItem
					onSelect={() => disconnect()}
					className="text-red-600 focus:text-red-600"
				>
					<LogOut className="mr-2 size-4" />
					Disconnect
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default WalletStatusChip;
