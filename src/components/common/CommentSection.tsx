import { useAccount, useConnect } from 'wagmi';
import { useKeyComments } from '@/hooks/useKeyComments';
import CommentComposer from './CommentComposer';
import CommentList from './CommentList';

interface CommentSectionProps {
	keyId: string;
	creatorAddress: string;
}

export default function CommentSection({
	keyId,
	creatorAddress,
}: CommentSectionProps) {
	const { address, isConnected } = useAccount();
	const { connect, connectors, isPending: isConnecting } = useConnect();
	const {
		comments,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		error,
		fetchNextPage,
		postComment,
		isPosting,
		hideComment,
		isHiding,
	} = useKeyComments(keyId);
	const isCreator = Boolean(
		isConnected &&
			address &&
			creatorAddress &&
			address.toLowerCase() === creatorAddress.toLowerCase()
	);

	const connectWallet = () => {
		const connector = connectors[0];
		if (connector) connect({ connector });
	};

	const submitComment = (content: string) =>
		postComment({ content }).then(() => undefined);
	const submitReply = (parentId: string, content: string) =>
		postComment({ content, parentId }).then(() => undefined);
	const hide = (commentId: string) =>
		hideComment(commentId).then(() => undefined);

	return (
		<section
			aria-labelledby="key-comments-heading"
			className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
		>
			<div className="mb-6">
				<h2
					id="key-comments-heading"
					className="font-grotesque text-xl font-black tracking-tight text-white"
				>
					Community discussion
				</h2>
				<p className="mt-1 text-sm text-white/50">
					Discuss this key with its holders and creator.
				</p>
			</div>

			{isConnected && address ? (
				<div className="mb-6">
					<CommentComposer
						onSubmit={submitComment}
						isSubmitting={isPosting}
					/>
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
					Loading comments...
				</p>
			) : isError ? (
				<p role="alert" className="py-6 text-center text-sm text-red-300">
					{error instanceof Error
						? error.message
						: 'Unable to load comments.'}
				</p>
			) : (
				<CommentList
					comments={comments}
					canReply={Boolean(isConnected && address)}
					isCreator={isCreator}
					isPosting={isPosting}
					isHiding={isHiding}
					hasNextPage={Boolean(hasNextPage)}
					isFetchingNextPage={isFetchingNextPage}
					onReply={submitReply}
					onHide={hide}
					onLoadMore={() => void fetchNextPage()}
				/>
			)}
		</section>
	);
}
