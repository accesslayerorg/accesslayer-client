import { Link } from 'react-router';
import { Users } from 'lucide-react';
import CreatorCard from '@/components/common/CreatorCard';
import { useFollowingCreators } from '@/hooks/useFollowingCreators';

export default function FollowingPage() {
	const { data: creators = [], isLoading, isFetched } = useFollowingCreators();

	return (
		<main className="mx-auto max-w-7xl px-6 py-16">
			<h1 className="mb-8 font-jakarta text-2xl font-bold text-white">
				Following
			</h1>

			{isLoading && (
				<div
					data-testid="following-page-loading"
					className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
				>
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							data-testid="following-skeleton"
							className="h-64 animate-pulse rounded-2xl bg-white/5"
						/>
					))}
				</div>
			)}

			{!isLoading && isFetched && creators.length === 0 && (
				<div
					data-testid="following-empty-state"
					className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-12 text-center"
				>
					<div className="mb-4 flex size-14 items-center justify-center rounded-full bg-white/10 text-amber-400">
						<Users className="size-7" aria-hidden="true" />
					</div>
					<p className="mb-6 max-w-md text-base text-white/70">
						You are not following anyone yet — discover creators on the marketplace
					</p>
					<Link
						to="/creators"
						data-testid="browse-marketplace-button"
						className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300"
					>
						Browse Marketplace
					</Link>
				</div>
			)}

			{!isLoading && creators.length > 0 && (
				<div
					data-testid="following-creators-list"
					className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
				>
					{creators.map(creator => (
						<CreatorCard key={creator.id} creator={creator} />
					))}
				</div>
			)}
		</main>
	);
}
