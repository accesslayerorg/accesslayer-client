import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import HoldDetailDrawer from '@/components/admin/HoldDetailDrawer';
import ReferralHoldsSummaryStrip from '@/components/admin/ReferralHoldsSummaryStrip';
import ReferralHoldsTable from '@/components/admin/ReferralHoldsTable';
import {
	useReferralHoldDetail,
	useReferralHolds,
	useReferralHoldsSummary,
	useReviewReferralHoldMutation,
} from '@/hooks/useReferralHolds';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import {
	REFERRAL_HOLD_REASONS,
	REFERRAL_HOLD_STATUSES,
	REFERRAL_HOLD_REASON_LABELS,
	REFERRAL_HOLD_STATUS_LABELS,
	parseReferralHoldFilters,
} from '@/utils/referralHolds.utils';
import { isAdminWallet } from '@/utils/adminAccess';
import type { ReferralHoldReviewAction } from '@/services/adminReferralHolds.service';

const SELECT_CLASS =
	'rounded-md border border-white/15 bg-[#0b1a2e] px-3 py-1.5 text-sm text-white focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30';

export default function ReferralHoldsPage() {
	useDocumentTitle('Referral holds — AccessLayer');
	useNavigationTiming('admin-referral-holds');

	const [searchParams, setSearchParams] = useSearchParams();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [reviewError, setReviewError] = useState<string | null>(null);

	const { address, isConnected } = useStellarWallet();
	const isAdmin = isConnected && isAdminWallet(address);

	const filters = parseReferralHoldFilters(searchParams);
	const holdsQuery = useReferralHolds(filters, isAdmin);
	const summaryQuery = useReferralHoldsSummary(isAdmin);
	const detailQuery = useReferralHoldDetail(selectedId, isAdmin);
	const review = useReviewReferralHoldMutation();

	const updateFilter = (key: 'status' | 'reason', value: string) => {
		setSearchParams(
			params => {
				const updated = new URLSearchParams(params);
				if (value === 'all') updated.delete(key);
				else updated.set(key, value);
				return updated;
			},
			{ replace: true }
		);
	};

	const handleReview = async (
		action: ReferralHoldReviewAction,
		note: string
	) => {
		if (!selectedId) return;
		setReviewError(null);
		try {
			await review.mutateAsync({
				holdId: selectedId,
				action,
				note,
				reviewer: address,
			});
		} catch (error) {
			setReviewError(
				error instanceof Error ? error.message : 'The review could not be saved.'
			);
		}
	};

	if (!isAdmin) {
		return <Navigate to="/" replace />;
	}

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8"
			data-testid="referral-holds-page"
		>
			<div className="mx-auto max-w-6xl space-y-8">
				<header>
					<h1 className="font-grotesque text-3xl font-black tracking-tight sm:text-4xl">
						Referral holds
					</h1>
					<p className="mt-2 max-w-2xl font-jakarta text-sm text-white/60">
						Review referral rewards flagged for self-referral or sybil
						clusters. Inspect the funding evidence before releasing or
						rejecting a hold.
					</p>
				</header>

				<ReferralHoldsSummaryStrip
					summary={summaryQuery.data}
					isLoading={summaryQuery.isLoading}
				/>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<label className="flex items-center gap-2 text-sm text-white/60">
						<span>Status</span>
						<select
							value={filters.status ?? 'all'}
							onChange={event => updateFilter('status', event.target.value)}
							className={SELECT_CLASS}
							data-testid="referral-holds-status-filter"
							aria-label="Filter by status"
						>
							<option value="all">All statuses</option>
							{REFERRAL_HOLD_STATUSES.map(status => (
								<option key={status} value={status}>
									{REFERRAL_HOLD_STATUS_LABELS[status]}
								</option>
							))}
						</select>
					</label>
					<label className="flex items-center gap-2 text-sm text-white/60">
						<span>Reason</span>
						<select
							value={filters.reason ?? 'all'}
							onChange={event => updateFilter('reason', event.target.value)}
							className={SELECT_CLASS}
							data-testid="referral-holds-reason-filter"
							aria-label="Filter by reason"
						>
							<option value="all">All reasons</option>
							{REFERRAL_HOLD_REASONS.map(reason => (
								<option key={reason} value={reason}>
									{REFERRAL_HOLD_REASON_LABELS[reason]}
								</option>
							))}
						</select>
					</label>
				</div>

				<ReferralHoldsTable
					holds={holdsQuery.holds}
					isLoading={holdsQuery.isLoading}
					isError={holdsQuery.isError}
					isFetchingNextPage={holdsQuery.isFetchingNextPage}
					hasNextPage={holdsQuery.hasNextPage}
					onLoadMore={() => void holdsQuery.fetchNextPage()}
					onSelect={hold => setSelectedId(hold.id)}
					selectedId={selectedId}
				/>

				<HoldDetailDrawer
					detail={detailQuery.data}
					isLoading={detailQuery.isLoading}
					open={Boolean(selectedId)}
					onClose={() => {
						setSelectedId(null);
						setReviewError(null);
					}}
					onReview={handleReview}
					isReviewing={review.isPending}
					reviewError={reviewError}
				/>
			</div>
		</main>
	);
}
