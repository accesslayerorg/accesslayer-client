import { Skeleton } from '@/components/ui/skeleton';

interface HolderRowSkeletonProps {
	style?: React.CSSProperties;
}

export function HolderRowSkeleton({ style }: HolderRowSkeletonProps) {
	return (
		<div
			style={style}
			className="absolute left-0 right-0 flex items-center gap-4 border-b border-white/5 px-6 py-3"
		>
			<Skeleton className="h-4 w-12" />
			<Skeleton className="h-8 w-8 rounded-full" />
			<Skeleton className="h-4 flex-1" />
			<Skeleton className="h-4 w-20" />
			<Skeleton className="h-4 w-24" />
			<Skeleton className="h-4 w-16" />
		</div>
	);
}
