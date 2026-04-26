import { cn } from '@/lib/utils';

interface CreatorSkeletonProps {
	className?: string;
}

const skeletonBlockClass =
	'rounded-md bg-white/12 skeleton-shimmer motion-reduce:bg-white/18 motion-reduce:ring-1 motion-reduce:ring-white/15';

const CreatorSkeleton: React.FC<CreatorSkeletonProps> = ({ className }) => {
	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/5 p-4',
				className
			)}
		>
			<div
				className={cn(
					'mb-4 aspect-square w-full rounded-xl',
					skeletonBlockClass
				)}
			/>

			<div className="mb-4 space-y-2">
				<div className={cn('h-6 w-3/4', skeletonBlockClass)} />
				<div className={cn('h-4 w-1/2', skeletonBlockClass)} />
			</div>

			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<div className={cn('h-3 w-12', skeletonBlockClass)} />
					<div className={cn('h-6 w-16', skeletonBlockClass)} />
				</div>
				<div className={cn('h-9 w-24 rounded-xl', skeletonBlockClass)} />
			</div>
		</div>
	);
};

export const CreatorGridSkeleton: React.FC<{ count?: number }> = ({
	count = 6,
}) => {
	return (
		<div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: count }).map((_, i) => (
				<CreatorSkeleton key={i} />
			))}
		</div>
	);
};

export default CreatorSkeleton;
