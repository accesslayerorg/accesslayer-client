import { useState } from 'react';
import { ChevronDown, ChevronRight, MessageCircle, Shield } from 'lucide-react';
import { shortenAddress } from '@/lib/web3/format';
import type { KeyComment } from '@/services/keyComments.service';
import CommentComposer from './CommentComposer';

interface CommentItemProps {
	comment: KeyComment;
	replies: KeyComment[];
	canReply: boolean;
	isCreator: boolean;
	isPosting: boolean;
	isHiding: boolean;
	onReply: (parentId: string, content: string) => Promise<void>;
	onHide: (commentId: string) => Promise<void>;
}

function CommentAuthor({ comment }: { comment: KeyComment }) {
	const author =
		comment.authorName?.trim() || shortenAddress(comment.authorAddress);
	const isHolder =
		typeof comment.authorKeyBalance === 'number' &&
		comment.authorKeyBalance > 0;

	return (
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<span
				className="truncate text-sm font-semibold text-white"
				title={comment.authorAddress}
			>
				{author}
			</span>
			{isHolder && (
				<span
					className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-300"
					data-testid="comment-holder-badge"
				>
					Holder
				</span>
			)}
		</div>
	);
}

function CommentBody({
	comment,
	isCreator,
	isHiding,
	onHide,
}: {
	comment: KeyComment;
	isCreator: boolean;
	isHiding: boolean;
	onHide: (commentId: string) => Promise<void>;
}) {
	const [hideError, setHideError] = useState<string | null>(null);

	const hide = async () => {
		setHideError(null);
		try {
			await onHide(comment.id);
		} catch (error) {
			setHideError(
				error instanceof Error ? error.message : 'Unable to hide comment.'
			);
		}
	};

	return (
		<>
			<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">
				{comment.content}
			</p>
			{isCreator && (
				<button
					type="button"
					onClick={() => void hide()}
					disabled={isHiding}
					className="mt-2 inline-flex items-center gap-1 text-xs text-white/45 hover:text-red-300 disabled:opacity-50"
				>
					<Shield className="size-3" aria-hidden="true" />
					{isHiding ? 'Hiding...' : 'Hide comment'}
				</button>
			)}
			{hideError && (
				<p role="alert" className="mt-2 text-xs text-red-300">
					{hideError}
				</p>
			)}
		</>
	);
}

export default function CommentItem({
	comment,
	replies,
	canReply,
	isCreator,
	isPosting,
	isHiding,
	onReply,
	onHide,
}: CommentItemProps) {
	const [repliesOpen, setRepliesOpen] = useState(true);
	const [replying, setReplying] = useState(false);

	return (
		<li className="border-b border-white/5 py-4 last:border-b-0">
			<article>
				<div className="min-w-0">
					<CommentAuthor comment={comment} />
					<time
						dateTime={comment.createdAt}
						className="mt-1 block text-xs text-white/40"
					>
						{new Date(comment.createdAt).toLocaleString()}
					</time>
				</div>
				<CommentBody
					comment={comment}
					isCreator={isCreator}
					isHiding={isHiding}
					onHide={onHide}
				/>
				<div className="mt-3 flex items-center gap-4">
					{replies.length > 0 && (
						<button
							type="button"
							onClick={() => setRepliesOpen(open => !open)}
							aria-expanded={repliesOpen}
							className="inline-flex items-center gap-1 text-xs font-medium text-white/55 hover:text-white"
						>
							{repliesOpen ? (
								<ChevronDown className="size-3.5" aria-hidden="true" />
							) : (
								<ChevronRight className="size-3.5" aria-hidden="true" />
							)}
							{repliesOpen ? 'Hide' : 'Show'} {replies.length}{' '}
							{replies.length === 1 ? 'reply' : 'replies'}
						</button>
					)}
					{canReply && (
						<button
							type="button"
							onClick={() => setReplying(open => !open)}
							className="inline-flex items-center gap-1 text-xs font-medium text-white/55 hover:text-amber-300"
						>
							<MessageCircle className="size-3.5" aria-hidden="true" />
							Reply
						</button>
					)}
				</div>
				{replying && (
					<div className="mt-3">
						<CommentComposer
							onSubmit={content => onReply(comment.id, content)}
							isSubmitting={isPosting}
							placeholder="Write a reply..."
							submitLabel="Post reply"
							onCancel={() => setReplying(false)}
						/>
					</div>
				)}
				{repliesOpen && replies.length > 0 && (
					<ol className="ml-3 mt-4 border-l border-white/10 pl-4 sm:ml-6 sm:pl-5">
						{replies.map(reply => (
							<li
								key={reply.id}
								className="border-b border-white/5 py-3 last:border-b-0"
							>
								<CommentAuthor comment={reply} />
								<time
									dateTime={reply.createdAt}
									className="mt-1 block text-xs text-white/40"
								>
									{new Date(reply.createdAt).toLocaleString()}
								</time>
								<CommentBody
									comment={reply}
									isCreator={isCreator}
									isHiding={isHiding}
									onHide={onHide}
								/>
							</li>
						))}
					</ol>
				)}
			</article>
		</li>
	);
}
