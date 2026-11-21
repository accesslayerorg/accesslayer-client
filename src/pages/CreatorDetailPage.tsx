import { useState } from 'react';
import { useParams } from 'react-router';
import { Bell } from 'lucide-react';
import { useCreatorDetail } from '@/hooks/useCreators';
import CreatorBreadcrumb from '@/components/common/CreatorBreadcrumb';
import CreatorProfileHeader from '@/components/common/CreatorProfileHeader';
import CreatorProfileInfoGrid from '@/components/common/CreatorProfileInfoGrid';
import CreatorActivityFeed from '@/components/common/CreatorActivityFeed';
import { CreatorProfileHeaderSkeleton } from '@/components/common/CreatorSkeleton';
import { bpsToPercent } from '@/utils/numberFormat.utils';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import CreatorPageErrorBoundary from '@/components/common/CreatorPageErrorBoundary';
import { ApiError } from '@/services/api.service';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import PriceAlertForm from '@/components/common/PriceAlertForm';

function CreatorDetailPageContent() {
	const { id } = useParams<{ id: string }>();
	const { data: creator, isLoading, error } = useCreatorDetail(id || '');
	useNavigationTiming('creator_profile');
	const [showAlertForm, setShowAlertForm] = useState(false);

	if (isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
				<div className="mx-auto max-w-7xl space-y-6">
					<CreatorProfileHeaderSkeleton />
				</div>
			</main>
		);
	}

	if (error) {
		throw error;
	}

	if (!creator) {
		throw new ApiError('Creator not found', 404);
	}

	const priceStroops = resolveCreatorKeyPriceStroops(creator) ?? 0;

	const feeItems = [
		{
			label: 'Creator fee',
			value: bpsToPercent(creator.creatorFeeBps),
			helperText: 'Fee paid directly to the creator on each trade.',
		},
		{
			label: 'Protocol fee',
			value: bpsToPercent(creator.protocolFeeBps),
			helperText: 'Fee paid to the platform for protocol maintenance.',
		},
	];

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-7xl space-y-8">
				<CreatorBreadcrumb
					parentLabel="Marketplace"
					parentHref="/"
					currentLabel={`${creator.title} Profile`}
				/>
				<CreatorProfileHeader
					name={creator.title}
					handle={creator.socialHandle || creator.instructorId}
					creatorId={creator.id}
					isVerified={creator.isVerified}
					avatarUrl={creator.thumbnail}
					bio={creator.description}
					priceStroops={resolveCreatorKeyPriceStroops(creator)}
				/>
				<div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<div className="mb-6 flex items-center justify-between">
						<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
							Fee Structure
						</h2>
						<button
							type="button"
							onClick={() => setShowAlertForm(v => !v)}
							aria-expanded={showAlertForm}
							className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
						>
							<Bell className="size-3.5" aria-hidden="true" />
							{showAlertForm ? 'Cancel' : 'Set Alert'}
						</button>
					</div>
					{showAlertForm && (
						<div className="mb-6">
							<PriceAlertForm
								creatorId={creator.id}
								creatorTitle={creator.title}
								currentPriceStroops={priceStroops}
								onClose={() => setShowAlertForm(false)}
							/>
						</div>
					)}
					<CreatorProfileInfoGrid items={feeItems} />
				</div>
				<div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white mb-6">
						Activity
					</h2>
					<CreatorActivityFeed creatorId={creator.id} />
				</div>
			</div>
		</main>
	);
}

export default function CreatorDetailPage() {
	return (
		<CreatorPageErrorBoundary>
			<CreatorDetailPageContent />
		</CreatorPageErrorBoundary>
	);
}
