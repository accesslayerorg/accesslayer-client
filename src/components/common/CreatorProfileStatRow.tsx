import { cn } from '@/lib/utils';
import CreatorProfileStatItem from './CreatorProfileStatItem';
import Skeleton from '@/components/ui/skeleton';
import type { ReactNode } from 'react';

interface CreatorProfileStatItemData {
  label: string;
  value: ReactNode;
}

interface CreatorProfileStatRowProps {
  items: CreatorProfileStatItemData[];
  className?: string;
  itemClassName?: string;
  isLoading?: boolean;
  skeletonCount?: number;
}

const CreatorProfileStatRowSkeleton: React.FC<{
  count: number;
  className?: string;
  itemClassName?: string;
}> = ({ count, className, itemClassName }) => {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 backdrop-blur-md',
            itemClassName
          )}
        >
          {/* label */}
          <Skeleton className="h-2.5 w-16" />
          {/* value */}
          <Skeleton className="mt-2.5 h-5 w-24" />
        </div>
      ))}
    </div>
  );
};

const CreatorProfileStatRow: React.FC<CreatorProfileStatRowProps> = ({
  items,
  className,
  itemClassName,
  isLoading = false,
  skeletonCount = 4,
}) => {
  if (isLoading) {
    return (
      <CreatorProfileStatRowSkeleton
        count={skeletonCount}
        className={className}
        itemClassName={itemClassName}
      />
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {items.map(item => (
        <CreatorProfileStatItem
          key={item.label}
          label={item.label}
          value={item.value}
          className={itemClassName}
        />
      ))}
    </div>
  );
};

export default CreatorProfileStatRow;