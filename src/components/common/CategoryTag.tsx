import { cn } from '@/lib/utils';

interface CategoryTagProps {
	label?: string;
	className?: string;
}

const CategoryTag: React.FC<CategoryTagProps> = ({
	label = 'Uncategorized',
	className,
}) => {
	return (
		<span
			className={cn(
				'inline-flex max-w-full items-center rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80',
				className
			)}
			title={label}
		>
			<span className="truncate">{label}</span>
		</span>
	);
};

export default CategoryTag;
