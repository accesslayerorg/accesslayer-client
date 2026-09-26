import { useAccount } from 'wagmi';
import { Coins } from 'lucide-react';
import ProtocolRevenueDistributionTable from '@/components/common/ProtocolRevenueDistributionTable';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Revenue Distribution History page for stakers.
 *
 * Shows all past distribution cycles, the amount distributed per cycle,
 * and the connected wallet's claim per cycle with claim functionality.
 */
export default function RevenueDistributionHistoryPage() {
	const { address } = useAccount();

	useDocumentTitle('Revenue Distribution History — AccessLayer');

	if (!address) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-7xl">
					<div className="flex items-center gap-2 mb-6">
						<Coins className="size-5 text-amber-300" aria-hidden="true" />
						<h1 className="text-2xl font-black">Revenue Distribution History</h1>
					</div>
					<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center">
						<p className="text-white/60">Please connect your wallet to view your revenue distribution history.</p>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-7xl">
				<div className="mb-6 flex items-center gap-2">
					<Coins className="size-5 text-amber-300" aria-hidden="true" />
					<h1 className="text-2xl font-black">Revenue Distribution History</h1>
				</div>
				<ProtocolRevenueDistributionTable walletAddress={address} />
			</div>
		</main>
	);
}
