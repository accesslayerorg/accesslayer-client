import { ArrowRight, KeyRound } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { EMPTY_STATE_ILLUSTRATION_SIZES } from './emptyStateIllustration.config';

interface HoldingsEmptyStateProps {
	className?: string;
	/** Creator discovery path — defaults to marketplace creators route. */
	browseHref?: string;
}

/**
 * Shown when the holdings query has settled with zero creator keys.
 * Distinct from loading (skeleton) and from marketplace search empty states.
 */
const HoldingsEmptyState: React.FC<HoldingsEmptyStateProps> = ({
	className,
	browseHref = '/creators',
}) => (
	<div
		className={cn(
			'mt-6 flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 px-8 py-14 text-center backdrop-blur-xl',
			className
		)}
		role="status"
		aria-label="No holdings"
		data-testid="holdings-empty-state"
	>
		<div
			className={cn(
				'relative mb-6 flex items-center justify-center',
				EMPTY_STATE_ILLUSTRATION_SIZES.heroFrame
			)}
		>
			<div className="absolute inset-0 size-full rounded-full bg-amber-500/10 blur-2xl" />
			<span className="relative z-10 flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5 sm:size-20">
				<KeyRound
					className="size-7 text-white/40 sm:size-8"
					aria-hidden="true"
				/>
			</span>
		</div>

		<h2 className="mb-2 font-grotesque text-2xl font-black tracking-tight text-white">
			No creator keys yet
		</h2>
		<p className="mb-8 max-w-[300px] font-jakarta text-sm leading-relaxed text-white/50">
			This wallet doesn&apos;t hold any creator keys right now. Browse
			creators and secure your first key.
		</p>

		<Link
			to={browseHref}
			aria-label="Browse creators"
			className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
		>
			Browse creators
			<ArrowRight className="ml-2 size-4" aria-hidden="true" />
		</Link>
	</div>
);

export default HoldingsEmptyState;
