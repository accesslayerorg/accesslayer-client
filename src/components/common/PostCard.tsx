import type { FeedPost } from '@/services/keySocialFeed.service';

interface PostCardProps {
	post: FeedPost;
}

export default function PostCard({ post }: PostCardProps) {
	return (
		<article
			data-testid="post-card"
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
				{post.isGated && (
					<span
						data-testid="post-gated-badge"
						className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-300"
					>
						Gated
					</span>
				)}
			</header>
			<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">
				{post.content}
			</p>
			{post.imageUrl && (
				<img
					src={post.imageUrl}
					alt="Post attachment"
					data-testid="post-image"
					className="mt-3 max-h-64 w-full rounded-xl object-cover"
				/>
			)}
			{post.linkUrl && (
				<a
					href={post.linkUrl}
					target="_blank"
					rel="noreferrer"
					data-testid="post-link"
					className="mt-3 block text-sm text-amber-300 hover:underline"
				>
					{post.linkUrl}
				</a>
			)}
		</article>
	);
}
