import AirdropClaimsPanel from '@/components/common/AirdropClaimsPanel';
import EmptyState from '@/components/common/EmptyState';
import { useStellarWallet } from '@/hooks/useStellarWallet';

export default function AirdropsPage() {
	const { address, isConnected } = useStellarWallet();

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-3xl space-y-8">
				<header>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">
						Airdrops
					</h1>
					<p className="mt-2 text-sm text-white/50">
						View and claim airdrops allocated to the keys you hold.
					</p>
				</header>

				{isConnected && address ? (
					<AirdropClaimsPanel walletAddress={address} />
				) : (
					<EmptyState
						title="Connect your wallet"
						description="Connect your Stellar wallet to see the airdrops allocated to the keys you hold."
					/>
				)}
			</div>
		</main>
	);
}
