import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useCreatorDetail } from '@/hooks/useCreators';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNowMs } from '@/hooks/useNowMs';
import {
	useBundleKeyOptions,
	useCancelBundleMutation,
	useCreateBundleMutation,
	useCreatorBundles,
} from '@/hooks/useBundles';
import { CreatorDashboardSkeleton } from '@/components/common/CreatorSkeleton';
import BundleCreateForm from '@/components/common/BundleCreateForm';
import ActiveBundlesList from '@/components/common/ActiveBundlesList';
import ExpiredBundlesArchive from '@/components/common/ExpiredBundlesArchive';
import { partitionBundlesByStatus } from '@/utils/bundle.utils';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

/**
 * Creator bundle management page.
 *
 * Lets a creator define a bundle of their keys at a discounted price with an
 * expiry window, then track the active bundles (purchase count and time
 * remaining) and review the archive of bundles that expired or were cancelled.
 *
 * Expiry is evaluated against a shared ticking clock, so a bundle leaves the
 * active list and lands in the archive on its own once it lapses.
 */
export default function BundleManagementPage() {
	const { id = '' } = useParams<{ id: string }>();
	const nowMs = useNowMs();

	const { data: creator, isLoading, isError } = useCreatorDetail(id);
	const {
		data: bundlePages,
		isError: isBundlesError,
		isLoading: isBundlesLoading,
	} = useCreatorBundles(id);
	const { options: keyOptions } = useBundleKeyOptions(id);

	const createBundle = useCreateBundleMutation(id);
	const cancelBundle = useCancelBundleMutation(id);

	// Bumped on a successful creation so the create form clears its draft.
	const [resetSignal, setResetSignal] = useState(0);

	const bundles = useMemo(
		() => bundlePages?.pages.flatMap(page => page.bundles) ?? [],
		[bundlePages]
	);
	const { active, archived } = useMemo(
		() => partitionBundlesByStatus(bundles, nowMs),
		[bundles, nowMs]
	);

	// A first page that has not resolved yet means the active list is still
	// loading; an empty result is a real empty state, not a loading one.
	const isLoadingBundles = isBundlesLoading && !bundlePages;

	useDocumentTitle(
		creator ? `${creator.title} · Bundles — AccessLayer` : 'Bundles — AccessLayer'
	);

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-5xl">
					<CreatorDashboardSkeleton />
				</div>
			</main>
		);
	}

	if (isError || !creator) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-5xl">
					<h1 className="font-grotesque text-3xl font-black">Key bundles</h1>
					<p
						className="mt-4 text-white/60"
						data-testid="bundle-management-error"
					>
						We couldn&apos;t load this creator&apos;s bundles. Try again
						shortly.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-5xl space-y-8">
				<div>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">
						{creator.title} · Key bundles
					</h1>
					<p className="mt-2 text-sm text-white/50">
						Bundle your keys at a discounted price, set an expiry, and track
						how each bundle sells.
					</p>
				</div>

				<section className={CARD_CLASS} data-testid="bundle-create-section">
					<h2 className="mb-1 font-grotesque text-xl font-black tracking-tight">
						Create a bundle
					</h2>
					<p className="mb-6 text-sm text-white/50">
						Pick the keys and quantities to include, then set a discounted
						bundle price and how long it stays available.
					</p>

					{keyOptions.length === 0 ? (
						<p
							className="text-sm text-white/55"
							data-testid="bundle-create-no-keys"
						>
							You need at least one of your own keys with a published price
							before you can create a bundle.
						</p>
					) : (
						<BundleCreateForm
							availableKeys={keyOptions}
							resetSignal={resetSignal}
							isSubmitting={createBundle.isPending}
							onSubmit={request =>
								createBundle.mutate(request, {
									onSuccess: () => setResetSignal(current => current + 1),
								})
							}
						/>
					)}
				</section>

				<section className={CARD_CLASS} data-testid="bundle-active-section">
					<ActiveBundlesList
						bundles={active}
						nowMs={nowMs}
						isLoading={isLoadingBundles}
						isError={isBundlesError}
						cancellingBundleId={
							cancelBundle.isPending ? cancelBundle.variables : undefined
						}
						onCancelBundle={bundleId => cancelBundle.mutate(bundleId)}
					/>
				</section>

				<section className={CARD_CLASS} data-testid="bundle-archive-section">
					<ExpiredBundlesArchive bundles={archived} nowMs={nowMs} />
				</section>
			</div>
		</main>
	);
}
