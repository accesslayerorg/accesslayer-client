import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CreatorSkeletonProps {
	className?: string;
}

const CreatorSkeleton: React.FC<CreatorSkeletonProps> = ({ className }) => {
	return (
		<div
			className={cn(
				'rounded-2xl border border-white/10 bg-white/5 p-4',
				className
			)}
		>
			<motion.div
				animate={{ opacity: [0.4, 0.7, 0.4] }}
				transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
				className="mb-4 aspect-square w-full rounded-xl bg-white/10"
			/>

			<div className="mb-4 space-y-2">
				<motion.div
					animate={{ opacity: [0.4, 0.7, 0.4] }}
					transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
					className="h-6 w-3/4 rounded-md bg-white/10"
				/>
				<motion.div
					animate={{ opacity: [0.4, 0.7, 0.4] }}
					transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
					className="h-4 w-1/2 rounded-md bg-white/10"
				/>
			</div>

			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<motion.div
						animate={{ opacity: [0.4, 0.7, 0.4] }}
						transition={{
							duration: 1.5,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className="h-3 w-12 rounded bg-white/10"
					/>
					<motion.div
						animate={{ opacity: [0.4, 0.7, 0.4] }}
						transition={{
							duration: 1.5,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className="h-6 w-16 rounded bg-white/10"
					/>
				</div>
				<motion.div
					animate={{ opacity: [0.4, 0.7, 0.4] }}
					transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
					className="h-9 w-24 rounded-xl bg-white/10"
				/>
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
