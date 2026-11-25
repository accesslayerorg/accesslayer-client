import type { FeedPost } from '@/services/keySocialFeed.service';

interface LockedPostCardProps {
	post: FeedPost;
	holderCount?: number;
}

export default function LockedPostCard({
	post,
	holderCount,
}: LockedPostCardProps) {
	return (
		<article
			data-testid="locked-post-card"
			className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
		>
			<header className="flex items-center gap-2 text-xs text-white/50">
				<span className="font-semibold text-white">
					{post.authorName?.trim() ||
						post.authorAddress.slice(0, 8) + '...'}
				</span>
				<time dateTime={post.createdAt}>
					{new Date(post.createdAt).toLocaleString()}
				</time>
			</header>
			<div
				data-testid="locked-post-message"
				className="mt-3 rounded-xl border border-dashed border-amber-400/30 bg-amber-400/5 p-4 text-center"
			>
				<p className="text-sm font-semibold text-amber-200">
					Locked post
				</p>
				<p
					data-testid="unlock-requirement"
					className="mt-1 text-xs text-white/60"
				>
					Hold at least {post.minHoldingThreshold} key
					{post.minHoldingThreshold === 1 ? '' : 's'} to unlock
				</p>
				{typeof holderCount === 'number' && (
					<p
						data-testid="holder-count"
						className="mt-1 text-xs text-white/50"
					>
						{holderCount} holder{holderCount === 1 ? '' : 's'}
					</p>
				)}
			</div>
		</article>
	);
}
