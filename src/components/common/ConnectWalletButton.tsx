import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Copy, Check } from 'lucide-react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { shortenAddress } from '@/lib/web3/format';
import {
	WALLET_CONNECTION_AD_BLOCKER_MESSAGE,
	useWalletConnectionStallDetection,
} from '@/hooks/useWalletConnectionStallDetection';
import { useCopySuccessAnnouncement } from '@/hooks/useCopySuccessAnnouncement';
import CopySuccessAnnouncement from '@/components/common/CopySuccessAnnouncement';
import showToast from '@/utils/toast.util';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function ConnectWalletButton() {
	const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
	const [copied, setCopied] = useState(false);
	const [popoverOpen, setPopoverOpen] = useState(false);
	const { address, isConnected } = useAccount();
	const { connect, connectors, error, isPending } = useConnect();
	const { disconnect } = useDisconnect();
	const { announcement, announceCopySuccess } = useCopySuccessAnnouncement();

	const primaryConnector = connectors[0];
	const showAdBlockerSuggestion = useWalletConnectionStallDetection({
		isAwaitingWalletResponse: isPending,
		hasWalletResponse: isConnected || Boolean(error),
	});

	const handleCopyAddress = async () => {
		if (!address) return;
		try {
			await copyTextToClipboard(address);
			announceCopySuccess('Wallet address copied.');
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
			showToast.error(
				'Could not copy the wallet address. Please copy it manually.'
			);
		}
	};

	if (isConnected && address) {
		return (
			<>
				<div className="flex items-center gap-1.5">
					<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
						<PopoverTrigger asChild>
							<button
								type="button"
								className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
							>
								{shortenAddress(address)}
							</button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-80">
							<div className="flex flex-col gap-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-gray-900">
										Connected Wallet
									</span>
									<button
										type="button"
										onClick={() => setPopoverOpen(false)}
										className="text-gray-400 hover:text-gray-600"
									>
										×
									</button>
								</div>
								<div className="rounded-md bg-gray-100 p-3">
									<p className="font-mono text-xs break-all text-gray-700">
										{address}
									</p>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleCopyAddress}
										className="flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
									>
										{copied ? (
											<Check className="size-4 text-emerald-500" />
										) : (
											<Copy className="size-4" />
										)}
										{copied ? 'Copied!' : 'Copy Address'}
									</button>
									<button
										type="button"
										onClick={() => {
											setPopoverOpen(false);
											setShowDisconnectDialog(true);
										}}
										className="flex-1 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
									>
										Disconnect
									</button>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>
				<Dialog
					open={showDisconnectDialog}
					onOpenChange={setShowDisconnectDialog}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Disconnect wallet?</DialogTitle>
							<DialogDescription>
								Disconnecting clears your current wallet session and any
								pending wallet state. You will need to reconnect to
								continue.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">Cancel</Button>
							</DialogClose>
							<Button
								type="button"
								variant="destructive"
								onClick={() => {
									disconnect();
									setShowDisconnectDialog(false);
								}}
							>
								Disconnect
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
				<CopySuccessAnnouncement message={announcement} />
			</>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<button
				type="button"
				onClick={() =>
					primaryConnector && connect({ connector: primaryConnector })
				}
				disabled={!primaryConnector || isPending}
				className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
			>
				{isPending ? 'Connecting...' : 'Connect Wallet'}
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

export default ConnectWalletButton;
