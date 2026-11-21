import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SupportTicketDialog from '@/components/common/SupportTicketDialog';

export interface ReportIssueButtonProps {
	keyId: string;
	keyName?: string;
	className?: string;
}

/**
 * "Report Issue" trigger for the support-ticket flow (#1250), shown on
 * both the key detail page and each portfolio holding row.
 */
export const ReportIssueButton: React.FC<ReportIssueButtonProps> = ({
	keyId,
	keyName,
	className,
}) => {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setOpen(true)}
				className={cn(
					'gap-1.5 text-white/50 hover:text-white/80',
					className
				)}
				data-testid="report-issue-button"
			>
				<Flag className="size-3.5" aria-hidden="true" />
				<span>Report Issue</span>
			</Button>

			<SupportTicketDialog
				open={open}
				onOpenChange={setOpen}
				keyId={keyId}
				keyName={keyName}
			/>
		</>
	);
};

export default ReportIssueButton;
