import React from 'react';
import { cn } from '@/lib/utils';

const skeletonBlockClass =
	'rounded-md bg-white/10 skeleton-shimmer motion-reduce:bg-white/15 motion-reduce:ring-1 motion-reduce:ring-white/10';

export interface DiscoveryKeyCardSkeletonProps {
	className?: string;
}

export const DiscoveryKeyCardSkeleton: React.FC<DiscoveryKeyCardSkeletonProps> = ({
	className,
}) => {
	return (
		<div
			aria-hidden="true"
			data-testid="discovery-card-skeleton"
			className={cn(
				'flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur-md',
				className
			)}
		>
			<div>
				{/* Top Bar Skeleton */}
				<div className="flex items-start justify-between gap-3">
					<div className={cn('size-14 shrink-0 rounded-full', skeletonBlockClass)} />
					<div className="flex flex-col items-end gap-1.5">
						<div className={cn('h-5 w-12 rounded-full', skeletonBlockClass)} />
						<div className={cn('h-4 w-14 rounded-full', skeletonBlockClass)} />
					</div>
				</div>

				{/* Name & Handle Skeleton */}
				<div className="mt-4 space-y-2">
					<div className={cn('h-5 w-32', skeletonBlockClass)} />
					<div className={cn('h-3.5 w-20', skeletonBlockClass)} />
				</div>
			</div>

			{/* Price Skeleton */}
			<div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3">
				<div className={cn('h-3.5 w-10', skeletonBlockClass)} />
				<div className={cn('h-4 w-16', skeletonBlockClass)} />
			</div>
		</div>
	);
};

export interface DiscoveryCardGridSkeletonProps {
	count?: number;
	className?: string;
}

export const DiscoveryCardGridSkeleton: React.FC<DiscoveryCardGridSkeletonProps> = ({
	count = 5,
	className,
}) => {
	return (
		<div
			data-testid="discovery-grid-skeleton"
			className={cn(
				'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
				className
			)}
		>
			{Array.from({ length: count }, (_, i) => (
				<DiscoveryKeyCardSkeleton key={i} />
			))}
		</div>
	);
};

export default DiscoveryKeyCardSkeleton;
