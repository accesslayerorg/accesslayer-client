import { useId, useState, type FormEvent } from 'react';

export const COMMENT_MAX_LENGTH = 500;

interface CommentComposerProps {
	onSubmit: (content: string) => Promise<void>;
	isSubmitting: boolean;
	placeholder?: string;
	submitLabel?: string;
	onCancel?: () => void;
}

export default function CommentComposer({
	onSubmit,
	isSubmitting,
	placeholder = 'Share your thoughts...',
	submitLabel = 'Post comment',
	onCancel,
}: CommentComposerProps) {
	const [content, setContent] = useState('');
	const [error, setError] = useState<string | null>(null);
	const inputId = useId();

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = content.trim();
		if (!trimmed || trimmed.length > COMMENT_MAX_LENGTH) return;

		setError(null);
		try {
			await onSubmit(trimmed);
			setContent('');
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Unable to post comment.'
			);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-2">
			<label className="sr-only" htmlFor={inputId}>
				Comment
			</label>
			<textarea
				id={inputId}
				value={content}
				onChange={event => setContent(event.target.value)}
				maxLength={COMMENT_MAX_LENGTH}
				placeholder={placeholder}
				rows={3}
				className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none"
				aria-describedby={`${inputId}-count`}
			/>
			<div className="flex items-center justify-between gap-3">
				<span
					id={`${inputId}-count`}
					className="text-xs text-white/45"
					aria-live="polite"
				>
					{content.length}/{COMMENT_MAX_LENGTH}
				</span>
				<div className="flex items-center gap-2">
					{onCancel && (
						<button
							type="button"
							onClick={onCancel}
							className="rounded-lg px-3 py-2 text-sm text-white/65 hover:bg-white/5"
						>
							Cancel
						</button>
					)}
					<button
						type="submit"
						disabled={
							isSubmitting ||
							!content.trim() ||
							content.length > COMMENT_MAX_LENGTH
						}
						className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isSubmitting ? 'Posting...' : submitLabel}
					</button>
				</div>
			</div>
			{error && (
				<p role="alert" className="text-sm text-red-300">
					{error}
				</p>
			)}
		</form>
	);
}
