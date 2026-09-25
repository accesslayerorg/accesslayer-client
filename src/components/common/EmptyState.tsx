import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { EMPTY_STATE_ILLUSTRATION_SIZES } from './emptyStateIllustration.config';

export interface EmptyStateCTAConfig {
	label?: string;
	text?: string;
	href?: string;
	onClick?: () => void;
}

export interface EmptyStateProps {
	image?: string;
	title?: string;
	description?: string;
	message?: string;
	cta?: EmptyStateCTAConfig | string;
	ctaHref?: string;
	className?: string;
	onReset?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
	image,
	title,
	description,
	message,
	cta,
	ctaHref,
	className,
	onReset,
}: EmptyStateProps) => {
	const displayTitle = title;
	const displayMessage = message ?? description;
	const ariaLabelText = title || message || description || 'Empty state';

	const ctaObject = typeof cta === 'object' ? cta : undefined;
	const ctaLabel =
		ctaObject?.label ??
		ctaObject?.text ??
		(typeof cta === 'string' ? cta : undefined);
	const resolvedHref = ctaObject?.href ?? ctaHref;
	const resolvedOnClick = ctaObject?.onClick;

	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 px-8 py-14 text-center backdrop-blur-xl',
				className
			)}
			role="status"
			aria-label={ariaLabelText}
		>
			{image && (
				<div
					className={cn(
						'relative mb-6 flex items-center justify-center',
						EMPTY_STATE_ILLUSTRATION_SIZES.heroFrame
					)}
				>
					<div className="absolute inset-0 size-full rounded-full bg-amber-500/10 blur-2xl" />
					<img
						src={image}
						className={cn(
							'relative z-10 opacity-60 grayscale transition-all duration-500 hover:opacity-80 hover:grayscale-0',
							EMPTY_STATE_ILLUSTRATION_SIZES.heroVisual
						)}
						alt=""
						aria-hidden="true"
					/>
				</div>
			)}
			{displayTitle && (
				<h2 className="font-grotesque text-2xl font-black tracking-tight text-white mb-2">
					{displayTitle}
				</h2>
			)}
			{displayMessage !== undefined && (
				<p className="max-w-[280px] font-jakarta text-sm leading-relaxed text-white/50 mb-8">
					{displayMessage}
				</p>
			)}

			{resolvedHref && ctaLabel ? (
				<Link
					to={resolvedHref}
					aria-label={ctaLabel}
					className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
				>
					{ctaLabel}
				</Link>
			) : ctaLabel ? (
				<Button
					onClick={resolvedOnClick}
					variant="outline"
					aria-label={ctaLabel}
					className="rounded-xl border-white/10 bg-white/5 px-6 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
				>
					{ctaLabel}
				</Button>
			) : onReset ? (
				<Button
					onClick={onReset}
					variant="outline"
					aria-label="Reset search results"
					className="rounded-xl border-white/10 bg-white/5 px-6 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
				>
					<RotateCcw className="mr-2 size-4" aria-hidden="true" />
					Reset Search
				</Button>
			) : null}
		</div>
	);
};

export default EmptyState;

