import { cn } from '@/lib/utils';
import CreatorProfileStatItem from './CreatorProfileStatItem';
import type { ReactNode } from 'react';

interface CreatorProfileStatItemData {
	label: string;
	value: ReactNode;
}

interface CreatorProfileStatRowProps {
	items: CreatorProfileStatItemData[];
	className?: string;
	itemClassName?: string;
}

const CreatorProfileStatRow: React.FC<CreatorProfileStatRowProps> = ({
	items,
	className,
	itemClassName,
}) => {
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
