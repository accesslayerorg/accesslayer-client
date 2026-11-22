import { useState } from 'react';
import { Link } from 'react-router';
import { Networks } from '@stellar/stellar-sdk';
import { useAccount } from 'wagmi';
import { CalendarClock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import ListRentalModal from '@/components/rentals/ListRentalModal';
import RentalListingCard from '@/components/rentals/RentalListingCard';
import RentalsUnavailableNotice from '@/components/rentals/RentalsUnavailableNotice';
import RentModal from '@/components/rentals/RentModal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
	useAvailableRentals,
	useKeyRentalsEnabled,
	useListRentalMutation,
	useRentKeyMutation,
} from '@/hooks/useKeyRentals';
import { useListableRentalKeys } from '@/hooks/useListableRentalKeys';
import { useSigner } from '@/hooks/useSigner';
import type { RentalListing } from '@/types/keyRental';
import { env } from '@/utils/env.utils';

const networkPassphrase =
	env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

/**
 * Rental market at `/rentals` (#1360): keys listed for rent with their fee per
 * day, maximum days and collateral. Holders list keys from here and renters
 * open the rent flow on a listing.
 */
export default function RentalMarketPage() {
	useDocumentTitle('Key Rentals — AccessLayer');

	const rentalsEnabled = useKeyRentalsEnabled();
	const { address, isConnected } = useAccount();
	const wallet = address ?? '';
	const { activeSigner } = useSigner(networkPassphrase);

	const {
		data: listings = [],
		isLoading,
		isError,
		refetch,
	} = useAvailableRentals();
	const listableKeys = useListableRentalKeys(wallet);
	const listMutation = useListRentalMutation(wallet, activeSigner);
	const rentMutation = useRentKeyMutation(wallet, activeSigner);

	const [listOpen, setListOpen] = useState(false);
	const [rentTarget, setRentTarget] = useState<RentalListing | null>(null);

	const rentDisabledReason = (listing: RentalListing): string | null => {
		if (!rentalsEnabled) return 'Key rentals are not live yet';
		if (!isConnected || !wallet) return 'Connect a wallet to rent keys';
		if (listing.owner.toLowerCase() === wallet.toLowerCase()) {
			return 'This is your listing';
		}
		return null;
	};

	const listDisabledReason = !rentalsEnabled
		? 'Key rentals are not live yet'
		: !isConnected
			? 'Connect a wallet to list keys'
			: null;

	return (
		<main className="mx-auto max-w-6xl px-4 py-10 text-white sm:px-6">
			<header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-grotesque text-3xl font-black tracking-tight sm:text-4xl">
						Key rentals
					</h1>
					<p className="mt-2 max-w-xl text-sm text-white/60">
						Rent creator keys by the day for access, or earn a daily fee
						by listing keys you hold. Collateral is refunded when a rental
						ends.
					</p>
				</div>
				<div className="flex gap-2">
					<Button asChild variant="outline">
						<Link to="/rentals/mine" data-testid="rentals-my-link">
							<CalendarClock className="size-4" />
							My rentals
						</Link>
					</Button>
					<Button
						type="button"
						onClick={() => setListOpen(true)}
						disabled={listDisabledReason !== null}
						title={listDisabledReason ?? undefined}
						data-testid="rentals-list-keys"
					>
						<KeyRound className="size-4" />
						List your keys
					</Button>
				</div>
			</header>

			{!rentalsEnabled ? (
				<RentalsUnavailableNotice />
			) : isLoading ? (
				<div
					className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
					data-testid="rentals-loading"
				>
					{[0, 1, 2].map(i => (
						<Skeleton key={i} className="h-48 rounded-2xl" />
					))}
				</div>
			) : isError ? (
				<div
					className="flex items-center justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
					role="alert"
					data-testid="rentals-error"
				>
					Couldn&apos;t load rental listings.
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => void refetch()}
					>
						Retry
					</Button>
				</div>
			) : listings.length === 0 ? (
				<EmptyState
					title="No keys listed for rent"
					description="Listings appear here as soon as holders put keys up for rent."
					data-testid="rentals-empty"
				/>
			) : (
				<div
					className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
					data-testid="rentals-grid"
				>
					{listings.map(listing => (
						<RentalListingCard
							key={listing.id}
							listing={listing}
							rentDisabledReason={rentDisabledReason(listing)}
							onRent={setRentTarget}
						/>
					))}
				</div>
			)}

			<RentModal
				open={rentTarget !== null}
				onOpenChange={open => !open && setRentTarget(null)}
				listing={rentTarget}
				isSubmitting={rentMutation.isPending}
				onConfirm={days =>
					rentMutation.mutateAsync({
						listingId: rentTarget?.id ?? '',
						days,
					})
				}
			/>

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
