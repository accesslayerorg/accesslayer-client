import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import { usePlatformStatus } from '@/hooks/usePlatformStatus';
import {
	getServiceStatusMeta,
	summarizeServiceStatuses,
} from '@/utils/status.utils';

export default function StatusBanner() {
	const { data } = usePlatformStatus();
	const overall = summarizeServiceStatuses(data?.services ?? []);

	if (overall === 'operational') return null;

	const meta = getServiceStatusMeta(overall);

	return (
		<div
			role="status"
			className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-200"
		>
			<AlertTriangle className="size-3.5" aria-hidden="true" />
			<span>{meta.summary}. Some features may be affected.</span>
			<Link to="/status" className="underline underline-offset-2">
				View status
			</Link>
		</div>
	);
}
