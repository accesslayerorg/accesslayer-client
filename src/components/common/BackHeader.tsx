import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackHeaderProps {
	title: string;
	subtitle?: string;
	onBack?: () => void;
	className?: string;
}

const BackHeader: React.FC<BackHeaderProps> = ({
	title,
	subtitle,
	onBack,
	className,
}) => {
	const navigate = useNavigate();

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			navigate(-1);
		}
	};

	return (
		<div className={cn('flex items-center gap-3', className)}>
			<button
				onClick={handleBack}
				aria-label="Go back"
				className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-white"
			>
				<ArrowLeft className="size-4" />
			</button>
			<div className="min-w-0">
				<h1 className="font-grotesque text-xl font-black tracking-tight text-white truncate">
					{title}
				</h1>
				{subtitle && (
					<p className="font-jakarta text-sm text-white/50 truncate">
						{subtitle}
					</p>
				)}
			</div>
		</div>
	);
};

export default BackHeader;
