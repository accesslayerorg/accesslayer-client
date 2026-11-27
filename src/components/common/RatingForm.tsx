import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { KeyRating } from '@/types/keyRating';
import { KEY_RATING_REVIEW_MAX_LENGTH, getReviewCharacterCount } from '@/hooks/useKeyRatings';

interface RatingFormProps {
	existingRating: KeyRating | null;
	isHolder: boolean;
	isConnected: boolean;
	isSubmitting: boolean;
	onSubmit: (input: { rating: number; review?: string }) => Promise<void> | void;
}

export default function RatingForm({
	existingRating,
	isHolder,
	isConnected,
	isSubmitting,
	onSubmit,
}: RatingFormProps) {
	const [rating, setRating] = useState<number>(existingRating?.rating ?? 0);
	const [hovered, setHovered] = useState<number>(0);
	const [review, setReview] = useState<string>(existingRating?.review ?? '');
	const [touched, setTouched] = useState(false);

	useEffect(() => {
		setRating(existingRating?.rating ?? 0);
		setReview(existingRating?.review ?? '');
		setTouched(false);
	}, [existingRating?.id, existingRating?.rating, existingRating?.review]);

	const charCount = getReviewCharacterCount(review);
	const overLimit = charCount > KEY_RATING_REVIEW_MAX_LENGTH;
	const ratingMissing = touched && rating < 1;
	const canSubmit =
		isConnected && isHolder && rating >= 1 && !overLimit && !isSubmitting;

	const submitLabel = existingRating ? 'Update review' : 'Submit review';
	const displayRating = hovered || rating;

	const helperMessage = useMemo(() => {
		if (!isConnected) return 'Connect your wallet to rate this key.';
		if (!isHolder) return 'Only wallets holding at least one key can submit a rating.';
		return null;
	}, [isConnected, isHolder]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setTouched(true);
		if (!canSubmit) return;
		await onSubmit({ rating, review: review.trim() });
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
			data-testid="rating-form"
		>
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="text-sm font-bold text-white">
						{existingRating ? 'Edit your review' : 'Rate this key'}
					</h3>
					<p className="text-xs text-white/50">
						Share a short review for other holders.
					</p>
				</div>
				{existingRating && (
					<span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
						Your review
					</span>
				)}
			</div>

			<div className="mt-4">
				<div
					className="flex items-center gap-1"
					role="radiogroup"
					aria-label="Rating"
					data-testid="rating-star-selector"
				>
					{[1, 2, 3, 4, 5].map(value => {
						const active = value <= displayRating;
						return (
							<button
								key={value}
								type="button"
								role="radio"
								aria-checked={rating === value}
								aria-label={`${value} star${value === 1 ? '' : 's'}`}
								disabled={!isConnected || !isHolder || isSubmitting}
								onMouseEnter={() => setHovered(value)}
								onMouseLeave={() => setHovered(0)}
								onFocus={() => setHovered(value)}
								onBlur={() => setHovered(0)}
								onClick={() => {
									setRating(value);
									setTouched(true);
								}}
								className={cn(
									'rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50',
									active ? 'text-amber-400' : 'text-white/25 hover:text-amber-300'
								)}
								data-testid={`rating-star-${value}`}
							>
								<Star className={cn('size-7', active && 'fill-current')} />
							</button>
						);
					})}
					<span className="ml-2 text-xs text-white/50">
						{displayRating > 0 ? `${displayRating}/5` : 'Select rating'}
					</span>
				</div>
				{ratingMissing && (
					<p className="mt-1 text-xs text-rose-300" data-testid="rating-required-error">
						Select a star rating.
					</p>
				)}
			</div>

			<div className="mt-4">
				<label htmlFor="key-rating-review" className="mb-1.5 block text-xs font-semibold text-white/70">
					Review (optional)
				</label>
				<Textarea
					id="key-rating-review"
					value={review}
					onChange={e => setReview(e.target.value)}
					placeholder="What should other holders know?"
					maxLength={KEY_RATING_REVIEW_MAX_LENGTH + 20}
					disabled={!isConnected || !isHolder || isSubmitting}
					className="min-h-24 border-white/15 bg-white/[0.04] text-white placeholder:text-white/30"
					data-testid="rating-review-input"
				/>
				<div className="mt-1 flex items-center justify-between gap-2 text-xs">
					<span className={cn(overLimit ? 'text-rose-300' : 'text-white/45')} data-testid="rating-review-counter">
						{charCount}/{KEY_RATING_REVIEW_MAX_LENGTH}
					</span>
					{overLimit && (
						<span className="text-rose-300" data-testid="rating-review-limit-error">
							Review is too long.
						</span>
					)}
				</div>
			</div>

			{helperMessage && (
				<div
					className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60"
					data-testid="rating-gate-message"
				>
					{helperMessage}
				</div>
			)}

			<div className="mt-4 flex justify-end">
				<Button
					type="submit"
					disabled={!canSubmit}
					className="bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-50"
					data-testid="rating-submit-button"
				>
					{isSubmitting ? 'Submitting...' : submitLabel}
				</Button>
			</div>
		</form>
	);
}
