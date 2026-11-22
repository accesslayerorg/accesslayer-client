import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Networks } from '@stellar/stellar-sdk';
import { useAccount } from 'wagmi';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import ListRentalModal from '@/components/rentals/ListRentalModal';
import RentalRow from '@/components/rentals/RentalRow';
import RentalsUnavailableNotice from '@/components/rentals/RentalsUnavailableNotice';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
	useClaimCollateralMutation,
	useEndRentalMutation,
	useKeyRentalsEnabled,
	useListRentalMutation,
	useWalletRentals,
} from '@/hooks/useKeyRentals';
import { useListableRentalKeys } from '@/hooks/useListableRentalKeys';
import { useNowMs } from '@/hooks/useNowMs';
import { useSigner } from '@/hooks/useSigner';
import type { RentalListing, WalletRentalGroups } from '@/types/keyRental';
import { groupWalletRentals } from '@/utils/keyRental.utils';
import { env } from '@/utils/env.utils';

const networkPassphrase =
	env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

type RentalsTab = keyof WalletRentalGroups;

const TABS: Array<{ id: RentalsTab; label: string; empty: string }> = [
	{
		id: 'listed',
		label: 'Listed',
		empty: 'You have no keys waiting for a renter.',
	},
	{
		id: 'rentedOut',
		label: 'Rented out',
		empty: 'None of your keys are rented out right now.',
	},
	{
		id: 'rentedIn',
		label: 'Rented in',
		empty: 'You are not renting any keys.',
	},
];

/**
 * My Rentals at `/rentals/mine` (#1360): the wallet's listings, keys rented
 * out and keys rented in, with time remaining. End rental appears after
 * expiry and Claim collateral after the grace period.
 */
export default function MyRentalsPage() {
	useDocumentTitle('My Rentals — AccessLayer');

	const rentalsEnabled = useKeyRentalsEnabled();
	const { address, isConnected } = useAccount();
	const wallet = address ?? '';
	const { activeSigner } = useSigner(networkPassphrase);
	const nowMs = useNowMs(1000);

	const {
		data: rentals = [],
		isLoading,
		isError,
		refetch,
	} = useWalletRentals(wallet);
	const groups = useMemo(
		() => groupWalletRentals(rentals, wallet),
		[rentals, wallet]
	);
	const listableKeys = useListableRentalKeys(wallet);

	const listMutation = useListRentalMutation(wallet, activeSigner);
	const endMutation = useEndRentalMutation(wallet, activeSigner);
	const claimMutation = useClaimCollateralMutation(wallet, activeSigner);
	const actionsDisabled = endMutation.isPending || claimMutation.isPending;

	const [tab, setTab] = useState<RentalsTab>('listed');
	const [listOpen, setListOpen] = useState(false);

	const renderList = (items: RentalListing[], empty: string) =>
		items.length === 0 ? (
			<p
				className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/60"
				data-testid="my-rentals-empty"
			>
				{empty}
			</p>
		) : (
			<ul className="space-y-3">
				{items.map(listing => (
					<RentalRow
						key={listing.id}
						listing={listing}
						wallet={wallet}
						nowMs={nowMs}
						actionsDisabled={actionsDisabled}
						onEndRental={item => endMutation.mutate(item.id)}
						onClaimCollateral={item => claimMutation.mutate(item.id)}
					/>
				))}
			</ul>
		);

	return (
		<main className="mx-auto max-w-4xl px-4 py-10 text-white sm:px-6">
			<Link
				to="/rentals"
				className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
			>
				<ArrowLeft className="size-4" />
				Rental market
			</Link>

			<header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">
						My rentals
					</h1>
					<p className="mt-2 text-sm text-white/60">
						Track keys you have listed, rented out and rented in.
					</p>
				</div>
				<Button
					type="button"
					onClick={() => setListOpen(true)}
					disabled={!rentalsEnabled || !isConnected}
					data-testid="my-rentals-list-keys"
				>
					<KeyRound className="size-4" />
					List keys
				</Button>
			</header>

			{!rentalsEnabled ? (
				<RentalsUnavailableNotice />
			) : !isConnected ? (
				<div
					className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center"
					data-testid="my-rentals-connect"
				>
					<p className="mb-4 text-white/70">
						Connect your wallet to see your rentals.
					</p>
					<ConnectWalletButton />
				</div>
			) : isLoading ? (
				<div className="space-y-3" data-testid="my-rentals-loading">
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
				</div>
			) : isError ? (
				<div
					className="flex items-center justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
					role="alert"
					data-testid="my-rentals-error"
				>
					Couldn&apos;t load your rentals.
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => void refetch()}
					>
						Retry
					</Button>
				</div>
			) : (
				<Tabs
					value={tab}
					onValueChange={value => setTab(value as RentalsTab)}
				>
					<TabsList aria-label="Rental views">
						{TABS.map(item => (
							<TabsTrigger
								key={item.id}
								value={item.id}
								data-testid={`my-rentals-tab-${item.id}`}
							>
								{item.label} ({groups[item.id].length})
							</TabsTrigger>
						))}
					</TabsList>
					{TABS.map(item => (
						<TabsContent key={item.id} value={item.id} className="mt-4">
							{renderList(groups[item.id], item.empty)}
						</TabsContent>
					))}
				</Tabs>
			)}

			<ListRentalModal
				open={listOpen}
				onOpenChange={setListOpen}
				keys={listableKeys}
				isSubmitting={listMutation.isPending}
				onConfirm={input => listMutation.mutateAsync(input)}
			/>
		</main>
	);
}
