import { useState, type FormEvent } from 'react';

export const POST_MAX_LENGTH = 1000;

interface PostComposerProps {
	onSubmit: (input: {
		content: string;
		imageUrl?: string;
		linkUrl?: string;
		isGated?: boolean;
		minHoldingThreshold?: number;
	}) => Promise<void>;
	isSubmitting: boolean;
}

export default function PostComposer({ onSubmit, isSubmitting }: PostComposerProps) {
	const [content, setContent] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [linkUrl, setLinkUrl] = useState('');
	const [isGated, setIsGated] = useState(false);
	const [threshold, setThreshold] = useState('1');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = content.trim();
		if (!trimmed) return;

		setError(null);
		try {
			await onSubmit({
				content: trimmed,
				imageUrl: imageUrl.trim() || undefined,
				linkUrl: linkUrl.trim() || undefined,
				isGated,
				minHoldingThreshold: isGated
					? Number(threshold) || 1
					: 0,
			});
			setContent('');
			setImageUrl('');
			setLinkUrl('');
			setIsGated(false);
			setThreshold('1');
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Unable to create post.'
			);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			<textarea
				value={content}
				onChange={event => setContent(event.target.value)}
				maxLength={POST_MAX_LENGTH}
				placeholder="Share an update..."
				rows={3}
				className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none"
				aria-label="Post content"
			/>
			<input
				type="url"
				value={imageUrl}
				onChange={event => setImageUrl(event.target.value)}
				placeholder="Image URL (optional)"
				className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none"
				aria-label="Image URL"
			/>
			<input
				type="url"
				value={linkUrl}
				onChange={event => setLinkUrl(event.target.value)}
				placeholder="Link URL (optional)"
				className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none"
				aria-label="Link URL"
			/>
			<div className="flex items-center gap-3">
				<label className="flex items-center gap-2 text-sm text-white/70">
					<input
						type="checkbox"
						checked={isGated}
						onChange={event => setIsGated(event.target.checked)}
					/>
					Holder-gated
				</label>
				{isGated && (
					<input
						type="number"
						min={1}
						value={threshold}
						onChange={event => setThreshold(event.target.value)}
						className="w-24 rounded-xl border border-white/10 bg-black/20 p-2 text-sm text-white focus:border-amber-400/50 focus:outline-none"
						aria-label="Minimum holding threshold"
						placeholder="Threshold"
					/>
				)}
			</div>
			<div className="flex items-center justify-between gap-3">
				<span className="text-xs text-white/45">
					{content.length}/{POST_MAX_LENGTH}
				</span>
				<button
					type="submit"
					disabled={isSubmitting || !content.trim()}
					className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isSubmitting ? 'Posting...' : 'Post'}
				</button>
			</div>
			{error && (
				<p role="alert" className="text-sm text-red-300">
					{error}
				</p>
			)}
		</form>
	);
}
