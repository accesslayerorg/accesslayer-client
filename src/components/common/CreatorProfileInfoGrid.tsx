import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import CreatorProfileStatItem from './CreatorProfileStatItem';

interface CreatorProfileInfoItem {
	label: string;
	value: ReactNode;
}

interface CreatorProfileInfoGridProps {
	items: CreatorProfileInfoItem[];
	className?: string;
}

const CreatorProfileInfoGrid: React.FC<CreatorProfileInfoGridProps> = ({
	items,
	className,
}) => {
	return (
		<div
			className={cn(
				'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4',
				className
			)}
		>
			{items.map(item => (
				<CreatorProfileStatItem
					key={item.label}
					label={item.label}
					value={item.value}
				/>
			))}
		</div>
	);
};

export default CreatorProfileInfoGrid;
