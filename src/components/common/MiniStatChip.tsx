import { cn } from '@/lib/utils';
import AccessibleInfoTrigger from '@/components/common/AccessibleInfoTrigger';
import { TruncatedText } from '@/components/ui/truncated-text';

interface MiniStatChipProps {
	label: string;
	value: string;
	/**
	 * Optional explanation surfaced via an accessible tooltip trigger (#290).
	 * The trigger is a focusable button with `aria-describedby` pointing at
	 * the tooltip, so keyboard users can reach it and screen readers
	 * announce the explanation on focus.
	 */
	explanation?: string;
	className?: string;
}

const MiniStatChip: React.FC<MiniStatChipProps> = ({
	label,
	value,
	explanation,
	className,
}) => {
	return (
		<div
			className={cn(
				'inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.65rem] font-medium text-white/80 backdrop-blur-sm',
				className
			)}
		>
			<span className="shrink-0 uppercase tracking-[0.18em] text-white/42">
				{label}
			</span>
			<TruncatedText
				text={value}
				maxWidth={120}
				className="font-jakarta text-xs font-semibold text-white"
			/>
			{explanation && (
				<AccessibleInfoTrigger
					explanation={explanation}
					label={`Explanation for ${label}`}
				/>
			)}
		</div>
	);
};

export default MiniStatChip;
