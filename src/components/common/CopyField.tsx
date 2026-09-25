import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutoSelectOnFocus } from '@/hooks/useAutoSelectOnFocus';
import CopySuccessAnnouncement from '@/components/common/CopySuccessAnnouncement';
import { useCopySuccessAnnouncement } from '@/hooks/useCopySuccessAnnouncement';
import showToast from '@/utils/toast.util';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

interface CopyFieldProps {
	value: string;
	label: string;
	className?: string;
	inputClassName?: string;
	buttonClassName?: string;
}

const CopyField: React.FC<CopyFieldProps> = ({
	value,
	label,
	className,
	inputClassName,
	buttonClassName,
}) => {
	const [copied, setCopied] = useState(false);
	const inputRef = useAutoSelectOnFocus<HTMLInputElement>();
	const { announcement, announceCopySuccess } = useCopySuccessAnnouncement();

	const handleCopy = async () => {
		try {
			await copyTextToClipboard(value);
			announceCopySuccess(`${label} copied.`);
			showToast.success('Address copied to clipboard', { duration: 2000 });
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
			showToast.error(`Could not copy ${label}. Please copy it manually.`);
		}
	};

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<input
				ref={inputRef}
				type="text"
				readOnly
				value={value}
				aria-label={label}
				title={value}
				className={cn(
					'min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white/75 outline-none transition-colors focus:border-amber-400/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-amber-400/20',
					inputClassName
				)}
			/>
			<button
				type="button"
				onClick={handleCopy}
				className={cn(
					'inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white',
					buttonClassName
				)}
				aria-label={copied ? `${label} copied` : `Copy ${label}`}
			>
				{copied ? (
					<Check className="size-4 text-emerald-400" aria-hidden="true" />
				) : (
					<Copy className="size-4" aria-hidden="true" />
				)}
			</button>
			<CopySuccessAnnouncement message={announcement} />
		</div>
	);
};

export default CopyField;
