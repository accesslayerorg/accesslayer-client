import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewKeyBadgeProps {
	/** ISO timestamp for when the creator key was created. */
	createdAt?: string;
	className?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const NewKeyBadge: React.FC<NewKeyBadgeProps> = ({ createdAt, className }) => {
	if (!createdAt) return null;

	const createdTime = new Date(createdAt).getTime();
	if (Number.isNaN(createdTime)) return null;

	const isWithinWindow = Date.now() - createdTime < SEVEN_DAYS_MS;
	if (!isWithinWindow) return null;

	return (
		<div
			className={cn(
				'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold backdrop-blur-sm',
				'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
				className
			)}
			title="Created within the last 7 days"
		>
			<Sparkles className="size-3" />
			<span>New</span>
		</div>
	);
};

export default NewKeyBadge;
