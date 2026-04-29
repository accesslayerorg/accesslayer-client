import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface EmptyStateProps {
	image: string;
	title: string;
	description: string;
	className?: string;
	onReset?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
	image,
	title,
	description,
	className,
	onReset,
}: EmptyStateProps) => {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 px-8 py-14 text-center backdrop-blur-xl',
				className
			)}
			role="status"
			aria-label={title}
		>
			<div className="relative mb-6">
				<div className="absolute inset-0 size-full rounded-full bg-amber-500/10 blur-2xl" />
				<img
					src={image}
					className="relative z-10 size-[180px] object-contain opacity-60 grayscale transition-all duration-500 hover:opacity-80 hover:grayscale-0"
					alt=""
					aria-hidden="true"
				/>
			</div>
			<h2 className="font-grotesque text-2xl font-black tracking-tight text-white mb-2">
				{title}
			</h2>
			<p className="max-w-[280px] font-jakarta text-sm leading-relaxed text-white/50 mb-8">
				{description}
			</p>

			{onReset && (
				<Button
					onClick={onReset}
					variant="outline"
					aria-label="Reset search results"
					className="rounded-xl border-white/10 bg-white/5 px-6 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
				>
					<RotateCcw className="mr-2 size-4" aria-hidden="true" />
					Reset Search
				</Button>
			)}
		</div>
	);
};

export default EmptyState;
