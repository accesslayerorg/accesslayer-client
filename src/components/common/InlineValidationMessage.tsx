import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineValidationMessageProps {
	message: string;
	className?: string;
}

const InlineValidationMessage: React.FC<InlineValidationMessageProps> = ({
	message,
	className,
}) => {
	return (
		<p
			className={cn(
				'mt-2 inline-flex items-start gap-1.5 text-xs font-medium text-amber-200/90',
				className
			)}
			role="status"
		>
			<AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
			<span>{message}</span>
		</p>
	);
};

export default InlineValidationMessage;
