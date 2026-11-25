import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import KeyMiniCard from '@/components/common/KeyMiniCard';
import { useRelatedKeys } from '@/hooks/useRelatedKeys';
import { useTelemetry } from '@/hooks/useTelemetry';
import type { RelatedKey } from '@/services/relatedKeys.service';

export interface RelatedKeysCarouselProps {
	keyId: string;
	limit?: number;
}

/** Fraction of the visible width scrolled per previous/next step. */
const SCROLL_STEP_RATIO = 0.8;

/**
 * Carousel of keys that share holders with the current key (#1318).
 * Hidden when the list is empty or the request fails.
 */
export default function RelatedKeysCarousel({
	keyId,
	limit,
}: RelatedKeysCarouselProps) {
	const { data, isLoading, isError } = useRelatedKeys(keyId, limit);
	const { track } = useTelemetry();
	const trackRef = useRef<HTMLDivElement>(null);

	const scrollByStep = (direction: 1 | -1) => {
		const el = trackRef.current;
		if (!el) return;
		const step = Math.max(el.clientWidth * SCROLL_STEP_RATIO, 160);
		el.scrollBy({ left: direction * step, behavior: 'smooth' });
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			scrollByStep(1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			scrollByStep(-1);
		}
	};

	const handleCardClick = (item: RelatedKey) => {
		track({
			type: 'UserAction',
			action: 'related_key_click',
			target: item.id,
			metadata: { sourceKeyId: keyId, relatedKeyId: item.id },
		});
	};

	if (isError) return null;
	if (!isLoading && (!data || data.length === 0)) return null;

	return (
		<section
			aria-labelledby="related-keys-heading"
			data-testid="related-keys-carousel"
			className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
		>
			<div className="mb-6 flex items-center justify-between gap-3">
				<h2
					id="related-keys-heading"
					className="font-grotesque text-xl font-black tracking-tight text-white"
				>
					Related keys
				</h2>
				{!isLoading && (
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label="Previous related keys"
							onClick={() => scrollByStep(-1)}
						>
							<ChevronLeft className="size-4" aria-hidden="true" />
						</Button>
						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label="Next related keys"
							onClick={() => scrollByStep(1)}
						>
							<ChevronRight className="size-4" aria-hidden="true" />
						</Button>
					</div>
				)}
			</div>

			{isLoading ? (
				<div
					data-testid="related-keys-skeleton"
					aria-busy="true"
					className="flex gap-4 overflow-hidden"
				>
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton key={index} className="h-32 w-44 shrink-0 rounded-2xl" />
					))}
				</div>
			) : (
				<div
					ref={trackRef}
					role="group"
					aria-roledescription="carousel"
					aria-label="Related keys"
					tabIndex={0}
					onKeyDown={handleKeyDown}
					data-testid="related-keys-track"
					className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
				>
					{data?.map(item => (
						<KeyMiniCard key={item.id} item={item} onClick={handleCardClick} />
					))}
				</div>
			)}
		</section>
	);
}
