import { useAccount, useConnect } from 'wagmi';
import { useKeySocialFeed } from '@/hooks/useKeySocialFeed';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import LockedPostCard from './LockedPostCard';

interface KeySocialFeedProps {
	keyId: string;
	creatorAddress?: string;
	userHolding?: number;
	holderCount?: number;
}

export default function KeySocialFeed({
	keyId,
	userHolding = 0,
	holderCount,
}: KeySocialFeedProps) {
	const { address, isConnected } = useAccount();
	const { connect, connectors, isPending: isConnecting } = useConnect();
	const {
		posts,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		error,
		fetchNextPage,
		createPost,
		isCreating,
	} = useKeySocialFeed(keyId);

	const connectWallet = () => {
		const connector = connectors[0];
		if (connector) connect({ connector });
	};

	const submitPost = (input: {
		content: string;
		imageUrl?: string;
		linkUrl?: string;
		isGated?: boolean;
		minHoldingThreshold?: number;
	}) =>
		createPost({
			content: input.content,
			imageUrl: input.imageUrl,
			linkUrl: input.linkUrl,
			isGated: input.isGated,
			minHoldingThreshold: input.minHoldingThreshold,
		}).then(() => undefined);

	return (
		<section
			aria-labelledby="key-social-feed-heading"
			data-testid="social-feed"
			className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
		>
			<div className="mb-6">
				<h2
					id="key-social-feed-heading"
					className="font-grotesque text-xl font-black tracking-tight text-white"
				>
					Social feed
				</h2>
				<p className="mt-1 text-sm text-white/50">
					Updates from the creator and the community.
				</p>
			</div>

			{isConnected && address ? (
				<div className="mb-6">
					<PostComposer onSubmit={submitPost} isSubmitting={isCreating} />
				</div>
			) : (
				<div className="mb-6 rounded-xl border border-white/10 bg-black/15 p-4 text-center">
					<p className="mb-3 text-sm text-white/65">
						Connect your wallet to join the conversation.
					</p>
					<button
						type="button"
						onClick={connectWallet}
						disabled={isConnecting || connectors.length === 0}
						className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isConnecting ? 'Connecting...' : 'Connect wallet'}
					</button>
				</div>
			)}

			{isLoading ? (
				<p role="status" className="py-6 text-center text-sm text-white/50">
					Loading feed...
				</p>
			) : isError ? (
				<p role="alert" className="py-6 text-center text-sm text-red-300">
					{error instanceof Error
						? error.message
						: 'Unable to load feed.'}
				</p>
			) : posts.length === 0 ? (
				<p
					data-testid="feed-empty"
					className="py-6 text-center text-sm text-white/50"
				>
					No posts yet.
				</p>
			) : (
				<div className="space-y-4">
					{posts.map(post => {
						const locked =
							post.isGated &&
							userHolding < post.minHoldingThreshold;
						return locked ? (
							<LockedPostCard
								key={post.id}
								post={post}
								holderCount={holderCount}
							/>
						) : (
							<PostCard key={post.id} post={post} />
						);
					})}
					{hasNextPage && (
						<div className="pt-4 text-center">
							<button
								type="button"
								onClick={() => void fetchNextPage()}
								disabled={isFetchingNextPage}
								data-testid="feed-load-more"
								className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5 disabled:opacity-50"
							>
								{isFetchingNextPage
									? 'Loading...'
									: 'Load more'}
							</button>
						</div>
					)}
				</div>
			)}
		</section>
	);
}
