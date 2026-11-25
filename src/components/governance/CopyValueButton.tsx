import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import CopySuccessAnnouncement from '@/components/common/CopySuccessAnnouncement';
import { useCopySuccessAnnouncement } from '@/hooks/useCopySuccessAnnouncement';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';

interface CopyValueButtonProps {
	/** Full value written to the clipboard (address or transaction hash). */
	value: string;
	/** What the value is, used in the accessible name, e.g. "actor address". */
	label: string;
	className?: string;
}

/**
 * Compact icon button that copies an address or transaction hash (#1351).
 * Announces success to screen readers and flips to a check mark for 2 s.
 */
export default function CopyValueButton({
	value,
	label,
	className,
}: CopyValueButtonProps) {
	const [copied, setCopied] = useState(false);
	const resetTimerRef = useRef<number | null>(null);
	const { announcement, announceCopySuccess } = useCopySuccessAnnouncement();

	useEffect(
		() => () => {
			if (resetTimerRef.current !== null) {
				window.clearTimeout(resetTimerRef.current);
			}
		},
		[]
	);

	const handleCopy = async () => {
		try {
			await copyTextToClipboard(value);
			announceCopySuccess(`${label} copied.`);
			setCopied(true);
			if (resetTimerRef.current !== null) {
				window.clearTimeout(resetTimerRef.current);
			}
			resetTimerRef.current = window.setTimeout(
				() => setCopied(false),
				2000
			);
		} catch {
			setCopied(false);
			showToast.error(`Could not copy ${label}. Please copy it manually.`);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={() => void handleCopy()}
				aria-label={copied ? `${label} copied` : `Copy ${label}`}
				title={copied ? 'Copied' : `Copy ${label}`}
				className={cn(
					'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50',
					className
				)}
			>
				{copied ? (
					<Check
						className="size-3.5 text-emerald-400"
						aria-hidden="true"
					/>
				) : (
					<Copy className="size-3.5" aria-hidden="true" />
				)}
			</button>
			<CopySuccessAnnouncement message={announcement} />
		</>
	);
}
