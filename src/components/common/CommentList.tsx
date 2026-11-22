import type { KeyComment } from '@/services/keyComments.service';
import CommentItem from './CommentItem';

interface CommentListProps {
	comments: KeyComment[];
	canReply: boolean;
	isCreator: boolean;
	isPosting: boolean;
	isHiding: boolean;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onReply: (parentId: string, content: string) => Promise<void>;
	onHide: (commentId: string) => Promise<void>;
	onLoadMore: () => void;
}

export default function CommentList({
	comments,
	canReply,
	isCreator,
	isPosting,
	isHiding,
	hasNextPage,
	isFetchingNextPage,
	onReply,
	onHide,
	onLoadMore,
}: CommentListProps) {
	const commentsById = new Map(comments.map(comment => [comment.id, comment]));
	const repliesByParent = new Map<string, KeyComment[]>();
	const rootComments: KeyComment[] = [];

	for (const comment of comments) {
		if (comment.parentId && commentsById.has(comment.parentId)) {
			const replies = repliesByParent.get(comment.parentId) ?? [];
			replies.push(comment);
			repliesByParent.set(comment.parentId, replies);
		} else if (!comment.parentId) {
			rootComments.push(comment);
		}
	}

	for (const comment of comments) {
		for (const reply of comment.replies ?? []) {
			if (reply.parentId && reply.parentId !== comment.id) continue;
			const replies = repliesByParent.get(comment.id) ?? [];
			if (!replies.some(existing => existing.id === reply.id)) {
				replies.push({ ...reply, parentId: comment.id });
			}
			repliesByParent.set(comment.id, replies);
		}
	}

	return (
		<>
			{rootComments.length === 0 && (
				<p className="py-6 text-center text-sm text-white/50">
					No comments yet. Start the conversation.
				</p>
			)}
			<ol aria-label="Comments" className="divide-y divide-white/5">
				{rootComments.map(comment => (
					<CommentItem
						key={comment.id}
						comment={comment}
						replies={repliesByParent.get(comment.id) ?? []}
						canReply={canReply}
						isCreator={isCreator}
						isPosting={isPosting}
						isHiding={isHiding}
						onReply={onReply}
						onHide={onHide}
					/>
				))}
			</ol>
			{hasNextPage && (
				<div className="pt-4 text-center">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={isFetchingNextPage}
						className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5 disabled:opacity-50"
					>
						{isFetchingNextPage ? 'Loading...' : 'Load more'}
					</button>
				</div>
			)}
		</>
	);
}
